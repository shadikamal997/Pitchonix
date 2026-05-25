'use client';

import React, { useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { MentionMeta } from './mention-tokens';
import { useCurrentWorkspace } from '@/features/workspaces/WorkspaceContext';

// =============================================================================
//  Phase 36.1A — MentionAutocomplete
//
//  Lightweight dropdown anchored to a host element (the comment composer's
//  textarea wrapper). The host owns the textarea + caret state; this
//  component only:
//
//    - debounces a GET /users/search?q= as the query changes
//    - renders the candidate list
//    - exposes keyboard navigation (↑/↓/Enter/Tab/Esc) through `onKeyEvent`
//    - calls `onSelect` with the chosen user
//
//  The host wires this to a `detectActiveMention()` watcher on the textarea
//  so we only show it when the user is typing inside an `@trigger`.
// =============================================================================

export interface AutocompleteUser {
  id:    string;
  name:  string | null;
  email: string;
}

interface Props {
  active:   boolean;
  query:    string;
  anchor:   { left: number; top: number } | null;   // viewport coords for positioning
  onSelect: (user: MentionMeta) => void;
  onClose:  () => void;
  /** Notifies the host so it can swallow the keydown when we handle it. */
  registerKeyHandler?: (h: (e: KeyboardEvent) => boolean) => void;
}

export const MentionAutocomplete: React.FC<Props> = ({
  active, query, anchor, onSelect, onClose, registerKeyHandler,
}) => {
  const [results, setResults] = useState<AutocompleteUser[]>([]);
  const [hoverIdx, setHoverIdx] = useState(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Phase 39.1B — scope autocomplete to the current workspace so mentions
  // can never reach users outside it.
  const { workspaceId } = useCurrentWorkspace();

  // Reset highlight on query change
  useEffect(() => { setHoverIdx(0); }, [query, active]);

  // Debounced search
  useEffect(() => {
    if (!active) { setResults([]); return; }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        const params: Record<string, any> = { q: query, limit: 8 };
        if (workspaceId) params.workspaceId = workspaceId;
        const { data } = await api.get<AutocompleteUser[]>(`/users/search`, { params });
        setResults(data || []);
      } catch {
        setResults([]);
      }
    }, 120);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [active, query, workspaceId]);

  // Keyboard nav routed through host so the textarea swallows handled keys.
  useEffect(() => {
    if (!registerKeyHandler || !active) return;
    registerKeyHandler((e) => {
      if (!active) return false;
      if (e.key === 'ArrowDown') {
        setHoverIdx((i) => Math.min(results.length - 1, i + 1));
        return true;
      }
      if (e.key === 'ArrowUp') {
        setHoverIdx((i) => Math.max(0, i - 1));
        return true;
      }
      if ((e.key === 'Enter' || e.key === 'Tab') && results[hoverIdx]) {
        const u = results[hoverIdx];
        onSelect({ userId: u.id, displayName: u.name || u.email });
        return true;
      }
      if (e.key === 'Escape') { onClose(); return true; }
      return false;
    });
  }, [active, results, hoverIdx, onSelect, onClose, registerKeyHandler]);

  if (!active || !anchor || results.length === 0) return null;

  return (
    <div
      role="listbox"
      aria-label="Mention suggestions"
      style={{
        position: 'fixed',
        left:     anchor.left,
        top:      anchor.top,
        zIndex:   200,
      }}
      className="w-64 bg-white border border-[#E3E1DA] rounded-lg shadow-xl py-1 max-h-64 overflow-auto"
    >
      {results.map((u, i) => {
        const focused = i === hoverIdx;
        return (
          <button
            key={u.id}
            type="button"
            onMouseEnter={() => setHoverIdx(i)}
            onClick={() => onSelect({ userId: u.id, displayName: u.name || u.email })}
            className={`w-full text-left px-2.5 py-1.5 flex items-center gap-2 transition-colors ${
              focused ? 'bg-[#EEF5F1]' : 'hover:bg-[#EDEBE6]'
            }`}
          >
            <div className="w-6 h-6 rounded-full bg-[#4F7563] text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {(u.name || u.email).charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs font-semibold text-[#111111] truncate">{u.name || u.email}</div>
              {u.name && <div className="text-[10px] text-[#9A9A9A] truncate">{u.email}</div>}
            </div>
          </button>
        );
      })}
    </div>
  );
};
