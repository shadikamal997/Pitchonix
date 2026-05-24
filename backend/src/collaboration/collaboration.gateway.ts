import {
  WebSocketGateway, WebSocketServer, SubscribeMessage,
  OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit,
  ConnectedSocket, MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CollaborationBroadcaster, roomName } from './collaboration-broadcaster';
import { PresenceStore, pickColor, PresenceUser } from './presence-store';
import { ReviewEventBus, ReviewEvent } from '../reviews/review-event-bus';
import { YDocStore } from './ydoc-store';

// =============================================================================
//  Phase 34A — CollaborationGateway
//
//  Socket.IO gateway at namespace `/collaboration`. Rooms are
//  `deck:{deckId}`. Every operation requires:
//
//    1. JWT on connection (handshake.auth.token)
//    2. Deck-level access on `join` — verified by walking
//         deck → project → workspace → workspaceMember{userId, deckId}
//       so cross-workspace cursors / selections can never leak.
//
//  Throttling on the client side keeps cursor traffic <60fps; the gateway
//  itself does no throttling so a misbehaving client can spam, but the
//  damage is contained to one room.
// =============================================================================

interface JoinPayload  { deckId: string; slideId?: string }
interface CursorPayload    { slideId: string; x: number; y: number }
interface SelectionPayload { slideId: string; elementIds: string[] }
interface SlideViewPayload { slideId: string }
interface EditingStartPayload { slideId: string; elementId: string; field?: string }
interface EditingStopPayload  { slideId: string; elementId: string }
interface YjsUpdatePayload    { docId: string; update: number[] }   // update is Uint8Array serialised as number[]
interface YjsAwarenessPayload { docId: string; update: number[] }
interface YjsJoinPayload      { docId: string }

