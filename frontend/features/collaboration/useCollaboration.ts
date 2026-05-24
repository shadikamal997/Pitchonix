'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Socket } from 'socket.io-client';
import { createCollaborationSocket } from './socket-client';
import type {
  PresenceUser, ConnectionState, RemoteCursor, RemoteSelection, RemoteEditing,
} from './types';

// =============================================================================
//  Phase 34 — useCollaboration
//
//  Owns the lifecycle of one collaboration socket connection scoped to a
//  single deck. Joins the deck room, tracks presence / cursors / selections,
//  surfaces a connectionState string, and exposes:
//
//    sendCursor(slideId, x, y)            — throttled at the call site
//    sendSelection(slideId, elementIds)
//    sendSlideView(slideId)               — broadcasts "I'm on slide X"
//    onElement(handler)                   — subscribe to element.* events
//    onSlide(handler)                     — subscribe to slide.* events
//    onReviewBus(type, handler)           — subscribe to comment/review/version events
//
//  The host (SlideEditor) is responsible for choosing what to do with each
//  remote event — applying patches, refreshing lists, etc.
// =============================================================================

interface UseCollaborationResult {
  state:        ConnectionState;
  /** Map of userId → PresenceUser. Excludes the current user. */
  users:        Record<string, PresenceUser>;
  /** Includes the current user as the `you` entry (or null until presence.you). */
  you:          PresenceUser | null;
  cursors:      RemoteCursor[];        // one per active remote user
  selections:   RemoteSelection[];     // one per active remote user
  /** Phase 34.1C — who is currently editing which element. */
  editing:      RemoteEditing[];

  sendCursor:     (slideId: string, x: number, y: number) => void;
  sendSelection:  (slideId: string, elementIds: string[]) => void;
  sendSlideView:  (slideId: string) => void;
  /** Phase 34.1C — start/stop editing an element. Stop is auto-fired on
   *  inactivity timeout if the caller forgets. */
  sendEditingStart: (slideId: string, elementId: string, field?: string) => void;
  sendEditingStop:  (slideId: string, elementId: string) => void;

  /** Subscribe to element.* events (element.created / .updated / .deleted). */
  onElement:      (handler: (event: string, payload: any) => void) => () => void;
  /** Subscribe to slide.* events. */
  onSlide:        (handler: (event: string, payload: any) => void) => () => void;
  /** Subscribe to version.* events (version.snapshot_created / .restored / .deleted / .renamed). */
  onVersion:      (handler: (event: string, payload: any) => void) => () => void;
  /** Subscribe to specific bus event (comment / review / version). */
  onBusEvent:     (type: string, handler: (payload: any) => void) => () => void;
}

const ELEMENT_EVENTS = ['element.created', 'element.updated', 'element.deleted'] as const;
const SLIDE_EVENTS   = ['slide.created',   'slide.updated',   'slide.deleted', 'slide.reordered'] as const;
const VERSION_EVENTS = [
  'version.snapshot_created', 'version.restored', 'version.deleted', 'version.renamed',
] as const;

// Phase 34.1C — auto-clear remote editing markers after this much idle time
// (covers the case where the editor closes their tab without firing stop).
const EDITING_TIMEOUT_MS = 30_000;
const EDITING_INACTIVITY_MS = 8_000;   // local auto-stop after typing pause

