'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

// =============================================================================
//  Phase 42 — Career documents hooks (frontend mirror of backend API).
// =============================================================================

export type CvDoctype = 'cv' | 'resume' | 'coverLetter' | 'portfolio';

export interface CvPersonalDto {
  fullName?: string; headline?: string; location?: string;
  email?: string; phone?: string; website?: string;
  linkedin?: string; github?: string; summary?: string; photoUrl?: string;
}

export interface CvProfileDto {
  id: string; userId: string;
  personal: CvPersonalDto | null;
  experience: any[]; education: any[]; skills: any[]; languages: any[];
  projects: any[]; certifications: any[]; awards: any[]; publications: any[]; references: any[];
  importSource: string | null; importedAt: string | null;
  createdAt: string; updatedAt: string;
}

export interface CvDocumentDto {
  id: string; profileId: string; userId: string;
  doctype: CvDoctype; title: string;
  templateId: string | null; brandKitId: string | null; variant: string | null;
  content: any;
  thumbnailUrl: string | null; lastExportUrl: string | null;
  createdAt: string; updatedAt: string;
}

export interface CvTemplateDto {
  id: string; doctype: CvDoctype;
  name: string; category: string;
  layout: any; thumbnailUrl: string | null;
  isPublic: boolean;
}

// ---------------------------------------------------------------------------
//  Profile
// ---------------------------------------------------------------------------

