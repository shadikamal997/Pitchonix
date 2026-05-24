import {
  Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { VersionHistoryService } from '../version-history/version-history.service';
import { ReviewEventBus } from './review-event-bus';

// =============================================================================
//  Phase 36 — Reviews
//
//  Review-request lifecycle on top of the existing Comment/Project model.
//
//    request          → "requested"
//    reviewer opens   → "in_review"     (also flips Deck.reviewStatus)
//    reviewer approves → "approved"      (Deck.reviewStatus = "approved")
//    reviewer rejects → "changes_requested"
//    requester cancels → "withdrawn"
//
//  Deck.reviewStatus is a cached projection of the *latest active* request so
//  the editor can render a status badge without re-querying every render.
// =============================================================================

export type ReviewRequestStatus =
  | 'requested'
  | 'in_review'
  | 'approved'
  | 'changes_requested'
  | 'withdrawn';

export type DeckReviewStatus =
  | 'draft'
  | 'in_review'
  | 'approved'
  | 'changes_requested';

export interface CreateReviewRequestInput {
  /** Provide either reviewerId or reviewerEmail. Email path mirrors the
   *  project-sharing invite flow (resolve via prisma.user.findUnique). */
  reviewerId?:    string;
  reviewerEmail?: string;
  message?:       string;
  dueDate?:       string | Date | null;
}

const REVIEW_INCLUDE = {
  requestedBy: { select: { id: true, name: true, email: true } },
  reviewer:    { select: { id: true, name: true, email: true } },
};

@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private prisma: PrismaService,
    private versions: VersionHistoryService,
    private events:   ReviewEventBus,
  ) {}

  /**
   * Phase 36.1C — best-effort snapshot. Snapshots are nice-to-have, never
   * load-bearing — if the version history call fails we log + continue so
   * the review transition still succeeds.
   */
  private async snapshot(deckId: string, userId: string, type: any, name: string) {
    try {
      await this.versions.createSnapshot(deckId, { type, name, userId });
    } catch (e: any) {
      this.logger.warn(`Snapshot "${name}" failed for deck ${deckId}: ${e?.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Ownership / authorization
  // ---------------------------------------------------------------------------

  /** Caller must own the deck's parent project. */
  private async assertDeckOwner(deckId: string, userId: string): Promise<{ projectId: string }> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: { id: true, project: { select: { id: true, userId: true } } },
    });
    if (!deck) throw new NotFoundException('Deck not found');
    if (deck.project.userId !== userId) throw new ForbiddenException('No access to this deck');
    return { projectId: deck.project.id };
  }

  /** Caller is either the deck owner OR the assigned reviewer for this request. */
  private async assertRequesterOrReviewer(reviewId: string, userId: string) {
    const review = await this.prisma.reviewRequest.findUnique({
      where: { id: reviewId },
      select: {
        id: true, deckId: true, requestedById: true, reviewerId: true, status: true,
        deck: { select: { project: { select: { userId: true } } } },
      },
    });
    if (!review) throw new NotFoundException('Review request not found');
    const isOwner    = review.deck.project.userId === userId;
    const isReviewer = review.reviewerId === userId;
    if (!isOwner && !isReviewer) {
      throw new ForbiddenException('Only the deck owner or assigned reviewer can act on this request');
    }
    return { review, isOwner, isReviewer };
  }

  // ---------------------------------------------------------------------------
  //  Queries
  // ---------------------------------------------------------------------------

  async listForDeck(deckId: string, userId: string) {
    await this.assertDeckOwner(deckId, userId);
    return this.prisma.reviewRequest.findMany({
      where: { deckId },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  /** Compact status object for the editor toolbar badge. */
  async getDeckStatus(deckId: string, userId: string) {
    await this.assertDeckOwner(deckId, userId);
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: { reviewStatus: true },
    });
    const active = await this.prisma.reviewRequest.findFirst({
      where: { deckId, status: { in: ['requested', 'in_review'] } },
      include: REVIEW_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return {
      deckReviewStatus: (deck?.reviewStatus || 'draft') as DeckReviewStatus,
      activeRequest:    active,
    };
  }

  /** Requests assigned TO me (used by reviewer-side dashboards). */
  async listAssignedToMe(userId: string) {
    return this.prisma.reviewRequest.findMany({
      where: { reviewerId: userId, status: { in: ['requested', 'in_review'] } },
      include: { ...REVIEW_INCLUDE, deck: { select: { id: true, title: true, projectId: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ---------------------------------------------------------------------------
  //  Mutations — lifecycle transitions
  // ---------------------------------------------------------------------------

  async create(deckId: string, userId: string, input: CreateReviewRequestInput) {
    await this.assertDeckOwner(deckId, userId);
    if (!input.reviewerId && !input.reviewerEmail) {
      throw new BadRequestException('reviewerId or reviewerEmail is required');
    }

    // Resolve reviewer (id or email) to a user record. Email path mirrors
    // ProjectSharingService.inviteByEmail.
    const reviewer = input.reviewerId
      ? await this.prisma.user.findUnique({
          where: { id: input.reviewerId }, select: { id: true },
        })
      : await this.prisma.user.findUnique({
          where: { email: input.reviewerEmail! }, select: { id: true },
        });
    if (!reviewer) throw new BadRequestException('Reviewer user not found');
    if (reviewer.id === userId) {
      throw new BadRequestException('Cannot request review from yourself');
    }

    // Block creating a second active request for the same reviewer.
    const existingActive = await this.prisma.reviewRequest.findFirst({
      where: {
        deckId,
        reviewerId: reviewer.id,
        status: { in: ['requested', 'in_review'] },
      },
      select: { id: true },
    });
    if (existingActive) {
      throw new BadRequestException('Reviewer already has an active request for this deck');
    }

    const due = input.dueDate ? new Date(input.dueDate) : null;
    if (due && Number.isNaN(due.getTime())) {
      throw new BadRequestException('Invalid dueDate');
    }

    // Phase 36.1C — pre-request snapshot so the requester can roll back to
    // exactly what was sent for review.
    await this.snapshot(deckId, userId, 'REVIEW_REQUESTED', 'Before review request');

    const [request] = await this.prisma.$transaction([
      this.prisma.reviewRequest.create({
        data: {
          deckId,
          requestedById: userId,
          reviewerId:    reviewer.id,
          status:        'requested',
          message:       input.message?.trim() || null,
          dueDate:       due,
        },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.deck.update({
        where: { id: deckId },
        data:  { reviewStatus: 'in_review' },
      }),
    ]);
    this.events.emit({
      type:          'review.requested',
      reviewId:      request.id,
      deckId,
      requestedById: userId,
      reviewerId:    reviewer.id,
    });
    return request;
  }

  /** Reviewer marks request as opened (transition requested → in_review). */
  async open(reviewId: string, userId: string) {
    const { review, isReviewer } = await this.assertRequesterOrReviewer(reviewId, userId);
    if (!isReviewer) throw new ForbiddenException('Only the reviewer can open a request');
    if (review.status !== 'requested') return review;  // idempotent
    await this.snapshot(review.deckId, userId, 'REVIEW_STARTED', 'Review started');
    const updated = await this.prisma.reviewRequest.update({
      where: { id: reviewId },
      data:  { status: 'in_review', openedAt: new Date() },
      include: REVIEW_INCLUDE,
    });
    this.events.emit({ type: 'review.started', reviewId, deckId: review.deckId, reviewerId: userId });
    return updated;
  }

  async approve(reviewId: string, userId: string) {
    const { review, isReviewer } = await this.assertRequesterOrReviewer(reviewId, userId);
    if (!isReviewer) throw new ForbiddenException('Only the reviewer can approve');
    if (review.status === 'approved') return review;
    if (review.status === 'withdrawn') {
      throw new BadRequestException('Cannot approve a withdrawn request');
    }
    await this.snapshot(review.deckId, userId, 'REVIEW_APPROVED', 'Approved version');
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.reviewRequest.update({
        where: { id: reviewId },
        data:  { status: 'approved', decidedAt: now },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.deck.update({
        where: { id: review.deckId },
        data:  { reviewStatus: 'approved' },
      }),
    ]);
    this.events.emit({ type: 'review.approved', reviewId, deckId: review.deckId, reviewerId: userId });
    return updated;
  }

  async requestChanges(reviewId: string, userId: string) {
    const { review, isReviewer } = await this.assertRequesterOrReviewer(reviewId, userId);
    if (!isReviewer) throw new ForbiddenException('Only the reviewer can request changes');
    if (review.status === 'changes_requested') return review;
    if (review.status === 'withdrawn') {
      throw new BadRequestException('Cannot reject a withdrawn request');
    }
    await this.snapshot(review.deckId, userId, 'REVIEW_CHANGES_REQUESTED', 'Changes requested');
    const now = new Date();
    const [updated] = await this.prisma.$transaction([
      this.prisma.reviewRequest.update({
        where: { id: reviewId },
        data:  { status: 'changes_requested', decidedAt: now },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.deck.update({
        where: { id: review.deckId },
        data:  { reviewStatus: 'changes_requested' },
      }),
    ]);
    this.events.emit({ type: 'review.changes_requested', reviewId, deckId: review.deckId, reviewerId: userId });
    return updated;
  }

  /**
   * Phase 36.1G — re-open a decided request (changes_requested → in_review).
   * Only the original reviewer may re-open. This is the "after the requester
   * pushed fixes, please look again" path.
   */
  async reopen(reviewId: string, userId: string) {
    const { review, isReviewer } = await this.assertRequesterOrReviewer(reviewId, userId);
    if (!isReviewer) throw new ForbiddenException('Only the reviewer can re-open a request');
    if (review.status !== 'changes_requested') {
      throw new BadRequestException('Only changes-requested reviews can be re-opened');
    }
    const [updated] = await this.prisma.$transaction([
      this.prisma.reviewRequest.update({
        where: { id: reviewId },
        data:  { status: 'in_review', decidedAt: null },
        include: REVIEW_INCLUDE,
      }),
      this.prisma.deck.update({
        where: { id: review.deckId },
        data:  { reviewStatus: 'in_review' },
      }),
    ]);
    this.events.emit({ type: 'review.reopened', reviewId, deckId: review.deckId, reviewerId: userId });
    return updated;
  }

  /** Requester (deck owner) cancels a request that hasn't been decided yet. */
  async withdraw(reviewId: string, userId: string) {
    const { review, isOwner } = await this.assertRequesterOrReviewer(reviewId, userId);
    if (!isOwner) throw new ForbiddenException('Only the requester can withdraw');
    if (review.status === 'approved' || review.status === 'changes_requested') {
      throw new BadRequestException('Cannot withdraw a decided request');
    }
    const updated = await this.prisma.reviewRequest.update({
      where: { id: reviewId },
      data:  { status: 'withdrawn', decidedAt: new Date() },
      include: REVIEW_INCLUDE,
    });
    // If this was the last active request, demote deck status back to draft.
    const stillActive = await this.prisma.reviewRequest.count({
      where: { deckId: review.deckId, status: { in: ['requested', 'in_review'] } },
    });
    if (stillActive === 0) {
      await this.prisma.deck.update({
        where: { id: review.deckId },
        data:  { reviewStatus: 'draft' },
      });
    }
    this.events.emit({
      type: 'review.withdrawn',
      reviewId,
      deckId:        review.deckId,
      requestedById: userId,
    });
    return updated;
  }
}
