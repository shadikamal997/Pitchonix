'use client';

import React from 'react';
import { MousePointer2 } from 'lucide-react';
import type { RemoteCursor } from './types';

// =============================================================================
//  Phase 34D — CursorOverlay
//
//  Renders other users' cursors on the slide stage. Coordinates are 0..100%
//  of the stage (sender already normalised them); mount this as a sibling
//  of SlideCanvas inside the same absolute-positioned wrapper so coords
//  match 1:1.
//
//  Only shows cursors for the active slide — viewers on other slides are
//  surfaced in PresenceAvatars instead.
// =============================================================================

interface Props {
  cursors:  RemoteCursor[];
  slideId:  string;
}

export const CursorOverlay: React.FC<Props> = ({ cursors, slideId }) => {
  const onThisSlide = cursors.filter((c) => c.slideId === slideId && c.user);
  if (onThisSlide.length === 0) return null;
  return (
    <>
      {onThisSlide.map((c) => {
        const color = c.user?.color || '#7C3AED';
        return (
          <div
            key={c.userId}
            className="absolute z-[90] pointer-events-none transition-transform duration-75 ease-out"
            style={{
              left: `${c.x}%`,
              top:  `${c.y}%`,
              transform: 'translate(-2px, -2px)',
            }}
          >
            <MousePointer2 className="w-3.5 h-3.5" style={{ color, fill: color, strokeWidth: 1.5 }} />
            <div
              className="ml-3 -mt-1 inline-block px-1.5 py-0.5 rounded text-white text-[10px] font-semibold whitespace-nowrap shadow"
              style={{ background: color }}
            >
              {c.user?.name || 'Someone'}
            </div>
          </div>
        );
      })}
    </>
  );
};