export function useCvProfile() {
  const [profile, setProfile] = useState<CvProfileDto | null>(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const { data } = await api.get<CvProfileDto>('/career/profile');
      setProfile(data);
    } catch (e: any) {
      // Phase 43.0A — handle network errors gracefully so the page doesn't
      // crash with an unhandled rejection when the backend is unreachable.
      setError(e?.response?.data?.message || e?.message || 'Failed to load profile');
      setProfile(null);
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const patchPersonal = async (patch: Partial<CvPersonalDto>) => {
    const { data } = await api.patch<CvProfileDto>('/career/profile/personal', patch);
    setProfile(data);
    return data;
  };

  const addItem = async (section: string, item: any) => {
    if (!profile) return null;
    const { data } = await api.post<CvProfileDto>(`/career/profile/${profile.id}/section/${section}`, item);
    setProfile(data);
    return data;
  };

  const updateItem = async (section: string, itemId: string, patch: any) => {
    if (!profile) return null;
    const { data } = await api.patch<CvProfileDto>(`/career/profile/${profile.id}/section/${section}/${itemId}`, patch);
    setProfile(data);
    return data;
  };

  const removeItem = async (section: string, itemId: string) => {
    if (!profile) return null;
    const { data } = await api.delete<CvProfileDto>(`/career/profile/${profile.id}/section/${section}/${itemId}`);
    setProfile(data);
    return data;
  };

  const reorder = async (section: string, ids: string[]) => {
    if (!profile) return null;
    const { data } = await api.post<CvProfileDto>(`/career/profile/${profile.id}/section/${section}/reorder`, { ids });
    setProfile(data);
    return data;
  };

  const importFile = async (
    file: File,
    opts?: { forceOcr?: boolean; sectionMappings?: Record<string, string>; onProgress?: (p: any) => void; jobId?: string },
  ) => {
    if (!profile) return null;
    const form = new FormData();
    form.append('file', file);
    if (opts?.sectionMappings) form.append('sectionMappings', JSON.stringify(opts.sectionMappings));
    const jobId = opts?.jobId || (typeof crypto !== 'undefined' && (crypto as any).randomUUID ? (crypto as any).randomUUID() : `j-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    const qs = `?jobId=${encodeURIComponent(jobId)}${opts?.forceOcr ? '&forceOcr=1' : ''}`;

    // Phase 42.9A — prefer SSE for real-time streaming, fall back to
    // polling if EventSource fails to open (proxies, older browsers).
    let stream: EventSource | null = null;
    let pollTimer: any = null;
    const baseUrl =
      typeof window !== 'undefined' && (window as any).NEXT_PUBLIC_API_BASE
        ? (window as any).NEXT_PUBLIC_API_BASE
        : (process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:3001');
    const stop = () => {
      if (stream) { try { stream.close(); } catch { /* */ } stream = null; }
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
    };
    const startPolling = () => {
      pollTimer = setInterval(async () => {
        try {
          const { data } = await api.get(`/career/profile/import/progress/${jobId}`);
          opts?.onProgress?.(data);
          if (data.phase === 'done' || data.phase === 'failed' || data.phase === 'cancelled') stop();
        } catch { /* */ }
      }, 500);
    };
    try {
      if (typeof window !== 'undefined' && typeof EventSource !== 'undefined') {
        try {
          stream = new EventSource(`${baseUrl}/api/career/profile/import/progress/${jobId}/stream`);
          stream.onmessage = (e) => {
            try {
              const data = JSON.parse(e.data);
              opts?.onProgress?.(data);
              if (data.phase === 'done' || data.phase === 'failed' || data.phase === 'cancelled') stop();
            } catch { /* */ }
          };
          stream.onerror = () => {
            // SSE failed — close and fall back to polling.
            if (stream) { try { stream.close(); } catch { /* */ } stream = null; }
            if (!pollTimer) startPolling();
          };
        } catch { startPolling(); }
      } else {
        startPolling();
      }
    } catch { startPolling(); }

    try {
      const { data } = await api.post<{ jobId: string; profile: CvProfileDto; warnings: string[]; debug?: any; confidence?: any; quality?: any }>(
        `/career/profile/${profile.id}/import/file${qs}`, form,
        { headers: { 'Content-Type': 'multipart/form-data' } },
      );
      setProfile(data.profile);
      return { ...data, jobId };
    } finally {
      // Let the last progress tick / event land then stop.
      setTimeout(stop, 1000);
    }
  };

  const cancelImport = async (jobId: string) => {
    try { await api.post(`/career/profile/import/cancel/${jobId}`); } catch { /* */ }
  };

  const importLinkedIn = async (payload: any) => {
    if (!profile) return null;
    const { data } = await api.post<{ profile: CvProfileDto; warnings: string[] }>(
      `/career/profile/${profile.id}/import/linkedin`, { payload },
    );
    setProfile(data.profile);
    return data;
  };

  return { profile, loading, error, refresh, patchPersonal, addItem, updateItem, removeItem, reorder, importFile, importLinkedIn, cancelImport };
}

// ---------------------------------------------------------------------------
//  Documents
// ---------------------------------------------------------------------------

export function useCvDocuments(doctype?: CvDoctype) {
  const [items, setItems] = useState<CvDocumentDto[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CvDocumentDto[]>('/career/documents', { params: doctype ? { doctype } : {} });
      setItems(data || []);
    } catch {
      // Phase 43.0A — keep an empty list on network failure so the dashboard
      // still renders instead of throwing into the React error boundary.
      setItems([]);
    } finally { setLoading(false); }
  }, [doctype]);
  useEffect(() => { refresh(); }, [refresh]);

  const create = async (input: { doctype: CvDoctype; title: string; templateId?: string; variant?: string }) => {
    const { data } = await api.post<CvDocumentDto>('/career/documents', input);
    await refresh();
    return data;
  };

  const update = async (id: string, patch: any) => {
    const { data } = await api.patch<CvDocumentDto>(`/career/documents/${id}`, patch);
    await refresh();
    return data;
  };

  const remove = async (id: string) => {
    await api.delete(`/career/documents/${id}`);
    await refresh();
  };

  const duplicate = async (id: string, title?: string, variant?: string) => {
    const { data } = await api.post<CvDocumentDto>(`/career/documents/${id}/duplicate`, { title, variant });
    await refresh();
    return data;
  };

  const switchTemplate = async (id: string, templateId: string | null) => {
    const { data } = await api.post<CvDocumentDto>(`/career/documents/${id}/template`, { templateId });
    await refresh();
    return data;
  };

  const exportDoc = async (id: string, format: 'pdf' | 'docx' | 'pptx' | 'html' | 'md', filename: string) => {
    const res = await api.post(`/career/documents/${id}/export?format=${format}`, null, { responseType: 'blob' });
    const url = URL.createObjectURL(res.data as Blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  return { items, loading, refresh, create, update, remove, duplicate, switchTemplate, exportDoc };
}

// ---------------------------------------------------------------------------
//  Templates
// ---------------------------------------------------------------------------

export function useCvTemplates(doctype?: CvDoctype, category?: string) {
  const [items, setItems] = useState<CvTemplateDto[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<CvTemplateDto[]>('/career/templates', {
        params: { ...(doctype ? { doctype } : {}), ...(category ? { category } : {}) },
      });
      setItems(data || []);
    } catch {
      // Phase 43.0A — keep an empty list on network failure.
      setItems([]);
    } finally { setLoading(false); }
  }, [doctype, category]);
  useEffect(() => { refresh(); }, [refresh]);
  return { items, loading, refresh };
}
