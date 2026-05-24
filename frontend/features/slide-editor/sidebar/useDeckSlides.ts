'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import { useIsPreviewing } from '../versions/useVersionPreview';
import { useSafetySnapshot } from '../versions/useSafetySnapshot';

// =============================================================================
//  useDeckSlides
//
//  Manages the editor's view of every slide in the deck, used by the left
//  sidebar (thumbnails, reorder, add, duplicate, delete) and by next/prev
//  navigation in the top bar.
//
//  Single source of truth — the editor reads `slides` from here, and the URL
//  drives which one is "current".
// =============================================================================

export interface SlideListItem {
  id:           string;
  deckId:       string;
  type:         string;
  order:        number;
  title:        string;
  subtitle:     string | null;
  speakerNotes: string | null;
  layoutKey?:   string | null;
  themeKey?:    string | null;
  /** Phase 32F — slide.metadata.sectionId is consumed by the sectioned sidebar. */
  metadata?:    any | null;
}

export interface UseDeckSlides {
  slides:           SlideListItem[];
  loading:          boolean;
  error:            string | null;
  refresh:          () => Promise<void>;
  insertAfter:      (afterSlideId: string, title?: string) => Promise<SlideListItem | null>;
  insertAtEnd:      (title?: string) => Promise<SlideListItem | null>;
  duplicate:        (slideId: string) => Promise<SlideListItem | null>;
  remove:           (slideId: string) => Promise<boolean>;
  reorder:          (newOrderIds: string[]) => Promise<void>;
  updateLocal:      (slideId: string, patch: Partial<SlideListItem>) => void;   // for title rename, etc.
  /** Phase 32F — write a slide's metadata back to the server. Used to assign
   *  / unassign a section. Optimistic; merges with the existing metadata blob. */
  patchSlideMetadata: (slideId: string, patch: Record<string, any>) => Promise<void>;
  /** Phase 32G — bulk delete in a single round-trip per id (no batch endpoint
   *  exists yet; the loop is short for typical use). */
  removeMany:       (ids: string[]) => Promise<void>;
  /** Phase 32G — bulk duplicate. */
  duplicateMany:    (ids: string[]) => Promise<string[]>;
}

export function useDeckSlides(deckId: string | null | undefined): UseDeckSlides {
  const [slides, setSlides] = useState<SlideListItem[]>([]);
  const [loading, setLoading] = useState(!!deckId);
  const [error, setError] = useState<string | null>(null);

  // Phase 35.1A — shared preview state + safety snapshot helper. Every
  // mutator below short-circuits when previewing; destructive mutators
  // capture a SAFETY snapshot first.
  const isPreviewing = useIsPreviewing();
  const safety = useSafetySnapshot(deckId);

  // ── Load on mount / deck change ────────────────────────────────────────────
  const refresh = useCallback(async () => {
    if (!deckId) { setSlides([]); setLoading(false); return; }
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<SlideListItem[]>(`/slides/deck/${deckId}`);
      setSlides([...data].sort((a, b) => a.order - b.order));
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to load slides');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  // Phase 35.1A — gated on `isPreviewing` so historical versions are immutable.

  const insertAfter = useCallback(async (afterSlideId: string, title?: string): Promise<SlideListItem | null> => {
    if (isPreviewing || !deckId) return null;
    try {
      const { data } = await api.post<SlideListItem>(`/slides/deck/${deckId}/insert`, { afterSlideId, title });
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.message || 'Insert failed');
      return null;
    }
  }, [deckId, refresh, isPreviewing]);

  const insertAtEnd = useCallback(async (title?: string): Promise<SlideListItem | null> => {
    if (isPreviewing || !deckId) return null;
    try {
      const { data } = await api.post<SlideListItem>(`/slides/deck/${deckId}/insert`, { title });
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.message || 'Insert failed');
      return null;
    }
  }, [deckId, refresh, isPreviewing]);

  const duplicate = useCallback(async (slideId: string): Promise<SlideListItem | null> => {
    if (isPreviewing || !deckId) return null;
    try {
      const { data } = await api.post<SlideListItem>(`/slides/${slideId}/duplicate`);
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.message || 'Duplicate failed');
      return null;
    }
  }, [deckId, refresh, isPreviewing]);

  const remove = useCallback(async (slideId: string): Promise<boolean> => {
    if (isPreviewing) return false;
    // Phase 35.1A — capture a safety snapshot before destroying a slide.
    await safety.beforeDelete('slide');
    // Optimistic
    setSlides((prev) => prev.filter((s) => s.id !== slideId));
    try {
      await api.delete(`/slides/${slideId}`);
      return true;
    } catch {
      // Fall back: refresh to restore
      await refresh();
      return false;
    }
  }, [refresh, isPreviewing, safety]);

  const reorder = useCallback(async (newOrderIds: string[]) => {
    if (isPreviewing || !deckId || newOrderIds.length === 0) return;
    // Optimistic reorder
    const map = new Map(slides.map((s) => [s.id, s]));
    const optimistic = newOrderIds
      .map((id, i) => {
        const s = map.get(id);
        return s ? { ...s, order: i + 1 } : null;
      })
      .filter(Boolean) as SlideListItem[];
    setSlides(optimistic);

    const entries = newOrderIds.map((id, i) => ({ id, order: i + 1 }));
    try {
      const { data } = await api.post<SlideListItem[]>(`/slides/deck/${deckId}/reorder`, { entries });
      setSlides([...data].sort((a, b) => a.order - b.order));
    } catch {
      await refresh();
    }
  }, [deckId, slides, refresh, isPreviewing]);

  const updateLocal = useCallback((slideId: string, patch: Partial<SlideListItem>) => {
    if (isPreviewing) return;
    setSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, ...patch } : s)));
  }, [isPreviewing]);

  const patchSlideMetadata = useCallback(async (slideId: string, patch: Record<string, any>) => {
    if (isPreviewing) return;
    // Optimistic merge — preserve any keys the caller didn't mention.
    let nextMetadata: any = null;
    setSlides((prev) => prev.map((s) => {
      if (s.id !== slideId) return s;
      nextMetadata = { ...(s.metadata || {}), ...patch };
      return { ...s, metadata: nextMetadata };
    }));
    try {
      await api.patch(`/slides/${slideId}`, { metadata: nextMetadata });
    } catch {
      await refresh();
    }
  }, [refresh, isPreviewing]);

  const removeMany = useCallback(async (ids: string[]) => {
    if (isPreviewing || ids.length === 0) return;
    // Phase 35.1A — single safety snapshot for the whole batch.
    await safety.beforeDelete('slides', ids.length);
    // Optimistic
    setSlides((prev) => prev.filter((s) => !ids.includes(s.id)));
    try {
      await Promise.all(ids.map((id) => api.delete(`/slides/${id}`)));
    } catch {
      await refresh();
    }
  }, [refresh, isPreviewing, safety]);

  const duplicateMany = useCallback(async (ids: string[]): Promise<string[]> => {
    if (isPreviewing) return [];
    const newIds: string[] = [];
    for (const id of ids) {
      try {
        const { data } = await api.post<SlideListItem>(`/slides/${id}/duplicate`);
        newIds.push(data.id);
      } catch { /* keep going; one failure shouldn't abort the batch */ }
    }
    await refresh();
    return newIds;
  }, [refresh, isPreviewing]);

  return {
    slides, loading, error, refresh,
    insertAfter, insertAtEnd, duplicate, remove, reorder,
    updateLocal, patchSlideMetadata, removeMany, duplicateMany,
  };
}
