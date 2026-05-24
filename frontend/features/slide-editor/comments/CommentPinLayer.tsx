'use client';

import React from 'react';
import type { CommentDTO } from './useSlideComments';

// =============================================================================
//  Phase 36D — Canvas comment pins
//
//  Renders numbered pins for slide-level comments (those with anchorX/Y set
//  and slideElementId null). Element-level comments are already represented
//  by ElementCommentBadge on the element's top-right corner.
//
//  Positioned absolutely inside the same stage region as ElementCommentBadge,
//  so they share the 0..100% coordinate system.
//
//  Pin color:
//    OPEN     → amber  (matches element badge)
//    RESOLVED → slate  (hidden by default; toggled via `showResolved`)
//
//  Pins are numbered 1..N in created-at order so they line up with the
//  Comments panel list.
// =============================================================================

interface Props {
  comments:     CommentDTO[];
  showResolved?: boolean;
  onOpenThread: (commentId: string) => void;
}

export const CommentPinLayer: React.FC<Props> = ({
  comments, showResolved = false, onOpenThread,
}) => {
  // Only slide-level pins (with anchor); element-level handled elsewhere.
  const all = comments.filter((c) =>
    c.slideElementId == null &&
    typeof c.anchorX === 'number' &&
    typeof c.anchorY === 'number',
  );

  const visible = showResolved ? all : all.filter((c) => !c.resolved);
  if (visible.length === 0) return null;

  // Sort by createdAt asc so the number matches the order in the panel.
  const sorted = [...visible].sort((a, b) =>
    new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <>
      {sorted.map((c, idx) => {
        const resolved = c.resolved;
        const replyCount = c.replies?.length ?? 0;
        const label = resolved
          ? `Resolved: ${c.content.slice(0, 80)}`
          : `${c.user?.name || c.user?.email || 'Comment'} — ${c.content.slice(0, 80)}${
              replyCount > 0 ? ` (+${replyCount} repl${replyCount === 1 ? 'y' : 'ies'})` : ''
            }`;
        return (
          <button
            key={c.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenThread(c.id); }}
            title={label}
            aria-label={label}
            className={`absolute z-[60] flex items-center justify-center w-6 h-6 rounded-full text-[11px] font-bold text-white ring-2 ring-white shadow-lg pointer-events-auto transition-transform hover:scale-110 ${
              resolved
                ? 'bg-slate-400 shadow-slate-400/40 opacity-70'
                : 'bg-amber-500 shadow-amber-500/50 hover:bg-amber-600'
            }`}
            style={{
              // anchorX/Y are already in 0..100% of stage; offset by half-pin.
              left:      `calc(${c.anchorX}% - 12px)`,
              top:       `calc(${c.anchorY}% - 12px)`,
              transform: 'translateZ(0)',
            }}
          >
            {idx + 1}
          </button>
        );
      })}
    </>
  );
};
