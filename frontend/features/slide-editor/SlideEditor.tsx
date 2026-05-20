'use client';

import React, { useCallback, useState, useEffect, useRef, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ArrowLeft, Copy, Trash2, ZoomIn, ZoomOut, MoveLeft, MoveRight,
  Save, AlertCircle, Loader2, CheckCircle2, RotateCcw,
} from 'lucide-react';
import type { Editor } from '@tiptap/react';
import { SlideCanvas } from './SlideCanvas';
import { useElementsApi } from './useElementsApi';
import { InlineTextEditor } from './editing/InlineTextEditor';
import { InlineListEditor } from './editing/InlineListEditor';
import { FloatingToolbar } from './editing/FloatingToolbar';
import { Inspector } from './inspector/Inspector';
import { SlideSidebar } from './sidebar/SlideSidebar';
import { useDeckSlides } from './sidebar/useDeckSlides';
import { bumpSlideThumbnail, bumpAllSlideThumbnails } from './sidebar/SlideThumbnail';
import { useUndoRedo } from './useUndoRedo';
import { InsertMenu } from './toolbar/InsertMenu';
import { AlignTools } from './toolbar/AlignTools';
import { ArrangeTools } from './toolbar/ArrangeTools';
import { TemplateGallery } from './templates/TemplateGallery';
import { findTemplate } from './templates/registry';
import { LayoutSwitcher } from './layouts/LayoutSwitcher';
import { ExportMenu } from './export/ExportMenu';
import { SmartTools } from './smart/SmartTools';
import { EditorErrorBoundary } from './polish/EditorErrorBoundary';
import { KeyboardShortcutsDialog } from './polish/KeyboardShortcutsDialog';
import { Keyboard } from 'lucide-react';
import { OverflowBadgeLayer } from './smart/OverflowBadgeLayer';
import { analyzeSlideOverflow } from './smart/overflow-analyzer';
import { expandSelectionToGroups, groupSelection, ungroupSelection, groupIdOf, groupMembers, groupBounds } from './smart/group-utils';
import { tidySlide } from './smart/tidy-engine';
import { PresenterMode } from './presenter/PresenterMode';
import { CompositionDebugBadge } from './templates/composition/DebugBadge';
import { CommentsPanel } from './comments/CommentsPanel';
import { useSlideComments } from './comments/useSlideComments';
import { ElementCommentBadge } from './comments/ElementCommentBadge';
import { Play, MessageSquare } from 'lucide-react';
import { applyLayout } from './layouts/applyLayout';
import { findLayout, type LayoutSpec } from './layouts/registry';
import { Undo2, Redo2, Sparkles } from 'lucide-react';
import type { SlideElementDTO, ElementStyle } from '@/types/slide-element';

interface Slide {
  id: string;
  deckId: string;
  type: string;
  order: number;
  title: string;
  subtitle: string | null;
  speakerNotes: string | null;
  background?: any;
  themeTokens?: any;
  metadata?: any;
}

