'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import api from '@/lib/api';
import type { SlideElementDTO } from '@/types/slide-element';
import type { SlideListItem } from './sidebar/useDeckSlides';

// =============================================================================
//  useDeckElements (Phase 26.5)
//
//  Fetches elements for EVERY slide in the deck so the deck-level narrative
//  analyzer can run with real per-slide content. The current slide's elements
//  come from useElementsApi (live state); other slides are loaded lazily.
//
//  Strategy:
//    - On mount / when slide ids change, fire N parallel GETs for slides we
//      don't yet have cached.
//    - Cache by slide id. Re-fetch is opt-in via refresh().
//    - The caller (SlideEditor) overrides the cache entry for the active
//      slide with the up-to-the-millisecond array so the deck plan sees the
//      user's in-progress edits.
//
//  This is the practical compromise: the deck plan is one HTTP fetch per
//  non-active slide, then refreshes only when the user actually navigates
//  or modifies that slide.
// =============================================================================

export interface UseDeckElements {
  /** Map: slideId → elements array. Loaded slides only. */
  byId:    Record<string, SlideElementDTO[]>;
  loading: boolean;
  error:   string | null;
  refresh: (slideId?: string) => Promise<void>;
  /** True once every slide id in the deck has a cache entry (even if empty). */
  ready:   boolean;
}

export function useDeckElements(slides: SlideListItem[]): UseDeckElements {
  const [byId,    setById]    = useState<Record<string, SlideElementDTO[]>>({});
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  // Stable list of slide ids — re-fetch only when the set changes
  const slideIds = useMemo(() => slides.map((s) => s.id), [slides]);
  const slideIdsKey = slideIds.join('|');

  // Avoid refetching the same slide multiple times in flight
  const inflight = useRef<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const ids = slideIdsKey ? slideIdsKey.split('|').filter(Boolean) : [];
    const missing = ids.filter((id) => !(id in byId) && !inflight.current.has(id));
    if (missing.length === 0) return;

    setLoading(true);
    for (const id of missing) inflight.current.add(id);

    Promise.all(
      missing.map(async (id): Promise<[string, SlideElementDTO[]]> => {
        try {
          const { data } = await api.get<SlideElementDTO[]>(`/slides/${id}/elements`);
          return [id, Array.isArray(data) ? data : []];
        } catch {
          return [id, []];
        }
      }),
    )
      .then((pairs) => {
        if (cancelled) return;
        setById((prev) => {
          const next = { ...prev };
          for (const [id, els] of pairs) next[id] = els;
          return next;
        });
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load deck elements'); })
      .finally(() => {
        for (const id of missing) inflight.current.delete(id);
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [slideIdsKey, byId]);

  const refresh = async (slideId?: string) => {
    if (slideId) {
      try {
        const { data } = await api.get<SlideElementDTO[]>(`/slides/${slideId}/elements`);
        setById((prev) => ({ ...prev, [slideId]: Array.isArray(data) ? data : [] }));
      } catch (e: any) {
        setError(e?.message || 'Refresh failed');
      }
    } else {
      setById({});
    }
  };

  const ready = slideIds.length > 0 && slideIds.every((id) => id in byId);
  return { byId, loading, error, refresh, ready };
}
