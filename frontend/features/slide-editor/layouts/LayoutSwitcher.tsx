'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ChevronDown, LayoutGrid, Check } from 'lucide-react';
import { LAYOUTS, type LayoutSpec, type LayoutSlot } from './registry';

// =============================================================================
//  LayoutSwitcher — toolbar dropdown that lets the user reshape the current
//  slide's content into one of the named layouts. Each option shows a tiny
//  visual mock of the layout's slot geometry, plus name + description.
// =============================================================================

interface Props {
  currentLayoutId?: string | null;
  onPick:           (layout: LayoutSpec) => void;
}

export const LayoutSwitcher: React.FC<Props> = ({ currentLayoutId, onPick }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const current = LAYOUTS.find((l) => l.id === currentLayoutId);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Change slide layout"
        className="h-7 px-2.5 bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-1.5"
      >
        <LayoutGrid className="w-3.5 h-3.5 text-green-600" />
        {current ? current.name : 'Layout'}
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[260px] bg-white border border-slate-200 rounded-lg shadow-2xl z-50 max-h-[460px] overflow-y-auto">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Layout</p>
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Content is preserved — only positions change.</p>
          </div>

          {(['Basic', 'Visual', 'Data', 'Storytelling'] as const).map((cat) => {
            const items = LAYOUTS.filter((l) => l.category === cat);
            if (items.length === 0) return null;
            return (
              <div key={cat} className="py-1.5 border-b border-slate-100 last:border-b-0">
                <div className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">{cat}</div>
                {items.map((l) => {
                  const isCurrent = currentLayoutId === l.id;
                  return (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { onPick(l); setOpen(false); }}
                      className={`w-full flex items-center gap-2.5 px-2.5 py-2 transition-colors ${isCurrent ? 'bg-green-50' : 'hover:bg-slate-50'}`}
                    >
                      <LayoutMock layout={l} />
                      <div className="flex-1 min-w-0 text-left">
                        <div className={`text-xs font-semibold ${isCurrent ? 'text-green-800' : 'text-slate-800'}`}>{l.name}</div>
                        <div className="text-[10px] text-slate-500 truncate">{l.description}</div>
                      </div>
                      {isCurrent && <Check className="w-3 h-3 text-green-600 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  LayoutMock — tiny 32×18 visual showing the layout's slot rectangles.
//  Drawn from the layout's `slots` so adding new layouts in registry just
//  works.
// =============================================================================

const LayoutMock: React.FC<{ layout: LayoutSpec }> = ({ layout }) => {
  const W = 32, H = 18;
  if (layout.blank) {
    return (
      <div className="w-8 h-[18px] flex items-center justify-center border border-slate-300 rounded bg-white">
        <span className="text-[8px] text-slate-300">∅</span>
      </div>
    );
  }
  return (
    <div className="relative w-8 h-[18px] border border-slate-300 rounded bg-white flex-shrink-0 overflow-hidden">
      {layout.slots
        .filter((s: LayoutSlot) => s.id !== 'footer' && s.id !== 'pageNumber')
        .map((s, i) => (
          <div
            key={s.id}
            style={{
              position: 'absolute',
              left:   `${(s.x / 100) * W}px`,
              top:    `${(s.y / 100) * H}px`,
              width:  `${(s.w / 100) * W}px`,
              height: `${(s.h / 100) * H}px`,
              background: shadeFor(s.id),
              borderRadius: 1,
            }}
          />
        ))}
    </div>
  );
};

function shadeFor(slotId: string): string {
  if (slotId === 'title')    return '#0f172a';
  if (slotId === 'subtitle') return '#475569';
  if (slotId === 'image')    return '#94a3b8';
  if (slotId === 'chart')    return '#16a34a';
  if (slotId === 'quote')    return '#7c3aed';
  if (slotId.startsWith('metric')) return '#16a34a';
  return '#cbd5e1';
}
