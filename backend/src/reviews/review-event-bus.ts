import { Injectable, Logger } from '@nestjs/common';
import { EventEmitter } from 'events';

/**
 * Phase 36.1M — ReviewEventBus
 *
 * Lightweight in-process emitter for comment/review lifecycle events. Other
 * services subscribe to it without a hard dependency, and a future
 * notification center can listen here too.
 *
 * This is the *emit-only* slice — we don't ship subscribers yet. Every emit
 * is logged so the events show up in dev tail-logs immediately.
 */

export type ReviewEvent =
  | { type: 'comment.created';        commentId: string; projectId: string; userId: string; mentions: Array<{ userId: string; displayName: string }> }
  | { type: 'comment.resolved';       commentId: string; projectId: string }
  | { type: 'comment.reopened';       commentId: string; projectId: string }
  | { type: 'comment.assigned';       commentId: string; projectId: string; assigneeId: string | null }
  | { type: 'comments.resolved_all';  projectId?: string; deckId?: string; slideId?: string; count: number }
  | { type: 'review.requested';       reviewId: string; deckId: string; requestedById: string; reviewerId: string }
  | { type: 'review.started';         reviewId: string; deckId: string; reviewerId: string }
  | { type: 'review.approved';        reviewId: string; deckId: string; reviewerId: string }
  | { type: 'review.changes_requested'; reviewId: string; deckId: string; reviewerId: string }
  | { type: 'review.withdrawn';       reviewId: string; deckId: string; requestedById: string }
  | { type: 'review.reopened';        reviewId: string; deckId: string; reviewerId: string };

@Injectable()
export class ReviewEventBus {
  private readonly emitter = new EventEmitter();
  private readonly logger  = new Logger(ReviewEventBus.name);

  emit(event: ReviewEvent): void {
    this.logger.debug(`[${event.type}] ${JSON.stringify(event)}`);
    this.emitter.emit(event.type, event);
    this.emitter.emit('*', event);
  }

  on(type: ReviewEvent['type'] | '*', handler: (e: ReviewEvent) => void): () => void {
    this.emitter.on(type, handler);
    return () => this.emitter.off(type, handler);
  }
}
