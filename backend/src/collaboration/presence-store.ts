// =============================================================================
//  Phase 34B/K — Presence store
//
//  Pure in-memory map of "who is connected to which deck". A process restart
//  drops state, which is correct — clients reconnect and re-emit join.
//
//  Color assignment is deterministic per userId (stable hash → palette
//  index) so the same user always gets the same color, and the same color
//  shows on cursor + selection outline + avatar ring.
// =============================================================================

export interface EditingFocus {
  slideId:   string;
  elementId: string;
  field?:    string;        // 'title' | 'subtitle' | 'content' | etc.
  startedAt: number;
}

export interface PresenceUser {
  userId:    string;
  name:      string;
  email:     string;
  color:     string;
  role:      string | null;             // workspace role at join time
  slideId:   string | null;             // currently-viewed slide
  cursor:    { x: number; y: number } | null;
  selection: string[];                  // elementIds
  editing:   EditingFocus | null;       // Phase 34.1C — "John is editing X"
  lastSeen:  number;                    // epoch ms
}

export interface RoomEntry {
  socketId:  string;
  user:      PresenceUser;
}

const COLORS = [
  '#2563EB', // blue
  '#16A34A', // green
  '#7C3AED', // purple
  '#EA580C', // orange
  '#DB2777', // pink
  '#0891B2', // cyan
  '#CA8A04', // amber
  '#9333EA', // violet
];

export function pickColor(userId: string): string {
  // Simple deterministic hash → palette. Doesn't need crypto strength.
  let hash = 0;
  for (let i = 0; i < userId.length; i++) hash = (hash * 31 + userId.charCodeAt(i)) | 0;
  return COLORS[Math.abs(hash) % COLORS.length];
}

export class PresenceStore {
  // deckId → socketId → entry
  private rooms = new Map<string, Map<string, RoomEntry>>();
  // socketId → { deckId, userId }
  private sockets = new Map<string, { deckId: string; userId: string }>();

  /** Returns the room snapshot for broadcast. */
  join(deckId: string, socketId: string, user: PresenceUser): PresenceUser[] {
    let room = this.rooms.get(deckId);
    if (!room) { room = new Map(); this.rooms.set(deckId, room); }
    room.set(socketId, { socketId, user });
    this.sockets.set(socketId, { deckId, userId: user.userId });
    return this.snapshot(deckId);
  }

  /** Returns the deckId so the gateway knows which room to re-broadcast. */
  leave(socketId: string): { deckId: string; users: PresenceUser[] } | null {
    const entry = this.sockets.get(socketId);
    if (!entry) return null;
    const room = this.rooms.get(entry.deckId);
    if (room) {
      room.delete(socketId);
      if (room.size === 0) this.rooms.delete(entry.deckId);
    }
    this.sockets.delete(socketId);
    return { deckId: entry.deckId, users: this.snapshot(entry.deckId) };
  }

  /** Update slide / cursor / selection / lastSeen for a connected socket. */
  patch(socketId: string, patch: Partial<Omit<PresenceUser, 'userId' | 'name' | 'email' | 'color' | 'role'>>): PresenceUser[] | null {
    const entry = this.sockets.get(socketId);
    if (!entry) return null;
    const room = this.rooms.get(entry.deckId);
    if (!room) return null;
    const slot = room.get(socketId);
    if (!slot) return null;
    slot.user = { ...slot.user, ...patch, lastSeen: Date.now() };
    return this.snapshot(entry.deckId);
  }

  snapshot(deckId: string): PresenceUser[] {
    const room = this.rooms.get(deckId);
    if (!room) return [];
    // De-duplicate by userId — if the same user has multiple tabs open, we
    // only show the most-recently-seen entry. Latest lastSeen wins.
    const byUser = new Map<string, PresenceUser>();
    for (const { user } of room.values()) {
      const existing = byUser.get(user.userId);
      if (!existing || existing.lastSeen < user.lastSeen) byUser.set(user.userId, user);
    }
    return Array.from(byUser.values());
  }

  deckOfSocket(socketId: string): string | null {
    return this.sockets.get(socketId)?.deckId ?? null;
  }

  /** Phase 34.3G — observability snapshot. */
  stats(): { rooms: number; users: number; connectedSockets: number } {
    const uniqueUsers = new Set<string>();
    for (const entry of this.sockets.values()) uniqueUsers.add(entry.userId);
    return {
      rooms: this.rooms.size,
      users: uniqueUsers.size,
      connectedSockets: this.sockets.size,
    };
  }
}
