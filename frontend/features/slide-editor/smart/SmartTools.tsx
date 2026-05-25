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
          open ? 'bg-[#EEF5F1] text-[#355846] border border-[#A8B9AE]' : 'bg-white border border-[#E3E1DA] hover:border-green-400 hover:bg-[#EEF5F1] text-[#111111]'
        }`}
      >
        <Wand2 className="w-3.5 h-3.5 text-[#4F7563]" />
        Smart
        <ChevronDown className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} />
        {overflowCount > 0 && (
          <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#D96A6A] text-white text-[9px] font-bold ring-2 ring-white">
            {overflowCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-2 w-[260px] bg-white border border-[#E3E1DA] rounded-lg shadow-2xl z-50 overflow-hidden">
          <div className="px-3 py-2 border-b border-[#F1F0EC]">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#9A9A9A]">Smart tools</p>
            <p className="text-[11px] text-[#C9C6BD] leading-snug mt-0.5">Auto-flow, grouping, overflow.</p>
          </div>

          <div className="py-1">
            <Item
              icon={<Sparkles className="w-3.5 h-3.5 text-[#4F7563]" />}
              label="Tidy slide"
              hint="Pick best layout for your content"
              onClick={() => { setOpen(false); onTidy(); }}
            />
            <Item
              icon={<Group className="w-3.5 h-3.5 text-[#4F7563]" />}
              label="Group selection"
              hint={groupState.canGroup ? `Bind ${selectedIds.length} elements together` : 'Select 2+ elements first'}
              disabled={!groupState.canGroup}
              onClick={() => { setOpen(false); onGroup(); }}
            />
            <Item
              icon={<Ungroup className="w-3.5 h-3.5 text-[#9A9A9A]" />}
              label="Ungroup"
              hint={groupState.canUngroup ? 'Release current group' : 'No group in selection'}
              disabled={!groupState.canUngroup}
              onClick={() => { setOpen(false); onUngroup(); }}
            />
          </div>

          <div className="px-3 py-2 border-t border-[#F1F0EC] flex items-center gap-1.5 text-[11px]">
            {overflowCount > 0 ? (
              <>
                <AlertTriangle className="w-3 h-3 text-[#9a3737]" />
                <span className="text-[#7a2929] font-semibold">{overflowCount} overflow{overflowCount === 1 ? '' : 's'} on this slide</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3 h-3 text-[#4F7563]" />
                <span className="text-[#355846] font-semibold">All content fits cleanly</span>
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
    className="w-full flex items-start gap-2 px-3 py-2 text-left hover:bg-[#EDEBE6] disabled:opacity-40 disabled:cursor-not-allowed"
  >
    <span className="mt-0.5">{icon}</span>
    <span className="flex-1 min-w-0">
      <span className="block text-xs font-semibold text-[#111111]">{label}</span>
      <span className="block text-[10px] text-[#9A9A9A] truncate">{hint}</span>
    </span>
  </button>
);
