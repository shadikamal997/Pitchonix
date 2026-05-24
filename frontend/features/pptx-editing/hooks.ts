'use client';

import { useCallback, useEffect, useState } from 'react';
import api from '@/lib/api';

// =============================================================================
//  Phase 38 — frontend hooks for the Advanced PPTX Editing backend.
//
//  Covers:
//    38A — useMasterSlides     (deck-scoped)
//    38B — useLayoutTemplates  (workspace-scoped)
//    38C — useThemes
//    38G — useDeckSections
//    38H — useElementAnimations
//    38I — useSlideTransition
//    38O — useSlideLibrary
//    38P — useDeckTemplates
//    38D — importPptx (one-off, no state hook)
// =============================================================================

// ----- 38A — Master slides ---------------------------------------------------

export interface MasterSlideDTO {
  id: string; deckId: string; name: string; layoutType: string;
  background: any; slots: any; defaultStyles: any; preview: any;
  createdAt: string; updatedAt: string;
}

export function useMasterSlides(deckId: string | null | undefined) {
  const [items,   setItems]   = useState<MasterSlideDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!deckId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get<MasterSlideDTO[]>(`/decks/${deckId}/master-slides`);
      setItems(data || []);
    } finally { setLoading(false); }
  }, [deckId]);
  useEffect(() => { refresh(); }, [refresh]);

  const create     = (input: Partial<MasterSlideDTO>) => api.post(`/decks/${deckId}/master-slides`, input).then((r) => { refresh(); return r.data; });
  const update     = (id: string, patch: Partial<MasterSlideDTO>) => api.patch(`/master-slides/${id}`, patch).then((r) => { refresh(); return r.data; });
  const duplicate  = (id: string) => api.post(`/master-slides/${id}/duplicate`).then((r) => { refresh(); return r.data; });
  const remove     = (id: string) => api.delete(`/master-slides/${id}`).then((r) => { refresh(); return r.data; });
  const applyToDeck   = (id: string)              => api.post(`/master-slides/${id}/apply-to-deck`).then((r) => r.data);
  const applyToSlides = (id: string, ids: string[]) => api.post(`/master-slides/${id}/apply-to-slides`, { slideIds: ids }).then((r) => r.data);

  return { items, loading, refresh, create, update, duplicate, remove, applyToDeck, applyToSlides };
}

// ----- 38B — Layout templates ------------------------------------------------

export interface LayoutTemplateDTO {
  id: string; workspaceId: string | null; name: string;
  layoutType: string; slots: any; thumbnail: string | null;
  sourceSlideId: string | null; createdAt: string; updatedAt: string;
}

export function useLayoutTemplates(workspaceId?: string | null) {
  const [items,   setItems]   = useState<LayoutTemplateDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<LayoutTemplateDTO[]>(
        '/layout-templates', { params: { workspaceId: workspaceId || undefined } },
      );
      setItems(data || []);
    } finally { setLoading(false); }
  }, [workspaceId]);
  useEffect(() => { refresh(); }, [refresh]);

  const create   = (input: Partial<LayoutTemplateDTO>) => api.post('/layout-templates', input).then((r) => { refresh(); return r.data; });
  const update   = (id: string, patch: Partial<LayoutTemplateDTO>) => api.patch(`/layout-templates/${id}`, patch).then((r) => { refresh(); return r.data; });
  const remove   = (id: string) => api.delete(`/layout-templates/${id}`).then((r) => { refresh(); return r.data; });
  const fromSlide = (slideId: string, name: string) => api.post(`/layout-templates/from-slide/${slideId}`, { name }).then((r) => { refresh(); return r.data; });
  const applyToSlide = (id: string, slideId: string) => api.post(`/layout-templates/${id}/apply-to-slide/${slideId}`).then((r) => r.data);

  return { items, loading, refresh, create, update, remove, fromSlide, applyToSlide };
}

// ----- 38C — Themes ----------------------------------------------------------

export interface ThemeDTO {
  id: string; deckId: string | null; workspaceId: string | null;
  name: string; tokens: any; isWorkspace: boolean; thumbnail: string | null;
  createdAt: string; updatedAt: string;
}

