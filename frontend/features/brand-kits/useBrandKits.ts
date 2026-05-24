'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type {
  BrandKitDTO, BrandAssetDTO, BrandAssetKind, BrandTokens, BrandVoice, BrandIdentity,
  BrandAuditReport,
} from '@/types/brand-kit';

// =============================================================================
//  Phase 37 — useBrandKits + useBrandKit + useBrandAudit hooks
// =============================================================================

// ---------------------------------------------------------------------------
//  List
// ---------------------------------------------------------------------------

export function useMyBrandKits() {
  const [items,   setItems]   = useState<BrandKitDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<BrandKitDTO[]>('/brand-kits');
      setItems(data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load brand kits');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: Partial<BrandKitDTO> & { name: string }) => {
    const { data } = await api.post<BrandKitDTO>('/brand-kits', input);
    await refresh();
    return data;
  }, [refresh]);

  return { items, loading, error, refresh, create };
}

/** Phase 37M — workspace-scoped listing (admin + member views). */
export function useWorkspaceBrandKits(workspaceId: string | null | undefined) {
  const [items,   setItems]   = useState<BrandKitDTO[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!workspaceId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get<BrandKitDTO[]>(`/workspaces/${workspaceId}/brand-kits`);
      setItems(data || []);
    } finally { setLoading(false); }
  }, [workspaceId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { items, loading, refresh };
}

// ---------------------------------------------------------------------------
//  Detail + mutations
// ---------------------------------------------------------------------------

export interface UseBrandKitResult {
  kit:       BrandKitDTO | null;
  loading:   boolean;
  error:     string | null;
  refresh:   () => Promise<void>;

  update:        (patch: Partial<{
    name: string; description: string;
    primaryColor: string; secondaryColor: string; fontFamily: string;
    logo: string; isDefault: boolean;
    tokens: BrandTokens; voice: BrandVoice; identity: BrandIdentity;
  }>) => Promise<void>;
  remove:        () => Promise<void>;
  addAsset:      (input: { kind: BrandAssetKind; url: string; alt?: string; mimeType?: string; width?: number; height?: number }) => Promise<BrandAssetDTO | null>;
  removeAsset:   (assetId: string) => Promise<void>;
  applyToDeck:   (deckId: string) => Promise<void>;
  // Phase 37.1B/E/F/C
  rebrandChart:     (elementId: string) => Promise<void>;
  rebrandAllCharts: (deckId: string)    => Promise<{ updated: number; palette: string[] } | null>;
  applyToMany:      (input: { deckIds?: string[]; workspaceId?: string }) => Promise<{ applied: number } | null>;
  exportKit:        () => Promise<any | null>;
  uploadAsset:      (file: File, kind: BrandAssetKind, alt?: string) => Promise<BrandAssetDTO | null>;
}

export function useBrandKit(id: string | null | undefined): UseBrandKitResult {
  const [kit,     setKit]     = useState<BrandKitDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!id) { setKit(null); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<BrandKitDTO>(`/brand-kits/${id}`);
      setKit(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load brand kit');
    } finally { setLoading(false); }
  }, [id]);

  useEffect(() => { refresh(); }, [refresh]);

  const update = useCallback(async (patch: any) => {
    if (!id) return;
    await api.patch(`/brand-kits/${id}`, patch);
    await refresh();
  }, [id, refresh]);

  const remove = useCallback(async () => {
    if (!id) return;
    await api.delete(`/brand-kits/${id}`);
  }, [id]);

  const addAsset = useCallback(async (input: any) => {
    if (!id) return null;
    const { data } = await api.post<BrandAssetDTO>(`/brand-kits/${id}/assets`, input);
    await refresh();
    return data;
  }, [id, refresh]);

  const removeAsset = useCallback(async (assetId: string) => {
    if (!id) return;
    await api.delete(`/brand-kits/${id}/assets/${assetId}`);
    await refresh();
  }, [id, refresh]);

  const applyToDeck = useCallback(async (deckId: string) => {
    if (!id) return;
    await api.post(`/brand-kits/${id}/apply/${deckId}`);
  }, [id]);

  // Phase 37.1B — chart auto-rebrand
  const rebrandChart = useCallback(async (elementId: string) => {
    if (!id) return;
    await api.post(`/brand-kits/${id}/rebrand-chart/${elementId}`);
  }, [id]);
  const rebrandAllCharts = useCallback(async (deckId: string) => {
    if (!id) return null;
    const { data } = await api.post<{ updated: number; palette: string[] }>(
      `/brand-kits/${id}/rebrand-all-charts/${deckId}`,
    );
    return data;
  }, [id]);

  // Phase 37.1F — batch apply
  const applyToMany = useCallback(async (input: { deckIds?: string[]; workspaceId?: string }) => {
    if (!id) return null;
    const { data } = await api.post<{ applied: number }>(`/brand-kits/${id}/apply-batch`, input);
    return data;
  }, [id]);

  // Phase 37.1E — export
  const exportKit = useCallback(async () => {
    if (!id) return null;
    const { data } = await api.get(`/brand-kits/${id}/export`);
    return data;
  }, [id]);

  // Phase 37.1C — file upload → /upload/image then attach as BrandAsset.
  const uploadAsset = useCallback(async (file: File, kind: string, alt?: string) => {
    if (!id) return null;
    const form = new FormData();
    form.append('image', file);
    const upload = await api.post<{ url: string; width?: number; height?: number; mimetype?: string }>(
      '/upload/image', form, { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    const u = upload.data;
    const { data } = await api.post<BrandAssetDTO>(`/brand-kits/${id}/assets`, {
      kind, url: u.url, mimeType: u.mimetype, width: u.width, height: u.height, alt,
    });
    await refresh();
    return data;
  }, [id, refresh]);

  return {
    kit, loading, error, refresh,
    update, remove, addAsset, removeAsset, applyToDeck,
    rebrandChart, rebrandAllCharts, applyToMany, exportKit, uploadAsset,
  };
}

// ---------------------------------------------------------------------------
//  Phase 37.1E — Import (top-level — not bound to a single kit)
// ---------------------------------------------------------------------------

export async function importBrandKit(payload: any, workspaceId?: string): Promise<BrandKitDTO> {
  const { data } = await api.post<BrandKitDTO>('/brand-kits/import', { payload, workspaceId });
  return data;
}

// ---------------------------------------------------------------------------
//  Audit
// ---------------------------------------------------------------------------

export function useBrandAudit(deckId: string | null | undefined) {
  const [report,  setReport]  = useState<BrandAuditReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const run = useCallback(async () => {
    if (!deckId) { setReport(null); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<BrandAuditReport>(`/decks/${deckId}/brand-audit`);
      setReport(data);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Audit failed');
    } finally { setLoading(false); }
  }, [deckId]);

  useEffect(() => { run(); }, [run]);

  return { report, loading, error, refresh: run };
}
