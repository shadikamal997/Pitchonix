'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import api from '@/lib/api';

// =============================================================================
//  useSlideComments — data hook for the right-side comments panel
//
//  - Loads top-level comments anchored to the slide (or to any element on
//    that slide via slideElementId).
//  - Provides CRUD: addComment, addReply, resolve, reopen, remove.
//  - Polls every 10 s so collaborators' comments appear automatically.
//  - Tracks per-element unresolved counts for badges on the canvas.
// =============================================================================

export interface CommentUser {
  id:    string;
  name:  string | null;
  email: string;
}

export interface MentionMeta {
  userId:      string;
  displayName: string;
}

export interface CommentDTO {
  id:             string;
  projectId:      string;
  userId:         string;
  content:        string;
  resolved:       boolean;
  parentId:       string | null;
  slideId:        string | null;
  slideElementId: string | null;
  pageId:         string | null;
  anchorX:        number | null;
  anchorY:        number | null;
  createdAt:      string;
  updatedAt:      string;
  // Phase 36.1A — mentions parsed at create/edit time.
  mentions?:      MentionMeta[] | null;
  // Phase 36.1H — thread assignee.
  assignedToId?:  string | null;
  assignedTo?:    CommentUser | null;
  // Phase 36.1E — edit/delete metadata.
  editedAt?:      string | null;
  deletedAt?:     string | null;
  user:           CommentUser;
  replies:        CommentDTO[];
}

export interface UseSlideCommentsResult {
  comments:        CommentDTO[];
  elementCounts:   Record<string, number>;
  loading:         boolean;
  error:           string | null;
  refresh:         () => Promise<void>;
  addComment:      (input: { content: string; slideElementId?: string; anchorX?: number; anchorY?: number }) => Promise<CommentDTO | null>;
  addReply:        (parentId: string, content: string) => Promise<CommentDTO | null>;
  resolve:         (id: string) => Promise<void>;
  reopen:          (id: string) => Promise<void>;
  remove:          (id: string) => Promise<void>;
  // Phase 36.1E — edit own message
  edit:            (id: string, content: string) => Promise<void>;
  // Phase 36.1H — assignment
  assign:          (id: string, assigneeId: string | null) => Promise<void>;
  // Phase 36.1K — bulk resolve for the current slide
  resolveAll:      () => Promise<number>;
}

export function useSlideComments(projectId: string | null | undefined, slideId: string | null | undefined): UseSlideCommentsResult {
  const [comments, setComments] = useState<CommentDTO[]>([]);
  const [elementCounts, setElementCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track in-flight slideId so out-of-order responses don't clobber state.
  const lastReqIdRef = useRef<string>('');

  const refresh = useCallback(async () => {
    if (!slideId) { setComments([]); setElementCounts({}); return; }
    const reqId = slideId + ':' + Date.now();
    lastReqIdRef.current = reqId;
    setLoading(true); setError(null);
    try {
      const [{ data: list }, { data: counts }] = await Promise.all([
        api.get<CommentDTO[]>(`/slides/${slideId}/comments`),
        api.get<Record<string, number>>(`/slides/${slideId}/element-comment-counts`),
      ]);
      if (lastReqIdRef.current !== reqId) return;
      setComments(list);
      setElementCounts(counts);
    } catch (err: any) {
      if (lastReqIdRef.current !== reqId) return;
      setError(err?.response?.data?.message || err?.message || 'Failed to load comments');
    } finally {
      if (lastReqIdRef.current === reqId) setLoading(false);
    }
  }, [slideId]);

  useEffect(() => { refresh(); }, [refresh]);

  // Poll for collaborator updates.
  useEffect(() => {
    if (!slideId) return;
    const id = window.setInterval(refresh, 10000);
    return () => window.clearInterval(id);
  }, [slideId, refresh]);

  const addComment = useCallback(async (input: { content: string; slideElementId?: string; anchorX?: number; anchorY?: number }) => {
    if (!projectId || !slideId) return null;
    try {
      const { data } = await api.post<CommentDTO>(`/projects/${projectId}/comments`, {
        content: input.content,
        slideId,
        slideElementId: input.slideElementId,
        anchorX: input.anchorX,
        anchorY: input.anchorY,
      });
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to add comment');
      return null;
    }
  }, [projectId, slideId, refresh]);

  const addReply = useCallback(async (parentId: string, content: string) => {
    if (!projectId) return null;
    try {
      const { data } = await api.post<CommentDTO>(`/projects/${projectId}/comments`, { content, parentId });
      await refresh();
      return data;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reply');
      return null;
    }
  }, [projectId, refresh]);

  const resolve = useCallback(async (id: string) => {
    try {
      await api.patch(`/comments/${id}/resolve`);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resolve');
    }
  }, [refresh]);

  const reopen = useCallback(async (id: string) => {
    try {
      await api.patch(`/comments/${id}/reopen`);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to reopen');
    }
  }, [refresh]);

  const remove = useCallback(async (id: string) => {
    try {
      await api.delete(`/comments/${id}`);
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to delete');
    }
  }, [refresh]);

  const edit = useCallback(async (id: string, content: string) => {
    try {
      await api.patch(`/comments/${id}`, { content });
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to edit');
    }
  }, [refresh]);

  const assign = useCallback(async (id: string, assigneeId: string | null) => {
    try {
      await api.patch(`/comments/${id}/assign`, { assigneeId });
      await refresh();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to assign');
    }
  }, [refresh]);

  const resolveAll = useCallback(async (): Promise<number> => {
    if (!slideId) return 0;
    try {
      const { data } = await api.post<{ resolved: number }>(
        `/slides/${slideId}/comments/resolve-all`,
      );
      await refresh();
      return data.resolved ?? 0;
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to resolve all');
      return 0;
    }
  }, [slideId, refresh]);

  return {
    comments, elementCounts, loading, error, refresh,
    addComment, addReply, resolve, reopen, remove,
    edit, assign, resolveAll,
  };
}
