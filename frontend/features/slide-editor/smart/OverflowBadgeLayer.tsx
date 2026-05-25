'use client';

import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, Wand2, X } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';
import type { OverflowReport } from './overflow-analyzer';

// =============================================================================
//  OverflowBadgeLayer — small warning chip on each element with an overflow.
//  Clicking the chip opens a tiny popover that lists the auto-fix suggestions.
// =============================================================================

interface Props {
  elements: SlideElementDTO[];
  reports:  Record<string, OverflowReport>;
  onApplyFix: (elementId: string, patch: Partial<SlideElementDTO>) => void;
}

export const OverflowBadgeLayer: React.FC<Props> = ({ elements, reports, onApplyFix }) => {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const ids = Object.keys(reports);
  if (ids.length === 0) return null;

  return (
    <>
      {ids.map((id) => {
        const el = byId.get(id);
        const r = reports[id];
        if (!el || !r) return null;
        return (
          <OverflowBadge
            key={id}
            element={el}
            report={r}
            onApply={(patch) => onApplyFix(id, patch)}
          />
        );
      })}
    </>
  );
};

// =============================================================================
//  Single badge
// =============================================================================

const OverflowBadge: React.FC<{
  element: SlideElementDTO;
  report:  OverflowReport;
  onApply: (patch: Partial<SlideElementDTO>) => void;
}> = ({ element, report, onApply }) => {
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

  // Anchor to bottom-right corner of the element.
  const left = `calc(${element.x + element.width}% - 22px)`;
  const top  = `calc(${element.y + element.height}% - 22px)`;
  const colorBg = report.severity === 'overflow' ? 'bg-[#D96A6A] hover:bg-red-600 shadow-red-500/40'
                                                  : 'bg-[#D9A441] hover:bg-amber-600 shadow-amber-500/40';

  return (
    <div ref={ref} className="absolute z-[55] pointer-events-auto" style={{ left, top }}>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }}
        title={report.reason}
        className={`flex items-center justify-center w-5 h-5 rounded-full text-white shadow-lg ring-2 ring-white ${colorBg}`}
      >
        <AlertTriangle className="w-2.5 h-2.5" />
      </button>
      {open && (
        <div className="absolute top-6 right-0 w-[260px] bg-white border border-[#E3E1DA] rounded-lg shadow-2xl p-2.5">
          <div className="flex items-start gap-1.5 mb-2">
            <AlertTriangle className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 ${report.severity === 'overflow' ? 'text-[#9a3737]' : 'text-[#8c6210]'}`} />
            <p className="text-xs font-semibold text-[#111111] leading-snug">{report.reason}</p>
            <button type="button" onClick={() => setOpen(false)} className="ml-auto p-0.5 rounded text-[#9A9A9A] hover:bg-[#F1F0EC]">
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {report.suggestions.length === 0 ? (
              <p className="text-[11px] text-[#9A9A9A] italic px-1">No automatic fix available — edit the content directly.</p>
            ) : (
              report.suggestions.map((s, i) => (
                <button
                  key={i}
                  type="button"
                  disabled={!s.patch}
                  onClick={() => { if (s.patch) { onApply(s.patch as any); setOpen(false); } }}
                  className="w-full flex items-center gap-2 px-2 py-1.5 rounded text-left text-[11px] font-semibold text-[#111111] hover:bg-[#EEF5F1] hover:text-[#355846] disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Wand2 className="w-3 h-3 text-[#4F7563] flex-shrink-0" />
                  <span className="flex-1 min-w-0 truncate">{s.description}</span>
                  {!s.patch && <span className="text-[9px] text-[#C9C6BD]">manual</span>}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
