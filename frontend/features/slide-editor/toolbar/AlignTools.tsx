'use client';

import React from 'react';
import {
  AlignStartHorizontal, AlignCenterHorizontal, AlignEndHorizontal,
  AlignStartVertical, AlignCenterVertical, AlignEndVertical,
  AlignHorizontalDistributeCenter, AlignVerticalDistributeCenter,
} from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  AlignTools
//
//  Operates on selected elements. With ≥1 selection:
//    - Align edges (left/right/top/bottom) — every selected element's edge
//      moves to the equivalent edge of the bounding box of the selection.
//    - Align centers (h/v) — center every element on the bounding-box center.
//    - Distribute h/v — at ≥3 selected, equal-gap distribute centers.
// =============================================================================

interface Props {
  selected: SlideElementDTO[];
  /** Apply a batch update to many elements at once. */
  onUpdateMany: (updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => void;
  disabled?: boolean;
}

export const AlignTools: React.FC<Props> = ({ selected, onUpdateMany, disabled }) => {
  const n = selected.length;
  const off = disabled || n < 1;

  // Bounding box of the selection (in %)
  const bbox = computeBBox(selected);

  const alignH = (mode: 'left' | 'center' | 'right') => {
    if (off || !bbox) return;
    onUpdateMany(selected.map((e) => {
      let x = e.x;
      if (mode === 'left')   x = bbox.x;
      if (mode === 'right')  x = bbox.x + bbox.w - e.width;
      if (mode === 'center') x = bbox.x + (bbox.w - e.width) / 2;
      return { id: e.id, patch: { x: clamp(x) } };
    }));
  };

  const alignV = (mode: 'top' | 'middle' | 'bottom') => {
    if (off || !bbox) return;
    onUpdateMany(selected.map((e) => {
      let y = e.y;
      if (mode === 'top')    y = bbox.y;
      if (mode === 'bottom') y = bbox.y + bbox.h - e.height;
      if (mode === 'middle') y = bbox.y + (bbox.h - e.height) / 2;
      return { id: e.id, patch: { y: clamp(y) } };
    }));
  };

  const distributeH = () => {
    if (off || !bbox || n < 3) return;
    const sorted = [...selected].sort((a, b) => a.x - b.x);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const firstCx = first.x + first.width / 2;
    const lastCx  = last.x  + last.width  / 2;
    const span = lastCx - firstCx;
    const step = span / (n - 1);
    onUpdateMany(sorted.map((e, i) => {
      if (i === 0 || i === n - 1) return { id: e.id, patch: {} };
      const cx = firstCx + step * i;
      return { id: e.id, patch: { x: clamp(cx - e.width / 2) } };
    }).filter((u) => Object.keys(u.patch).length));
  };

  const distributeV = () => {
    if (off || !bbox || n < 3) return;
    const sorted = [...selected].sort((a, b) => a.y - b.y);
    const first = sorted[0], last = sorted[sorted.length - 1];
    const firstCy = first.y + first.height / 2;
    const lastCy  = last.y  + last.height  / 2;
    const span = lastCy - firstCy;
    const step = span / (n - 1);
    onUpdateMany(sorted.map((e, i) => {
      if (i === 0 || i === n - 1) return { id: e.id, patch: {} };
      const cy = firstCy + step * i;
      return { id: e.id, patch: { y: clamp(cy - e.height / 2) } };
    }).filter((u) => Object.keys(u.patch).length));
  };

  return (
    <div className={`flex items-center gap-0.5 px-1 ${off ? 'opacity-40 pointer-events-none' : ''}`}>
      <Btn onClick={() => alignH('left')}   title="Align left"        ><AlignStartHorizontal className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => alignH('center')} title="Align horizontal center"><AlignCenterHorizontal className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => alignH('right')}  title="Align right"       ><AlignEndHorizontal className="w-3.5 h-3.5" /></Btn>
      <span className="w-px h-4 bg-slate-200 mx-0.5" />
      <Btn onClick={() => alignV('top')}    title="Align top"         ><AlignStartVertical className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => alignV('middle')} title="Align vertical middle"><AlignCenterVertical className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => alignV('bottom')} title="Align bottom"      ><AlignEndVertical className="w-3.5 h-3.5" /></Btn>
      <span className="w-px h-4 bg-slate-200 mx-0.5" />
      <Btn onClick={distributeH} disabled={n < 3} title="Distribute horizontally"><AlignHorizontalDistributeCenter className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={distributeV} disabled={n < 3} title="Distribute vertically"  ><AlignVerticalDistributeCenter   className="w-3.5 h-3.5" /></Btn>
    </div>
  );
};

const Btn: React.FC<{
  onClick: () => void; title: string; disabled?: boolean; children: React.ReactNode;
}> = ({ onClick, title, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className="w-7 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
  >
    {children}
  </button>
);

function computeBBox(els: SlideElementDTO[]): { x: number; y: number; w: number; h: number } | null {
  if (els.length === 0) return null;
  let x1 = +Infinity, y1 = +Infinity, x2 = -Infinity, y2 = -Infinity;
  for (const e of els) {
    x1 = Math.min(x1, e.x);
    y1 = Math.min(y1, e.y);
    x2 = Math.max(x2, e.x + e.width);
    y2 = Math.max(y2, e.y + e.height);
  }
  return { x: x1, y: y1, w: x2 - x1, h: y2 - y1 };
}

function clamp(v: number): number { return Math.max(0, Math.min(100, v)); }
