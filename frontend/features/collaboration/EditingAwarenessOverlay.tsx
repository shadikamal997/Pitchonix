'use client';

import React from 'react';
import { Pencil } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';
import type { RemoteEditing } from './types';

// =============================================================================
//  Phase 34.1C/H — EditingAwarenessOverlay
//
//  Renders a small "John is editing" pill anchored to the top-left of any
//  element that a remote collaborator is currently editing. Coordinates are
//  0..100% of the stage, matching the cursor + selection overlays.
//
//  Editing is awareness-only — multiple users can still type into the same
//  element. The pill exists so people see who's touching what without
//  bumping into each other.
// =============================================================================

interface Props {
  editing:  RemoteEditing[];
  slideId:  string;
  elements: SlideElementDTO[];
}

export const EditingAwarenessOverlay: React.FC<Props> = ({ editing, slideId, elements }) => {
  const onSlide = editing.filter((e) => e.slideId === slideId && e.user);
  if (onSlide.length === 0) return null;
  const elementById = new Map(elements.map((e) => [e.id, e]));
  return (
    <>
      {onSlide.map((e) => {
        const el = elementById.get(e.elementId);
        if (!el) return null;
        const color = e.user?.color || '#7C3AED';
        const label = e.user?.name || 'Someone';
        return (
          <div
            key={`${e.userId}:${e.elementId}`}
            className="absolute z-[85] pointer-events-none"
            style={{
              left: `${el.x}%`,
              top:  `${el.y}%`,
              transform: 'translate(-2px, -100%)',
            }}
          >
            <div
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-white text-[10px] font-semibold whitespace-nowrap shadow"
              style={{ background: color }}
            >
              <Pencil className="w-2.5 h-2.5" />
              {label} editing{e.field ? ` · ${e.field}` : ''}
            </div>
          </div>
        );
      })}
    </>
  );
};
