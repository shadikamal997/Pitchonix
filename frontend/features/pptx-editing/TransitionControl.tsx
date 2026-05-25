'use client';

import React from 'react';
import { Film, X } from 'lucide-react';
import { useSlideTransition, SlideTransitionDTO } from './hooks';

// =============================================================================
//  Phase 38I — TransitionControl
//
//  Per-slide transition editor. Embedded in the SlidePanel (slide-level
//  inspector) so the user can pick how the slide enters during playback.
//
//    [effect dropdown] [direction] [duration] [clear]
//
//  Direction is only shown for effects that support one (push / reveal / cover).
// =============================================================================

const EFFECTS: { value: SlideTransitionDTO['effect']; label: string }[] = [
  { value: 'fade',   label: 'Fade'   },
  { value: 'push',   label: 'Push'   },
  { value: 'reveal', label: 'Reveal' },
  { value: 'morph',  label: 'Morph'  },
  { value: 'cover',  label: 'Cover'  },
];

const DIRECTIONS = ['left', 'right', 'top', 'bottom'] as const;
const HAS_DIRECTION = new Set(['push', 'reveal', 'cover']);

interface Props {
  slideId: string | null | undefined;
}

export const TransitionControl: React.FC<Props> = ({ slideId }) => {
  const { transition, set, clear } = useSlideTransition(slideId);

  if (!slideId) return null;
  const t: SlideTransitionDTO = transition || { effect: 'fade', duration: 400 };

  return (
    <div className="space-y-2 px-3 py-2 border-t border-[#E3E1DA] bg-[#EDEBE6]">
      <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">
        <Film className="w-3 h-3" /> Transition
        {transition && (
          <button onClick={() => clear()} title="Clear transition"
            className="ml-auto p-1 text-[#9A9A9A] hover:bg-[#E3E1DA] rounded"
          ><X className="w-3 h-3" /></button>
        )}
      </div>
      <div className="flex items-center gap-1.5">
        <select
          value={t.effect}
          onChange={(e) => set({ ...t, effect: e.target.value as SlideTransitionDTO['effect'] })}
          className="flex-1 h-7 text-xs px-1.5 border border-[#C9C6BD] rounded bg-white"
        >
          {EFFECTS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <input
          type="number" min={0} step={50}
          value={t.duration}
          onChange={(e) => set({ ...t, duration: Math.max(0, Number(e.target.value) || 0) })}
          className="w-20 h-7 text-xs px-1.5 border border-[#C9C6BD] rounded font-mono bg-white"
          title="Duration (ms)"
        />
      </div>
      {HAS_DIRECTION.has(t.effect) && (
        <div className="flex gap-0.5">
          {DIRECTIONS.map((d) => (
            <button
              key={d}
              onClick={() => set({ ...t, direction: d })}
              className={`flex-1 h-6 text-[10px] capitalize border rounded ${
                t.direction === d
                  ? 'bg-[#4F7563] text-white border-[#4F7563]'
                  : 'bg-white text-[#111111] border-[#C9C6BD] hover:bg-[#EDEBE6]'
              }`}
            >{d}</button>
          ))}
        </div>
      )}
    </div>
  );
};
