'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import api from '@/lib/api';
import type {
  SmartComponentDTO, SmartFamilyId, SmartComponentType, SmartUseCase,
} from '@/types/smart-component';

// =============================================================================
//  useSmartComponents — Phase 32.75 Tier 3
//
//  Loads the built-in component registry from the backend, optionally
//  filtered to a family. Cached for the session — the backend's in-memory
//  cache covers repeat fetches, so a remount doesn't replay generation.
// =============================================================================

export interface UseSmartComponents {
  items:    SmartComponentDTO[];
  loading:  boolean;
  error:    string | null;
  byUseCase: Record<SmartUseCase, SmartComponentDTO[]>;
  byFamily:  Record<SmartFamilyId, SmartComponentDTO[]>;
  refresh:  () => Promise<void>;
}

export function useSmartComponents(family?: SmartFamilyId | null): UseSmartComponents {
  const [items,   setItems]   = useState<SmartComponentDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, any> = {};
      if (family) params.family = family;
      const { data } = await api.get<SmartComponentDTO[]>('/components/smart', { params });
      setItems(data || []);
    } catch (e: any) {
      setError(e?.message || 'Failed to load smart components');
    } finally {
      setLoading(false);
    }
  }, [family]);

  useEffect(() => { refresh(); }, [refresh]);

  const byUseCase = useMemo(() => {
    const out: Record<SmartUseCase, SmartComponentDTO[]> = {
      Business: [], Investor: [], Sales: [], Board: [], Strategy: [], Marketing: [],
    };
    for (const c of items) (out[c.useCase] ||= []).push(c);
    return out;
  }, [items]);

  const byFamily = useMemo(() => {
    const out: Record<string, SmartComponentDTO[]> = {};
    for (const c of items) (out[c.family] ||= []).push(c);
    return out as Record<SmartFamilyId, SmartComponentDTO[]>;
  }, [items]);

  return { items, loading, error, byUseCase, byFamily, refresh };
}
