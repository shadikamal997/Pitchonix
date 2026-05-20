'use client';

import React from 'react';
import { MessageSquare } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  ElementCommentBadge layer — renders a small dot + count over each element
//  that has unresolved comments. Positioned absolutely inside the same parent
//  as the SlideCanvas, so badges follow the same coordinate system (% of the
//  16:9 stage).
// =============================================================================

interface Props {
  elements: SlideElementDTO[];
  counts:   Record<string, number>;
  onOpenForElement: (elementId: string) => void;
}

export const ElementCommentBadge: React.FC<Props> = ({ elements, counts, onOpenForElement }) => {
  const targets = elements.filter((e) => (counts[e.id] ?? 0) > 0);
  if (targets.length === 0) return null;
  return (
    <>
      {targets.map((el) => {
        const count = counts[el.id];
        return (
          <button
            key={el.id}
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenForElement(el.id); }}
            title={`${count} unresolved comment${count === 1 ? '' : 's'}`}
            className="absolute z-[60] flex items-center gap-0.5 h-5 px-1.5 rounded-full text-[10px] font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/50 ring-2 ring-white pointer-events-auto"
            style={{
              // Anchor to the top-right corner of the element box.
              left:      `calc(${el.x + el.width}% - 16px)`,
              top:       `calc(${el.y}% - 6px)`,
              transform: 'translateZ(0)',
            }}
          >
            <MessageSquare className="w-2.5 h-2.5" />
            {count}
          </button>
        );
      })}
    </>
  );
};
