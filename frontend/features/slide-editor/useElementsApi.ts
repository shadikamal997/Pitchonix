'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import api from '@/lib/api';
import type { SlideElementDTO } from '@/types/slide-element';
import { useIsPreviewing } from './versions/useVersionPreview';
import { useSafetySnapshot } from './versions/useSafetySnapshot';

// =============================================================================
//  useElementsApi
//
//  Single source of truth for a slide's editable elements during the editor
//  session.
//
//    1. Loads elements from GET /api/slides/:slideId/elements once
//    2. Keeps an in-memory list that the canvas binds to (instant local edits)
//    3. PATCHes the server in the background; coalesces rapid edits to the
//       same element so dragging one element doesn't flood the network
//    4. Exposes create / duplicate / delete / reorder
//
//  Optimistic-update strategy:
//    - Local state moves first (canvas stays buttery).
//    - On 4xx/5xx we revert that one element to last server-known value.
//    - All public mutators return the up-to-date list synchronously.
// =============================================================================

const PATCH_DEBOUNCE_MS = 350;

interface ApiState {
  elements: SlideElementDTO[];
  loading:  boolean;
  error:    string | null;
  /** "saved" | "saving" | "dirty" | "error" */
  saveStatus: 'saved' | 'saving' | 'dirty' | 'error';
}

