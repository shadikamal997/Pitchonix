'use client';

import React from 'react';
import { AlertTriangle, RotateCcw, X, Calendar, Layers, Award, Palette } from 'lucide-react';
import type { DeckVersionDTO } from '@/types/deck-version';
import { VERSION_TYPE_LABEL } from '@/types/deck-version';

// =============================================================================
//  RestoreVersionModal — Phase 35.1E
//
//  Rich confirmation dialog for restoring an old version. Replaces the
//  bare `confirm()` so the user can see exactly what they're rolling back
//  to (name, type, date, slide count, family, quality score) and the
//  reassurance that a safety snapshot is taken automatically.
// =============================================================================

interface Props {
  version:   DeckVersionDTO;
  onCancel:  () => void;
  onConfirm: () => Promise<void> | void;
  /** Lock the action button while the restore call is in flight. */
  busy?:     boolean;
}

export const RestoreVersionModal: React.FC<Props> = ({ version, onCancel, onConfirm, busy }) => {
  const date = new Date(version.createdAt).toLocaleString(
    undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric' },
  );

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-6" onClick={busy ? undefined : onCancel}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <RotateCcw className="w-4 h-4 text-violet-600" />
            <span className="text-sm font-semibold">Restore version</span>
          </div>
          {!busy && (
            <button type="button" onClick={onCancel} className="w-7 h-7 flex items-center justify-center rounded text-slate-500 hover:bg-slate-100">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Body */}
        <div className="p-4 space-y-3">
          <div>
            <div className="text-[13px] font-medium text-slate-900">{version.name}</div>
            {version.description && (
              <div className="text-[11px] text-slate-500 mt-1">{version.description}</div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <MetaRow icon={<Calendar className="w-3 h-3" />} label="Captured" value={date} />
            <MetaRow icon={<Layers   className="w-3 h-3" />} label="Slides"   value={String(version.slideCount)} />
            <MetaRow icon={<Palette  className="w-3 h-3" />} label="Family"   value={version.familyId || '—'} />
            <MetaRow icon={<Award    className="w-3 h-3" />} label="Quality"  value={version.qualityScore != null ? `${version.qualityScore}/100` : '—'} />
          </div>

          <div className="text-[10px] text-slate-500">
            Type: <span className="px-1.5 py-0.5 bg-slate-100 rounded">{VERSION_TYPE_LABEL[version.type]}</span>
          </div>

          {/* Safety reassurance */}
          <div className="flex items-start gap-2 p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-800">
            <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
            <div>
              <strong>This will replace your current deck.</strong> A safety snapshot of the current state will be created automatically so this restore is reversible.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-200 flex justify-end gap-1.5">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="h-7 px-3 text-[11px] bg-slate-100 hover:bg-slate-200 rounded disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="h-7 px-3 text-[11px] bg-violet-600 hover:bg-violet-700 text-white rounded disabled:bg-slate-300 flex items-center gap-1.5"
          >
            <RotateCcw className="w-3 h-3" />
            {busy ? 'Restoring…' : 'Restore version'}
          </button>
        </div>
      </div>
    </div>
  );
};

const MetaRow: React.FC<{ icon: React.ReactNode; label: string; value: string }> = ({ icon, label, value }) => (
  <div className="flex items-center gap-1.5 text-slate-700 bg-slate-50 border border-slate-200 rounded px-2 py-1.5">
    <span className="text-slate-400">{icon}</span>
    <div className="min-w-0 flex-1">
      <div className="text-[9px] uppercase tracking-wide text-slate-500">{label}</div>
      <div className="truncate font-medium">{value}</div>
    </div>
  </div>
);
