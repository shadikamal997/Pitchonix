'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type { DeckVersionDTO, VersionDiff } from '@/types/deck-version';

// =============================================================================
//  useVersionHistory — Phase 35
//
//  Loads the version timeline for a deck and exposes imperative actions
//  (create manual snapshot, restore, rename, delete, compare).
// =============================================================================

export interface UseVersionHistory {
  versions:    DeckVersionDTO[];
  loading:     boolean;
  error:       string | null;
  refresh:     () => Promise<void>;
  saveManual:  (name: string, description?: string) => Promise<DeckVersionDTO | null>;
  restore:     (versionId: string) => Promise<{ restoredVersionId: string; safetyVersionId: string } | null>;
  rename:      (versionId: string, name: string, description?: string) => Promise<void>;
  remove:      (versionId: string) => Promise<void>;
  compare:     (a: string, b: string) => Promise<VersionDiff | null>;
  preview:     (versionId: string) => Promise<{ meta: DeckVersionDTO; snapshot: any } | null>;
}

export function useVersionHistory(deckId: string | null | undefined): UseVersionHistory {
  const [versions, setVersions] = useState<DeckVersionDTO[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!deckId) return;
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<DeckVersionDTO[]>(`/decks/${deckId}/versions`);
      setVersions(data || []);
    } catch (e: any) { setError(e?.message || 'Failed to load versions'); }
    finally { setLoading(false); }
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  const saveManual = useCallback(async (name: string, description?: string) => {
    if (!deckId) return null;
    try {
      const { data } = await api.post<DeckVersionDTO>(`/decks/${deckId}/versions`, {
        type: 'MANUAL_SNAPSHOT', name, description,
      });
      setVersions((prev) => [data, ...prev]);
      return data;
    } catch (e: any) { setError(e?.message || 'Failed to save version'); return null; }
  }, [deckId]);

  const restore = useCallback(async (versionId: string) => {
    try {
      const { data } = await api.post<{ restoredVersionId: string; safetyVersionId: string }>(`/versions/${versionId}/restore`);
      await refresh();
      return data;
    } catch (e: any) { setError(e?.message || 'Failed to restore'); return null; }
  }, [refresh]);

  const rename = useCallback(async (versionId: string, name: string, description?: string) => {
    try {
      const { data } = await api.patch<DeckVersionDTO>(`/versions/${versionId}`, { name, description });
      setVersions((prev) => prev.map((v) => (v.id === versionId ? data : v)));
    } catch (e: any) { setError(e?.message || 'Failed to rename'); }
  }, []);

  const remove = useCallback(async (versionId: string) => {
    try {
      await api.delete(`/versions/${versionId}`);
      setVersions((prev) => prev.filter((v) => v.id !== versionId));
    } catch (e: any) { setError(e?.message || 'Failed to delete'); }
  }, []);

  const compare = useCallback(async (a: string, b: string) => {
    try {
      const { data } = await api.get<VersionDiff>(`/versions/${a}/diff/${b}`);
      return data;
    } catch (e: any) { setError(e?.message || 'Failed to compare'); return null; }
  }, []);

  const preview = useCallback(async (versionId: string) => {
    try {
      const { data } = await api.get<{ meta: DeckVersionDTO; snapshot: any }>(`/versions/${versionId}`);
      return data;
    } catch (e: any) { setError(e?.message || 'Failed to preview'); return null; }
  }, []);

  return { versions, loading, error, refresh, saveManual, restore, rename, remove, compare, preview };
}
