import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { parseMentions, MentionMeta } from './mention-parser';
import { ReviewEventBus } from '../reviews/review-event-bus';

// =============================================================================
//  Phase 14 — Collaboration v1
//
//  Comments now anchor to *any* of:
//    - project              (legacy — Comment.slideId/elementId/pageId all null)
//    - a slide              (Comment.slideId set)
//    - a slide element      (Comment.slideElementId set; slideId is also set)
//    - a PDF Studio page    (Comment.pageId set)
//
//  All anchor fields are optional so existing project-level comments stay
//  valid. Replies inherit their parent's anchor naturally (callers should
//  pass the same anchor when replying).
// =============================================================================

export interface CreateCommentInput {
  content:         string;
  parentId?:       string;
  slideId?:        string;
  slideElementId?: string;
  pageId?:         string;
  anchorX?:        number;
  anchorY?:        number;
}

const COMMENT_INCLUDE = {
  user:       { select: { id: true, name: true, email: true } },
  assignedTo: { select: { id: true, name: true, email: true } },
  replies: {
    include: {
      user:       { select: { id: true, name: true, email: true } },
      assignedTo: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    private events: ReviewEventBus,
  ) {}

  // ---------------------------------------------------------------------------
  //  Ownership / authorization
  // ---------------------------------------------------------------------------

  async assertProjectAccess(projectId: string, userId: string): Promise<void> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, userId },
      select: { id: true },
    });
    if (!project) throw new ForbiddenException('No access to this project');
  }

  /** Resolves the project owning a slide and returns it. */
  async projectForSlide(slideId: string): Promise<string> {
    const slide = await this.prisma.slide.findUnique({
      where: { id: slideId },
      select: { deck: { select: { projectId: true } } },
    });
    if (!slide) throw new NotFoundException('Slide not found');
    return slide.deck.projectId;
  }

  /** Resolves the project owning an element and returns it. */
  async projectForElement(elementId: string): Promise<{ projectId: string; slideId: string }> {
    const el = await this.prisma.slideElement.findUnique({
      where: { id: elementId },
      select: { slideId: true, slide: { select: { deck: { select: { projectId: true } } } } },
    });
    if (!el) throw new NotFoundException('Element not found');
    return { projectId: el.slide.deck.projectId, slideId: el.slideId };
  }

  // ---------------------------------------------------------------------------
  //  Queries
  // ---------------------------------------------------------------------------

  /** All top-level comments in a project (legacy behaviour, kept for compat). */
  async findAll(projectId: string) {
    return this.prisma.comment.findMany({
      where: { projectId, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** All top-level comments anchored to a slide (or any of its elements). */
  async findForSlide(slideId: string) {
    return this.prisma.comment.findMany({
      where: { slideId, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** All top-level comments anchored to a specific element. */
  async findForElement(slideElementId: string) {
    return this.prisma.comment.findMany({
      where: { slideElementId, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** All top-level comments anchored to a PDF Studio page. */
  async findForPage(pageId: string) {
    return this.prisma.comment.findMany({
      where: { pageId, parentId: null },
      include: COMMENT_INCLUDE,
      orderBy: [{ resolved: 'asc' }, { createdAt: 'desc' }],
    });
  }

  /** Lightweight count map for badge UIs: { [slideId]: unresolvedCount }. */
  async countsByDeckSlides(deckId: string): Promise<Record<string, number>> {
    const slides = await this.prisma.slide.findMany({ where: { deckId }, select: { id: true } });
    const slideIds = slides.map((s) => s.id);
    if (slideIds.length === 0) return {};
    const rows = await this.prisma.comment.groupBy({
      by: ['slideId'],
      where: { resolved: false, slideId: { in: slideIds } },
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const r of rows) if (r.slideId) map[r.slideId] = r._count._all;
    return map;
  }

  /** Lightweight count map for element badges on a single slide. */
  async countsByElementsForSlide(slideId: string): Promise<Record<string, number>> {
    const rows = await this.prisma.comment.groupBy({
      by: ['slideElementId'],
      where: { resolved: false, slideId, slideElementId: { not: null } },
      _count: { _all: true },
    });
    const map: Record<string, number> = {};
    for (const r of rows) if (r.slideElementId) map[r.slideElementId] = r._count._all;
    return map;
  }

  // ---------------------------------------------------------------------------
  //  Mutations
  // ---------------------------------------------------------------------------

  async create(projectId: string, userId: string, input: CreateCommentInput) {
    const content = (input.content || '').trim();
    if (!content) throw new BadRequestException('Comment content is required');

    // Replies inherit their parent's anchor unless the caller passed one.
    let slideId = input.slideId;
    let slideElementId = input.slideElementId;
    let pageId = input.pageId;
    let anchorX = input.anchorX;
    let anchorY = input.anchorY;

    if (input.parentId) {
      const parent = await this.prisma.comment.findUnique({
        where: { id: input.parentId },
        select: { projectId: true, slideId: true, slideElementId: true, pageId: true, anchorX: true, anchorY: true },
      });
      if (!parent) throw new NotFoundException('Parent comment not found');
      if (parent.projectId !== projectId) throw new BadRequestException('Parent comment belongs to a different project');
      slideId        = slideId        ?? parent.slideId        ?? undefined;
      slideElementId = slideElementId ?? parent.slideElementId ?? undefined;
      pageId         = pageId         ?? parent.pageId         ?? undefined;
      anchorX        = anchorX        ?? parent.anchorX        ?? undefined;
      anchorY        = anchorY        ?? parent.anchorY        ?? undefined;
    }

    // Phase 36.1A — parse @mentions. We only handle the bracket form server-
    // side; bare @handles are best-effort matched against project members.
    const mentions = await this.parseAndResolveMentions(content, projectId);

    const created = await this.prisma.comment.create({
      data: {
        projectId,
        userId,
        content,
        parentId: input.parentId,
        slideId, slideElementId, pageId, anchorX, anchorY,
        mentions: mentions.length > 0 ? (mentions as any) : undefined,
      },
      include: COMMENT_INCLUDE,
    });

    // Phase 36.1M — event emission (notification-center stub).
    this.events.emit({ type: 'comment.created', commentId: created.id, projectId, userId, mentions });
    return created;
  }

  // ---------------------------------------------------------------------------
  //  Phase 36.1A — mention resolution
  // ---------------------------------------------------------------------------

  /**
   * Parse bracket mentions from `content` and, where the content references
   * bare @handles, attempt to match them against project members (owner +
   * shares) by name or email prefix.
   */
  private async parseAndResolveMentions(content: string, projectId: string): Promise<MentionMeta[]> {
    // Build candidate pool: project owner + share members.
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      select: {
        user:   { select: { id: true, name: true, email: true } },
        shares: { select: { user: { select: { id: true, name: true, email: true } } } },
      },
    });
    if (!project) return [];

    const pool = [
      project.user,
      ...project.shares.map((s) => s.user),
    ];
    const byHandle = (h: string) => {
      const needle = h.toLowerCase();
      const hit = pool.find((u) =>
        (u.name || '').toLowerCase().startsWith(needle) ||
        (u.email || '').toLowerCase().split('@')[0].startsWith(needle),
      );
      return hit ? { userId: hit.id, displayName: hit.name || hit.email } : null;
    };
    return parseMentions(content, byHandle);
  }

  // ---------------------------------------------------------------------------
  //  Phase 36.1E — edit own message
  // ---------------------------------------------------------------------------

  async edit(id: string, userId: string, content: string) {
    const trimmed = (content || '').trim();
    if (!trimmed) throw new BadRequestException('Comment content is required');
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true, userId: true, projectId: true, deletedAt: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.deletedAt) throw new BadRequestException('Cannot edit a deleted comment');
    if (comment.userId !== userId) {
      throw new ForbiddenException("Cannot edit another user's comment");
    }
    const mentions = await this.parseAndResolveMentions(trimmed, comment.projectId);
    return this.prisma.comment.update({
      where: { id },
      data:  {
        content: trimmed,
        editedAt: new Date(),
        mentions: mentions.length > 0 ? (mentions as any) : undefined,
      },
      include: COMMENT_INCLUDE,
    });
  }

  // ---------------------------------------------------------------------------
  //  Phase 36.1H — assignment
  // ---------------------------------------------------------------------------

  async assign(id: string, userId: string, assigneeId: string | null) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      select: { id: true, projectId: true, parentId: true },
    });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.parentId) {
      throw new BadRequestException('Replies cannot be assigned — assign the thread root instead');
    }
    await this.assertProjectAccess(comment.projectId, userId);

    if (assigneeId) {
      const member = await this.prisma.user.findUnique({
        where: { id: assigneeId }, select: { id: true },
      });
      if (!member) throw new BadRequestException('Assignee user not found');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data:  { assignedToId: assigneeId },
      include: COMMENT_INCLUDE,
    });
    this.events.emit({ type: 'comment.assigned', commentId: id, projectId: comment.projectId, assigneeId });
    return updated;
  }

  // ---------------------------------------------------------------------------
  //  Phase 36.1K — resolve all comments on a slide or deck
  // ---------------------------------------------------------------------------

  async resolveAllForSlide(slideId: string, userId: string) {
    const projectId = await this.projectForSlide(slideId);
    await this.assertProjectAccess(projectId, userId);
    const res = await this.prisma.comment.updateMany({
      where: { slideId, parentId: null, resolved: false, deletedAt: null },
      data:  { resolved: true },
    });
    this.events.emit({ type: 'comments.resolved_all', projectId, slideId, count: res.count });
    return { resolved: res.count };
  }

  async resolveAllForDeck(deckId: string, userId: string) {
    const slide = await this.prisma.slide.findFirst({ where: { deckId }, select: { id: true } });
    if (slide) {
      const projectId = await this.projectForSlide(slide.id);
      await this.assertProjectAccess(projectId, userId);
    }
    const slides = await this.prisma.slide.findMany({ where: { deckId }, select: { id: true } });
    const ids = slides.map((s) => s.id);
    if (ids.length === 0) return { resolved: 0 };
    const res = await this.prisma.comment.updateMany({
      where: { slideId: { in: ids }, parentId: null, resolved: false, deletedAt: null },
      data:  { resolved: true },
    });
    this.events.emit({ type: 'comments.resolved_all', deckId, count: res.count });
    return { resolved: res.count };
  }

  // ---------------------------------------------------------------------------
  //  Phase 36.1L — search across project comments
  // ---------------------------------------------------------------------------

  async search(projectId: string, userId: string, q: string) {
    await this.assertProjectAccess(projectId, userId);
    const needle = (q || '').trim().toLowerCase();
    if (!needle) return [];
    const rows = await this.prisma.comment.findMany({
      where: { projectId, parentId: null, deletedAt: null },
      include: COMMENT_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    // Hydrate slide titles in a single batched query (Comment has no direct
    // `slide` relation, so a join via Prisma isn't an option).
    const slideIds = Array.from(new Set(rows.map((r) => r.slideId).filter(Boolean) as string[]));
    const slides = slideIds.length
      ? await this.prisma.slide.findMany({
          where:  { id: { in: slideIds } },
          select: { id: true, title: true },
        })
      : [];
    const slideTitleById = new Map(slides.map((s) => [s.id, s.title]));

    return rows.filter((c) => {
      const slideTitle = c.slideId ? slideTitleById.get(c.slideId) : undefined;
      const blob = [
        c.content,
        c.user?.name, c.user?.email,
        ...c.replies.map((r) => r.content),
        ...c.replies.map((r) => r.user?.name),
        ...c.replies.map((r) => r.user?.email),
        slideTitle,
        ...(Array.isArray(c.mentions)
          ? (c.mentions as any[]).map((m: any) => m?.displayName)
          : []),
      ].filter(Boolean).join(' ').toLowerCase();
      return blob.includes(needle);
    }).map((c) => ({
      ...c,
      // Inline slide title so the search panel can show "Slide 3 — Problem".
      slide: c.slideId ? { id: c.slideId, title: slideTitleById.get(c.slideId) || null } : null,
    }));
  }

  async resolve(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id }, select: { id: true, projectId: true } });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.assertProjectAccess(comment.projectId, userId);
    const updated = await this.prisma.comment.update({ where: { id }, data: { resolved: true }, include: COMMENT_INCLUDE });
    this.events.emit({ type: 'comment.resolved', commentId: id, projectId: comment.projectId });
    return updated;
  }

  async reopen(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id }, select: { id: true, projectId: true } });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.assertProjectAccess(comment.projectId, userId);
    const updated = await this.prisma.comment.update({ where: { id }, data: { resolved: false }, include: COMMENT_INCLUDE });
    this.events.emit({ type: 'comment.reopened', commentId: id, projectId: comment.projectId });
    return updated;
  }

  /** Phase 36.1E — soft delete. The row stays so reply threads remain
   *  coherent; clients should render "[message deleted]" when deletedAt is
   *  set. Only the author can delete their own message. */
  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException("Cannot delete another user's comment");
    if (comment.deletedAt) return { id, ok: true };
    await this.prisma.comment.update({
      where: { id },
      data:  { deletedAt: new Date(), content: '[deleted]' },
    });
    return { id, ok: true };
  }
}
