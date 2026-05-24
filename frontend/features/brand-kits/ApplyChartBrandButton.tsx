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
        className="h-7 px-2 text-[11px] font-semibold border border-slate-300 hover:bg-slate-50 rounded inline-flex items-center gap-1.5"
        title="Apply brand chart palette to this chart"
      >
        <Palette className="w-3 h-3 text-purple-600" />
        Apply brand palette
      </button>
      {open && (
        <div className="absolute right-0 mt-1 w-56 bg-white border border-slate-200 rounded-lg shadow-xl z-50">
          {loading ? (
            <div className="px-3 py-2 text-[11px] text-slate-500">Loading…</div>
          ) : items.length === 0 ? (
            <div className="px-3 py-2 text-[11px] text-slate-500 italic">
              No brand kits.{' '}
              <a href="/brand-kits" className="text-blue-600 hover:underline">Create one →</a>
            </div>
          ) : items.map((k) => (
            <button
              key={k.id}
              onClick={() => apply(k.id)}
              disabled={applying === k.id}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-left hover:bg-slate-50 disabled:opacity-60"
            >
              <span
                className="w-3 h-3 rounded ring-1 ring-slate-200"
                style={{ background: k.primaryColor || '#8B5CF6' }}
              />
              <span className="text-xs font-semibold text-slate-900 truncate flex-1">{k.name}</span>
              {applying === k.id && <Loader2 className="w-3 h-3 animate-spin text-slate-400" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
