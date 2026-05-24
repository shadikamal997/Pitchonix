'use client';

import React, { useEffect, useRef } from 'react';

// =============================================================================
//  Phase 34D — CollaborationCursorEmitter
//
//  Invisible overlay that listens for mousemove on its parent stage and
//  emits the cursor coordinate (as 0..100% of the stage) at ~60fps. Coords
//  are computed against `getBoundingClientRect()` of the emitter itself,
//  so it must sit absolute inset-0 inside the stage region.
//
//  Pointer-events stay disabled so we never steal clicks from the canvas.
// =============================================================================

interface Props {
  slideId:    string;
  sendCursor: (slideId: string, x: number, y: number) => void;
  connected:  boolean;
}

const MIN_INTERVAL = 16;   // ~60fps cap

export const CollaborationCursorEmitter: React.FC<Props> = ({ slideId, sendCursor, connected }) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const lastSent = useRef(0);

  useEffect(() => {
    if (!connected) return;
    const node = ref.current;
    if (!node) return;
    const parent = node.parentElement;
    if (!parent) return;

    const handler = (e: MouseEvent) => {
      const now = performance.now();
      if (now - lastSent.current < MIN_INTERVAL) return;
      const box = parent.getBoundingClientRect();
      if (box.width === 0 || box.height === 0) return;
      const xPct = ((e.clientX - box.left) / box.width)  * 100;
      const yPct = ((e.clientY - box.top)  / box.height) * 100;
      // Skip out-of-stage drags so we don't paint cursors at -10%.
      if (xPct < 0 || xPct > 100 || yPct < 0 || yPct > 100) return;
      lastSent.current = now;
      sendCursor(slideId, xPct, yPct);
    };

    parent.addEventListener('mousemove', handler);
    return () => parent.removeEventListener('mousemove', handler);
  }, [slideId, sendCursor, connected]);

  return <div ref={ref} className="absolute inset-0 pointer-events-none" aria-hidden="true" />;
};
