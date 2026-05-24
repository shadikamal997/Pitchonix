'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';
import type {
  MasterElementDTO, MasterElementType, DeckMasterSettings,
} from '@/types/master-element';
import { DEFAULT_MASTER_SETTINGS } from '@/types/master-element';
import { useIsPreviewing } from '../versions/useVersionPreview';
import { useSafetySnapshot } from '../versions/useSafetySnapshot';

// =============================================================================
//  useDeckMasters — Phase 32.75
//
//  Loads + caches a deck's master elements and master settings. Mirrors the
//  ergonomics of useElementsApi: stateful list of items + imperative
//  create/update/delete functions that hit the API and update local cache.
// =============================================================================

export interface UseDeckMasters {
  masters:   MasterElementDTO[];
  settings:  Required<DeckMasterSettings>;
  loading:   boolean;
  error:     string | null;
  refresh:   () => Promise<void>;
  create:    (type: MasterElementType, partial?: Partial<MasterElementDTO>) => Promise<MasterElementDTO | null>;
  update:    (id: string, patch: Partial<MasterElementDTO>) => Promise<MasterElementDTO | null>;
  remove:    (id: string) => Promise<void>;
  setSettings: (patch: DeckMasterSettings) => Promise<void>;
}

export function useDeckMasters(
  deckId: string | null | undefined,
  /** Phase 35.1C Task 3 — when supplied, the hook reports these masters
   *  directly instead of fetching from the API. Mirrors the
   *  `overrideElements` pin on `useElementsApi`: skip the network fetch,
   *  pin loading=false, and rely on the existing `isPreviewing` guards
   *  on mutators to drop writes. Used by Version History preview mode. */
  overrideMasters?: MasterElementDTO[] | null,
): UseDeckMasters {
  const [masters,  setMasters]  = useState<MasterElementDTO[]>([]);
  const [settings, setSettings] = useState<Required<DeckMasterSettings>>(DEFAULT_MASTER_SETTINGS);
  const [loading,  setLoading]  = useState(false);

  // Phase 35 — read-only during preview + safety snapshot before delete.
  const isPreviewing = useIsPreviewing();
  const safety = useSafetySnapshot(deckId);
  const [error,    setError]    = useState<string | null>(null);

  // Phase 35.1C Task 3 — override pin. When overrideMasters is set, mirror
  // them into local state and disable the network fetch below.
  const hasOverride = Array.isArray(overrideMasters);
  useEffect(() => {
    if (!hasOverride) return;
    setMasters(overrideMasters as MasterElementDTO[]);
    setLoading(false);
    setError(null);
  }, [hasOverride, overrideMasters]);

  const refresh = useCallback(async () => {
    if (hasOverride) return;  // override active — no network fetch
    if (!deckId) return;
    setLoading(true);
    setError(null);
    try {
      const [listRes, settingsRes] = await Promise.all([
        api.get<MasterElementDTO[]>(`/decks/${deckId}/masters`),
        api.get<Required<DeckMasterSettings>>(`/decks/${deckId}/masters/settings`),
      ]);
      setMasters(listRes.data || []);
      setSettings({ ...DEFAULT_MASTER_SETTINGS, ...(settingsRes.data || {}) });
    } catch (e: any) {
      setError(e?.message || 'Failed to load masters');
    } finally {
      setLoading(false);
    }
  }, [deckId, hasOverride]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback(async (type: MasterElementType, partial?: Partial<MasterElementDTO>) => {
    if (isPreviewing || !deckId) return null;
    try {
      const body = { ...defaultGeometry(type), ...partial, type };
      const { data } = await api.post<MasterElementDTO>(`/decks/${deckId}/masters`, body);
      setMasters((prev) => [...prev, data]);
      return data;
    } catch (e: any) {
      setError(e?.message || 'Failed to create master');
      return null;
    }
  }, [deckId, isPreviewing]);

  const update = useCallback(async (id: string, patch: Partial<MasterElementDTO>) => {
    if (isPreviewing || !deckId) return null;
    try {
      const { data } = await api.patch<MasterElementDTO>(`/decks/${deckId}/masters/${id}`, patch);
      setMasters((prev) => prev.map((m) => (m.id === id ? data : m)));
      return data;
    } catch (e: any) {
      setError(e?.message || 'Failed to update master');
      return null;
    }
  }, [deckId, isPreviewing]);

  const remove = useCallback(async (id: string) => {
    if (isPreviewing || !deckId) return;
    // Phase 35.1A — safety snapshot first; failure is non-fatal.
    await safety.beforeDelete('master');
    try {
      await api.delete(`/decks/${deckId}/masters/${id}`);
      setMasters((prev) => prev.filter((m) => m.id !== id));
    } catch (e: any) {
      setError(e?.message || 'Failed to delete master');
    }
  }, [deckId, isPreviewing, safety]);

  const setSettingsApi = useCallback(async (patch: DeckMasterSettings) => {
    if (isPreviewing || !deckId) return;
    try {
      const { data } = await api.patch<Required<DeckMasterSettings>>(`/decks/${deckId}/masters/settings`, patch);
      setSettings(data);
    } catch (e: any) {
      setError(e?.message || 'Failed to update settings');
    }
  }, [deckId, isPreviewing]);

  return { masters, settings, loading, error, refresh, create, update, remove, setSettings: setSettingsApi };
}

// =============================================================================
//  Default geometry per master family (percent grid)
// =============================================================================
function defaultGeometry(type: MasterElementType): Partial<MasterElementDTO> {
  switch (type) {
    case 'logo':         return { x: 2,  y: 2,  width: 12, height: 5  };
    case 'companyName':  return { x: 16, y: 2,  width: 30, height: 4  };
    case 'header':       return { x: 50, y: 2,  width: 48, height: 4  };
    case 'footer':       return { x: 2,  y: 94, width: 60, height: 3  };
    case 'pageNumber':   return { x: 88, y: 94, width: 10, height: 3, elementData: { format: 'pageOfTotal' } };
    case 'date':         return { x: 70, y: 94, width: 16, height: 3  };
    case 'copyright':    return { x: 50, y: 97, width: 48, height: 2  };
    case 'watermark':    return { x: 10, y: 40, width: 80, height: 20, rotation: -20, elementData: { text: 'DRAFT', opacity: 0.08 } };
    case 'confidential': return { x: 40, y: 97, width: 20, height: 2, elementData: { text: 'CONFIDENTIAL' } };
    case 'backgroundShape': return { x: 0, y: 0, width: 100, height: 100, elementData: { kind: 'rect', fill: '#f8fafc' } };
    case 'backgroundImage': return { x: 0, y: 0, width: 100, height: 100 };
    case 'brandBanner':  return { x: 0,  y: 0,  width: 100, height: 6 };
    case 'contact':      return { x: 2,  y: 90, width: 40, height: 4  };
    default:             return { x: 40, y: 40, width: 20, height: 10 };
  }
}
