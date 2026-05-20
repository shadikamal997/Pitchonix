'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

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
}

export function useDeckSlides(deckId: string | null | undefined): UseDeckSlides {
  const [slides, setSlides] = useState<SlideListItem[]>([]);
  const [loading, setLoading] = useState(!!deckId);
  const [error, setError] = useState<string | null>(null);

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
  const insertAfter = useCallback(async (afterSlideId: string, title?: string): Promise<SlideListItem | null> => {
    if (!deckId) return null;
    try {
      const { data } = await api.post<SlideListItem>(`/slides/deck/${deckId}/insert`, { afterSlideId, title });
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.message || 'Insert failed');
      return null;
    }
  }, [deckId, refresh]);

  const insertAtEnd = useCallback(async (title?: string): Promise<SlideListItem | null> => {
    if (!deckId) return null;
    try {
      const { data } = await api.post<SlideListItem>(`/slides/deck/${deckId}/insert`, { title });
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.message || 'Insert failed');
      return null;
    }
  }, [deckId, refresh]);

  const duplicate = useCallback(async (slideId: string): Promise<SlideListItem | null> => {
    if (!deckId) return null;
    try {
      const { data } = await api.post<SlideListItem>(`/slides/${slideId}/duplicate`);
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.message || 'Duplicate failed');
      return null;
    }
  }, [deckId, refresh]);

  const remove = useCallback(async (slideId: string): Promise<boolean> => {
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
  }, [refresh]);

  const reorder = useCallback(async (newOrderIds: string[]) => {
    if (!deckId || newOrderIds.length === 0) return;
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
  }, [deckId, slides, refresh]);

  const updateLocal = useCallback((slideId: string, patch: Partial<SlideListItem>) => {
    setSlides((prev) => prev.map((s) => (s.id === slideId ? { ...s, ...patch } : s)));
  }, []);

  return { slides, loading, error, refresh, insertAfter, insertAtEnd, duplicate, remove, reorder, updateLocal };
}