export function useThemes(opts: { deckId?: string | null; workspaceId?: string | null }) {
  const [items,   setItems]   = useState<ThemeDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ThemeDTO[]>('/themes', {
        params: { deckId: opts.deckId || undefined, workspaceId: opts.workspaceId || undefined },
      });
      setItems(data || []);
    } finally { setLoading(false); }
  }, [opts.deckId, opts.workspaceId]);
  useEffect(() => { refresh(); }, [refresh]);

  const create  = (input: Partial<ThemeDTO>) => api.post('/themes', input).then((r) => { refresh(); return r.data; });
  const update  = (id: string, patch: Partial<ThemeDTO>) => api.patch(`/themes/${id}`, patch).then((r) => { refresh(); return r.data; });
  const remove  = (id: string) => api.delete(`/themes/${id}`).then((r) => { refresh(); return r.data; });
  const applyToDeck  = (id: string, deckId: string)  => api.post(`/themes/${id}/apply-to-deck/${deckId}`).then((r) => r.data);
  const applyToSlide = (id: string, slideId: string) => api.post(`/themes/${id}/apply-to-slide/${slideId}`).then((r) => r.data);

  return { items, loading, refresh, create, update, remove, applyToDeck, applyToSlide };
}

// ----- 38G — Sections --------------------------------------------------------

export interface DeckSectionDTO {
  id: string; deckId: string; name: string; color: string | null;
  order: number; collapsed: boolean; createdAt: string; updatedAt: string;
}

export function useDeckSections(deckId: string | null | undefined) {
  const [items,   setItems]   = useState<DeckSectionDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!deckId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get<DeckSectionDTO[]>(`/decks/${deckId}/sections`);
      setItems(data || []);
    } finally { setLoading(false); }
  }, [deckId]);
  useEffect(() => { refresh(); }, [refresh]);

  const create    = (input: Partial<DeckSectionDTO>) => api.post(`/decks/${deckId}/sections`, input).then((r) => { refresh(); return r.data; });
  const update    = (id: string, patch: Partial<DeckSectionDTO>) => api.patch(`/sections/${id}`, patch).then((r) => { refresh(); return r.data; });
  const remove    = (id: string) => api.delete(`/sections/${id}`).then((r) => { refresh(); return r.data; });
  const reorder   = (ids: string[]) => api.post(`/decks/${deckId}/sections/reorder`, { ids }).then((r) => { refresh(); return r.data; });
  const duplicate = (id: string) => api.post(`/sections/${id}/duplicate`).then((r) => { refresh(); return r.data; });
  const moveSlide = (slideId: string, sectionId: string | null) => api.post(`/slides/${slideId}/section`, { sectionId }).then((r) => r.data);

  return { items, loading, refresh, create, update, remove, reorder, duplicate, moveSlide };
}

// ----- 38H — Element animations ---------------------------------------------

export interface ElementAnimation {
  id: string;
  effect: string;
  /** Phase 38.2D — 'entr' | 'exit' | 'emph' | 'path'. */
  class?: 'entr' | 'exit' | 'emph' | 'path';
  direction?: string;
  duration: number;
  delay: number;
  order: number;
  trigger?: string;
  // Phase 38.2D additions
  repeat?: number | 'indefinite';
  byParagraph?: boolean;
  /** Phase 38.2E — SVG-like motion path in slide-percent coords. */
  motionPath?: string;
}

export function useElementAnimations(elementId: string | null | undefined) {
  const [items, setItems] = useState<ElementAnimation[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!elementId) { setItems([]); return; }
    setLoading(true);
    try {
      const { data } = await api.get<ElementAnimation[]>(`/elements/${elementId}/animations`);
      setItems(data || []);
    } finally { setLoading(false); }
  }, [elementId]);
  useEffect(() => { refresh(); }, [refresh]);

  const add    = (input: Omit<ElementAnimation, 'id'>) => api.post(`/elements/${elementId}/animations`, input).then((r) => { refresh(); return r.data; });
  const update = (id: string, patch: Partial<ElementAnimation>) => api.patch(`/elements/${elementId}/animations/${id}`, patch).then((r) => { refresh(); return r.data; });
  const remove = (id: string) => api.delete(`/elements/${elementId}/animations/${id}`).then((r) => { refresh(); return r.data; });
  const reorder = (ids: string[]) => api.post(`/elements/${elementId}/animations/reorder`, { ids }).then((r) => { refresh(); return r.data; });
  return { items, loading, refresh, add, update, remove, reorder };
}