@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/collaboration',
})
export class CollaborationGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(CollaborationGateway.name);
  private readonly store  = new PresenceStore();
  // Phase 34.4D — monotonic event counters surfaced via /collaboration/metrics
  // and the Prometheus exporter. Reset only on process restart.
  private cursorEvents = 0;
  private yjsUpdates   = 0;
  private editingEvents = 0;

  @WebSocketServer()
  server!: Server;

  constructor(
    private jwt:          JwtService,
    private prisma:       PrismaService,
    private broadcaster:  CollaborationBroadcaster,
    private reviewBus:    ReviewEventBus,
    private ydocStore:    YDocStore,
  ) {}

  // ---------------------------------------------------------------------------
  //  Init — wire broadcaster + event bus
  // ---------------------------------------------------------------------------

  async afterInit(server: Server) {
    this.broadcaster.setServer(server);

    // Phase 34.1D — Redis adapter for horizontal scaling. Activates only
    // when REDIS_URL is set; otherwise stays on the in-memory adapter.
    if (process.env.REDIS_URL) {
      try {
        const { createAdapter } = await import('@socket.io/redis-adapter');
        // ioredis is already a runtime dep (used elsewhere); reusing it
        // avoids pulling in @types/redis on top.
        const { default: Redis } = await import('ioredis');
        const pub = new (Redis as any)(process.env.REDIS_URL);
        const sub = pub.duplicate();
        server.adapter(createAdapter(pub, sub));
        this.logger.log(`Redis adapter wired to ${process.env.REDIS_URL.replace(/:[^@]*@/, ':***@')}`);
      } catch (e: any) {
        this.logger.warn(`Redis adapter init failed (${e?.message}); staying on in-memory adapter`);
      }
    }

    // Phase 34L/M/N — forward comment/review/version events from the in-process
    // bus to the deck's room so clients see live updates without polling.
    this.reviewBus.on('*', (evt: ReviewEvent) => {
      this.forwardReviewEvent(evt);
    });

    this.logger.log('CollaborationGateway initialised at /collaboration');
  }

  // ---------------------------------------------------------------------------
  //  Auth — every connection needs a valid JWT
  // ---------------------------------------------------------------------------

  async handleConnection(client: Socket) {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) throw new Error('missing token');
      const payload: any = this.jwt.verify(token, {
        secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-this-in-production',
      });
      // Stash the resolved userId on the socket for cheap re-use.
      (client.data as any).userId = payload?.sub;
    } catch {
      client.disconnect(true);
    }
  }

  handleDisconnect(client: Socket) {
    // Phase 34.3E — release every Y.Doc subscription this socket held.
    const subs = (client.data as any).ydocSubs as Set<string> | undefined;
    if (subs) {
      for (const docId of subs) this.ydocStore.unsubscribe(docId);
      subs.clear();
    }
    const left = this.store.leave(client.id);
    if (left) {
      this.server.to(roomName(left.deckId)).emit('presence.updated', { deckId: left.deckId, users: left.users });
    }
  }

  // ---------------------------------------------------------------------------
  //  Presence — join / leave / slide change
  // ---------------------------------------------------------------------------

  @SubscribeMessage('presence.join')
  async onJoin(@ConnectedSocket() client: Socket, @MessageBody() body: JoinPayload) {
    const userId = (client.data as any).userId as string | undefined;
    if (!userId || !body?.deckId) { client.disconnect(true); return; }

    // Phase 34S — verify workspace membership for the deck. Any failure here
    // disconnects the socket so the client never even sees the room exist.
    const access = await this.resolveAccess(body.deckId, userId);
    if (!access) {
      client.emit('error', { code: 'forbidden', message: 'No access to this deck' });
      client.disconnect(true);
      return;
    }

    const presence: PresenceUser = {
      userId,
      name:      access.user.name || access.user.email,
      email:     access.user.email,
      color:     pickColor(userId),
      role:      access.role,
      slideId:   body.slideId || null,
      cursor:    null,
      selection: [],
      editing:   null,
      lastSeen:  Date.now(),
    };

    const users = this.store.join(body.deckId, client.id, presence);
    client.join(roomName(body.deckId));
    this.server.to(roomName(body.deckId)).emit('presence.updated', { deckId: body.deckId, users });
    // Echo a join-ack so the client can finish setup with the stable color.
    client.emit('presence.you', { you: presence });
  }

  @SubscribeMessage('presence.slide')
  onSlideView(@ConnectedSocket() client: Socket, @MessageBody() body: SlideViewPayload) {
    const users = this.store.patch(client.id, { slideId: body?.slideId || null, cursor: null, selection: [] });
    const deckId = this.store.deckOfSocket(client.id);
    if (users && deckId) {
      this.server.to(roomName(deckId)).emit('presence.updated', { deckId, users });
    }
  }

  @SubscribeMessage('presence.leave')
  onLeave(@ConnectedSocket() client: Socket) {
    this.handleDisconnect(client);
  }

  // ---------------------------------------------------------------------------
  //  Cursors + selections — broadcast-without-persisting
  // ---------------------------------------------------------------------------

  @SubscribeMessage('cursor.move')
  onCursor(@ConnectedSocket() client: Socket, @MessageBody() body: CursorPayload) {
    const deckId = this.store.deckOfSocket(client.id);
    if (!deckId || !body) return;
    this.cursorEvents++;
    this.store.patch(client.id, { slideId: body.slideId, cursor: { x: body.x, y: body.y } });
    // Don't echo back to sender — they already know where their cursor is.
    client.to(roomName(deckId)).emit('cursor.move', {
      deckId,
      userId:   (client.data as any).userId,
      slideId:  body.slideId,
      x:        body.x,
      y:        body.y,
    });
  }

  @SubscribeMessage('selection.change')
  onSelection(@ConnectedSocket() client: Socket, @MessageBody() body: SelectionPayload) {
    const deckId = this.store.deckOfSocket(client.id);
    if (!deckId || !body) return;
    this.store.patch(client.id, { slideId: body.slideId, selection: body.elementIds || [] });
    client.to(roomName(deckId)).emit('selection.change', {
      deckId,
      userId:     (client.data as any).userId,
      slideId:    body.slideId,
      elementIds: body.elementIds || [],
    });
  }

  // ---------------------------------------------------------------------------
  //  Phase 34.1C/H — Editing awareness
  // ---------------------------------------------------------------------------

  @SubscribeMessage('editing.started')
  onEditingStarted(@ConnectedSocket() client: Socket, @MessageBody() body: EditingStartPayload) {
    const deckId = this.store.deckOfSocket(client.id);
    if (!deckId || !body?.slideId || !body?.elementId) return;
    this.editingEvents++;
    const editing = {
      slideId:   body.slideId,
      elementId: body.elementId,
      field:     body.field,
      startedAt: Date.now(),
    };
    const users = this.store.patch(client.id, { editing });
    if (users) {
      this.server.to(roomName(deckId)).emit('presence.updated', { deckId, users });
    }
    client.to(roomName(deckId)).emit('editing.started', {
      deckId,
      userId:    (client.data as any).userId,
      ...editing,
    });
  }

  @SubscribeMessage('editing.stopped')
  onEditingStopped(@ConnectedSocket() client: Socket, @MessageBody() body: EditingStopPayload) {
    const deckId = this.store.deckOfSocket(client.id);
    if (!deckId) return;
    const users = this.store.patch(client.id, { editing: null });
    if (users) {
      this.server.to(roomName(deckId)).emit('presence.updated', { deckId, users });
    }
    client.to(roomName(deckId)).emit('editing.stopped', {
      deckId,
      userId:    (client.data as any).userId,
      slideId:   body?.slideId,
      elementId: body?.elementId,
    });
  }

  // ---------------------------------------------------------------------------
  //  Phase 34.2A/B — Server-authoritative Y.Doc handling
  //
  //  Upgraded from the 34.1E pure-relay implementation. The server now:
  //
  //    - Hydrates each Y.Doc from DB on first join (via YDocStore)
  //    - Sends the full state to newcomers as their initial sync
  //    - Applies every incoming update to its in-memory Y.Doc before
  //      broadcasting, so the server's view always matches all clients
  //    - Persists debounced (~2s) to SlideElement.ydocState
  //
  //  Awareness stays a pure relay — it's transient cursor / selection data
  //  that doesn't need server-side state.
  // ---------------------------------------------------------------------------

  @SubscribeMessage('yjs.join')
  async onYjsJoin(@ConnectedSocket() client: Socket, @MessageBody() body: YjsJoinPayload) {
    if (!body?.docId) return;
    client.join(`ydoc:${body.docId}`);
    // Phase 34.3E — track subscriber so the LRU sweeper doesn't evict this doc.
    this.ydocStore.subscribe(body.docId);
    // Remember the docId on the socket so disconnect can unsubscribe.
    const subs = (client.data as any).ydocSubs as Set<string> | undefined;
    if (subs) subs.add(body.docId);
    else (client.data as any).ydocSubs = new Set([body.docId]);

    // Send the current server-side state to this client so it fast-forwards
    // immediately. This eliminates the previous "ask other peers to echo"
    // pattern which broke down when only one client was connected.
    try {
      const state = await this.ydocStore.encodeState(body.docId);
      client.emit('yjs.initial_state', {
        docId:  body.docId,
        update: Array.from(state),
      });
    } catch (e: any) {
      this.logger.warn(`Initial state ${body.docId} failed: ${e?.message}`);
    }
    client.to(`ydoc:${body.docId}`).emit('yjs.peer_joined', {
      docId: body.docId, userId: (client.data as any).userId,
    });
  }

  @SubscribeMessage('yjs.leave')
  onYjsLeave(@ConnectedSocket() client: Socket, @MessageBody() body: YjsJoinPayload) {
    if (!body?.docId) return;
    client.leave(`ydoc:${body.docId}`);
    this.ydocStore.unsubscribe(body.docId);
    (client.data as any).ydocSubs?.delete(body.docId);
  }

  @SubscribeMessage('yjs.update')
  async onYjsUpdate(@ConnectedSocket() client: Socket, @MessageBody() body: YjsUpdatePayload) {
    if (!body?.docId || !Array.isArray(body.update)) return;
    this.yjsUpdates++;
    // Apply to server-side state FIRST so persistence + future newcomers see
    // the change. Failure here logs + drops the update — never crashes.
    await this.ydocStore.applyUpdate(body.docId, Uint8Array.from(body.update));
    client.to(`ydoc:${body.docId}`).emit('yjs.update', body);
  }

  @SubscribeMessage('yjs.awareness')
  onYjsAwareness(@ConnectedSocket() client: Socket, @MessageBody() body: YjsAwarenessPayload) {
    if (!body?.docId || !Array.isArray(body.update)) return;
    client.to(`ydoc:${body.docId}`).emit('yjs.awareness', body);
  }

  // ---------------------------------------------------------------------------
  //  Bridge: ReviewEventBus → deck room
  // ---------------------------------------------------------------------------

  private async forwardReviewEvent(evt: ReviewEvent) {
    try {
      const deckId = await this.resolveDeckIdForEvent(evt);
      if (!deckId) return;
      this.server.to(roomName(deckId)).emit(evt.type, { ...evt, deckId });
    } catch (e: any) {
      this.logger.warn(`forwardReviewEvent ${evt.type} failed: ${e?.message}`);
    }
  }

  /** Resolve which deck room should receive a given bus event. */
  private async resolveDeckIdForEvent(evt: ReviewEvent): Promise<string | null> {
    // Review events already carry deckId.
    if ('deckId' in evt && evt.deckId) return evt.deckId;
    // Comment events carry projectId — walk to a deck via the first slide.
    if ('projectId' in evt && evt.projectId) {
      const deck = await this.prisma.deck.findFirst({
        where: { projectId: evt.projectId }, select: { id: true },
      });
      return deck?.id || null;
    }
    if ('deckId' in (evt as any) && (evt as any).deckId) return (evt as any).deckId;
    return null;
  }

  // ---------------------------------------------------------------------------
  //  Phase 34.3G — Observability accessor (used by /collaboration/metrics)
  // ---------------------------------------------------------------------------

  presenceStats(): { rooms: number; users: number; connectedSockets: number } {
    return this.store.stats();
  }

  /** Phase 34.4D — cumulative event counters for Prometheus exporter. */
  eventCounters(): { cursorEvents: number; yjsUpdates: number; editingEvents: number } {
    return {
      cursorEvents:  this.cursorEvents,
      yjsUpdates:    this.yjsUpdates,
      editingEvents: this.editingEvents,
    };
  }

  // ---------------------------------------------------------------------------
  //  Access resolution
  // ---------------------------------------------------------------------------

  /**
   * Returns { user, role } if the caller can access this deck (via workspace
   * membership) or null otherwise. Mirrors the WorkspaceRoleGuard logic but
   * runs at socket-connect time so unauthorized joiners never see the room.
   */
  private async resolveAccess(deckId: string, userId: string): Promise<{
    user: { name: string | null; email: string }; role: string;
  } | null> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        project: { select: { userId: true, workspaceId: true, sharingMode: true } },
      },
    });
    if (!deck?.project) return null;
    const user = await this.prisma.user.findUnique({
      where: { id: userId }, select: { name: true, email: true },
    });
    if (!user) return null;

    // Owner always passes.
    if (deck.project.userId === userId) return { user, role: 'owner' };

    if (deck.project.sharingMode === 'private') return null;
    if (!deck.project.workspaceId) return null;

    const member = await this.prisma.workspaceMember.findUnique({
      where:  { workspaceId_userId: { workspaceId: deck.project.workspaceId, userId } },
      select: { role: true },
    });
    if (!member) return null;
    return { user, role: member.role };
  }
}
