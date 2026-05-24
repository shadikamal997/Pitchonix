'use client';

import React from 'react';
import Link from 'next/link';
import { Palette, Check, Plus, X } from 'lucide-react';
import { useMyBrandKits } from '@/features/brand-kits/useBrandKits';
import { BrandPreviewPanel } from '@/features/brand-kits/BrandPreviewPanel';
import type { BrandKitDTO } from '@/types/brand-kit';

// =============================================================================
//  Phase 37.2A — StepBrandSelection
//
//  Wizard step that lets the user pick a saved Brand Kit before generation.
//  When set, `wizardData.brandKitId` is included in the generate payload
//  and the backend pipeline (Phase 37.1A) uses its tokens — colors,
//  typography, voice, identity — as the primary theme source.
//
//  Picking "None" keeps the legacy behavior (the inline brandColors +
//  fontStyle from the Design step take effect).
// =============================================================================

interface Props {
  selectedBrandKitId: string | null | undefined;
  onSelect: (brandKitId: string | null) => void;
}

export default function StepBrandSelection({ selectedBrandKitId, onSelect }: Props) {
  const { items, loading } = useMyBrandKits();
  const selected = items.find((k) => k.id === selectedBrandKitId) || null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Palette className="w-6 h-6 text-purple-600" />
          Brand Selection
        </h2>
        <p className="text-sm text-slate-600 mt-1">
          Pick a brand kit and your deck will inherit colors, fonts, logo, and voice automatically. Or skip to set them manually in the Design step.
        </p>
      </div>

      {/* "None" option */}
      <button
        type="button"
        onClick={() => onSelect(null)}
        className={`w-full flex items-center justify-between p-4 rounded-lg border-2 transition-colors text-left ${
          !selectedBrandKitId
            ? 'border-blue-500 bg-blue-50'
            : 'border-slate-200 hover:border-slate-300 bg-white'
        }`}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
            <X className="w-5 h-5 text-slate-400" />
          </div>
          <div>
            <div className="text-sm font-semibold text-slate-900">No brand kit</div>
            <div className="text-xs text-slate-500">Use the Design step to pick colors + fonts manually.</div>
          </div>
        </div>
        {!selectedBrandKitId && <Check className="w-5 h-5 text-blue-600" />}
      </button>

      {/* Brand kit cards */}
      {loading ? (
        <div className="text-sm text-slate-500">Loading brand kits…</div>
      ) : items.length === 0 ? (
        <div className="text-center py-8 px-4 border-2 border-dashed border-slate-300 rounded-lg">
          <Palette className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <p className="text-sm text-slate-600 mb-1">No brand kits yet.</p>
          <Link href="/brand-kits" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
            <Plus className="w-3.5 h-3.5" /> Create your first brand kit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {items.map((k) => (
            <BrandKitCard
              key={k.id}
              kit={k}
              selected={k.id === selectedBrandKitId}
              onSelect={() => onSelect(k.id)}
            />
          ))}
        </div>
      )}

      {/* Live preview of what the picked kit looks like */}
      {selected && (
        <div className="pt-4 border-t border-slate-200">
          <div className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Preview</div>
          <BrandPreviewPanel kit={selected} />
        </div>
      )}
    </div>
  );
}

const BrandKitCard: React.FC<{
  kit: BrandKitDTO; selected: boolean; onSelect: () => void;
}> = ({ kit, selected, onSelect }) => {
  const primary = kit.tokens?.colors?.primary ?? kit.primaryColor ?? '#8B5CF6';
  const secondary = kit.tokens?.colors?.secondary ?? kit.secondaryColor ?? '#64748B';
  const accent = kit.tokens?.colors?.accent ?? '#16A34A';
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative flex items-start gap-3 p-4 rounded-lg border-2 transition-colors text-left ${
        selected
          ? 'border-blue-500 bg-blue-50'
          : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      {/* Logo or colored block */}
      {kit.logo ? (
        <img src={kit.logo} alt="" className="w-12 h-12 object-contain rounded-lg bg-white border border-slate-200 flex-shrink-0" />
      ) : (
        <div
          className="w-12 h-12 rounded-lg flex-shrink-0"
          style={{ background: primary }}
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <div className="text-sm font-semibold text-slate-900 truncate">{kit.name}</div>
          {kit.isDefault && (
            <span className="text-[9px] uppercase tracking-wide bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold">Default</span>
          )}
        </div>
        {kit.description && (
          <div className="text-xs text-slate-500 truncate mt-0.5">{kit.description}</div>
        )}
        {/* Color swatches */}
        <div className="flex items-center gap-1 mt-2">
          <span className="w-4 h-4 rounded-sm ring-1 ring-slate-200" style={{ background: primary }} />
          <span className="w-4 h-4 rounded-sm ring-1 ring-slate-200" style={{ background: secondary }} />
          <span className="w-4 h-4 rounded-sm ring-1 ring-slate-200" style={{ background: accent }} />
          {kit.fontFamily && (
            <span className="ml-1 text-[10px] text-slate-500 font-mono" style={{ fontFamily: kit.fontFamily }}>
              {kit.fontFamily.split(',')[0]}
            </span>
          )}
        </div>
      </div>
      {selected && (
        <Check className="absolute top-3 right-3 w-5 h-5 text-blue-600" />
      )}
    </button>
  );
};
