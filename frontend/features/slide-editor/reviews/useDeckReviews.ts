'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

// =============================================================================
//  Phase 36 — useDeckReviews
//
//  Data hook for the editor's review surface. Backs both:
//    - the toolbar status badge (deckReviewStatus + activeRequest)
//    - the Request Review modal (create + listForDeck)
//
//  Polls every 15 s so reviewer-side transitions (approve / request-changes)
//  show up in the editor without a page refresh.
// =============================================================================

export type DeckReviewStatus =
  | 'draft' | 'in_review' | 'approved' | 'changes_requested';

export type ReviewRequestStatus =
  | 'requested' | 'in_review' | 'approved' | 'changes_requested' | 'withdrawn';

export interface ReviewRequestDTO {
  id:            string;
  deckId:        string;
  requestedById: string;
  reviewerId:    string;
  status:        ReviewRequestStatus;
  message:       string | null;
  dueDate:       string | null;
  openedAt:      string | null;
  decidedAt:     string | null;
  createdAt:     string;
  updatedAt:     string;
  requestedBy:   { id: string; name: string | null; email: string };
  reviewer:      { id: string; name: string | null; email: string };
}

export interface DeckReviewStatusDTO {
  deckReviewStatus: DeckReviewStatus;
  activeRequest:    ReviewRequestDTO | null;
}

export interface CreateReviewRequestInput {
  /** Provide either reviewerId or reviewerEmail (matches backend). */
  reviewerId?:    string;
  reviewerEmail?: string;
  message?:       string;
  dueDate?:       string | null;
}

export interface UseDeckReviewsResult {
  status:         DeckReviewStatusDTO | null;
  requests:       ReviewRequestDTO[];
  loading:        boolean;
  error:          string | null;
  refresh:        () => Promise<void>;
  create:         (input: CreateReviewRequestInput) => Promise<ReviewRequestDTO | null>;
  withdraw:       (id: string) => Promise<void>;
  approve:        (id: string) => Promise<void>;
  requestChanges: (id: string) => Promise<void>;
  // Phase 36.1B / 36.1G
  open:           (id: string) => Promise<void>;
  reopen:         (id: string) => Promise<void>;
  /** True when the current user is the reviewer on the active request. */
  isReviewerForMe: (currentUserId: string | null | undefined) => boolean;
  /** Active request (alias of status.activeRequest for convenience). */
  activeRequest:   ReviewRequestDTO | null;
}

export function useDeckReviews(deckId: string | null | undefined): UseDeckReviewsResult {
  const [status,   setStatus]   = useState<DeckReviewStatusDTO | null>(null);
  const [requests, setRequests] = useState<ReviewRequestDTO[]>([]);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!deckId) { setStatus(null); setRequests([]); return; }
    setLoading(true);
    setError(null);
    try {
      const [statusRes, listRes] = await Promise.all([
        api.get<DeckReviewStatusDTO>(`/decks/${deckId}/review-status`),
        api.get<ReviewRequestDTO[]>(`/decks/${deckId}/review-requests`),
      ]);
      setStatus(statusRes.data);
      setRequests(listRes.data || []);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to load reviews');
    } finally {
      setLoading(false);
    }
  }, [deckId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Light poll — reviewer decisions made elsewhere should reach the editor
  // within ~15s without a full reload.
  useEffect(() => {
    if (!deckId) return;
    const t = setInterval(() => { refresh(); }, 15000);
    return () => clearInterval(t);
  }, [deckId, refresh]);

  const create = useCallback(async (input: CreateReviewRequestInput) => {
    if (!deckId) return null;
    try {
      const { data } = await api.post<ReviewRequestDTO>(
        `/decks/${deckId}/review-requests`, input,
      );
      await refresh();
      return data;
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to request review');
      return null;
    }
  }, [deckId, refresh]);

  const withdraw = useCallback(async (id: string) => {
    try {
      await api.patch(`/review-requests/${id}/withdraw`);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to withdraw');
    }
  }, [refresh]);

  const approve = useCallback(async (id: string) => {
    try {
      await api.patch(`/review-requests/${id}/approve`);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to approve');
    }
  }, [refresh]);

  const requestChanges = useCallback(async (id: string) => {
    try {
      await api.patch(`/review-requests/${id}/request-changes`);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to request changes');
    }
  }, [refresh]);

  const open = useCallback(async (id: string) => {
    try {
      await api.patch(`/review-requests/${id}/open`);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to open review');
    }
  }, [refresh]);

  const reopen = useCallback(async (id: string) => {
    try {
      await api.patch(`/review-requests/${id}/reopen`);
      await refresh();
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || 'Failed to reopen review');
    }
  }, [refresh]);

  const isReviewerForMe = useCallback((currentUserId: string | null | undefined) => {
    if (!currentUserId) return false;
    return status?.activeRequest?.reviewerId === currentUserId;
  }, [status]);

  return {
    status, requests, loading, error, refresh,
    create, withdraw, approve, requestChanges, open, reopen,
    isReviewerForMe,
    activeRequest: status?.activeRequest ?? null,
  };
}