interface SlideEditorProps {
  projectId: string;
  slideId: string;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ projectId, slideId }) => {
  const router = useRouter();
  const [slide, setSlide] = useState<Slide | null>(null);
  const [loadingSlide, setLoadingSlide] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editingBoxRef = useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);
  const [templateGalleryOpen, setTemplateGalleryOpen] = useState(false);
  const [presenterOpen, setPresenterOpen] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commentsFocusElementId, setCommentsFocusElementId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Read the currently-applied template from the slide's metadata
  const appliedTemplate = (slide?.metadata as any)?.appliedTemplateId
    ? findTemplate((slide?.metadata as any).appliedTemplateId)
    : null;

  // Read the current layout from metadata
  const appliedLayoutId: string | null = (slide?.metadata as any)?.layoutId || null;

  const api$ = useElementsApi(slideId);
  const deckSlides = useDeckSlides(slide?.deckId || null);

  // ── Undo / redo ───────────────────────────────────────────────────────────
  // The hook holds snapshots of the elements array. `commit` is called from
  // settle events; restoration replaces the slide's elements via syncAll.
  const apiRef = useRef(api$);
  apiRef.current = api$;
  const history = useUndoRedo({
    resetKey: slideId,
    getCurrent: () => apiRef.current.elements,
    onRestore:  (snapshot) => apiRef.current.syncAll(snapshot),
  });

  // Seed the history with the initial element set once it loads
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (api$.elements.length > 0 && seededFor.current !== slideId && !api$.loading) {
      seededFor.current = slideId;
      history.reset(api$.elements);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId, api$.loading, api$.elements.length]);

  // ── Layout apply (Phase 11) ───────────────────────────────────────────────
  const handleApplyLayout = useCallback(async (layout: LayoutSpec) => {
    // Snapshot the current state to the undo stack BEFORE the change
    history.commit(apiRef.current.elements);

    if (layout.blank) {
      const confirmed = window.confirm('Blank layout will remove every element on this slide. Continue?');
      if (!confirmed) return;
      await apiRef.current.syncAll([]);
    } else {
      const next = applyLayout(apiRef.current.elements, layout);
      await apiRef.current.syncAll(next);
    }

    // Persist the new layoutId in slide metadata
    try {
      const currentMeta = (slide?.metadata as any) || {};
      await api.patch(`/slides/${slideId}`, {
        metadata: { ...currentMeta, layoutId: layout.id, layoutAppliedAt: new Date().toISOString() },
      });
      setSlide((prev) => prev ? { ...prev, metadata: { ...currentMeta, layoutId: layout.id } } : prev);
    } catch (_) {}

    // Snapshot the post-apply state so further edits can undo back to here
    history.commit(apiRef.current.elements);
  }, [slide, slideId, history]);

  // Track the editing element's DOM box so the floating toolbar follows it.
  useEffect(() => {
    if (!editingId) { setAnchorRect(null); return; }
    const update = () => {
      const node = document.querySelector(`[data-element-id="${editingId}"]`) as HTMLElement | null;
      setAnchorRect(node ? node.getBoundingClientRect() : null);
    };
    update();
    const interval = setInterval(update, 200);   // tracks zoom/scroll changes cheaply
    window.addEventListener('resize', update);
    return () => { clearInterval(interval); window.removeEventListener('resize', update); };
  }, [editingId, zoom]);

  // Exit edit mode when slide changes
  useEffect(() => { setEditingId(null); setActiveEditor(null); }, [slideId]);

  // ── Load slide metadata ───────────────────────────────────────────────────
  // (Deck-level slide list is owned by useDeckSlides; this effect only fetches
  // the current slide's title / subtitle / speakerNotes / background.)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingSlide(true);
        const { data: slideRow } = await api.get(`/slides/${slideId}`);
        if (cancelled) return;
        setSlide(slideRow);
      } catch (_) {
        if (!cancelled) setSlide(null);
      } finally {
        if (!cancelled) setLoadingSlide(false);
      }
    })();
    return () => { cancelled = true; };
  }, [slideId]);

  // Clear selection when slide changes
  useEffect(() => { setSelectedIds([]); }, [slideId]);

  // Load current user id (once) for comment-author detection.
  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/users/me');
        setCurrentUserId(data?.id || null);
      } catch (_) { /* ignored — anonymous fallback */ }
    })();
  }, []);

  // Slide-scoped comments (counts + the panel reuses its own hook for the list).
  const slideComments = useSlideComments(slide?.deckId ? (slide as any).deck?.projectId || projectId : null, slideId);
  const elementCounts = slideComments.elementCounts;
  const totalOpenComments = Object.values(elementCounts).reduce((a, n) => a + n, 0)
    + slideComments.comments.filter((c) => !c.resolved && !c.slideElementId).length;

  // Auto-focus the panel on the selected element if the panel is open.
  useEffect(() => {
    if (!commentsOpen) return;
    if (selectedIds.length === 1) setCommentsFocusElementId(selectedIds[0]);
    else                          setCommentsFocusElementId(null);
  }, [selectedIds, commentsOpen]);

  // ── Debounced slide-level PATCH ────────────────────────────────────────────
  const slidePatchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const slidePatchPending = useRef<Partial<Slide>>({});
  const flushSlidePatch = useCallback(async () => {
    const patch = slidePatchPending.current;
    slidePatchPending.current = {};
    if (Object.keys(patch).length === 0) return;
    try { await api.patch(`/slides/${slideId}`, patch); } catch (_) {}
  }, [slideId]);
  const handlePatchSlide = useCallback((patch: Partial<Slide>) => {
    setSlide((prev) => (prev ? { ...prev, ...patch } : prev));
    slidePatchPending.current = { ...slidePatchPending.current, ...patch };
    if (slidePatchTimer.current) clearTimeout(slidePatchTimer.current);
    slidePatchTimer.current = setTimeout(() => { flushSlidePatch(); }, 400);
  }, [flushSlidePatch]);

  // ── Transform handlers (live = local only, commit = save) ─────────────────
  const handleTransformLive = useCallback((updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => {
    // updateMany updates local state immediately and schedules a debounced save
    api$.updateMany(updates);
  }, [api$]);

  const handleTransformCommit = useCallback((_updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => {
    // The local state already reflects the change. Snapshot it into history.
    history.commit(apiRef.current.elements);
  }, [history]);

  // ── Inline-edit renderer ──────────────────────────────────────────────────
  const handleStyleChange = useCallback((id: string, patch: Partial<ElementStyle>) => {
    const el = api$.elements.find(e => e.id === id);
    if (!el) return;
    api$.updateElement(id, { style: { ...(el.style || {}), ...patch } as any });
  }, [api$]);

  // ── Smart tools (Phase 15) ────────────────────────────────────────────────
  // Overflow reports are re-derived on every element change. Heuristic only,
  // so it's cheap (< 1 ms for typical decks).
  const overflowReports = useMemo(() => analyzeSlideOverflow(api$.elements), [api$.elements]);
  const overflowCount = Object.keys(overflowReports).length;

  const handleApplyOverflowFix = useCallback((elementId: string, patch: Partial<SlideElementDTO>) => {
    api$.updateElement(elementId, patch);
    history.commit(apiRef.current.elements);
  }, [api$, history]);

  const handleGroupSelection = useCallback(() => {
    const result = groupSelection(api$.elements, selectedIds);
    if (!result) return;
    api$.updateMany(result.patches);
    setSelectedIds(result.patches.map((p) => p.id));
    history.commit(apiRef.current.elements);
  }, [api$, selectedIds, history]);

  const handleUngroupSelection = useCallback(() => {
    const patches = ungroupSelection(api$.elements, selectedIds);
    if (patches.length === 0) return;
    api$.updateMany(patches);
    history.commit(apiRef.current.elements);
  }, [api$, selectedIds, history]);

  const handleTidySlide = useCallback(async () => {
    const decision = tidySlide(apiRef.current.elements);
    if (decision.next.length === 0 && apiRef.current.elements.length > 0) return;
    if (!window.confirm(`Tidy slide → ${decision.layoutName}\n\n${decision.reason}\n\nThis will re-position your elements. Continue?`)) return;
    history.commit(apiRef.current.elements);
    await apiRef.current.syncAll(decision.next);
    if (decision.layoutId) {
      try {
        const currentMeta = (slide?.metadata as any) || {};
        await api.patch(`/slides/${slideId}`, {
          metadata: { ...currentMeta, layoutId: decision.layoutId, layoutAppliedAt: new Date().toISOString() },
        });
        setSlide((prev) => prev ? { ...prev, metadata: { ...currentMeta, layoutId: decision.layoutId } } : prev);
      } catch (_) {}
    }
    history.commit(apiRef.current.elements);
  }, [history, slide, slideId]);

  // Group-aware selection: when the user clicks one element in a group, expand
  // to the whole group so dragging moves them together. Holding Alt bypasses.
  const handleSelectIds = useCallback((ids: string[], opts?: { altKey?: boolean }) => {
    if (opts?.altKey) { setSelectedIds(ids); return; }
    const expanded = expandSelectionToGroups(api$.elements, ids);
    setSelectedIds(expanded);
    if (editingId && !expanded.includes(editingId)) { setEditingId(null); setActiveEditor(null); }
  }, [api$.elements, editingId]);

  const renderInlineEditor = useCallback((el: SlideElementDTO) => {
    const commit = () => { setEditingId(null); setActiveEditor(null); };

    const updateContent = (patch: any) => {
      api$.updateElement(el.id, patch);
    };

    if (el.type === 'bulletList') {
      return (
        <InlineListEditor
          element={el}
          ordered={false}
          onChange={updateContent}
          onCommit={commit}
          onEditorReady={setActiveEditor}
        />
      );
    }
    if (el.type === 'numberedList') {
      return (
        <InlineListEditor
          element={el}
          ordered
          onChange={updateContent}
          onCommit={commit}
          onEditorReady={setActiveEditor}
        />
      );
    }
    // Single-block text elements
    const sizeFor: Record<string, number> = {
      heading: 32, subheading: 18, paragraph: 14, quote: 16, caption: 11,
      label: 11, cta: 14, footer: 10,
    };
    const weightFor: Record<string, number> = {
      heading: 700, subheading: 500, label: 600, cta: 600, paragraph: 400, quote: 500,
    };
    const multilineTypes = new Set(['paragraph', 'quote']);
    return (
      <InlineTextEditor
        element={el}
        defaultSize={(el.style as any)?.fontSize ?? sizeFor[el.type] ?? 14}
        defaultWeight={(el.style as any)?.fontWeight ?? weightFor[el.type] ?? 400}
        multiline={multilineTypes.has(el.type)}
        onChange={updateContent}
        onCommit={commit}
        onEditorReady={setActiveEditor}
      />
    );
  }, [api$]);

  // Auto-focus first element on Enter when one is selected and not yet editing
  // + Cmd/Ctrl+Z (undo) / Cmd/Ctrl+Shift+Z (redo)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;

      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) history.redo();
        else            history.undo();
        return;
      }

      // ⌘/Ctrl + / → keyboard-shortcuts help dialog
      if (meta && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        setShortcutsOpen((v) => !v);
        return;
      }

      // ⌘/Ctrl + A → select all elements on this slide
      if (meta && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        const allIds = api$.elements.filter((el) => !el.locked && el.visible !== false).map((el) => el.id);
        setSelectedIds(allIds);
        return;
      }

      // ⌘/Ctrl + D → duplicate selection (canvas owns Del handler; mirror here too)
      if (meta && e.key.toLowerCase() === 'd') {
        if (selectedIds.length > 0) {
          e.preventDefault();
          handleDuplicateSelected();
        }
        return;
      }

      if (e.key === 'Enter' && !editingId && selectedIds.length === 1) {
        const el = api$.elements.find((x) => x.id === selectedIds[0]);
        if (el && ['heading','subheading','paragraph','quote','caption','label','cta','footer','bulletList','numberedList'].includes(el.type)) {
          e.preventDefault();
          setEditingId(el.id);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [editingId, selectedIds, api$.elements, history]);

  // ── Selection-derived actions ─────────────────────────────────────────────
  const handleDeleteSelected = useCallback(async () => {
    for (const id of selectedIds) await api$.deleteElement(id);
    setSelectedIds([]);
    history.commit(apiRef.current.elements);
  }, [selectedIds, api$, history]);

  const handleDuplicateSelected = useCallback(async () => {
    const newIds: string[] = [];
    for (const id of selectedIds) {
      const dup = await api$.duplicateElement(id);
      if (dup) newIds.push(dup.id);
    }
    if (newIds.length > 0) setSelectedIds(newIds);
    history.commit(apiRef.current.elements);
  }, [selectedIds, api$, history]);

  const handleInsertElement = useCallback(async (def: Partial<SlideElementDTO>) => {
    const created = await api$.createElement(def);
    if (created) {
      setSelectedIds([created.id]);
      history.commit(apiRef.current.elements);
    }
  }, [api$, history]);

  // ── Slide navigation ──────────────────────────────────────────────────────
  const slideIdx = deckSlides.slides.findIndex((s) => s.id === slideId);
  const prevSlide = slideIdx > 0 ? deckSlides.slides[slideIdx - 1] : null;
  const nextSlide = slideIdx >= 0 && slideIdx < deckSlides.slides.length - 1 ? deckSlides.slides[slideIdx + 1] : null;

  const gotoSlide = (id: string) => router.push(`/projects/${projectId}/edit/${id}`);

  // When the current slide is deleted, navigate to a neighbour or back to project
  const handleCurrentDeleted = useCallback((nextId: string | null) => {
    if (nextId) router.push(`/projects/${projectId}/edit/${nextId}`);
    else        router.push(`/projects/${projectId}`);
  }, [projectId, router]);

  // Bump the live slide's thumbnail whenever its elements change
  useEffect(() => {
    if (slideId && api$.elements.length > 0) bumpSlideThumbnail(slideId);
  }, [slideId, api$.elements]);

  // ── Save status pill ──────────────────────────────────────────────────────
  const SaveStatus = () => {
    if (api$.saveStatus === 'saving')
      return <span className="text-xs text-slate-500 flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>;
    if (api$.saveStatus === 'error')
      return <span className="text-xs text-red-600 flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Save failed</span>;
    if (api$.saveStatus === 'dirty')
      return <span className="text-xs text-amber-600 flex items-center gap-1.5"><Save className="w-3 h-3" />Unsaved changes</span>;
    return <span className="text-xs text-green-700 flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />Saved</span>;
  };

  if (loadingSlide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Loader2 className="w-8 h-8 animate-spin text-green-600" />
      </div>
    );
  }
  if (!slide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 flex-col gap-3">
        <p className="text-slate-700">Slide not found.</p>
        <Link href={`/projects/${projectId}`} className="text-sm text-green-700 hover:underline">← Back to project</Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-slate-100 overflow-hidden">
      {/* ── Top toolbar ───────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 px-4 h-12 flex items-center gap-3 shadow-sm flex-shrink-0">
        <Link href={`/projects/${projectId}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="h-5 w-px bg-slate-200" />
        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-900 truncate max-w-xs">
          {slide.title}
        </div>
        <span className="text-[11px] text-slate-400 font-mono uppercase">{slide.type}</span>

        {/* Slide nav */}
        <div className="ml-3 flex items-center gap-1">
          <button
            disabled={!prevSlide}
            onClick={() => prevSlide && gotoSlide(prevSlide.id)}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous slide"
          >
            <MoveLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-16 text-center">
            {slideIdx >= 0 ? `${slideIdx + 1} / ${deckSlides.slides.length}` : '—'}
          </span>
          <button
            disabled={!nextSlide}
            onClick={() => nextSlide && gotoSlide(nextSlide.id)}
            className="p-1 rounded text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next slide"
          >
            <MoveRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Template gallery */}
        <button
          type="button"
          onClick={() => setTemplateGalleryOpen(true)}
          title="Browse templates"
          className="h-7 px-2.5 bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-green-600" />
          {appliedTemplate ? appliedTemplate.name : 'Templates'}
        </button>

        {/* Layout switcher */}
        <LayoutSwitcher
          currentLayoutId={appliedLayoutId}
          onPick={handleApplyLayout}
        />

        <div className="h-5 w-px bg-slate-200" />

        {/* Insert menu */}
        <InsertMenu onInsert={handleInsertElement} />

        <div className="h-5 w-px bg-slate-200" />

        {/* Smart tools (Phase 15): tidy, group, overflow stats */}
        <SmartTools
          elements={api$.elements}
          selectedIds={selectedIds}
          overflowCount={overflowCount}
          onGroup={handleGroupSelection}
          onUngroup={handleUngroupSelection}
          onTidy={handleTidySlide}
        />

        <div className="h-5 w-px bg-slate-200" />

        {/* Undo / redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => history.undo()}
            disabled={!history.canUndo}
            title="Undo (⌘Z)"
            className="w-7 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => history.redo()}
            disabled={!history.canRedo}
            title="Redo (⌘⇧Z)"
            className="w-7 h-6 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-slate-200" />

        {/* Align */}
        <AlignTools
          selected={api$.elements.filter((e) => selectedIds.includes(e.id))}
          onUpdateMany={(u) => { api$.updateMany(u); history.commit(apiRef.current.elements); }}
        />

        <div className="h-5 w-px bg-slate-200" />

        {/* Arrange */}
        <ArrangeTools
          allElements={api$.elements}
          selected={api$.elements.filter((e) => selectedIds.includes(e.id))}
          onUpdateMany={(u) => { api$.updateMany(u); history.commit(apiRef.current.elements); }}
        />

        <div className="ml-auto flex items-center gap-3">
          <SaveStatus />

          <div className="h-5 w-px bg-slate-200" />

          <button
            onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
            className="p-1 rounded text-slate-600 hover:bg-slate-100"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-500 w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
            className="p-1 rounded text-slate-600 hover:bg-slate-100"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-slate-200" />

          <button
            disabled={selectedIds.length === 0}
            onClick={handleDuplicateSelected}
            title="Duplicate (Cmd/Ctrl+D)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          <button
            disabled={selectedIds.length === 0}
            onClick={handleDeleteSelected}
            title="Delete (Del)"
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          {slide?.deckId && (
            <>
              <div className="h-5 w-px bg-slate-200" />
              <button
                type="button"
                onClick={() => { setCommentsOpen((v) => !v); }}
                title="Comments"
                className={`relative h-7 px-2.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                  commentsOpen
                    ? 'bg-green-50 text-green-700 border border-green-300'
                    : 'bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-700'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-green-600" />
                Comments
                {totalOpenComments > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-amber-500 text-white text-[9px] font-bold ring-2 ring-white">
                    {totalOpenComments}
                  </span>
                )}
              </button>
              <button
                type="button"
                onClick={() => setPresenterOpen(true)}
                disabled={deckSlides.slides.length === 0}
                title="Present (P)"
                className="h-7 px-2.5 bg-white border border-slate-200 hover:border-green-400 hover:bg-green-50 text-slate-700 text-xs font-semibold rounded flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 text-green-600 fill-green-600" />
                Present
              </button>
              <ExportMenu deckId={slide.deckId} deckTitle={slide.title} />
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                title="Keyboard shortcuts (⌘/)"
                aria-label="Keyboard shortcuts"
                className="h-7 w-7 flex items-center justify-center rounded text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Sidebar + Stage + Inspector ───────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar */}
        <SlideSidebar
          api={deckSlides}
          currentSlideId={slideId}
          onNavigate={gotoSlide}
          onCurrentDeleted={handleCurrentDeleted}
          onTitleRename={async (id, newTitle) => {
            await api.patch(`/slides/${id}`, { title: newTitle });
            if (id === slideId) setSlide((prev) => prev ? { ...prev, title: newTitle } : prev);
          }}
        />
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative">
          {api$.loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          ) : api$.error ? (
            <div className="text-red-600 flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              {api$.error}
              <button onClick={api$.refresh} className="ml-2 underline text-sm">Retry</button>
            </div>
          ) : (
            <SlideCanvas
              elements={api$.elements}
              selectedIds={selectedIds}
              onSelect={(ids) => handleSelectIds(ids)}
              onTransformLive={handleTransformLive}
              onTransformCommit={handleTransformCommit}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              pageNumber={slideIdx >= 0 ? slideIdx + 1 : undefined}
              totalPages={deckSlides.slides.length || undefined}
              zoom={zoom}
              editingId={editingId}
              onRequestEdit={(id) => { setSelectedIds([id]); setEditingId(id); }}
              renderEditor={renderInlineEditor}
              background={slide?.background || null}
              themeTokens={slide?.themeTokens || null}
              slideType={(slide as any)?.type || undefined}
              slideIndex={slideIdx >= 0 ? slideIdx : 0}
              compositionFamilyId={(slide?.metadata as any)?.appliedTemplateId || null}
            />
          )}

          {/* Floating formatting toolbar follows the editing element */}
          {editingId && (
            <FloatingToolbar
              editor={activeEditor}
              element={api$.elements.find((e) => e.id === editingId) || null}
              anchorRect={anchorRect}
              onStyleChange={(patch) => handleStyleChange(editingId, patch)}
            />
          )}

          {/* Element comment badges (Phase 14) */}
          {Object.keys(elementCounts).length > 0 && (
            <ElementCommentBadge
              elements={api$.elements}
              counts={elementCounts}
              onOpenForElement={(id) => {
                setSelectedIds([id]);
                setCommentsFocusElementId(id);
                setCommentsOpen(true);
              }}
            />
          )}

          {/* Overflow badges (Phase 15) */}
          {overflowCount > 0 && (
            <OverflowBadgeLayer
              elements={api$.elements}
              reports={overflowReports}
              onApplyFix={handleApplyOverflowFix}
            />
          )}

          {/* Group outline for the currently-selected group */}
          {(() => {
            if (selectedIds.length === 0) return null;
            const first = api$.elements.find((e) => e.id === selectedIds[0]);
            const gid = groupIdOf(first);
            if (!gid) return null;
            const members = groupMembers(api$.elements, gid);
            if (members.length < 2) return null;
            const b = groupBounds(api$.elements, gid);
            if (!b) return null;
            return (
              <div
                className="pointer-events-none absolute z-[58] rounded-md"
                style={{
                  left:   `${b.x - 0.5}%`,
                  top:    `${b.y - 0.5}%`,
                  width:  `calc(${b.w}% + 1%)`,
                  height: `calc(${b.h}% + 1%)`,
                  border: '1.5px dashed #16a34a',
                  background: 'rgba(22,163,74,0.04)',
                }}
              >
                <span className="absolute -top-5 left-0 text-[10px] font-bold text-green-700 bg-green-50 border border-green-200 rounded px-1.5 py-0.5">
                  Group · {members.length}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Right rail — Comments panel OR Inspector (mutually exclusive) */}
        {commentsOpen && slide?.deckId ? (
          <CommentsPanel
            projectId={projectId}
            slideId={slideId}
            slideTitle={slide.title}
            elements={api$.elements}
            focusedElementId={commentsFocusElementId}
            onClose={() => { setCommentsOpen(false); setCommentsFocusElementId(null); }}
            currentUserId={currentUserId || undefined}
          />
        ) : (
          <Inspector
            elements={api$.elements}
            selectedIds={selectedIds}
            onPatchElement={(id, patch) => api$.updateElement(id, patch)}
            onStyleElement={handleStyleChange}
            slide={slide}
            onPatchSlide={handlePatchSlide}
          />
        )}
      </div>

      {/* ── Bottom info bar ────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-slate-200 px-4 h-9 flex items-center gap-4 text-[11px] text-slate-500 flex-shrink-0">
        <span>{api$.elements.length} elements</span>
        {selectedIds.length > 0 && (
          <span className="text-green-700 font-semibold">
            {selectedIds.length} selected
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">←↑↓→</kbd> nudge
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">⇧+arrow</kbd> 5%
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">⌫</kbd> delete
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">⌘D</kbd> duplicate
          <kbd className="px-1.5 py-0.5 bg-slate-100 border border-slate-200 rounded text-[10px]">esc</kbd> deselect
        </span>
      </footer>

      {/* Template gallery modal */}
      {templateGalleryOpen && slide?.deckId && (
        <TemplateGallery
          deckId={slide.deckId}
          currentTemplateId={appliedTemplate?.id || null}
          onClose={() => setTemplateGalleryOpen(false)}
          onApplied={async () => {
            // Refresh current slide so its background + themeTokens repopulate,
            // and refresh elements so their re-styled state appears.
            try {
              const { data: slideRow } = await api.get(`/slides/${slideId}`);
              setSlide(slideRow);
            } catch (_) {}
            await api$.refresh();
            // Bust every sidebar thumbnail so the new theme background paints there too.
            bumpAllSlideThumbnails();
            // Reset undo stack — template apply is a major checkpoint
            history.reset(apiRef.current.elements);
          }}
        />
      )}

      {/* Presenter mode overlay (Phase 13) */}
      {presenterOpen && deckSlides.slides.length > 0 && (
        <PresenterMode
          slides={deckSlides.slides}
          initialSlideId={slideId}
          onClose={() => setPresenterOpen(false)}
        />
      )}

      {/* Keyboard shortcuts dialog (Phase 16) */}
      <KeyboardShortcutsDialog open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* Dev-only composition debug badge */}
      <CompositionDebugBadge
        templateId={(slide?.metadata as any)?.appliedTemplateId || null}
        slideType={(slide as any)?.type || undefined}
      />
    </div>
  );
};

// =============================================================================
//  Default export wraps the editor in an error boundary so a renderer crash
//  doesn't break the whole route.
// =============================================================================

const SlideEditorInner = SlideEditor;
const SlideEditorWithBoundary: React.FC<SlideEditorProps> = (props) => (
  <EditorErrorBoundary contextLabel={`slide ${props.slideId}`}>
    <SlideEditorInner {...props} />
  </EditorErrorBoundary>
);
export default SlideEditorWithBoundary;
