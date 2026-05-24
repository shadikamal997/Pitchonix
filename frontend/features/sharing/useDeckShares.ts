'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

// =============================================================================
//  Phase 39.1D — useDeckShares
//
//  Backs the DeckShareModal. Loads the explicit DeckShare grants for a
//  project, plus the project's current sharingMode. Exposes upsert /
//  revoke / setMode.
// =============================================================================

export type SharingMode    = 'private' | 'workspace' | 'shared';
export type DeckPermission = 'view' | 'comment' | 'review' | 'edit';

export interface DeckShareDTO {
  id:          string;
  projectId:   string;
  memberId:    string;
  permission:  DeckPermission;
  createdAt:   string;
  updatedAt:   string;
  member:      { id: string; name: string | null; email: string };
  createdBy:   { id: string; name: string | null; email: string };
}

export function useDeckShares(projectId: string | null | undefined) {
  const [shares,  setShares]  = useState<DeckShareDTO[]>([]);
  const [mode,    setMode]    = useState<SharingMode>('workspace');
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!projectId) { setShares([]); return; }
    setLoading(true);
    setError(null);
    try {
      const [sharesRes, projectRes] = await Promise.all([
        api.get<DeckShareDTO[]>(`/projects/${projectId}/shares`),
        api.get<{ id: string; sharingMode: SharingMode }>(`/projects/${projectId}`),
      ]);
      setShares(sharesRes.data || []);
      if (projectRes.data?.sharingMode) setMode(projectRes.data.sharingMode);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load sharing');
    } finally { setLoading(false); }
  }, [projectId]);

  useEffect(() => { refresh(); }, [refresh]);

  const upsert = useCallback(async (memberId: string, permission: DeckPermission) => {
    if (!projectId) return;
    await api.post(`/projects/${projectId}/shares`, { memberId, permission });
    await refresh();
  }, [projectId, refresh]);

  const revoke = useCallback(async (shareId: string) => {
    if (!projectId) return;
    await api.delete(`/projects/${projectId}/shares/${shareId}`);
    await refresh();
  }, [projectId, refresh]);

  const setSharingMode = useCallback(async (next: SharingMode) => {
    if (!projectId) return;
    await api.patch(`/projects/${projectId}/sharing-mode`, { mode: next });
    setMode(next);   // optimistic
    await refresh();
  }, [projectId, refresh]);

  return { shares, mode, loading, error, refresh, upsert, revoke, setSharingMode };
}