// ----- 38I — Slide transition -----------------------------------------------

export interface SlideTransitionDTO {
  effect: string; duration: number; direction?: string;
  advanceOnClick?: boolean; advanceAfter?: number;
}

export function useSlideTransition(slideId: string | null | undefined) {
  const [transition, setTransition] = useState<SlideTransitionDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    if (!slideId) { setTransition(null); return; }
    setLoading(true);
    try {
      const { data } = await api.get<SlideTransitionDTO | null>(`/slides/${slideId}/transition`);
      setTransition(data || null);
    } finally { setLoading(false); }
  }, [slideId]);
  useEffect(() => { refresh(); }, [refresh]);

  const set   = (t: SlideTransitionDTO) => api.put(`/slides/${slideId}/transition`, t).then((r) => { setTransition(r.data); return r.data; });
  const clear = () => api.delete(`/slides/${slideId}/transition`).then(() => setTransition(null));
  const applyToDeck = (deckId: string, t: SlideTransitionDTO) => api.post(`/decks/${deckId}/transition`, t).then((r) => r.data);
  return { transition, loading, refresh, set, clear, applyToDeck };
}

// ----- 38O — Slide library ---------------------------------------------------

export interface ReusableSlideDTO {
  id: string; name: string; description: string | null;
  kind: string; payload: any; thumbnail: string | null;
  tags: string[]; createdAt: string; updatedAt: string;
}

export function useSlideLibrary(kind?: string) {
  const [items, setItems] = useState<ReusableSlideDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<ReusableSlideDTO[]>('/slide-library', { params: { kind } });
      setItems(data || []);
    } finally { setLoading(false); }
  }, [kind]);
  useEffect(() => { refresh(); }, [refresh]);

  const fromSlide   = (input: { slideId: string; name: string; description?: string; tags?: string[] }) => api.post('/slide-library/from-slide', input).then((r) => { refresh(); return r.data; });
  const fromSection = (input: { sectionId: string; name: string; description?: string; tags?: string[] }) => api.post('/slide-library/from-section', input).then((r) => { refresh(); return r.data; });
  const insert      = (id: string, deckId: string) => api.post(`/slide-library/${id}/insert/${deckId}`).then((r) => r.data);
  const remove      = (id: string) => api.delete(`/slide-library/${id}`).then((r) => { refresh(); return r.data; });
  return { items, loading, refresh, fromSlide, fromSection, insert, remove };
}

// ----- 38P — Deck templates --------------------------------------------------

export interface DeckTemplateDTO {
  id: string; workspaceId: string | null; sourceDeckId: string | null;
  name: string; description: string | null; thumbnail: string | null;
  isPublic: boolean; payload: any; createdAt: string; updatedAt: string;
}

export function useDeckTemplates(workspaceId?: string | null) {
  const [items, setItems] = useState<DeckTemplateDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await api.get<DeckTemplateDTO[]>('/deck-templates', { params: { workspaceId: workspaceId || undefined } });
      setItems(data || []);
    } finally { setLoading(false); }
  }, [workspaceId]);
  useEffect(() => { refresh(); }, [refresh]);

  const fromDeck     = (deckId: string, input: Partial<DeckTemplateDTO>) => api.post(`/deck-templates/from-deck/${deckId}`, input).then((r) => { refresh(); return r.data; });
  const instantiate  = (id: string, projectId: string, title?: string) => api.post(`/deck-templates/${id}/instantiate`, { projectId, title }).then((r) => r.data);
  const remove       = (id: string) => api.delete(`/deck-templates/${id}`).then((r) => { refresh(); return r.data; });
  return { items, loading, refresh, fromDeck, instantiate, remove };
}

// ----- 38D — PPTX import -----------------------------------------------------

export async function importPptx(file: File, projectId: string) {
  const form = new FormData();
  form.append('file', file);
  form.append('projectId', projectId);
  const { data } = await api.post<{ deckId: string; warnings: string[] }>(
    '/pptx-import/into-project', form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}

export async function parsePptx(file: File) {
  const form = new FormData();
  form.append('file', file);
  const { data } = await api.post<any>(
    '/pptx-import/parse', form,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return data;
}