export function useCollaboration(deckId: string | null | undefined, slideId: string | null | undefined): UseCollaborationResult {
  const socketRef = useRef<Socket | null>(null);
  const [state,    setState]    = useState<ConnectionState>('idle');
  const [users,    setUsers]    = useState<Record<string, PresenceUser>>({});
  const [you,      setYou]      = useState<PresenceUser | null>(null);
  const [cursors,  setCursors]  = useState<Record<string, RemoteCursor>>({});
  const [selects,  setSelects]  = useState<Record<string, RemoteSelection>>({});
  // Phase 34.1C — remote editing tracker. Keyed by `${userId}:${elementId}`
  // so a single user editing two fields shows up twice (rare but possible).
  const [editingMap, setEditingMap] = useState<Record<string, RemoteEditing & { receivedAt: number }>>({});

  // Phase 34.1G — buffer cursor / selection / editing events while the socket
  // is unhealthy. We keep at most LATEST per kind (cursor/selection echo the
  // most recent state anyway). Replays on reconnect.
  const pendingRef = useRef<{ cursor?: any; selection?: any; editing?: any[] }>({});

  // Phase 34.1I — rAF batching for cursor emits. We hold the most recent
  // coords and flush at most once per animation frame.
  const cursorRafRef = useRef<number | null>(null);
  const cursorBufRef = useRef<{ slideId: string; x: number; y: number } | null>(null);

  // Subscriber lists for host wiring.
  const elementHandlers = useRef(new Set<(event: string, payload: any) => void>());
  const slideHandlers   = useRef(new Set<(event: string, payload: any) => void>());
  const versionHandlers = useRef(new Set<(event: string, payload: any) => void>());
  const busHandlers     = useRef(new Map<string, Set<(payload: any) => void>>());

  // ---------------------------------------------------------------------------
  //  Lifecycle: connect / join room
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (!deckId) { setState('idle'); return; }

    setState('connecting');
    const sock = createCollaborationSocket();
    if (!sock) { setState('disconnected'); return; }
    socketRef.current = sock;

    const handleConnect = () => {
      setState('connected');
      sock.emit('presence.join', { deckId, slideId: slideId || undefined });
      // Phase 34.1G — replay any cursor / selection / editing events that
      // accrued while we were disconnected. We only keep the latest of each
      // kind (older states are stale).
      const queued = pendingRef.current;
      if (queued.cursor)    sock.emit('cursor.move',      queued.cursor);
      if (queued.selection) sock.emit('selection.change', queued.selection);
      if (queued.editing)   for (const e of queued.editing) sock.emit('editing.started', e);
      pendingRef.current = {};
    };
    const handleReconnectAttempt = () => setState('reconnecting');
    const handleDisconnect       = () => setState('reconnecting');
    const handleConnectError     = (err: any) => {
      // Auth + access errors come through here as `xhr poll error` etc.
      setState(err?.message?.includes('forbidden') ? 'forbidden' : 'disconnected');
    };

    sock.on('connect',          handleConnect);
    sock.io.on('reconnect_attempt', handleReconnectAttempt);
    sock.on('disconnect',       handleDisconnect);
    sock.on('connect_error',    handleConnectError);

    // Presence
    sock.on('presence.you', (msg: { you: PresenceUser }) => setYou(msg.you));
    sock.on('presence.updated', (msg: { deckId: string; users: PresenceUser[] }) => {
      if (msg.deckId !== deckId) return;
      const next: Record<string, PresenceUser> = {};
      for (const u of msg.users) next[u.userId] = u;
      setUsers(next);
    });

    // Forbidden hint from the gateway (clear emit before disconnect)
    sock.on('error', (err: any) => {
      if (err?.code === 'forbidden') setState('forbidden');
    });

    // Cursors / selections
    sock.on('cursor.move', (msg: RemoteCursor) => {
      setCursors((prev) => ({ ...prev, [msg.userId]: msg }));
    });
    sock.on('selection.change', (msg: RemoteSelection) => {
      setSelects((prev) => ({ ...prev, [msg.userId]: msg }));
    });

    // Phase 34.1C — editing.* tracker
    sock.on('editing.started', (msg: RemoteEditing) => {
      const key = `${msg.userId}:${msg.elementId}`;
      setEditingMap((prev) => ({ ...prev, [key]: { ...msg, receivedAt: Date.now() } }));
    });
    sock.on('editing.stopped', (msg: { userId: string; elementId: string }) => {
      const key = `${msg.userId}:${msg.elementId}`;
      setEditingMap((prev) => {
        const next = { ...prev }; delete next[key]; return next;
      });
    });

    // Element / slide forwards
    for (const evt of ELEMENT_EVENTS) {
      sock.on(evt, (payload: any) => {
        for (const h of elementHandlers.current) h(evt, payload);
      });
    }
    for (const evt of SLIDE_EVENTS) {
      sock.on(evt, (payload: any) => {
        for (const h of slideHandlers.current) h(evt, payload);
      });
    }
    for (const evt of VERSION_EVENTS) {
      sock.on(evt, (payload: any) => {
        for (const h of versionHandlers.current) h(evt, payload);
      });
    }

    // ReviewEventBus forwards — type union mirrors backend/src/reviews/review-event-bus.ts
    const busTypes = [
      'comment.created', 'comment.resolved', 'comment.reopened', 'comment.assigned',
      'comments.resolved_all',
      'review.requested', 'review.started', 'review.approved',
      'review.changes_requested', 'review.withdrawn', 'review.reopened',
    ];
    for (const t of busTypes) {
      sock.on(t, (payload: any) => {
        const handlers = busHandlers.current.get(t);
        if (handlers) for (const h of handlers) h(payload);
      });
    }

    return () => {
      try { sock.emit('presence.leave'); } catch { /* ignore */ }
      sock.removeAllListeners();
      sock.disconnect();
      socketRef.current = null;
      setUsers({});
      setYou(null);
      setCursors({});
      setSelects({});
      setState('disconnected');
    };
    // slideId intentionally NOT in deps — sending slide view changes is done
    // imperatively via sendSlideView, so we don't tear down the socket on nav.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deckId]);

  // ---------------------------------------------------------------------------
  //  Emitters
  // ---------------------------------------------------------------------------

  const sendCursor = useCallback((sId: string, x: number, y: number) => {
    cursorBufRef.current = { slideId: sId, x, y };
    // Phase 34.1I — coalesce multiple sendCursor calls per animation frame
    // into one emit. The host's CollaborationCursorEmitter already throttles
    // at ~60fps, but this gives us an additional rAF-aligned batch boundary.
    if (cursorRafRef.current != null) return;
    cursorRafRef.current = requestAnimationFrame(() => {
      cursorRafRef.current = null;
      const buf = cursorBufRef.current;
      cursorBufRef.current = null;
      if (!buf) return;
      const sock = socketRef.current;
      if (!sock || !sock.connected) {
        // Phase 34.1G — queue latest only; older positions are stale.
        pendingRef.current.cursor = buf;
        return;
      }
      sock.emit('cursor.move', buf);
    });
  }, []);

  const sendSelection = useCallback((sId: string, elementIds: string[]) => {
    const sock = socketRef.current;
    const payload = { slideId: sId, elementIds };
    if (!sock || !sock.connected) {
      pendingRef.current.selection = payload;   // latest-only
      return;
    }
    sock.emit('selection.change', payload);
  }, []);

  const sendSlideView = useCallback((sId: string) => {
    socketRef.current?.emit('presence.slide', { slideId: sId });
  }, []);

  // Phase 34.1C — editing-start / editing-stop emitters.
  const sendEditingStart = useCallback((sId: string, elementId: string, field?: string) => {
    const sock = socketRef.current;
    const payload = { slideId: sId, elementId, field };
    if (!sock || !sock.connected) {
      pendingRef.current.editing = [...(pendingRef.current.editing || []), payload];
      return;
    }
    sock.emit('editing.started', payload);
  }, []);
  const sendEditingStop = useCallback((sId: string, elementId: string) => {
    socketRef.current?.emit('editing.stopped', { slideId: sId, elementId });
  }, []);

  // ---------------------------------------------------------------------------
  //  Subscriptions
  // ---------------------------------------------------------------------------

  const onElement = useCallback((h: (event: string, payload: any) => void) => {
    elementHandlers.current.add(h);
    return () => { elementHandlers.current.delete(h); };
  }, []);

  const onSlide = useCallback((h: (event: string, payload: any) => void) => {
    slideHandlers.current.add(h);
    return () => { slideHandlers.current.delete(h); };
  }, []);

  const onVersion = useCallback((h: (event: string, payload: any) => void) => {
    versionHandlers.current.add(h);
    return () => { versionHandlers.current.delete(h); };
  }, []);

  const onBusEvent = useCallback((type: string, h: (payload: any) => void) => {
    let set = busHandlers.current.get(type);
    if (!set) { set = new Set(); busHandlers.current.set(type, set); }
    set.add(h);
    return () => { set!.delete(h); };
  }, []);

  // Derived: cursors/selections/editing list, filtered to remote users only.
  const myId = you?.userId;
  const cursorList = useMemo(() => {
    return Object.values(cursors)
      .filter((c) => c.userId !== myId)
      .map((c) => ({ ...c, user: users[c.userId] }));
  }, [cursors, users, myId]);
  const selectionList = useMemo(() => {
    return Object.values(selects)
      .filter((s) => s.userId !== myId)
      .map((s) => ({ ...s, user: users[s.userId] }));
  }, [selects, users, myId]);

  // Phase 34.1C — drop editing markers older than EDITING_TIMEOUT_MS so a
  // dropped client doesn't leave a permanent "John is editing" ghost.
  useEffect(() => {
    const tick = window.setInterval(() => {
      const cutoff = Date.now() - EDITING_TIMEOUT_MS;
      setEditingMap((prev) => {
        let mutated = false;
        const next: typeof prev = {};
        for (const [k, v] of Object.entries(prev)) {
          if (v.receivedAt < cutoff) { mutated = true; continue; }
          next[k] = v;
        }
        return mutated ? next : prev;
      });
    }, 5_000);
    return () => window.clearInterval(tick);
  }, []);

  const editingList = useMemo(() => {
    return Object.values(editingMap)
      .filter((e) => e.userId !== myId)
      .map((e) => ({ ...e, user: users[e.userId] }));
  }, [editingMap, users, myId]);

  // Remote users excluding me
  const remoteUsers = useMemo(() => {
    if (!myId) return users;
    const out: Record<string, PresenceUser> = {};
    for (const [k, v] of Object.entries(users)) if (k !== myId) out[k] = v;
    return out;
  }, [users, myId]);

  return {
    state,
    users:      remoteUsers,
    you,
    cursors:    cursorList,
    selections: selectionList,
    editing:    editingList,
    sendCursor,
    sendSelection,
    sendSlideView,
    sendEditingStart,
    sendEditingStop,
    onElement,
    onSlide,
    onVersion,
    onBusEvent,
  };
}
