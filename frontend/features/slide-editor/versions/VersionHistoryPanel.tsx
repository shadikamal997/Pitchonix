'use client';

import React, { useEffect, useMemo, useState } from 'react';
import {
  History, Save, RotateCcw, Trash2, Eye, Edit2, Search, GitCompare, X,
} from 'lucide-react';
import { PanelSection, Row, TextField, TextArea } from '../inspector/Primitives';
import { useVersionHistory } from './useVersionHistory';
import { VersionDiffModal } from './VersionDiffModal';
import { RestoreVersionModal } from './RestoreVersionModal';
import {
  filterVersions, countByType, FILTER_MODES, FILTER_MODE_LABEL, VersionFilterMode,
} from './version-filter';
import type { DeckVersionDTO, DeckVersionType } from '@/types/deck-version';
import { VERSION_TYPE_LABEL } from '@/types/deck-version';
import { toastSuccess, toastError } from '@/hooks/useToast';

// =============================================================================
//  VersionHistoryPanel — Phase 35 (initial) + 35.1 (UX completion)
//
//  Sidebar pane that consolidates everything the user can do with version
//  history:
//
//    - Save manual snapshots (+ Cmd/Ctrl+Shift+S shortcut)
//    - Search + filter the timeline
//    - Preview a version (via the parent's `onPreview` callback)
//    - Rich restore confirmation modal (with safety reassurance)
//    - Two-version diff modal (compare flow)
//    - Rename / delete entries
//    - Helpful empty state with an explanation
//
//  500-version performance: list rows are lightweight (a few divs each); at
//  500 items this stays under a frame budget without virtualisation. For
//  decks that accumulate 1000+ versions, swap the inner <ul> for
//  react-window — the row shape is already extracted into `VersionRow`.
// =============================================================================

interface Props {
  deckId: string;
  /** Emit when the user clicks Preview — the parent enters preview mode. */
  onPreview?: (versionId: string) => void;
  /** Optional toast hook — defaults to `alert` if not supplied. */
  toast?: (message: string, tone?: 'success' | 'error') => void;
  /** Phase Ω.1 — invoked after a successful restore so the parent can
   *  refresh the canvas / element array. Without this, the editor keeps
   *  showing pre-restore state until manual reload. */
  onRestored?: () => void;
}

const TYPE_TONE: Record<DeckVersionType, string> = {
  AUTO_SAVE:        'bg-slate-100 text-slate-600',
  MANUAL_SNAPSHOT:  'bg-blue-100  text-blue-700',
  GENERATED:        'bg-green-100 text-green-700',
  REGENERATED:      'bg-green-100 text-green-700',
  RESTORED:         'bg-violet-100 text-violet-700',
  FAMILY_CHANGED:   'bg-amber-100 text-amber-700',
  TEMPLATE_CHANGED: 'bg-amber-100 text-amber-700',
  EXPORTED:         'bg-cyan-100  text-cyan-700',
  SAFETY:           'bg-rose-100  text-rose-700',
};

