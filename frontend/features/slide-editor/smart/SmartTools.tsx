'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Wand2, Group, Ungroup, Sparkles, ChevronDown, AlertTriangle, CheckCircle2 } from 'lucide-react';
import type { SlideElementDTO } from '@/types/slide-element';
import { selectionGroupState } from './group-utils';

// =============================================================================
//  SmartTools — toolbar widget hosting Group, Ungroup, and Tidy.
// =============================================================================

interface Props {
  elements:        SlideElementDTO[];
  selectedIds:     string[];
  overflowCount:   number;
  onGroup:         () => void;
  onUngroup:       () => void;
  onTidy:          () => void;
}

export const SmartTools: React.FC<Props> = ({ elements, selectedIds, overflowCount, onGroup, onUngroup, onTidy }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const groupState = selectionGroupState(elements, selectedIds);

  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Smart tools"
        className={`relative h-7 px-2.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
          open ? 'bg-green-50 text-green-700 border border-green-300' : 'bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-700'
        }`}
      >
        <Wand2 className="w-3.5 h-3.5 text-green-600" />
        Smart
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        {overflowCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-red-500 text-white text-[9px] font-bold ring-2 ring-white">
            {overflowCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[260px] bg-white border border-slate-200 rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-slate-100">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Smart tools</p>
            <p className="text-[11px] text-slate-400 leading-snug mt-0.5">Auto-flow, grouping, overflow.</p>
          </div>

          <div className="py-1">
            <Item
              icon={<Sparkles className="w-3.5 h-3.5 text-green-600" />}
              label="Tidy slide"
              hint="Pick best layout for your content"
              onClick={() => { setOpen(false); onTidy(); }}
            />
            <Item
              icon={<Group className="w-3.5 h-3.5 text-green-600" />}
              label="Group selection"
              hint={groupState.canGroup ? `Bind ${selectedIds.length} elements together` : 'Select 2+ elements first'}
              disabled={!groupState.canGroup}
              onClick={() => { setOpen(false); onGroup(); }}
            />
            <Item
              icon={<Ungroup className="w-3.5 h-3.5 text-slate-500" />}
              label="Ungroup"
              hint={groupState.canUngroup ? 'Release current group' : 'No group in selection'}
              disabled={!groupState.canUngroup}
              onClick={() => { setOpen(false); onUngroup(); }}
            />
          </div>

          <div className="px-3 py-2 border-t border-slate-100 flex items-center gap-1.5 text-[11px]">
            {overflowCount > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-red-600" />
                <span className="text-red-700 font-semibold">{overflowCount} overflow{overflowCount === 1 ? '' : 's'} on this slide</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-green-600" />
                <span className="text-green-700 font-semibold">All content fits cleanly</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Item: React.FC<{ icon: React.ReactNode; label: string; hint: string; onClick: () => void; disabled?: boolean }> = ({ icon, label, hint, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <span className="mt-0.5">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-xs font-semibold text-slate-800">{label}</span>
      <span className="block text-[10px] text-slate-500 truncate">{hint}</span>
    </span>
  </button>
);
