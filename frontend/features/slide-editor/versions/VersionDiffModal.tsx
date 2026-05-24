'use client';

import React, { useEffect, useState } from 'react';
import {
  X, Plus, Minus, ArrowDownUp, Pencil, Palette, FileType, ArrowRight,
} from 'lucide-react';
import type { DeckVersionDTO, VersionDiff } from '@/types/deck-version';

// =============================================================================
//  VersionDiffModal — Phase 35.1A
//
//  Side-by-side comparison of two saved versions. Uses the existing
//  `compareVersions(a, b)` API from useVersionHistory — no new backend work.
//
//  Layout:
//    - Header: "Version A → Version B" with metadata for both
//    - Summary section: 6 stat tiles (added / removed / reordered / text /
//      family / quality)
//    - Detail sections: added slides, removed slides, reordered slides,
//      family change banner if any
// =============================================================================

interface Props {
  /** Whichever version was clicked first ("from"). */
  versionA: DeckVersionDTO;
  /** Which version to compare against ("to"). */
  versionB: DeckVersionDTO;
  /** Calls `useVersionHistory().compare(a, b)`. */
  loadDiff: (aId: string, bId: string) => Promise<VersionDiff | null>;
  /** Called when the user dismisses the modal. */
  onClose: () => void;
}

export const VersionDiffModal: React.FC<Props> = ({ versionA, versionB, loadDiff, onClose }) => {
  const [diff, setDiff] = useState<VersionDiff | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadDiff(versionA.id, versionB.id).then((d) => {
      if (!cancelled) { setDiff(d); setLoading(false); }
    });
    return () => { cancelled = true; };
  }, [versionA.id, versionB.id, loadDiff]);

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={onClose}>
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-slate-900">Compare versions</div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="truncate max-w-[140px]" title={versionA.name}>{versionA.name}</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[140px]" title={versionB.name}>{versionB.name}</span>
            </div>
          </div>
          <button type="button" onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading && (
            <div className="text-[11px] text-slate-500 italic">Computing diff…</div>
          )}
          {!loading && diff && (
            <>
              <SummaryTiles diff={diff} />
              <DetailSection diff={diff} versionA={versionA} versionB={versionB} />
            </>
          )}
          {!loading && !diff && (
            <div className="text-[11px] text-slate-500 italic">Failed to compute diff.</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end">
          <button type="button" onClick={onClose} className="h-7 px-3 text-[11px] bg-slate-100 hover:bg-slate-200 rounded">
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// =============================================================================
//  Summary tiles
// =============================================================================
const SummaryTiles: React.FC<{ diff: VersionDiff }> = ({ diff }) => {
  const tiles: Array<{ icon: React.ReactNode; label: string; value: string; tone: string }> = [
    { icon: <Plus className="w-3 h-3" />,        label: 'Slides added',       value: String(diff.summary.slidesAdded),     tone: 'bg-green-50 text-green-700  border-green-200' },
    { icon: <Minus className="w-3 h-3" />,       label: 'Slides removed',     value: String(diff.summary.slidesRemoved),   tone: 'bg-red-50   text-red-700    border-red-200' },
    { icon: <ArrowDownUp className="w-3 h-3" />, label: 'Reordered',          value: String(diff.summary.slidesReordered), tone: 'bg-blue-50  text-blue-700   border-blue-200' },
    { icon: <Pencil className="w-3 h-3" />,      label: 'Text edits',         value: String(diff.summary.textEdits),       tone: 'bg-amber-50 text-amber-700  border-amber-200' },
    { icon: <Palette className="w-3 h-3" />,     label: 'Family',             value: diff.summary.familyChanged ? 'Changed' : 'Same', tone: diff.summary.familyChanged ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-slate-50 text-slate-500 border-slate-200' },
    { icon: <FileType className="w-3 h-3" />,    label: 'Masters',            value: signed(diff.summary.masterCountDelta), tone: diff.summary.masterCountDelta === 0 ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2 mb-4">
      {tiles.map((t) => (
        <div key={t.label} className={`border rounded p-2 ${t.tone}`}>
          <div className="flex items-center gap-1 text-[10px] font-medium uppercase tracking-wide opacity-80">
            {t.icon} {t.label}
          </div>
          <div className="mt-1 text-base font-semibold leading-none">{t.value}</div>
        </div>
      ))}
    </div>
  );
};

// =============================================================================
//  Detail section — lists of added / removed / reordered slides
// =============================================================================
const DetailSection: React.FC<{ diff: VersionDiff; versionA: DeckVersionDTO; versionB: DeckVersionDTO }> = ({ diff }) => (
  <>
    {diff.summary.familyChanged && (
      <Section title="Family changed">
        <div className="text-[11px] text-slate-700">
          <span className="px-1.5 py-0.5 bg-red-50 text-red-700 rounded">{diff.details.fromFamily || '—'}</span>
          <span className="mx-1.5 text-slate-400">→</span>
          <span className="px-1.5 py-0.5 bg-green-50 text-green-700 rounded">{diff.details.toFamily || '—'}</span>
        </div>
      </Section>
    )}

    {diff.details.addedSlides.length > 0 && (
      <Section title={`Slides added (${diff.details.addedSlides.length})`}>
        <ul className="space-y-1">
          {diff.details.addedSlides.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px]">
              <Badge label="+" tone="green" />
              <span className="text-slate-700 truncate">{s.title || `(untitled ${s.type})`}</span>
              <span className="text-[10px] text-slate-400">· {s.type}</span>
            </li>
          ))}
        </ul>
      </Section>
    )}

    {diff.details.removedSlides.length > 0 && (
      <Section title={`Slides removed (${diff.details.removedSlides.length})`}>
        <ul className="space-y-1">
          {diff.details.removedSlides.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px]">
              <Badge label="−" tone="red" />
              <span className="text-slate-700 truncate line-through opacity-70">{s.title || `(untitled ${s.type})`}</span>
              <span className="text-[10px] text-slate-400">· {s.type}</span>
            </li>
          ))}
        </ul>
      </Section>
    )}

    {diff.details.reorderedSlides.length > 0 && (
      <Section title={`Slides reordered (${diff.details.reorderedSlides.length})`}>
        <ul className="space-y-1">
          {diff.details.reorderedSlides.map((s, i) => (
            <li key={i} className="flex items-center gap-2 text-[11px]">
              <Badge label="↕" tone="blue" />
              <span className="text-slate-700 truncate">{s.title}</span>
              <span className="text-[10px] text-slate-400">· #{s.from + 1} → #{s.to + 1}</span>
            </li>
          ))}
        </ul>
      </Section>
    )}

    {diff.details.addedSlides.length === 0 &&
     diff.details.removedSlides.length === 0 &&
     diff.details.reorderedSlides.length === 0 &&
     !diff.summary.familyChanged && (
      <div className="text-[11px] text-slate-500 italic">No structural changes between these versions.</div>
    )}
  </>
);

// =============================================================================
//  Reusable bits
// =============================================================================
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-4">
    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">{title}</div>
    {children}
  </div>
);

const Badge: React.FC<{ label: string; tone: 'green' | 'red' | 'blue' | 'orange' }> = ({ label, tone }) => {
  const cls = {
    green:  'bg-green-100  text-green-700',
    red:    'bg-red-100    text-red-700',
    blue:   'bg-blue-100   text-blue-700',
    orange: 'bg-orange-100 text-orange-700',
  }[tone];
  return (
    <span className={`inline-flex items-center justify-center w-4 h-4 rounded text-[10px] font-bold flex-shrink-0 ${cls}`}>{label}</span>
  );
};

function signed(n: number): string {
  if (n === 0) return '0';
  return n > 0 ? `+${n}` : `${n}`;
}

// Re-export for callers that want to render their own badges (35.1B).
export { Badge as VersionDiffBadge };
