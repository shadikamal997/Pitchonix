'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type { DeckVersionDTO } from '@/types/deck-version';

// =============================================================================
//  useVersionPreview — Phase 35.1C/D + 35.1A
//
//  Single source of truth for "the editor is previewing a historical version".
//  Provider holds the state; every consumer (canvas, mutation hooks, banner,
//  panel, inspector) reads via `useVersionPreview()` and gets the SAME state.
//
//  Without the provider, `useVersionPreview()` returns a benign no-op state
//  (`isPreviewing: false`, no-op `enter`/`exit`). That keeps tests + non-
//  editor pages safe without forcing every consumer to wrap in a provider.
//
//  Mutation hooks use `useIsPreviewing()` as a cheap boolean read.
// =============================================================================

export interface PreviewState {
  isPreviewing:    boolean;
  versionId:       string | null;
  meta:            DeckVersionDTO | null;
  /** Full snapshot payload (DeckSnapshot shape) — opaque here. */
  snapshot:        any | null;
  loading:         boolean;
  enter:           (versionId: string) => Promise<void>;
  exit:            () => void;
}

const NOOP_STATE: PreviewState = {
  isPreviewing: false, versionId: null, meta: null, snapshot: null, loading: false,
  enter: async () => {},
  exit:  () => {},
};

const VersionPreviewContext = createContext<PreviewState>(NOOP_STATE);

/** Use this in the consumer tree. Returns the shared state from the provider. */
export function useVersionPreview(): PreviewState {
  return useContext(VersionPreviewContext);
}

/** Read-only convenience for mutation hooks. */
export function useIsPreviewing(): boolean {
  return useContext(VersionPreviewContext).isPreviewing;
}

// =============================================================================
//  Provider — wrap the editor shell so all descendants share state.
// =============================================================================
export const VersionPreviewProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [versionId, setVersionId] = useState<string | null>(null);
  const [meta, setMeta]           = useState<DeckVersionDTO | null>(null);
  const [snapshot, setSnapshot]   = useState<any | null>(null);
  const [loading, setLoading]     = useState(false);

  const enter = useCallback(async (id: string) => {
    setLoading(true);
    try {
      const { data } = await api.get<{ meta: DeckVersionDTO; snapshot: any }>(`/versions/${id}`);
      setVersionId(id); setMeta(data.meta); setSnapshot(data.snapshot);
    } finally { setLoading(false); }
  }, []);

  const exit = useCallback(() => {
    setVersionId(null); setMeta(null); setSnapshot(null);
  }, []);

  // ESC exits preview as a quality-of-life keyboard shortcut.
  useEffect(() => {
    if (!versionId) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') exit(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [versionId, exit]);

  const value = useMemo<PreviewState>(() => ({
    isPreviewing: !!versionId,
    versionId, meta, snapshot, loading,
    enter, exit,
  }), [versionId, meta, snapshot, loading, enter, exit]);

  // Use createElement instead of JSX so the file can stay `.ts` (no JSX
  // parser involvement — keeps the hooks tree-shake friendly).
  return React.createElement(VersionPreviewContext.Provider, { value }, children);
};

// =============================================================================
//  useSlidesForRender — convenience hook for canvas integration (35.1A Task 1)
//
//  Pass the live slides; receive the slides to actually render. When the
//  editor is previewing, returns the snapshot slides; otherwise returns the
//  live array unchanged. Identity-stable across renders when preview state
//  hasn't changed so React.memo'd children don't thrash.
// =============================================================================
export function useSlidesForRender<T>(liveSlides: T[]): T[] {
  const preview = useVersionPreview();
  return useMemo(() => {
    if (!preview.isPreviewing) return liveSlides;
    const snap = preview.snapshot?.slides;
    if (!Array.isArray(snap)) return liveSlides;
    // Cast — the caller knows the runtime shape; the snapshot rows have the
    // same surface (type, title, content, elements[]) that the renderer needs.
    return snap as unknown as T[];
  }, [preview.isPreviewing, preview.snapshot, liveSlides]);
}
