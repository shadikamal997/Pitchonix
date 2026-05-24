'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, X } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  Phase 36E — Comment creation mode overlay
//
//  Mounted as a sibling of SlideCanvas inside the stage region. When `active`,
//  covers the canvas with a crosshair-cursor click-capture layer.
//
//    - Click anywhere → slide-level anchor at (anchorX, anchorY) %
//    - Click on an element's bbox → attach to that element
//      (hit-testing iterates elements in reverse z-order to pick topmost)
//    - A floating composer appears at the click point; Save creates the
//      comment, Cancel/Esc dismisses
//    - Esc exits comment mode entirely
//
//  All measurements are in % of the overlay box, which mirrors the canvas
//  stage 1:1 because both are absolute inset-0 in the same parent.
// =============================================================================

interface Props {
  active:    boolean;
  elements:  SlideElementDTO[];
  onCancel:  () => void;
  onSubmit:  (input: {
    content: string;
    slideElementId?: string;
    anchorX?: number;
    anchorY?: number;
  }) => Promise<void> | void;
}

interface PendingPin {
  x:         number;            // % of stage
  y:         number;
  elementId: string | null;     // null = slide-level
}

export const CommentModeOverlay: React.FC<Props> = ({ active, elements, onCancel, onSubmit }) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [pending, setPending] = useState<PendingPin | null>(null);
  const [draft,   setDraft]   = useState('');
  const [posting, setPosting] = useState(false);

  // Reset transient state whenever we leave comment mode.
  useEffect(() => {
    if (!active) { setPending(null); setDraft(''); setPosting(false); }
  }, [active]);

  // Esc cancels the pending composer (first press) or exits comment mode
  // entirely (second press if no composer is open).
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (pending) { setPending(null); setDraft(''); }
      else         { onCancel(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, pending, onCancel]);

  if (!active) return null;

  const handleClick = (e: React.MouseEvent) => {
    if (pending) return;  // composer already up
    const box = overlayRef.current?.getBoundingClientRect();
    if (!box) return;
    const xPct = ((e.clientX - box.left) / box.width)  * 100;
    const yPct = ((e.clientY - box.top)  / box.height) * 100;

    // Topmost-element hit test (reverse z-order; tie-break by array order).
    const hits = elements
      .filter((el) => el.visible !== false)
      .filter((el) =>
        xPct >= el.x && xPct <= el.x + el.width &&
        yPct >= el.y && yPct <= el.y + el.height,
      )
      .sort((a, b) => (b.zIndex ?? 0) - (a.zIndex ?? 0));

    const elementId = hits[0]?.id ?? null;
    setPending({ x: xPct, y: yPct, elementId });
    setDraft('');
  };

  const handleSubmit = async () => {
    const content = draft.trim();
    if (!content || !pending) return;
    setPosting(true);
    try {
      await onSubmit({
        content,
        slideElementId: pending.elementId ?? undefined,
        // Slide-level anchors carry coordinates; element-level don't need them
        // (the element bbox is the anchor).
        anchorX: pending.elementId ? undefined : pending.x,
        anchorY: pending.elementId ? undefined : pending.y,
      });
      setPending(null);
      setDraft('');
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleClick}
      className="absolute inset-0 z-[70] cursor-crosshair"
      // Tinted to make comment mode unmistakable; click-through is disabled
      // by the overlay itself so the canvas below ignores the click.
      style={{ background: 'rgba(245, 158, 11, 0.05)' }}
    >
      {/* Mode hint banner at top */}
      <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500 text-white text-xs font-semibold shadow-lg pointer-events-none">
        <MessageSquare className="w-3.5 h-3.5" />
        Click to place a comment — Esc to exit
      </div>

      {/* Floating composer at the pending pin position */}
      {pending && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute z-[71] w-72 bg-white rounded-lg shadow-2xl ring-1 ring-amber-300 p-3"
          style={{
            left: `calc(${pending.x}% + 14px)`,
            top:  `calc(${pending.y}% + 14px)`,
          }}
        >
          {/* The visible pin marker */}
          <div
            className="absolute -left-[26px] -top-[26px] w-6 h-6 rounded-full bg-amber-500 ring-2 ring-white shadow-lg flex items-center justify-center text-white pointer-events-none"
          >
            <MessageSquare className="w-3 h-3" />
          </div>

          {pending.elementId && (
            <div className="text-[10px] uppercase tracking-wide text-amber-700 font-bold mb-1">
              Attached to element
            </div>
          )}

          <textarea
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="Write a comment…  (⌘↵ to post)"
            rows={3}
            className="w-full text-sm border border-slate-200 rounded p-2 resize-none focus:outline-none focus:ring-2 focus:ring-amber-300"
          />

          <div className="mt-2 flex items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={() => { setPending(null); setDraft(''); }}
              className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded inline-flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!draft.trim() || posting}
              className="px-3 py-1 text-xs font-semibold text-white bg-amber-500 hover:bg-amber-600 rounded disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {posting ? 'Posting…' : 'Post'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
