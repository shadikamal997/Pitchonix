'use client';

import { useCallback } from 'react';
import api from '@/lib/api';
import type { DeckVersionDTO } from '@/types/deck-version';

// =============================================================================
//  useSafetySnapshot — Phase 35.1F
//
//  Single hook every destructive editor action wraps itself in:
//
//      const safety = useSafetySnapshot(deckId);
//      const deleteSlide = async (id: string) => {
//        await safety.before('Before deleting slide');
//        await api.delete(`/slides/${id}`);
//      };
//
//  - Creates a `SAFETY` snapshot through the existing backend endpoint
//  - Failures are non-fatal (logged) — the destructive action proceeds
//    even if the snapshot fails, so we never block user work on snapshotting
//  - No DOM, no React state — pure imperative
// =============================================================================

export interface SafetySnapshotApi {
  /** Capture a SAFETY snapshot, then resolve. Logs failures and resolves anyway. */
  before: (label: string, description?: string) => Promise<DeckVersionDTO | null>;
  /**
   * Convenience helper for "delete N things" — formats the label and
   * forwards to `before()`.
   */
  beforeDelete: (kind: 'slide' | 'slides' | 'section' | 'master' | 'component' | 'group', count?: number) => Promise<DeckVersionDTO | null>;
}

export function useSafetySnapshot(deckId: string | null | undefined): SafetySnapshotApi {
  const before = useCallback(async (label: string, description?: string) => {
    if (!deckId) return null;
    try {
      const { data } = await api.post<DeckVersionDTO>(`/decks/${deckId}/versions`, {
        type: 'SAFETY', name: label, description,
      });
      return data;
    } catch (err) {
      // Don't block the user's action on a snapshot failure — log + resolve null.
      // eslint-disable-next-line no-console
      console.warn('[safety-snapshot] failed:', err);
      return null;
    }
  }, [deckId]);

  const beforeDelete = useCallback((kind: Parameters<SafetySnapshotApi['beforeDelete']>[0], count = 1) => {
    const labels: Record<typeof kind, string> = {
      slide:     `Before deleting slide${count > 1 ? `s (${count})` : ''}`,
      slides:    `Before deleting ${count} slides`,
      section:   `Before deleting section${count > 1 ? `s (${count})` : ''}`,
      master:    `Before deleting master${count > 1 ? `s (${count})` : ''}`,
      component: `Before deleting component instance${count > 1 ? `s (${count})` : ''}`,
      group:     `Before deleting group${count > 1 ? `s (${count})` : ''}`,
    } as const;
    return before(labels[kind]);
  }, [before]);

  return { before, beforeDelete };
}
