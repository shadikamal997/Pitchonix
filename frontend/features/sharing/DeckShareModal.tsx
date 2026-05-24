'use client';

import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import { X, Share2, Globe, Lock, Building2, Search, Copy, Check, Trash2 } from 'lucide-react';
import { useDeckShares, type DeckPermission, type SharingMode } from './useDeckShares';
import { useCurrentWorkspace } from '@/features/workspaces/WorkspaceContext';

// =============================================================================
//  Phase 39.1D — DeckShareModal
//
//  Visibility tabs (Private / Workspace / Shared) + explicit grant list with
//  member search and per-row permission selector. Search results are scoped
//  to the current workspace (passes ?workspaceId=).
// =============================================================================

interface WorkspaceUser { id: string; name: string | null; email: string }

interface Props {
  open:      boolean;
  projectId: string | null;
  /** Public share link for the deck — host owns the URL shape (deck page). */
  shareLink?: string;
  onClose:   () => void;
}

const MODE_OPTIONS: Array<{
  value: SharingMode; label: string; description: string; Icon: React.ComponentType<any>;
}> = [
  { value: 'private',   label: 'Private',           description: 'Only you',                                        Icon: Lock },
  { value: 'workspace', label: 'Everyone in workspace', description: 'Members inherit access via their role',       Icon: Building2 },
  { value: 'shared',    label: 'Specific people',       description: 'Workspace access + explicit grants below',    Icon: Globe },
];

const PERM_LABEL: Record<DeckPermission, string> = {
  view: 'View', comment: 'Comment', review: 'Review', edit: 'Edit',
};

export const DeckShareModal: React.FC<Props> = ({ open, projectId, shareLink, onClose }) => {
  const detail = useDeckShares(projectId);
  const { workspaceId } = useCurrentWorkspace();

  const [searchQ,   setSearchQ]   = useState('');
  const [searchResults, setSearchResults] = useState<WorkspaceUser[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [linkCopied, setLinkCopied] = useState(false);

  useEffect(() => {
    if (!open) { setSearchQ(''); setSearchResults([]); }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const q = searchQ.trim();
      if (!q) { setSearchResults([]); return; }
      setSearching(true);
      try {
        const params: Record<string, any> = { q, limit: 8 };
        if (workspaceId) params.workspaceId = workspaceId;
        const { data } = await api.get<WorkspaceUser[]>('/users/search', { params });
        // Hide users who already have an explicit grant.
        const granted = new Set(detail.shares.map((s) => s.member.id));
        setSearchResults((data || []).filter((u) => !granted.has(u.id)));
      } finally { setSearching(false); }
    }, 150);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchQ, workspaceId, open, detail.shares]);

  if (!open) return null;

  const handleCopyLink = async () => {
    if (!shareLink) return;
    try {
      await navigator.clipboard.writeText(shareLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 1500);
    } catch { /* clipboard blocked */ }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Share2 className="w-4 h-4 text-blue-600" /> Share this deck
          </h2>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-100"><X className="w-4 h-4 text-slate-500" /></button>
        </div>

        <div className="px-5 py-4 space-y-4">
          {/* Visibility */}
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Visibility</p>
            <div className="space-y-1">
              {MODE_OPTIONS.map((opt) => {
                const Icon = opt.Icon;
                const active = detail.mode === opt.value;
                return (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-2 p-2 rounded cursor-pointer transition-colors ${
                      active ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="mode"
                      value={opt.value}
                      checked={active}
                      onChange={() => detail.setSharingMode(opt.value)}
                      className="mt-1"
                    />
                    <Icon className="w-3.5 h-3.5 text-slate-600 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-900">{opt.label}</div>
                      <div className="text-[10px] text-slate-500">{opt.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </section>

          {/* Shared-mode explicit grants */}
          {detail.mode === 'shared' && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">People with access</p>
              <div className="relative mb-2">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                <input
                  value={searchQ}
                  onChange={(e) => setSearchQ(e.target.value)}
                  placeholder="Search workspace members…"
                  className="w-full h-8 pl-7 pr-2 text-xs bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-500 focus:bg-white"
                />
                {searchResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 max-h-48 overflow-auto bg-white border border-slate-200 rounded-lg shadow-xl z-10">
                    {searchResults.map((u) => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={async () => {
                          await detail.upsert(u.id, 'view');
                          setSearchQ('');
                          setSearchResults([]);
                        }}
                        className="w-full text-left px-2.5 py-1.5 flex items-center gap-2 hover:bg-slate-50"
                      >
                        <div className="w-6 h-6 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                          {(u.name || u.email).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-slate-900 truncate">{u.name || u.email}</div>
                          {u.name && <div className="text-[10px] text-slate-500 truncate">{u.email}</div>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
                {searching && <div className="text-[10px] text-slate-400 mt-1">Searching…</div>}
              </div>

              {detail.shares.length === 0 ? (
                <div className="text-xs text-slate-500 italic">No explicit grants yet.</div>
              ) : (
                <ul className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {detail.shares.map((s) => (
                    <li key={s.id} className="flex items-center gap-2 px-3 py-2">
                      <div className="w-7 h-7 rounded-full bg-blue-500 text-white text-xs font-bold flex items-center justify-center">
                        {(s.member.name || s.member.email).charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">{s.member.name || s.member.email}</div>
                        {s.member.name && <div className="text-[10px] text-slate-500 truncate">{s.member.email}</div>}
                      </div>
                      <select
                        value={s.permission}
                        onChange={(e) => detail.upsert(s.member.id, e.target.value as DeckPermission)}
                        className="text-xs border border-slate-300 rounded px-1.5 py-0.5"
                      >
                        {(['view', 'comment', 'review', 'edit'] as const).map((p) => (
                          <option key={p} value={p}>{PERM_LABEL[p]}</option>
                        ))}
                      </select>
                      <button
                        onClick={() => detail.revoke(s.id)}
                        title="Revoke"
                        className="p-1 rounded text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          {/* Copy link */}
          {shareLink && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">Share link</p>
              <div className="flex items-center gap-1.5">
                <input
                  readOnly
                  value={shareLink}
                  className="flex-1 px-2 py-1.5 text-xs font-mono bg-slate-50 border border-slate-200 rounded"
                />
                <button
                  onClick={handleCopyLink}
                  className="h-8 px-3 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white rounded inline-flex items-center gap-1.5"
                >
                  {linkCopied ? <><Check className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                </button>
              </div>
            </section>
          )}
        </div>

        <div className="px-5 py-3 border-t border-slate-200 flex justify-end">
          <button onClick={onClose} className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 rounded">Done</button>
        </div>
      </div>
    </div>
  );
};
