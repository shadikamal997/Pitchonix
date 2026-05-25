'use client';

import React, { useState } from 'react';
import { Palette, Loader2 } from 'lucide-react';
import { useMyBrandKits } from './useBrandKits';
import api from '@/lib/api';

// =============================================================================
//  Phase 37.1B — ApplyChartBrandButton (chart inspector)
//
//  Compact dropdown of the caller's brand kits. Picking one calls
//  POST /brand-kits/:kitId/rebrand-chart/:elementId on the backend, which
//  rewrites el.data.colors + el.style (axis/grid/legend) to the brand
//  palette while preserving data, labels, and axes.
// =============================================================================

interface Props {
  elementId: string;
  onRebranded?: () => void;
}

export const ApplyChartBrandButton: React.FC<Props> = ({ elementId, onRebranded }) => {
  const { items, loading } = useMyBrandKits();
  const [open,    setOpen]    = useState(false);
  const [applying, setApplying] = useState<string | null>(null);

  const apply = async (kitId: string) => {
    setApplying(kitId);
    try {
      await api.post(`/brand-kits/${kitId}/rebrand-chart/${elementId}`);
      setOpen(false);
      onRebranded?.();
    } finally { setApplying(null); }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="h-7 px-2 text-[11px] font-semibold border border-[#C9C6BD] hover:bg-[#EDEBE6] rounded inline-flex items-center gap-1.5"
        title="Apply brand chart palette to this chart"
      >
        <Palette className="w-3 h-3 text-[#4F7563]" />
        Apply brand palette
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-[#E3E1DA] rounded-lg shadow-xl z-50">
          {loading ? (
            <div className="px-3 py-2 text-[11px] text-[#9A9A9A]">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-[#9A9A9A] italic">
              No brand kits.{' '}
              <a href="/brand-kits" className="text-[#4F7563] hover:underline">Create one →</a>
            </div>
          ) : items.map((k) => (
            <button
              key={k.id}
              onClick={() => apply(k.id)}
              disabled={applying === k.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-[#EDEBE6] disabled:opacity-60"
            >
              <span
                className="w-3 h-3 rounded ring-1 ring-slate-200"
                style={{ background: k.primaryColor || '#8B5CF6' }}
              />
              <span className="text-xs font-semibold text-[#111111] truncate flex-1">{k.name}</span>
              {applying === k.id && <Loader2 className="w-3 h-3 animate-spin text-[#C9C6BD]" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
