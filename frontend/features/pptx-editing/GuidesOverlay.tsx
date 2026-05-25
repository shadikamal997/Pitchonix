'use client';

import React, { useState, useCallback, useEffect } from 'react';
import { Ruler, Plus, Lock, Unlock, Trash2, X } from 'lucide-react';

// =============================================================================
//  Phase 38K — GuidesOverlay
//
//  Lightweight ruler + guides + safe-margin overlay positioned absolutely
//  inside the slide canvas. Mounts above the canvas and below the inspector.
//
//  Features:
//    - top and left rulers (10% ticks)
//    - draggable horizontal + vertical guides (per-deck, localStorage-cached)
//    - safe margin rectangle (default 5%)
//    - lock toggle so drags don't accidentally move them once placed
//    - "snap-to-guide" helper exposed as `useSnapToGuides()` for the canvas
// =============================================================================

interface Guide { id: string; axis: 'x' | 'y'; pos: number; locked?: boolean }

export interface GuidesOverlayProps {
  deckId:        string;
  showRulers?:   boolean;
  showGuides?:   boolean;
  showSafeArea?: boolean;
  /** Margin in percent of slide. Default 5. */
  safeMargin?:   number;
}

const STORAGE_PREFIX = 'pitchonix:guides:';

function loadGuides(deckId: string): Guide[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(STORAGE_PREFIX + deckId) || '[]') as Guide[]; }
  catch { return []; }
}
function saveGuides(deckId: string, guides: Guide[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_PREFIX + deckId, JSON.stringify(guides));
}

export const GuidesOverlay: React.FC<GuidesOverlayProps> = ({
  deckId, showRulers = true, showGuides = true, showSafeArea = true, safeMargin = 5,
}) => {
  const [guides, setGuides] = useState<Guide[]>([]);
  const [dragging, setDragging] = useState<string | null>(null);

  useEffect(() => { setGuides(loadGuides(deckId)); }, [deckId]);
  useEffect(() => { saveGuides(deckId, guides); }, [deckId, guides]);

  const addGuide = (axis: 'x' | 'y') => {
    setGuides((g) => [...g, { id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`, axis, pos: 50 }]);
  };
  const removeGuide = (id: string) => setGuides((g) => g.filter((x) => x.id !== id));
  const toggleLock  = (id: string) => setGuides((g) => g.map((x) => x.id === id ? { ...x, locked: !x.locked } : x));
  const updatePos   = (id: string, pos: number) =>
    setGuides((g) => g.map((x) => x.id === id ? { ...x, pos: Math.max(0, Math.min(100, pos)) } : x));

  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging) return;
    const g = guides.find((x) => x.id === dragging);
    if (!g || g.locked) return;
    const rect = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width)  * 100;
    const py = ((e.clientY - rect.top)  / rect.height) * 100;
    updatePos(g.id, g.axis === 'x' ? px : py);
  }, [dragging, guides]);

  return (
    <div
      className="absolute inset-0 pointer-events-none z-30 select-none"
      onPointerMove={onPointerMove}
      onPointerUp={() => setDragging(null)}
    >
      {/* Top + left rulers */}
      {showRulers && (
        <>
          <div className="absolute left-0 right-0 top-0 h-3 border-b border-[#C9C6BD]/60 bg-[#EDEBE6]/70 pointer-events-auto flex">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="flex-1 relative border-r border-[#C9C6BD]/40 text-[7px] text-[#9A9A9A] px-0.5">{i * 10}</div>
            ))}
          </div>
          <div className="absolute top-0 bottom-0 left-0 w-3 border-r border-[#C9C6BD]/60 bg-[#EDEBE6]/70 pointer-events-auto flex flex-col">
            {Array.from({ length: 11 }, (_, i) => (
              <div key={i} className="flex-1 relative border-b border-[#C9C6BD]/40 text-[7px] text-[#9A9A9A] text-center">{i * 10}</div>
            ))}
          </div>
        </>
      )}

      {/* Safe-area rectangle */}
      {showSafeArea && (
        <div
          className="absolute border border-dashed border-amber-400/70 pointer-events-none"
          style={{ top: `${safeMargin}%`, left: `${safeMargin}%`, right: `${safeMargin}%`, bottom: `${safeMargin}%` }}
        />
      )}

      {/* Guides */}
      {showGuides && guides.map((g) => (
        <div
          key={g.id}
          onPointerDown={() => !g.locked && setDragging(g.id)}
          className={`absolute pointer-events-auto ${g.locked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
          style={g.axis === 'x'
            ? { left: `${g.pos}%`, top: 0, bottom: 0, width: 2, marginLeft: -1, background: g.locked ? '#0EA5E9' : '#22C55E' }
            : { top:  `${g.pos}%`, left: 0, right: 0, height: 2, marginTop:  -1, background: g.locked ? '#0EA5E9' : '#22C55E' }}
          title={`Guide ${g.axis.toUpperCase()} ${g.pos.toFixed(0)}%`}
        >
          <div className="absolute -top-3 -left-3 hidden hover:flex items-center gap-0.5">
            <button onClick={() => toggleLock(g.id)} className="p-0.5 bg-white border border-[#C9C6BD] rounded text-[#6B6B6B] hover:bg-[#EDEBE6]">
              {g.locked ? <Lock className="w-2.5 h-2.5" /> : <Unlock className="w-2.5 h-2.5" />}
            </button>
            <button onClick={() => removeGuide(g.id)} className="p-0.5 bg-white border border-[#F7E3E3] rounded text-[#9a3737] hover:bg-[#FCF1F1]">
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
        </div>
      ))}

      {/* Add-guide controls (top-right corner) */}
      {showGuides && (
        <div className="absolute top-4 right-2 flex gap-1 pointer-events-auto">
          <button onClick={() => addGuide('x')} className="h-6 px-1.5 text-[9px] font-semibold bg-white border border-[#C9C6BD] text-[#111111] rounded hover:bg-[#EDEBE6] inline-flex items-center gap-0.5">
            <Plus className="w-2.5 h-2.5" /> V guide
          </button>
          <button onClick={() => addGuide('y')} className="h-6 px-1.5 text-[9px] font-semibold bg-white border border-[#C9C6BD] text-[#111111] rounded hover:bg-[#EDEBE6] inline-flex items-center gap-0.5">
            <Plus className="w-2.5 h-2.5" /> H guide
          </button>
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  Helper hook for the canvas's drag/move code: nearest snap candidate.
// =============================================================================

export interface SnapHit { axis: 'x' | 'y'; pos: number; delta: number }

export function findSnapTarget(deckId: string, axis: 'x' | 'y', pos: number, threshold = 1.5): SnapHit | null {
  const guides = loadGuides(deckId).filter((g) => g.axis === axis);
  let best: SnapHit | null = null;
  for (const g of guides) {
    const d = Math.abs(g.pos - pos);
    if (d <= threshold && (best === null || d < best.delta)) best = { axis, pos: g.pos, delta: d };
  }
  return best;
}
