import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

// =============================================================================
//  Phase 34Q — CollaborationBroadcaster
//
//  Tiny injectable service that other modules import to push events into
//  the collaboration WebSocket without depending on the gateway directly
//  (which would create circular imports).
//
//  The gateway calls `setServer()` once on init. Until then, calls are
//  silently no-op'd so non-WS contexts (tests, scripts) don't crash.
//
//  Event taxonomy (deck-scoped):
//    element.created | element.updated | element.deleted
//    slide.created   | slide.updated   | slide.deleted   | slide.reordered
//    comment.*       | review.*        | version.*
// =============================================================================

@Injectable()
export class CollaborationBroadcaster {
  private readonly logger = new Logger(CollaborationBroadcaster.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  /** Broadcast to every socket currently in the deck's room. */
  toDeck(deckId: string, event: string, payload: any): void {
    if (!this.server || !deckId) return;
    try {
      this.server.to(roomName(deckId)).emit(event, { deckId, ...payload });
    } catch (e: any) {
      this.logger.warn(`broadcast ${event} → deck:${deckId} failed: ${e?.message}`);
    }
  }

  /**
   * Broadcast to a deck but excluding the originator's socket. Useful when
   * the originator already applied the change locally and shouldn't see it
   * echoed back as a remote update.
   */
  toDeckExcept(deckId: string, exceptSocketId: string | null | undefined, event: string, payload: any): void {
    if (!this.server || !deckId) return;
    try {
      const ns = this.server.to(roomName(deckId));
      if (exceptSocketId) {
        // Socket.IO's `except` chains on top of `to`.
        ns.except(exceptSocketId).emit(event, { deckId, ...payload });
      } else {
        ns.emit(event, { deckId, ...payload });
      }
    } catch (e: any) {
      this.logger.warn(`broadcast (except) ${event} → deck:${deckId} failed: ${e?.message}`);
    }
  }
}

export function roomName(deckId: string): string {
  return `deck:${deckId}`;
}
