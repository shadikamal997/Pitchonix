// =============================================================================
//  Phase 34 — Collaboration types (frontend)
// =============================================================================

export interface EditingFocus {
  slideId:   string;
  elementId: string;
  field?:    string;
  startedAt: number;
}

export interface PresenceUser {
  userId:    string;
  name:      string;
  email:     string;
  color:     string;
  role:      string | null;
  slideId:   string | null;
  cursor:    { x: number; y: number } | null;
  selection: string[];
  editing:   EditingFocus | null;
  lastSeen:  number;
}

export interface RemoteEditing {
  userId:    string;
  slideId:   string;
  elementId: string;
  field?:    string;
  user?:     PresenceUser;
}

export type ConnectionState =
  | 'idle'
  | 'connecting'
  | 'connected'
  | 'reconnecting'
  | 'disconnected'
  | 'forbidden';

export interface RemoteCursor {
  userId:  string;
  slideId: string;
  x:       number;
  y:       number;
  user?:   PresenceUser;     // resolved at render time
}

export interface RemoteSelection {
  userId:     string;
  slideId:    string;
  elementIds: string[];
  user?:      PresenceUser;  // resolved at render time
}