export const VersionHistoryPanel: React.FC<Props> = ({ deckId, onPreview, toast, onRestored }) => {
  const v = useVersionHistory(deckId);
  const emit = useToast(toast);

  // --- search + filter -----------------------------------------------------
  const [query, setQuery]   = useState('');
  const [mode, setMode]     = useState<VersionFilterMode>('all');
  const counts   = useMemo(() => countByType(v.versions), [v.versions]);
  const filtered = useMemo(() => filterVersions(v.versions, query, mode), [v.versions, query, mode]);

  // --- save manual snapshot modal -----------------------------------------
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [saveName, setSaveName] = useState('');
  const [saveDesc, setSaveDesc] = useState('');

  // --- restore confirmation modal -----------------------------------------
  const [restoreTarget, setRestoreTarget] = useState<DeckVersionDTO | null>(null);
  const [restoreBusy,   setRestoreBusy]   = useState(false);

  // --- compare picker + diff modal ----------------------------------------
  const [compareSelection, setCompareSelection] = useState<DeckVersionDTO[]>([]);
  const compareReady = compareSelection.length === 2;
  const [diffOpen, setDiffOpen] = useState(false);

  // --- Quick-snapshot shortcut (Cmd/Ctrl+Shift+S) -------------------------
  useEffect(() => {
    const onKey = async (e: KeyboardEvent) => {
      const cmd = e.metaKey || e.ctrlKey;
      if (cmd && e.shiftKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        const dt = new Date().toLocaleString();
        const created = await v.saveManual(`Quick snapshot · ${dt}`);
        if (created) emit('Version saved successfully', 'success');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [v, emit]);

  // --- Compare selection toggling -----------------------------------------
  const toggleCompare = (row: DeckVersionDTO) => {
    setCompareSelection((prev) => {
      const exists = prev.find((p) => p.id === row.id);
      if (exists) return prev.filter((p) => p.id !== row.id);
      if (prev.length >= 2) return [prev[1], row]; // drop oldest selection
      return [...prev, row];
    });
  };

  // --- Actions -------------------------------------------------------------
  const saveManual = async () => {
    const ok = await v.saveManual(saveName.trim(), saveDesc.trim() || undefined);
    if (ok) {
      setShowSaveModal(false);
      emit('Version saved successfully', 'success');
    } else {
      emit('Failed to save version', 'error');
    }
  };

  const confirmRestore = async () => {
    if (!restoreTarget) return;
    setRestoreBusy(true);
    const result = await v.restore(restoreTarget.id);
    setRestoreBusy(false);
    setRestoreTarget(null);
    if (result) {
      emit(`Version "${restoreTarget.name}" restored`, 'success');
      // Phase Ω.1 — local restore doesn't trigger our own websocket
      // `version.restored` handler (broadcast goes only to other clients),
      // so refresh the parent canvas here too.
      onRestored?.();
    } else {
      emit('Failed to restore version', 'error');
    }
  };

  // =========================================================================
  //  Render
  // =========================================================================

  return (
    <div className="text-xs flex flex-col h-full">
      {/* Header */}
      <PanelSection title="Version history">
        <button
          type="button"
          onClick={() => { setSaveName(''); setSaveDesc(''); setShowSaveModal(true); }}
          className="w-full h-8 flex items-center justify-center gap-1.5 text-[11px] bg-blue-500 hover:bg-blue-600 text-white rounded"
        >
          <Save className="w-3 h-3" />
          Save version
          <span className="ml-1 text-[9px] opacity-70">⌘⇧S</span>
        </button>
      </PanelSection>

      {/* Search + filter — only render when we actually have versions */}
      {v.versions.length > 0 && (
        <div className="px-3 py-2 border-b border-slate-100 space-y-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded h-7 px-2">
            <Search className="w-3 h-3 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search versions…"
              className="flex-1 bg-transparent text-xs outline-none"
            />
            {query && (
              <button type="button" onClick={() => setQuery('')} className="text-slate-400 hover:text-slate-700">
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {FILTER_MODES.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`h-5 px-1.5 text-[10px] rounded ${
                  mode === m
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                }`}
              >
                {FILTER_MODE_LABEL[m]}
                {counts[m] > 0 && <span className="ml-1 opacity-70">{counts[m]}</span>}
              </button>
            ))}
          </div>

          {/* Compare selection bar */}
          {compareSelection.length > 0 && (
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-200 rounded px-2 py-1">
              <GitCompare className="w-3 h-3 text-blue-600" />
              <span className="text-[10px] text-blue-700 flex-1 truncate">
                {compareSelection.length === 1 ? 'Pick a 2nd version' : `Compare "${compareSelection[0].name}" → "${compareSelection[1].name}"`}
              </span>
              {compareReady && (
                <button type="button"
                  onClick={() => setDiffOpen(true)}
                  className="h-5 px-1.5 text-[10px] bg-blue-600 hover:bg-blue-700 text-white rounded font-medium"
                >
                  Compare
                </button>
              )}
              <button type="button" onClick={() => setCompareSelection([])} className="text-blue-400 hover:text-blue-700">
                <X className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>
      )}

      {v.error && <div className="px-3 py-2 bg-red-50 text-red-800 text-[11px]">{v.error}</div>}

      {/* Timeline */}
      <div className="flex-1 overflow-y-auto">
        {v.loading && v.versions.length === 0 && (
          <div className="px-3 py-4 text-[11px] text-slate-500 italic">Loading…</div>
        )}

        {/* Empty state (35.1L) */}
        {!v.loading && v.versions.length === 0 && (
          <EmptyState onSave={() => { setSaveName(''); setSaveDesc(''); setShowSaveModal(true); }} />
        )}

        {/* No matches state */}
        {!v.loading && v.versions.length > 0 && filtered.length === 0 && (
          <div className="px-3 py-6 text-center text-[11px] text-slate-500">
            No versions match your search or filter.
            <button type="button" onClick={() => { setQuery(''); setMode('all'); }} className="block mx-auto mt-1.5 text-blue-600 hover:text-blue-700">
              Clear filters
            </button>
          </div>
        )}

        {filtered.length > 0 && (
          <ul className="px-3 py-2 space-y-1.5">
            {filtered.map((row) => (
              <VersionRow
                key={row.id}
                row={row}
                selectedForCompare={!!compareSelection.find((p) => p.id === row.id)}
                onPreview={() => onPreview?.(row.id)}
                onRestore={() => setRestoreTarget(row)}
                onRename={async () => {
                  const name = prompt('New name', row.name);
                  if (!name) return;
                  await v.rename(row.id, name);
                }}
                onDelete={async () => {
                  if (!confirm(`Delete version "${row.name}"? This cannot be undone.`)) return;
                  await v.remove(row.id);
                }}
                onToggleCompare={() => toggleCompare(row)}
              />
            ))}
          </ul>
        )}
      </div>

      {/* Save-version modal */}
      {showSaveModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center" onClick={() => setShowSaveModal(false)}>
          <div className="bg-white rounded-lg shadow-xl w-80 p-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-sm font-semibold mb-3 flex items-center gap-1.5">
              <History className="w-4 h-4 text-blue-500" /> Save version
            </h3>
            <div className="space-y-2.5">
              <Row label="Name">
                <TextField value={saveName} onChange={setSaveName} placeholder="Before investor edits" />
              </Row>
              <Row label="Notes">
                <TextArea value={saveDesc} onChange={setSaveDesc} placeholder="Optional description" rows={3} />
              </Row>
            </div>
            <div className="mt-4 flex justify-end gap-1.5">
              <button type="button" onClick={() => setShowSaveModal(false)} className="h-7 px-3 text-[11px] bg-slate-100 hover:bg-slate-200 rounded">Cancel</button>
              <button type="button"
                disabled={!saveName.trim()}
                onClick={saveManual}
                className="h-7 px-3 text-[11px] bg-blue-500 hover:bg-blue-600 text-white rounded disabled:bg-slate-300"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore-version modal (35.1E) */}
      {restoreTarget && (
        <RestoreVersionModal
          version={restoreTarget}
          busy={restoreBusy}
          onCancel={() => setRestoreTarget(null)}
          onConfirm={confirmRestore}
        />
      )}

      {/* Diff modal (35.1A) */}
      {diffOpen && compareReady && (
        <VersionDiffModal
          versionA={compareSelection[0]}
          versionB={compareSelection[1]}
          loadDiff={v.compare}
          onClose={() => setDiffOpen(false)}
        />
      )}
    </div>
  );
};

// =============================================================================
//  Sub-components
// =============================================================================

const VersionRow: React.FC<{
  row: DeckVersionDTO;
  selectedForCompare: boolean;
  onPreview: () => void;
  onRestore: () => void;
  onRename: () => void;
  onDelete: () => void;
  onToggleCompare: () => void;
}> = ({ row, selectedForCompare, onPreview, onRestore, onRename, onDelete, onToggleCompare }) => {
  const date = new Date(row.createdAt).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: 'numeric', minute: 'numeric',
  });
  return (
    <li className={`group border rounded p-2 ${selectedForCompare ? 'border-blue-400 bg-blue-50/40' : 'border-slate-200 bg-white hover:border-slate-300'}`}>
      <div className="flex items-center gap-1.5">
        <span className={`text-[9px] px-1.5 py-0.5 rounded uppercase tracking-wide ${TYPE_TONE[row.type]}`}>
          {VERSION_TYPE_LABEL[row.type]}
        </span>
        <span className="text-[10px] text-slate-400 flex-1 truncate">{date}</span>
        {typeof row.qualityScore === 'number' && (
          <span className="text-[10px] font-semibold text-slate-600">{row.qualityScore}</span>
        )}
      </div>
      <div className="mt-1 text-[11px] font-medium text-slate-800 truncate">{row.name}</div>
      {row.description && (
        <div className="text-[10px] text-slate-500 truncate">{row.description}</div>
      )}
      <div className="mt-1 flex items-center gap-1 text-[10px] text-slate-500">
        <span>{row.slideCount} slides</span>
        {row.familyId && <span>· {row.familyId}</span>}
      </div>
      <div className="mt-1.5 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button type="button" onClick={onPreview} title="Preview" className="h-5 px-1.5 text-[10px] bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded flex items-center gap-1">
          <Eye className="w-2.5 h-2.5" /> Preview
        </button>
        <button type="button" onClick={onRestore} title="Restore" className="h-5 px-1.5 text-[10px] bg-violet-50 hover:bg-violet-100 text-violet-700 border border-violet-200 rounded flex items-center gap-1">
          <RotateCcw className="w-2.5 h-2.5" /> Restore
        </button>
        <button type="button" onClick={onToggleCompare} title="Add to compare" className={`h-5 px-1.5 text-[10px] border rounded flex items-center gap-1 ${selectedForCompare ? 'bg-blue-100 text-blue-700 border-blue-300' : 'bg-slate-50 hover:bg-slate-100 border-slate-200'}`}>
          <GitCompare className="w-2.5 h-2.5" /> Compare
        </button>
        <div className="flex-1" />
        <button type="button" onClick={onRename} title="Rename" className="h-5 w-5 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-600">
          <Edit2 className="w-2.5 h-2.5" />
        </button>
        <button type="button" onClick={onDelete} title="Delete" className="h-5 w-5 flex items-center justify-center bg-slate-50 hover:bg-red-50 border border-slate-200 rounded text-slate-400 hover:text-red-600">
          <Trash2 className="w-2.5 h-2.5" />
        </button>
      </div>
    </li>
  );
};

const EmptyState: React.FC<{ onSave: () => void }> = ({ onSave }) => (
  <div className="px-3 py-8 text-center">
    <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-blue-50 flex items-center justify-center">
      <History className="w-5 h-5 text-blue-500" />
    </div>
    <div className="text-[12px] font-medium text-slate-700">No versions yet</div>
    <div className="text-[11px] text-slate-500 mt-1 max-w-[200px] mx-auto leading-relaxed">
      Save a snapshot before risky edits, theme swaps, or sharing the deck with reviewers. Restore any version in one click.
    </div>
    <button
      type="button"
      onClick={onSave}
      className="mt-3 h-7 px-3 text-[11px] bg-blue-500 hover:bg-blue-600 text-white rounded inline-flex items-center gap-1.5"
    >
      <Save className="w-3 h-3" /> Create snapshot
    </button>
  </div>
);

// =============================================================================
//  Toast helper — Phase 35.1A
//
//  Defaults to the app's global toast system (`toastSuccess` / `toastError`
//  from @/hooks/useToast). Callers can still pass a `toast` prop to override
//  (e.g. tests that want to capture calls).
// =============================================================================
function useToast(provided?: Props['toast']) {
  return (msg: string, tone: 'success' | 'error' = 'success') => {
    if (provided) { provided(msg, tone); return; }
    if (tone === 'error') toastError(msg);
    else                  toastSuccess(msg);
  };
}
