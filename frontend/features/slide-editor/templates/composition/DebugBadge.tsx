'use client';

import React, { useEffect, useState } from 'react';
import { debugRenderer } from './registry';
import { getKnownCollisions } from './overlap-validator';

// =============================================================================
//  Composition debug badge (dev only)
//
//  Floating chip in the bottom-left corner that shows:
//    - selected template id
//    - active family id + name
//    - active variant slide types matched
//    - slot ids in the variant
//    - any slot overlap collisions detected at load time
//
//  Press D once on focus to toggle the panel open / closed.
// =============================================================================

interface Props {
  templateId: string | null | undefined;
  slideType:  string | undefined;
}

export const CompositionDebugBadge: React.FC<Props> = ({ templateId, slideType }) => {
  const [open, setOpen] = useState(false);
  if (process.env.NODE_ENV === 'production') return null;
  if (!templateId) return null;

  const info = debugRenderer(templateId, slideType);
  const collisions = getKnownCollisions();
  const familyCollisions = collisions.filter((c) => c.familyId === info.activeFamilyId);

  return (
    <div
      className="pointer-events-auto select-none"
      style={{
        position: 'fixed', left: 16, bottom: 16, zIndex: 1000,
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 10,
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Click to expand renderer debug info"
        className={`px-2.5 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 transition-colors ${
          info.activeFamilyId ? 'bg-emerald-600 hover:bg-emerald-700 text-white' : 'bg-amber-500 hover:bg-amber-600 text-white'
        }`}
      >
        <span style={{ width: 6, height: 6, borderRadius: 999, background: info.activeFamilyId ? '#ade7c1' : '#fde68a' }} />
        {info.activeFamilyName || 'no family — theme tokens only'}
        {familyCollisions.length > 0 && (
          <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-red-500 text-white text-[8px] font-bold">!</span>
        )}
      </button>

      {open && (
        <div className="mt-2 bg-white text-slate-800 border border-slate-200 rounded-lg shadow-2xl p-3" style={{ width: 320 }}>
          <Row label="Template id"   value={info.selectedTemplateId} />
          <Row label="Renderer"      value={info.activeFamilyId} />
          <Row label="Family name"   value={info.activeFamilyName} />
          <Row label="Slide type"    value={slideType || 'default'} />
          <Row label="Variant"       value={info.activeVariantTypes.join(', ') || '—'} />
          <Row label="Slots"         value={info.variantSlotIds.join(' · ') || '—'} />
          <div className="mt-2 pt-2 border-t border-slate-100">
            <div className="font-bold text-[10px] uppercase tracking-wider text-slate-500 mb-1">Overlap validator</div>
            {familyCollisions.length === 0 ? (
              <div className="text-emerald-600 font-semibold">✓ No slot collisions in this family</div>
            ) : (
              <div className="text-red-600">
                ✗ {familyCollisions.length} collision{familyCollisions.length === 1 ? '' : 's'} in this family
                <ul className="mt-1 pl-3 list-disc">
                  {familyCollisions.slice(0, 4).map((c, i) => (
                    <li key={i}>[{c.variantMatches.join(',')}] {c.a.id} ↔ {c.b.id} ({c.overlapArea.toFixed(1)}%)</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const Row: React.FC<{ label: string; value: string | null }> = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-0.5">
    <span className="text-slate-500 font-medium">{label}</span>
    <span className="text-slate-900 font-semibold truncate text-right" style={{ maxWidth: 200 }}>{value || '—'}</span>
  </div>
);
