import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

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
  user: { select: { id: true, name: true, email: true } },
  replies: {
    include: { user: { select: { id: true, name: true, email: true } } },
    orderBy: { createdAt: 'asc' as const },
  },
};

@Injectable()
export class CommentsService {
  constructor(private prisma: PrismaService) {}

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

    return this.prisma.comment.create({
      data: {
        projectId,
        userId,
        content,
        parentId: input.parentId,
        slideId, slideElementId, pageId, anchorX, anchorY,
      },
      include: { user: { select: { id: true, name: true, email: true } } },
    });
  }

  async resolve(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id }, select: { id: true, projectId: true } });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.assertProjectAccess(comment.projectId, userId);
    return this.prisma.comment.update({ where: { id }, data: { resolved: true }, include: COMMENT_INCLUDE });
  }

  async reopen(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id }, select: { id: true, projectId: true } });
    if (!comment) throw new NotFoundException('Comment not found');
    await this.assertProjectAccess(comment.projectId, userId);
    return this.prisma.comment.update({ where: { id }, data: { resolved: false }, include: COMMENT_INCLUDE });
  }

  async remove(id: string, userId: string) {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment) throw new NotFoundException('Comment not found');
    if (comment.userId !== userId) throw new ForbiddenException("Cannot delete another user's comment");
    await this.prisma.comment.delete({ where: { id } });
    return { id, ok: true };
  }
}
