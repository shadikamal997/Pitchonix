'use client';

import React from 'react';
import { Users, X, Wifi, WifiOff, ShieldOff, Loader2, MousePointer2 } from 'lucide-react';
import type { PresenceUser, ConnectionState, RemoteSelection } from './types';
import { relativeTime } from '../slide-editor/comments/relative-time';

// =============================================================================
//  Phase 34W — CollaborationPanel
//
//  Right-rail drawer that consolidates everything the editor knows about
//  the current real-time session: who's connected, which slide each user is
//  viewing, who has something selected, and the socket health.
// =============================================================================

interface Props {
  users:           PresenceUser[];        // remote
  you:             PresenceUser | null;
  selections:      RemoteSelection[];
  state:           ConnectionState;
  slideTitleById?: Record<string, string>;
  onClose:         () => void;
}

export const CollaborationPanel: React.FC<Props> = ({
  users, you, selections, state, slideTitleById, onClose,
}) => {
  const all = you ? [you, ...users] : users;
  const selectionByUser = new Map(selections.map((s) => [s.userId, s]));

  return (
    <aside className="w-[300px] flex-shrink-0 border-l border-slate-200 bg-white flex flex-col h-full overflow-hidden">
      <header className="h-11 flex items-center px-3 gap-2 border-b border-slate-200 flex-shrink-0">
        <Users className="w-4 h-4 text-blue-600" />
        <div className="flex-1 min-w-0">
          <div className="text-xs font-bold text-slate-900 truncate">Collaboration</div>
          <div className="text-[10px] text-slate-500">{all.length} active</div>
        </div>
        <ConnectionPill state={state} />
        <button onClick={onClose} className="p-1 rounded text-slate-500 hover:bg-slate-100" aria-label="Close">
          <X className="w-4 h-4" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {all.length === 0 ? (
          <div className="text-center pt-8">
            <Users className="w-7 h-7 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">You're the only one here.</p>
          </div>
        ) : (
          all.map((u) => {
            const sel = selectionByUser.get(u.userId);
            const slideLabel = u.slideId && slideTitleById?.[u.slideId];
            return (
              <article key={u.userId} className="rounded-lg border border-slate-200 bg-white p-2.5 flex items-start gap-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold flex-shrink-0 ring-2 ring-white"
                  style={{ background: u.color }}
                >
                  {(u.name || u.email || '?').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-slate-900 truncate flex items-center gap-1.5">
                    {u.name || u.email}
                    {you?.userId === u.userId && <span className="text-[9px] uppercase text-green-700">you</span>}
                  </div>
                  <div className="text-[10px] text-slate-500 truncate">
                    {u.role && <span className="font-mono uppercase">{u.role}</span>}
                    {slideLabel && <> · {slideLabel}</>}
                    {!slideLabel && u.slideId && <> · slide</>}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Active {relativeTime(new Date(u.lastSeen).toISOString())}
                  </div>
                  {sel && sel.elementIds.length > 0 && (
                    <div
                      className="mt-1 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold text-white"
                      style={{ background: u.color }}
                    >
                      <MousePointer2 className="w-2.5 h-2.5" />
                      Selecting {sel.elementIds.length} element{sel.elementIds.length === 1 ? '' : 's'}
                    </div>
                  )}
                </div>
              </article>
            );
          })
        )}
      </div>
    </aside>
  );
};

const ConnectionPill: React.FC<{ state: ConnectionState }> = ({ state }) => {
  if (state === 'forbidden') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 text-[9px] font-semibold uppercase">
        <ShieldOff className="w-2.5 h-2.5" /> Forbidden
      </span>
    );
  }
  if (state === 'connected') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-green-50 text-green-700 text-[9px] font-semibold uppercase">
        <Wifi className="w-2.5 h-2.5" /> Live
      </span>
    );
  }
  if (state === 'connecting' || state === 'reconnecting') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 text-[9px] font-semibold uppercase">
        <Loader2 className="w-2.5 h-2.5 animate-spin" />
        {state === 'connecting' ? 'Connecting' : 'Reconnecting'}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-slate-50 text-slate-700 text-[9px] font-semibold uppercase">
      <WifiOff className="w-2.5 h-2.5" /> Offline
    </span>
  );
};
