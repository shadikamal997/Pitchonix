'use client';

import React from 'react';
import type { SlideElementDTO } from '@/types/slide-element';
import type { RemoteSelection } from './types';

// =============================================================================
//  Phase 34E — SelectionOverlay
//
//  Draws a colored outline around each element that another collaborator
//  currently has selected. Element coordinates (x/y/width/height) are in
//  0..100% of stage, matching the cursor overlay coordinate system.
//
//  Each user's outline uses their stable presence color so it's instantly
//  recognisable alongside their cursor + avatar.
// =============================================================================

interface Props {
  selections: RemoteSelection[];
  slideId:    string;
  elements:   SlideElementDTO[];
}

export const SelectionOverlay: React.FC<Props> = ({ selections, slideId, elements }) => {
  const onSlide = selections.filter((s) => s.slideId === slideId && s.user);
  if (onSlide.length === 0) return null;
  const elementById = new Map(elements.map((e) => [e.id, e]));
  return (
    <>
      {onSlide.flatMap((sel) => {
        const color = sel.user?.color || '#7C3AED';
        return sel.elementIds.map((id) => {
          const el = elementById.get(id);
          if (!el) return null;
          const label = sel.user?.name || 'Someone';
          return (
            <div
              key={`${sel.userId}:${id}`}
              className="absolute z-[80] pointer-events-none rounded-sm"
              style={{
                left:   `${el.x}%`,
                top:    `${el.y}%`,
                width:  `${el.width}%`,
                height: `${el.height}%`,
                border: `2px solid ${color}`,
                boxShadow: `0 0 0 1px ${color}33`,
              }}
            >
              <span
                className="absolute -top-4 left-0 px-1 py-px rounded text-white text-[9px] font-semibold whitespace-nowrap shadow"
                style={{ background: color }}
              >
                {label}
              </span>
            </div>
          );
        });
      })}
    </>
  );
};