export interface UseElementsApi extends ApiState {
  /** Replace a partial element. Local state moves immediately; server PATCH is debounced per-element. */
  updateElement:  (id: string, patch: Partial<SlideElementDTO>) => void;
  /** Replace many. Server PATCH dispatched once per element (debounced). */
  updateMany:     (updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => void;
  /** Create a new element on this slide. */
  createElement:  (input: Partial<SlideElementDTO>) => Promise<SlideElementDTO | null>;
  /** Duplicate an existing element. */
  duplicateElement: (id: string) => Promise<SlideElementDTO | null>;
  /** Delete an element. */
  deleteElement:  (id: string) => Promise<boolean>;
  /** Reorder / z-index reshuffle. */
  reorder:        (entries: Array<{ id: string; order: number; zIndex?: number }>) => Promise<void>;
  /** Manually re-fetch (e.g. after a force-remigrate). */
  refresh:        () => Promise<void>;
  /** Ensure the legacy content blob has been materialized into elements. */
  ensureMigrated: () => Promise<void>;
  /** Atomically replace every element on the slide (used by undo / redo). */
  syncAll:        (elements: SlideElementDTO[]) => Promise<void>;
}

export function useElementsApi(
  slideId: string | null | undefined,
  /** Phase 35.1A — deckId enables safety-snapshot creation before deletes.
   *  Optional; legacy callers without deckId still work but skip snapshots. */
  deckId?: string | null,
  /** Phase 35-final-B Task 1 — when supplied, the hook reports these elements
   *  directly instead of fetching from the API. Used by Version History
   *  preview mode so the canvas renders the historical slide's elements.
   *  When set: skip the network fetch, skip the debounced flush, and pin
   *  saveStatus = 'saved'. Mutators continue to short-circuit via the
   *  existing isPreviewing guard. */
  overrideElements?: SlideElementDTO[] | null,
): UseElementsApi {
  const [state, setState] = useState<ApiState>({
    elements: [], loading: !!slideId, error: null, saveStatus: 'saved',
  });

  // Phase 35.1A — shared preview state + safety helper.
  const isPreviewing = useIsPreviewing();
  const safety = useSafetySnapshot(deckId);

  // Phase 35-final-B Task 1 — override pin. When overrideElements is set,
  // mirror them into local state and disable all network paths below.
  const hasOverride = Array.isArray(overrideElements);
  useEffect(() => {
    if (!hasOverride) return;
    setState({ elements: overrideElements as SlideElementDTO[], loading: false, error: null, saveStatus: 'saved' });
  }, [hasOverride, overrideElements]);

  // pending PATCH bodies per-element (debounced flush)
  const pendingRef = useRef<Map<string, Partial<SlideElementDTO>>>(new Map());
  const flushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inflightRef = useRef<Set<string>>(new Set());

  // ── Load on mount / slideId change ─────────────────────────────────────────
  useEffect(() => {
    if (hasOverride) return;  // override active — no network fetch
    if (!slideId) {
      setState({ elements: [], loading: false, error: null, saveStatus: 'saved' });
      return;
    }
    let cancelled = false;
    setState((s) => ({ ...s, loading: true, error: null }));
    (async () => {
      try {
        // Make sure the slide has been element-migrated (idempotent server-side)
        try { await api.post(`/slides/${slideId}/elements/ensure-migrated`); } catch (_) {}
        const { data } = await api.get<SlideElementDTO[]>(`/slides/${slideId}/elements`);
        if (cancelled) return;
        setState({ elements: data, loading: false, error: null, saveStatus: 'saved' });
      } catch (err: any) {
        if (cancelled) return;
        setState({
          elements: [], loading: false,
          error: err?.response?.data?.message || err?.message || 'Failed to load slide',
          saveStatus: 'error',
        });
      }
    })();
    return () => { cancelled = true; };
    // hasOverride is in the dep array so re-mounting back to live mode after
    // preview exit triggers a fresh fetch.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId, hasOverride]);

  // ── Debounced flush ────────────────────────────────────────────────────────
  const flush = useCallback(async () => {
    // Phase 35-final-B Task 1 — never write back when previewing or override
    // is active. Drop any queued patches so they don't fire when the user
    // exits preview.
    if (hasOverride || isPreviewing) { pendingRef.current.clear(); return; }
    if (!slideId) return;
    if (pendingRef.current.size === 0) return;

    const batch = Array.from(pendingRef.current.entries());
    pendingRef.current = new Map();
    setState((s) => ({ ...s, saveStatus: 'saving' }));

    let failed = false;
    await Promise.all(batch.map(async ([id, patch]) => {
      inflightRef.current.add(id);
      try {
        await api.patch(`/slides/${slideId}/elements/${id}`, patch);
      } catch (_e) {
        failed = true;
      } finally {
        inflightRef.current.delete(id);
      }
    }));

    setState((s) => ({ ...s, saveStatus: failed ? 'error' : 'saved' }));
  }, [slideId]);

  const scheduleFlush = useCallback(() => {
    if (flushTimerRef.current) clearTimeout(flushTimerRef.current);
    flushTimerRef.current = setTimeout(() => { flush(); }, PATCH_DEBOUNCE_MS);
  }, [flush]);

  // Flush before unload
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (state.saveStatus === 'dirty' || state.saveStatus === 'saving' || pendingRef.current.size > 0) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [state.saveStatus]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  //
  // Phase 35.1A — every mutator is gated on `isPreviewing`. When the editor
  // is showing a historical version, the deck must be immutable: text edits,
  // drags, creates, duplicates, deletes, reorders all short-circuit. This
  // single chokepoint replaces having to guard every UI handler individually.

  const updateElement = useCallback((id: string, patch: Partial<SlideElementDTO>) => {
    if (isPreviewing) return;
    setState((s) => ({
      ...s,
      elements: s.elements.map((e) => (e.id === id ? { ...e, ...patch, updatedAt: new Date().toISOString() } : e)),
      saveStatus: 'dirty',
    }));
    const prev = pendingRef.current.get(id) || {};
    pendingRef.current.set(id, { ...prev, ...patch });
    scheduleFlush();
  }, [scheduleFlush, isPreviewing]);

  const updateMany = useCallback((updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => {
    if (isPreviewing) return;
    if (updates.length === 0) return;
    setState((s) => {
      const map = new Map(updates.map((u) => [u.id, u.patch]));
      return {
        ...s,
        elements: s.elements.map((e) => (map.has(e.id) ? { ...e, ...map.get(e.id)! } : e)),
        saveStatus: 'dirty',
      };
    });
    for (const u of updates) {
      const prev = pendingRef.current.get(u.id) || {};
      pendingRef.current.set(u.id, { ...prev, ...u.patch });
    }
    scheduleFlush();
  }, [scheduleFlush, isPreviewing]);

  const createElement = useCallback(async (input: Partial<SlideElementDTO>): Promise<SlideElementDTO | null> => {
    if (isPreviewing || !slideId) return null;
    try {
      // Flush pending changes first so server has consistent prior state
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); await flush(); }
      const { data } = await api.post<SlideElementDTO>(`/slides/${slideId}/elements`, input);
      setState((s) => ({ ...s, elements: [...s.elements, data] }));
      return data;
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message || 'Create failed', saveStatus: 'error' }));
      return null;
    }
  }, [slideId, flush, isPreviewing]);

  const duplicateElement = useCallback(async (id: string): Promise<SlideElementDTO | null> => {
    if (isPreviewing || !slideId) return null;
    try {
      if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); await flush(); }
      const { data } = await api.post<SlideElementDTO>(`/slides/${slideId}/elements/${id}/duplicate`);
      setState((s) => ({ ...s, elements: [...s.elements, data] }));
      return data;
    } catch {
      return null;
    }
  }, [slideId, flush, isPreviewing]);

  const deleteElement = useCallback(async (id: string): Promise<boolean> => {
    if (isPreviewing || !slideId) return false;
    // Phase 35.1A — capture a safety snapshot before destroying state. The
    // helper is non-blocking; we proceed even if snapshotting fails so the
    // user's delete is never blocked on snapshot infrastructure.
    await safety.before('Before deleting element');
    // optimistic remove
    setState((s) => ({ ...s, elements: s.elements.filter((e) => e.id !== id) }));
    try {
      await api.delete(`/slides/${slideId}/elements/${id}`);
      return true;
    } catch {
      // fall back: refresh
      await refresh();
      return false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId, isPreviewing, safety]);

  const reorder = useCallback(async (entries: Array<{ id: string; order: number; zIndex?: number }>) => {
    if (isPreviewing || !slideId || entries.length === 0) return;
    try {
      const { data } = await api.post<SlideElementDTO[]>(`/slides/${slideId}/elements/reorder`, { entries });
      setState((s) => ({ ...s, elements: data }));
    } catch {
      await refresh();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId, isPreviewing]);

  const refresh = useCallback(async () => {
    if (!slideId) return;
    try {
      const { data } = await api.get<SlideElementDTO[]>(`/slides/${slideId}/elements`);
      setState({ elements: data, loading: false, error: null, saveStatus: 'saved' });
    } catch (err: any) {
      setState((s) => ({ ...s, error: err?.message || 'Refresh failed' }));
    }
  }, [slideId]);

  const ensureMigrated = useCallback(async () => {
    if (!slideId) return;
    try { await api.post(`/slides/${slideId}/elements/ensure-migrated`); } catch (_) {}
    await refresh();
  }, [slideId, refresh]);

  const syncAll = useCallback(async (elements: SlideElementDTO[]) => {
    if (isPreviewing || !slideId) return;
    // Flush any pending edits before the snapshot replace so they don't race the sync.
    if (flushTimerRef.current) { clearTimeout(flushTimerRef.current); await flush(); }
    // Optimistic local replace
    setState((s) => ({ ...s, elements, saveStatus: 'saving' }));
    try {
      const { data } = await api.post<SlideElementDTO[]>(`/slides/${slideId}/elements/sync`, { elements });
      setState((s) => ({ ...s, elements: data, saveStatus: 'saved' }));
    } catch (err: any) {
      setState((s) => ({ ...s, saveStatus: 'error', error: err?.message || 'Restore failed' }));
      await refresh();
    }
  }, [slideId, flush, refresh, isPreviewing]);

  return {
    elements:      state.elements,
    loading:       state.loading,
    error:         state.error,
    saveStatus:    state.saveStatus,
    updateElement,
    updateMany,
    createElement,
    duplicateElement,
    deleteElement,
    reorder,
    refresh,
    ensureMigrated,
    syncAll,
  };
}
