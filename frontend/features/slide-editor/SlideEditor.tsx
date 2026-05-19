'use client';

import React, { useCallback, useState, useEffect, useRef } from 'react';
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
}

interface SlideEditorProps {
  projectId: string;
  slideId: string;
}

export const SlideEditor: React.FC<SlideEditorProps> = ({ projectId, slideId }) => {
  const router = useRouter();
  const [slide, setSlide] = useState<Slide | null>(null);
  const [siblings, setSiblings] = useState<Slide[]>([]);
  const [loadingSlide, setLoadingSlide] = useState(true);
  const [zoom, setZoom] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [activeEditor, setActiveEditor] = useState<Editor | null>(null);
  const editingBoxRef = useRef<HTMLDivElement | null>(null);
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null);

  const api$ = useElementsApi(slideId);

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

  // ── Load slide metadata + sibling slides for nav ──────────────────────────
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setLoadingSlide(true);
        const { data: slideRow } = await api.get(`/slides/${slideId}`);
        if (cancelled) return;
        setSlide(slideRow);

        // Load sibling slides for previous/next nav
        try {
          const { data: deckSlides } = await api.get(`/slides/deck/${slideRow.deckId}`);
          if (!cancelled) setSiblings(deckSlides);
        } catch {
          if (!cancelled) setSiblings([]);
        }
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
    // updateMany already scheduled a save; nothing extra to do here, but keep
    // the slot open for future history-snapshot hooks (Phase 9).
  }, []);

  // ── Inline-edit renderer ──────────────────────────────────────────────────
  const handleStyleChange = useCallback((id: string, patch: Partial<ElementStyle>) => {
    const el = api$.elements.find(e => e.id === id);
    if (!el) return;
    api$.updateElement(id, { style: { ...(el.style || {}), ...patch } as any });
  }, [api$]);

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
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;
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
  }, [editingId, selectedIds, api$.elements]);

  // ── Selection-derived actions ─────────────────────────────────────────────
  const handleDeleteSelected = useCallback(async () => {
    for (const id of selectedIds) await api$.deleteElement(id);
    setSelectedIds([]);
  }, [selectedIds, api$]);

  const handleDuplicateSelected = useCallback(async () => {
    const newIds: string[] = [];
    for (const id of selectedIds) {
      const dup = await api$.duplicateElement(id);
      if (dup) newIds.push(dup.id);
    }
    if (newIds.length > 0) setSelectedIds(newIds);
  }, [selectedIds, api$]);

  // ── Slide navigation ──────────────────────────────────────────────────────
  const slideIdx = siblings.findIndex((s) => s.id === slideId);
  const prevSlide = slideIdx > 0 ? siblings[slideIdx - 1] : null;
  const nextSlide = slideIdx >= 0 && slideIdx < siblings.length - 1 ? siblings[slideIdx + 1] : null;

  const gotoSlide = (id: string) => router.push(`/projects/${projectId}/edit/${id}`);

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
            {slideIdx >= 0 ? `${slideIdx + 1} / ${siblings.length}` : '—'}
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
        </div>
      </header>

      {/* ── Stage + Inspector ─────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
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
              onSelect={(ids) => { setSelectedIds(ids); if (editingId && !ids.includes(editingId)) { setEditingId(null); setActiveEditor(null); } }}
              onTransformLive={handleTransformLive}
              onTransformCommit={handleTransformCommit}
              onDeleteSelected={handleDeleteSelected}
              onDuplicateSelected={handleDuplicateSelected}
              pageNumber={slideIdx >= 0 ? slideIdx + 1 : undefined}
              totalPages={siblings.length || undefined}
              zoom={zoom}
              editingId={editingId}
              onRequestEdit={(id) => { setSelectedIds([id]); setEditingId(id); }}
              renderEditor={renderInlineEditor}
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
        </div>

        {/* Right inspector */}
        <Inspector
          elements={api$.elements}
          selectedIds={selectedIds}
          onPatchElement={(id, patch) => api$.updateElement(id, patch)}
          onStyleElement={handleStyleChange}
          slide={slide}
          onPatchSlide={handlePatchSlide}
        />
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
    </div>
  );
};
