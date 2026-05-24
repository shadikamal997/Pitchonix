'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type {
  SavedComponentDTO, ComponentInstanceDTO,
  CreateComponentInput, ListComponentsQuery, ComponentCategory,
} from '@/types/saved-component';
import { useIsPreviewing } from '../versions/useVersionPreview';
import { useSafetySnapshot } from '../versions/useSafetySnapshot';

// =============================================================================
//  useComponents — Phase 32.75 Tier 2
//
//  Loads and caches the user's component library + provides imperative
//  mutators. Library is user-scoped (cross-deck) so we keep a single cache
//  per session and re-fetch on search/filter changes.
// =============================================================================

export interface UseComponents {
  items:      SavedComponentDTO[];
  loading:    boolean;
  error:      string | null;
  query:      ListComponentsQuery;
  setQuery:   (q: ListComponentsQuery) => void;
  refresh:    () => Promise<void>;
  create:     (input: CreateComponentInput) => Promise<SavedComponentDTO | null>;
  update:     (id: string, patch: Partial<SavedComponentDTO>) => Promise<SavedComponentDTO | null>;
  duplicate:  (id: string) => Promise<SavedComponentDTO | null>;
  toggleFavorite: (id: string) => Promise<void>;
  remove:     (id: string) => Promise<void>;
  getOutdatedCount: (id: string) => Promise<number>;
  acknowledgeAll: (id: string) => Promise<number>;
}

