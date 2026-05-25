'use client';

import React from 'react';
import type { PresenceUser } from './types';

// =============================================================================
//  Phase 34C — PresenceAvatars
//
//  Stacked avatars for active collaborators. Shows up to MAX visible; if
//  more are connected, displays a `+N` overflow chip. Tooltip on each
//  carries name + role + current slide.
// =============================================================================

interface Props {
  users:        PresenceUser[];     // remote users only
  you?:         PresenceUser | null;
  slideTitleById?: Record<string, string>;
  max?:         number;
}

const MAX = 5;

export const PresenceAvatars: React.FC<Props> = ({ users, you, slideTitleById, max = MAX }) => {
  const all = you ? [you, ...users] : users;
  if (all.length === 0) return null;
  const visible = all.slice(0, max);
  const overflow = Math.max(0, all.length - visible.length);

  return (
    <div className="flex items-center -space-x-2">
      {visible.map((u) => {
        const slideLabel = u.slideId && slideTitleById?.[u.slideId];
        const tip = `${u.name}${u.role ? ` · ${u.role}` : ''}${slideLabel ? ` · ${slideLabel}` : ''}`;
        return (
          <div
            key={u.userId}
            title={tip}
            aria-label={tip}
            className="relative w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold ring-2 ring-white shadow-sm"
            style={{ background: u.color }}
          >
            {(u.name || u.email || '?').charAt(0).toUpperCase()}
            {you?.userId === u.userId && (
              <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#4F7563] ring-1 ring-white" />
            )}
          </div>
        );
      })}
      {overflow > 0 && (
        <div
          className="w-7 h-7 rounded-full bg-[#E3E1DA] text-[#111111] text-[10px] font-bold flex items-center justify-center ring-2 ring-white"
          title={`${overflow} more collaborator${overflow === 1 ? '' : 's'}`}
        >
          +{overflow}
        </div>
      )}
    </div>
  );
};
