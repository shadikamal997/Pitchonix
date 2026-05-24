'use client';

import { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { Awareness } from 'y-protocols/awareness';
import { createCollaborationSocket } from './socket-client';
import type { Socket } from 'socket.io-client';

// =============================================================================
//  Phase 34.1E — useYDoc
//
//  Per-docId Y.Doc client. Connects to the collaboration namespace, joins
//  the `ydoc:{docId}` room, and bidirectionally syncs Yjs updates + awareness
//  with every other peer in the room. The server is a pure relay; no Y.Doc
//  state is hosted server-side in this pass.
//
//  Suitable docIds:
//    - `text:{elementId}`   for an element's text content
//    - `slide:{slideId}`    for slide-level multi-element coordination
//
//  Wiring TipTap / ProseMirror to use this Y.Doc as its content source is
//  the next step (y-prosemirror binding) and intentionally NOT in this hook
//  so existing inline editors keep working.
// =============================================================================

interface UseYDocResult {
  doc:        Y.Doc;
  awareness:  Awareness;
  connected:  boolean;
}

export function useYDoc(docId: string | null | undefined): UseYDocResult | null {
  const docRef       = useRef<Y.Doc | null>(null);
  const awarenessRef = useRef<Awareness | null>(null);
  const socketRef    = useRef<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  if (!docRef.current) docRef.current = new Y.Doc();
  if (!awarenessRef.current && docRef.current) awarenessRef.current = new Awareness(docRef.current);

  useEffect(() => {
    if (!docId) { setConnected(false); return; }
    const doc = docRef.current!;
    const awareness = awarenessRef.current!;

    const sock = createCollaborationSocket();
    if (!sock) return;
    socketRef.current = sock;

    const handleConnect = () => {
      setConnected(true);
      sock.emit('yjs.join', { docId });
      // Broadcast our full doc state so newcomers can fast-forward.
      const update = Y.encodeStateAsUpdate(doc);
      sock.emit('yjs.update', { docId, update: Array.from(update) });
    };

    const handleRemoteUpdate = (msg: { docId: string; update: number[] }) => {
      if (msg.docId !== docId) return;
      try {
        Y.applyUpdate(doc, Uint8Array.from(msg.update), 'remote');
      } catch { /* malformed remote update; ignore */ }
    };

    const handlePeerJoined = (msg: { docId: string }) => {
      if (msg.docId !== docId) return;
      // Echo our state so the newcomer fast-forwards immediately.
      const update = Y.encodeStateAsUpdate(doc);
      sock.emit('yjs.update', { docId, update: Array.from(update) });
    };

    const handleRemoteAwareness = (msg: { docId: string; update: number[] }) => {
      if (msg.docId !== docId) return;
      try {
        // y-protocols awareness is a separate update channel; we forward
        // raw bytes and apply via the Awareness instance.
        const { applyAwarenessUpdate } = require('y-protocols/awareness');
        applyAwarenessUpdate(awareness, Uint8Array.from(msg.update), 'remote');
      } catch { /* awareness apply failure is non-fatal */ }
    };

    const handleDisconnect = () => setConnected(false);

    sock.on('connect',        handleConnect);
    sock.on('disconnect',     handleDisconnect);
    sock.on('yjs.update',     handleRemoteUpdate);
    sock.on('yjs.peer_joined', handlePeerJoined);
    sock.on('yjs.awareness',  handleRemoteAwareness);

    // Local Y.Doc updates → broadcast (skip echoes triggered by remote applies)
    const localUpdateHandler = (update: Uint8Array, origin: any) => {
      if (origin === 'remote') return;
      if (sock.connected) {
        sock.emit('yjs.update', { docId, update: Array.from(update) });
      }
    };
    doc.on('update', localUpdateHandler);

    // Local awareness → broadcast
    const awarenessChangeHandler = ({ added, updated, removed }: { added: number[]; updated: number[]; removed: number[] }) => {
      try {
        const { encodeAwarenessUpdate } = require('y-protocols/awareness');
        const update = encodeAwarenessUpdate(awareness, [...added, ...updated, ...removed]);
        if (sock.connected) sock.emit('yjs.awareness', { docId, update: Array.from(update) });
      } catch { /* awareness encode failure non-fatal */ }
    };
    awareness.on('update', awarenessChangeHandler);

    return () => {
      try { sock.emit('yjs.leave', { docId }); } catch { /* ignore */ }
      doc.off('update', localUpdateHandler);
      awareness.off('update', awarenessChangeHandler);
      sock.removeAllListeners();
      sock.disconnect();
      socketRef.current = null;
      setConnected(false);
    };
  }, [docId]);

  // Clean up the doc/awareness on unmount.
  useEffect(() => {
    return () => {
      try { awarenessRef.current?.destroy(); } catch { /* ignore */ }
      try { docRef.current?.destroy(); } catch { /* ignore */ }
    };
  }, []);

  if (!docId) return null;
  return {
    doc:       docRef.current!,
    awareness: awarenessRef.current!,
    connected,
  };
}
