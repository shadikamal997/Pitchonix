'use client';

import { io, Socket } from 'socket.io-client';

// =============================================================================
//  Phase 34 — socket-client
//
//  Thin factory around socket.io-client that points at the collaboration
//  namespace on the backend. The JWT is pulled from localStorage at connect
//  time (same place axios reads it from).
//
//  We use the same base host as the REST API — strip the trailing /api so
//  the websocket lands on the bare server.
// =============================================================================

function resolveServerUrl(): string {
  // Mirror lib/api.ts. NEXT_PUBLIC_API_URL ends with `/api`; strip it.
  const raw = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';
  return raw.replace(/\/api\/?$/, '');
}

export function createCollaborationSocket(): Socket | null {
  if (typeof window === 'undefined') return null;        // SSR
  const token = window.localStorage.getItem('token');
  if (!token) return null;

  const url = `${resolveServerUrl()}/collaboration`;
  return io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5000,
  });
}
