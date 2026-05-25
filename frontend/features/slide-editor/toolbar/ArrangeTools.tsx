'use client';

import React from 'react';
import { ArrowUpToLine, ArrowUp, ArrowDown, ArrowDownToLine } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  ArrangeTools
//
//  Z-index controls. The slide canvas renders elements by zIndex ascending —
//  higher = on top.
//
//    Bring forward    → zIndex + 1 (relative to its current value)
//    Send backward    → zIndex - 1
//    Bring to front   → zIndex = (max of all on slide) + 1
//    Send to back     → zIndex = (min of all on slide) - 1
// =============================================================================

interface Props {
  allElements: SlideElementDTO[];
  selected:    SlideElementDTO[];
  onUpdateMany: (updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => void;
  disabled?: boolean;
}

export const ArrangeTools: React.FC<Props> = ({ allElements, selected, onUpdateMany, disabled }) => {
  const off = disabled || selected.length < 1;

  const minZ = allElements.length ? Math.min(...allElements.map((e) => e.zIndex)) : 0;
  const maxZ = allElements.length ? Math.max(...allElements.map((e) => e.zIndex)) : 0;

  const apply = (mode: 'front' | 'back' | 'forward' | 'backward') => {
    if (off) return;
    onUpdateMany(selected.map((e, i) => {
      let z = e.zIndex;
      if (mode === 'forward')  z = e.zIndex + 1;
      if (mode === 'backward') z = e.zIndex - 1;
      if (mode === 'front')    z = maxZ + 1 + i;
      if (mode === 'back')     z = minZ - 1 - i;
      return { id: e.id, patch: { zIndex: z } };
    }));
  };

  return (
    <div className={`flex items-center gap-0.5 px-1 ${off ? 'opacity-40 pointer-events-none' : ''}`}>
      <Btn onClick={() => apply('front')}    title="Bring to front"><ArrowUpToLine    className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => apply('forward')}  title="Bring forward" ><ArrowUp           className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => apply('backward')} title="Send backward" ><ArrowDown         className="w-3.5 h-3.5" /></Btn>
      <Btn onClick={() => apply('back')}     title="Send to back"  ><ArrowDownToLine   className="w-3.5 h-3.5" /></Btn>
    </div>
  );
};

const Btn: React.FC<{ onClick: () => void; title: string; children: React.ReactNode }> = ({ onClick, title, children }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className="w-7 h-6 flex items-center justify-center rounded text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]"
  >
    {children}
  </button>
);
