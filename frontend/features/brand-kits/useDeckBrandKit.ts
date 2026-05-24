'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

// =============================================================================
//  Phase 37.3 — useDeckBrandKit
//
//  Lightweight hook that resolves "which brand kit is currently linked to
//  this deck" so BrandKitPicker can render its current value + badge.
//
//  Pulls deck.brandKitId from GET /api/decks/:deckId (decks.service.findOne
//  already returns it as part of the deck row).
// =============================================================================

export function useDeckBrandKit(deckId: string | null | undefined) {
  const [brandKitId, setBrandKitId] = useState<string | null>(null);
  const [loading,    setLoading]    = useState(false);

  const refresh = useCallback(async () => {
    if (!deckId) { setBrandKitId(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get(`/decks/${deckId}`);
      setBrandKitId(data?.brandKitId || null);
    } catch {
      setBrandKitId(null);
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  return { brandKitId, loading, refresh, setBrandKitId };
}