export function useComponents(initialQuery: ListComponentsQuery = {}): UseComponents {
  const [items,   setItems]   = useState<SavedComponentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [query,   setQuery]   = useState<ListComponentsQuery>(initialQuery);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (query.search)   params.search   = query.search;
      if (query.category) params.category = query.category;
      if (query.favorite) params.favorite = 'true';
      if (query.tag)      params.tag      = query.tag;
      if (query.limit  != null) params.limit  = query.limit;
      if (query.offset != null) params.offset = query.offset;
      const { data } = await api.get<SavedComponentDTO[]>('/components', { params });
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load components');
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (input: CreateComponentInput) => {
    try {
      const { data } = await api.post<SavedComponentDTO>('/components', input);
      setItems((prev) => [data, ...prev]);
      return data;
    } catch (e: any) { setError(e?.message || 'Failed'); return null; }
  }, []);

  const update = useCallback(async (id: string, patch: Partial<SavedComponentDTO>) => {
    try {
      const { data } = await api.patch<SavedComponentDTO>(`/components/${id}`, patch);
      setItems((prev) => prev.map((c) => (c.id === id ? data : c)));
      return data;
    } catch (e: any) { setError(e?.message || 'Failed'); return null; }
  }, []);

  const duplicate = useCallback(async (id: string) => {
    try {
      const { data } = await api.post<SavedComponentDTO>(`/components/${id}/duplicate`);
      setItems((prev) => [data, ...prev]);
      return data;
    } catch (e: any) { setError(e?.message || 'Failed'); return null; }
  }, []);

  const toggleFavorite = useCallback(async (id: string) => {
    const current = items.find((c) => c.id === id);
    if (!current) return;
    try {
      const { data } = await api.post<SavedComponentDTO>(`/components/${id}/favorite`, { favorite: !current.favorite });
      setItems((prev) => prev.map((c) => (c.id === id ? data : c)));
    } catch (e: any) { setError(e?.message || 'Failed'); }
  }, [items]);

  // Phase 35 — Library component delete is workspace-scoped (no per-deck
  // safety snapshot — deleting the source SavedComponent cascades to its
  // ComponentInstance rows, but those are per-slide. A user who deletes a
  // library component while reviewing a deck still keeps the snapshot
  // mechanism via the slide-level safety snapshots in useSlideInstances.
  // No isPreviewing guard either — the library is a separate concern from
  // the active deck's preview state.
  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/components/${id}`);
      setItems((prev) => prev.filter((c) => c.id !== id));
    } catch (e: any) { setError(e?.message || 'Failed'); }
  }, []);

  const getOutdatedCount = useCallback(async (id: string) => {
    try {
      const { data } = await api.get<{ count: number }>(`/components/${id}/outdated`);
      return data.count || 0;
    } catch { return 0; }
  }, []);

  const acknowledgeAll = useCallback(async (id: string) => {
    try {
      const { data } = await api.post<{ updated: number }>(`/components/${id}/acknowledge`);
      return data.updated || 0;
    } catch (e: any) { setError(e?.message || 'Failed'); return 0; }
  }, []);

  return useMemo(() => ({
    items, loading, error, query, setQuery, refresh,
    create, update, duplicate, toggleFavorite, remove,
    getOutdatedCount, acknowledgeAll,
  }), [items, loading, error, query, refresh, create, update, duplicate, toggleFavorite, remove, getOutdatedCount, acknowledgeAll]);
}

// =============================================================================
//  useSlideInstances — load + create/delete instances on a specific slide.
// =============================================================================
export interface UseSlideInstances {
  instances: ComponentInstanceDTO[];
  loading: boolean;
  refresh: () => Promise<void>;
  insert:  (componentId: string, anchor?: { x?: number; y?: number; scale?: number }) => Promise<ComponentInstanceDTO | null>;
  remove:  (instanceId: string) => Promise<void>;
}

export function useSlideInstances(
  slideId: string | null | undefined,
  /** Phase 35.1A — pass deckId so the destructive instance-delete can capture
   *  a safety snapshot. Optional for backwards-compatible call sites. */
  deckId?: string | null,
): UseSlideInstances {
  const [instances, setInstances] = useState<ComponentInstanceDTO[]>([]);
  const [loading,   setLoading]   = useState(false);
  const isPreviewing = useIsPreviewing();
  const safety = useSafetySnapshot(deckId);

  const refresh = useCallback(async () => {
    if (!slideId) { setInstances([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get<ComponentInstanceDTO[]>(`/slides/${slideId}/component-instances`);
      setInstances(data || []);
    } finally { setLoading(false); }
  }, [slideId]);

  useEffect(() => { refresh(); }, [refresh]);

  const insert = useCallback(async (componentId: string, anchor?: { x?: number; y?: number; scale?: number }) => {
    if (isPreviewing || !slideId) return null;
    try {
      const { data } = await api.post<ComponentInstanceDTO>(`/slides/${slideId}/component-instances`, {
        componentId,
        anchorX: anchor?.x ?? 10,
        anchorY: anchor?.y ?? 30,
        scale:   anchor?.scale ?? 1,
      });
      setInstances((prev) => [...prev, data]);
      return data;
    } catch { return null; }
  }, [slideId, isPreviewing]);

  const remove = useCallback(async (instanceId: string) => {
    if (isPreviewing) return;
    // Phase 35.1A — safety snapshot first; non-fatal on failure.
    await safety.beforeDelete('component');
    try {
      await api.delete(`/component-instances/${instanceId}`);
      setInstances((prev) => prev.filter((i) => i.id !== instanceId));
    } catch { /* swallow */ }
  }, [isPreviewing, safety]);

  return { instances, loading, refresh, insert, remove };
}

// =============================================================================
//  Category helpers
// =============================================================================
export function categoryLabel(cat: ComponentCategory): string {
  return {
    kpi: 'KPI', metric: 'Metric', dashboard: 'Dashboard', pricing: 'Pricing',
    revenueModel: 'Revenue', team: 'Team', testimonial: 'Testimonial',
    featureGrid: 'Feature grid', comparison: 'Comparison', swot: 'SWOT',
    process: 'Process', roadmap: 'Roadmap', timeline: 'Timeline',
    chart: 'Chart', dataPanel: 'Data panel', hero: 'Hero', quote: 'Quote',
    imageCard: 'Image card', custom: 'Custom',
  }[cat];
}
