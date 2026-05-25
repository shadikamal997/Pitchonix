'use client';

import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Copy, Trash2, MoreVertical, Search, Pencil,
  ChevronDown, ChevronRight, Folder, FolderPlus, FolderOpen,
} from 'lucide-react';
import api from '@/lib/api';
import type { SlideListItem, UseDeckSlides } from './useDeckSlides';
import { SlideThumbnail } from './SlideThumbnail';
import { useToast } from '@/components/ToastProvider';
import { useConfirm } from '@/components/ConfirmDialog';
import {
  type Section, type DeckMetadata,
  getSections, bucketSlides, sectionIdOf, newSectionId,
  withSection, withoutSection, toggleSectionCollapsed,
  assignSection,
} from './sections';

// =============================================================================
//  Phase 32F + 32G + 32L — Sectioned sidebar with bulk multi-select +
//  thumbnail virtualization.
//
//  Renders the deck as collapsible sections, supports multi-select via
//  shift/cmd-click, exposes a bulk-action bar for duplicate / delete /
//  move-to-section, and renders only the thumbnails currently inside the
//  scroll viewport (plus a small overscan).
//
//  Drop-in replacement for SlideSidebar. Same props plus deckMetadata + an
//  onSaveDeckMetadata callback that owns persisting the deck's metadata.
// =============================================================================

const ROW_HEIGHT_PX     = 132;   // 16:9 mini at 170px wide ≈ 96 + title + padding
const SECTION_ROW_PX    = 28;
const ADD_ROW_PX        = 28;
const OUTLINE_ROW_PX    = 32;
const OVERSCAN          = 4;

interface Props {
  api:             UseDeckSlides;
  currentSlideId:  string | null;
  onNavigate:      (slideId: string) => void;
  onCurrentDeleted?: (nextSlideId: string | null) => void;
  onTitleRename?:    (slideId: string, newTitle: string) => Promise<void>;
  /** Deck-level metadata blob holding the section catalog. */
  deckMetadata:    DeckMetadata | null | undefined;
  /** Persist a *patch* of the deck metadata. Caller merges + PATCHes. */
  onPatchDeckMetadata: (patch: Partial<DeckMetadata>) => Promise<void>;
  /** Phase 35-final-B Task 3 — when true (Version History preview mode),
   *  hide every destructive / mutating affordance. Navigation still works
   *  so the user can move between snapshot slides. */
  readOnly?:       boolean;
}

type Row =
  | { kind: 'section'; section: Section | null; count: number; isCollapsed: boolean }
  | { kind: 'slide'; slide: SlideListItem; index: number; total: number }
  | { kind: 'add-slide-to-section'; sectionId: string | null }
  | { kind: 'outline'; slide: SlideListItem; index: number };

export const SectionedSidebar: React.FC<Props> = ({
  api: deckApi, currentSlideId, onNavigate, onCurrentDeleted, onTitleRename,
  deckMetadata, onPatchDeckMetadata,
  readOnly = false,
}) => {
  const [view, setView]                   = useState<'thumbnails' | 'outline'>('thumbnails');
  const [search, setSearch]               = useState('');
  const [renamingId, setRenamingId]       = useState<string | null>(null);
  const [menuOpen, setMenuOpen]           = useState<string | null>(null);
  const [busy, setBusy]                   = useState(false);
  /** Phase 32G — sidebar multi-selection (separate from canvas selection). */
  const [selectedIds, setSelectedIds]     = useState<Set<string>>(new Set());
  /** Phase 32F — inline-rename for sections. */
  const [renamingSectionId, setRenamingSectionId] = useState<string | null>(null);
  /** Phase Ω.3.1 — toast + confirm dialog (replaces window.alert/confirm). */
  const toast = useToast();
  const confirmDialog = useConfirm();

  // Sync the active slide into the selection set so single-click still feels right
  useEffect(() => {
    if (currentSlideId) setSelectedIds(new Set([currentSlideId]));
  }, [currentSlideId]);

  const sections = useMemo(() => getSections(deckMetadata), [deckMetadata]);
  const slides   = deckApi.slides;

  const filteredSlides = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return slides;
    return slides.filter((s) =>
      s.title.toLowerCase().includes(q) || s.type.toLowerCase().includes(q),
    );
  }, [slides, search]);

  const buckets = useMemo(() => bucketSlides(filteredSlides, sections), [filteredSlides, sections]);

  // Flatten buckets into a row list driving virtualization.
  const rows: Row[] = useMemo(() => {
    const out: Row[] = [];
    for (const b of buckets) {
      // Skip the "Unsectioned" bucket header if no sections exist (clean default).
      const showHeader = b.section !== null || sections.length > 0;
      const collapsed  = b.section ? !!b.section.collapsed : false;
      if (showHeader) {
        out.push({ kind: 'section', section: b.section, count: b.slides.length, isCollapsed: collapsed });
      }
      if (!collapsed) {
        b.slides.forEach((s, i) => {
          if (view === 'thumbnails') {
            out.push({ kind: 'slide', slide: s, index: i + 1, total: b.slides.length });
          } else {
            out.push({ kind: 'outline', slide: s, index: deckApi.slides.findIndex((x) => x.id === s.id) + 1 });
          }
        });
        out.push({ kind: 'add-slide-to-section', sectionId: b.section?.id ?? null });
      }
    }
    return out;
  }, [buckets, sections.length, view, deckApi.slides]);

  // ── Virtualization (Phase 32L) ───────────────────────────────────────────
  const scrollRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop]   = useState(0);
  const [viewportHeight, setVH]     = useState(600);
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => setScrollTop(el.scrollTop);
    const ro = new ResizeObserver(() => setVH(el.clientHeight));
    ro.observe(el);
    el.addEventListener('scroll', onScroll, { passive: true });
    setVH(el.clientHeight);
    return () => { el.removeEventListener('scroll', onScroll); ro.disconnect(); };
  }, []);

  const rowHeights = useMemo(() => rows.map((r) => {
    if (r.kind === 'section') return SECTION_ROW_PX;
    if (r.kind === 'add-slide-to-section') return ADD_ROW_PX;
    if (r.kind === 'outline') return OUTLINE_ROW_PX;
    return ROW_HEIGHT_PX;
  }), [rows]);

  const offsets = useMemo(() => {
    const arr = new Array(rowHeights.length + 1);
    arr[0] = 0;
    for (let i = 0; i < rowHeights.length; i++) arr[i + 1] = arr[i] + rowHeights[i];
    return arr;
  }, [rowHeights]);

  const totalHeight = offsets[offsets.length - 1] || 0;

  // Find the first visible row using binary search on cumulative offsets.
  const { startIdx, endIdx } = useMemo(() => {
    const top = Math.max(0, scrollTop - OVERSCAN * ROW_HEIGHT_PX);
    const bottom = scrollTop + viewportHeight + OVERSCAN * ROW_HEIGHT_PX;
    let lo = 0, hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (offsets[mid + 1] <= top) lo = mid + 1;
      else                          hi = mid;
    }
    const start = lo;
    let end = start;
    while (end < offsets.length - 1 && offsets[end] < bottom) end++;
    return { startIdx: start, endIdx: Math.min(rows.length, end + 1) };
  }, [offsets, scrollTop, viewportHeight, rows.length]);

  // ── Section ops ──────────────────────────────────────────────────────────
  const handleCreateSection = useCallback(async () => {
    const name = window.prompt('Section name', `Section ${sections.length + 1}`);
    if (!name?.trim()) return;
    const section: Section = { id: newSectionId(), name: name.trim() };
    await onPatchDeckMetadata({ sections: getSections({ ...(deckMetadata || {}), sections: [...sections, section] }) });
  }, [sections, deckMetadata, onPatchDeckMetadata]);

  const handleRenameSection = useCallback(async (id: string, name: string) => {
    setRenamingSectionId(null);
    const trimmed = name.trim();
    if (!trimmed) return;
    const next = withSection(deckMetadata, { id, name: trimmed });
    await onPatchDeckMetadata(next);
  }, [deckMetadata, onPatchDeckMetadata]);

  const handleToggleCollapsed = useCallback(async (id: string) => {
    const next = toggleSectionCollapsed(deckMetadata, id);
    await onPatchDeckMetadata(next);
  }, [deckMetadata, onPatchDeckMetadata]);

  const handleDeleteSection = useCallback(async (id: string) => {
    if (!confirm('Delete this section? Slides inside it will be moved to Unsectioned.')) return;
    // First clear sectionId on every slide assigned to this section
    const affected = slides.filter((s) => sectionIdOf(s.metadata) === id);
    await Promise.all(affected.map((s) => deckApi.patchSlideMetadata(s.id, { sectionId: null })));
    const next = withoutSection(deckMetadata, id);
    await onPatchDeckMetadata(next);
  }, [slides, deckApi, deckMetadata, onPatchDeckMetadata]);

  const handleAssignSection = useCallback(async (slideIds: string[], sectionId: string | null) => {
    setMenuOpen(null);
    await Promise.all(slideIds.map((id) =>
      deckApi.patchSlideMetadata(id, assignSection(
        deckApi.slides.find((s) => s.id === id)?.metadata,
        sectionId,
      )),
    ));
  }, [deckApi]);

  // ── Slide ops ────────────────────────────────────────────────────────────
  const handleAdd = useCallback(async (sectionId: string | null = null) => {
    if (busy) return;
    setBusy(true);
    try {
      const created = currentSlideId
        ? await deckApi.insertAfter(currentSlideId, 'New slide')
        : await deckApi.insertAtEnd('New slide');
      if (created) {
        if (sectionId) {
          await deckApi.patchSlideMetadata(created.id, { sectionId });
        }
        onNavigate(created.id);
      }
    } finally { setBusy(false); }
  }, [busy, currentSlideId, deckApi, onNavigate]);

  const handleDuplicate = useCallback(async (id: string) => {
    setMenuOpen(null);
    setBusy(true);
    try {
      const dup = await deckApi.duplicate(id);
      if (dup) onNavigate(dup.id);
    } finally { setBusy(false); }
  }, [deckApi, onNavigate]);

  const handleDelete = useCallback(async (id: string) => {
    setMenuOpen(null);
    if (slides.length <= 1) { alert('Cannot delete the last slide.'); return; }
    if (!confirm('Delete this slide?')) return;
    setBusy(true);
    try {
      const idx = slides.findIndex((s) => s.id === id);
      const neighbour = slides[idx + 1] || slides[idx - 1] || null;
      const ok = await deckApi.remove(id);
      if (ok && id === currentSlideId) onCurrentDeleted?.(neighbour?.id ?? null);
    } finally { setBusy(false); }
  }, [slides, deckApi, currentSlideId, onCurrentDeleted]);

  const handleRenameCommit = useCallback(async (id: string, newTitle: string) => {
    setRenamingId(null);
    if (!newTitle.trim()) return;
    deckApi.updateLocal(id, { title: newTitle });
    if (onTitleRename) await onTitleRename(id, newTitle);
  }, [deckApi, onTitleRename]);

  // ── Multi-select (Phase 32G) ─────────────────────────────────────────────
  const handleSlideClick = useCallback((slide: SlideListItem, e: React.MouseEvent) => {
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    if (additive) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(slide.id)) next.delete(slide.id);
        else                    next.add(slide.id);
        return next;
      });
    } else {
      setSelectedIds(new Set([slide.id]));
      onNavigate(slide.id);
    }
  }, [onNavigate]);

  const handleBulkDelete = useCallback(async () => {
    if (selectedIds.size === 0) return;
    if (selectedIds.size >= slides.length) {
      toast.error('A presentation must contain at least one slide.');
      return;
    }
    if (!(await confirmDialog({ title: `Delete ${selectedIds.size} slide(s)?`, message: 'The selected slides will be permanently removed from the deck.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    const ids = Array.from(selectedIds);
    const idx = slides.findIndex((s) => s.id === currentSlideId);
    const fallback = slides.slice(idx + 1).find((s) => !selectedIds.has(s.id)) ||
                     slides.slice(0, idx).reverse().find((s) => !selectedIds.has(s.id)) ||
                     null;
    setBusy(true);
    try {
      await deckApi.removeMany(ids);
      setSelectedIds(new Set());
      if (currentSlideId && ids.includes(currentSlideId)) {
        onCurrentDeleted?.(fallback?.id ?? null);
      }
    } finally { setBusy(false); }
  }, [selectedIds, slides, currentSlideId, deckApi, onCurrentDeleted]);

  const handleBulkDuplicate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setBusy(true);
    try {
      const newIds = await deckApi.duplicateMany(Array.from(selectedIds));
      if (newIds.length > 0) setSelectedIds(new Set(newIds));
    } finally { setBusy(false); }
  }, [selectedIds, deckApi]);

  const handleBulkMoveToSection = useCallback(async (sectionId: string | null) => {
    await handleAssignSection(Array.from(selectedIds), sectionId);
  }, [selectedIds, handleAssignSection]);

  // Close any open menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('[data-slide-menu]') || t.closest('[data-slide-menu-trigger]')) return;
      setMenuOpen(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [menuOpen]);

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <aside className="w-[220px] flex-shrink-0 bg-[#EDEBE6] border-r border-[#E3E1DA] flex flex-col h-full">
      {/* Header */}
      <div className="h-9 flex items-center px-3 gap-2 border-b border-[#E3E1DA] bg-white">
        <span className="text-[11px] font-bold uppercase tracking-wider text-[#6B6B6B]">Slides</span>
        <span className="text-[10px] text-[#C9C6BD]">{slides.length}</span>
        <div className="ml-auto flex items-center gap-1">
          {/* Phase 35-final-B Task 3 — hide destructive affordances in preview. */}
          {!readOnly && (
            <button
              type="button"
              onClick={handleCreateSection}
              title="Add section"
              className="p-1 rounded text-[#9A9A9A] hover:bg-[#F1F0EC] hover:text-[#111111]"
            >
              <FolderPlus className="w-3.5 h-3.5" />
            </button>
          )}
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {/* Search */}
      {slides.length > 6 && (
        <div className="px-3 pt-2 pb-1 bg-white border-b border-[#E3E1DA]">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-[#C9C6BD] pointer-events-none" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slides…"
              className="w-full h-7 pl-7 pr-2 text-xs bg-white border border-[#E3E1DA] rounded outline-none focus:border-[#4F7563] focus:ring-1 focus:ring-[#4F7563]/40/30"
            />
          </div>
        </div>
      )}

      {/* Bulk action bar — visible whenever 2+ selected (suppressed in preview). */}
      {!readOnly && selectedIds.size > 1 && (
        <div className="px-2 py-1.5 border-b border-[#DDE8E1] bg-[#EEF5F1] text-[11px] font-semibold text-[#263F34] flex items-center gap-2">
          <span>{selectedIds.size} selected</span>
          <div className="ml-auto flex items-center gap-1">
            <button onClick={handleBulkDuplicate} title="Duplicate"
                    className="p-1 rounded hover:bg-[#DDE8E1]">
              <Copy className="w-3 h-3" />
            </button>
            <BulkMoveMenu sections={sections} onMove={handleBulkMoveToSection} />
            <button onClick={handleBulkDelete} title="Delete"
                    className="p-1 rounded text-[#7a2929] hover:bg-[#F7E3E3]">
              <Trash2 className="w-3 h-3" />
            </button>
            <button onClick={() => setSelectedIds(new Set(currentSlideId ? [currentSlideId] : []))}
                    title="Clear" className="p-1 rounded text-[#6B6B6B] hover:bg-[#F1F0EC]">
              ✕
            </button>
          </div>
        </div>
      )}

      {/* Virtualized list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-2 py-2">
        {deckApi.loading && <div className="text-center text-xs text-[#C9C6BD] py-8">Loading…</div>}
        {!deckApi.loading && rows.length === 0 && (
          <div className="text-center text-xs text-[#C9C6BD] py-8">
            {search ? 'No matches' : 'No slides yet'}
          </div>
        )}

        <div style={{ position: 'relative', height: totalHeight }}>
          {rows.slice(startIdx, endIdx).map((row, i) => {
            const realIdx = startIdx + i;
            const top = offsets[realIdx];
            return (
              <div key={realIdx} style={{ position: 'absolute', top, left: 0, right: 0 }}>
                {renderRow(row)}
              </div>
            );
          })}
        </div>
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-[#E3E1DA] bg-white">
        <button
          type="button"
          onClick={() => handleAdd(null)}
          disabled={busy}
          className="w-full h-8 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded shadow-md shadow-green-500/30 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add slide
        </button>
      </div>
    </aside>
  );

  // ── Row renderer ─────────────────────────────────────────────────────────
  function renderRow(row: Row): React.ReactNode {
    if (row.kind === 'section') {
      const isUnsectioned = row.section === null;
      const name = isUnsectioned ? 'Unsectioned' : (row.section!.name || 'Section');
      const id   = row.section?.id ?? '__unsectioned__';
      const isRenaming = renamingSectionId === id;
      const Icon = row.isCollapsed ? Folder : FolderOpen;
      return (
        <div
          className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-[#6B6B6B] px-1 select-none"
          style={{ height: SECTION_ROW_PX }}
        >
          {!isUnsectioned && (
            <button
              onClick={() => handleToggleCollapsed(row.section!.id)}
              className="p-0.5 rounded text-[#9A9A9A] hover:text-[#111111] hover:bg-[#E3E1DA]"
            >
              {row.isCollapsed
                ? <ChevronRight className="w-3 h-3" />
                : <ChevronDown  className="w-3 h-3" />}
            </button>
          )}
          <Icon className={`w-3 h-3 ${isUnsectioned ? 'text-[#C9C6BD]' : 'text-[#4F7563]'} flex-shrink-0`} />
          {isRenaming ? (
            <input
              autoFocus
              defaultValue={name}
              onBlur={(e) => handleRenameSection(row.section!.id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSection(row.section!.id, (e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setRenamingSectionId(null);
              }}
              className="flex-1 h-5 px-1 text-[10px] uppercase tracking-wider rounded border border-purple-400 outline-none"
            />
          ) : (
            <span
              className="flex-1 truncate"
              onDoubleClick={() => !isUnsectioned && setRenamingSectionId(row.section!.id)}
              title={isUnsectioned ? '' : 'Double-click to rename'}
            >
              {name}
            </span>
          )}
          <span className="text-[#C9C6BD]">{row.count}</span>
          {!isUnsectioned && (
            <button
              onClick={() => handleDeleteSection(row.section!.id)}
              title="Delete section"
              className="p-0.5 rounded text-[#C9C6BD] hover:text-[#9a3737] hover:bg-[#FCF1F1]"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }

    if (row.kind === 'add-slide-to-section') {
      // Phase 35-final-B Task 3 — suppress add-slide affordance in preview.
      if (readOnly) return null;
      return (
        <button
          type="button"
          onClick={() => handleAdd(row.sectionId)}
          disabled={busy}
          className="w-full text-left flex items-center gap-1 px-2 text-[11px] text-[#C9C6BD] hover:text-[#355846] hover:bg-[#EEF5F1] rounded"
          style={{ height: ADD_ROW_PX }}
        >
          <Plus className="w-3 h-3" /> Add slide
        </button>
      );
    }

    if (row.kind === 'outline') {
      const isActive = row.slide.id === currentSlideId;
      const isSelected = selectedIds.has(row.slide.id);
      const isRenaming = renamingId === row.slide.id;
      return (
        <div
          onClick={(e) => handleSlideClick(row.slide, e)}
          onDoubleClick={() => setRenamingId(row.slide.id)}
          className={`flex items-center gap-2 px-2 rounded cursor-pointer text-xs ${
            isActive ? 'bg-[#EEF5F1] text-green-800 font-semibold' :
            isSelected ? 'bg-[#EEF5F1] text-[#263F34]' :
            'text-[#111111] hover:bg-[#F1F0EC]'
          }`}
          style={{ height: OUTLINE_ROW_PX }}
        >
          <span className="w-5 text-[10px] font-mono text-[#C9C6BD] text-right flex-shrink-0">{row.index}</span>
          {isRenaming ? (
            <input
              autoFocus
              defaultValue={row.slide.title}
              onBlur={(e) => handleRenameCommit(row.slide.id, e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameCommit(row.slide.id, (e.target as HTMLInputElement).value);
                if (e.key === 'Escape') setRenamingId(null);
              }}
              className="flex-1 h-5 px-1 text-xs rounded border border-[#4F7563] outline-none"
              onClick={(e) => e.stopPropagation()}
            />
          ) : (
            <span className="flex-1 truncate">{row.slide.title}</span>
          )}
        </div>
      );
    }

    // Thumbnail row
    const isActive   = row.slide.id === currentSlideId;
    const isSelected = selectedIds.has(row.slide.id);
    const isRenaming = renamingId === row.slide.id;
    return (
      <div
        onClick={(e) => handleSlideClick(row.slide, e)}
        onDoubleClick={() => setRenamingId(row.slide.id)}
        className={`group relative mb-2 rounded cursor-pointer transition-all ${
          isActive    ? 'ring-2 ring-[#4F7563]/40'
          : isSelected ? 'ring-2 ring-[#4F7563]/40'
          : 'ring-1 ring-transparent hover:ring-slate-300'
        }`}
        style={{ height: ROW_HEIGHT_PX - 6 /* mb-2 */ }}
      >
        <div className="flex items-start gap-1.5 px-1">
          <span className="w-4 text-[10px] font-mono text-[#C9C6BD] mt-1 text-right flex-shrink-0">
            {row.index}
          </span>
          <div className="flex-1 min-w-0">
            <SlideThumbnail slideId={row.slide.id} width={170} pageNumber={row.index} totalPages={row.total} />
            <div className="mt-1 flex items-center gap-1">
              {isRenaming ? (
                <input
                  autoFocus
                  defaultValue={row.slide.title}
                  onBlur={(e) => handleRenameCommit(row.slide.id, e.currentTarget.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleRenameCommit(row.slide.id, (e.target as HTMLInputElement).value);
                    if (e.key === 'Escape') setRenamingId(null);
                  }}
                  className="flex-1 h-5 bg-white border border-[#4F7563] rounded px-1 text-[11px] outline-none"
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <span className={`flex-1 min-w-0 text-[11px] font-medium truncate ${isActive ? 'text-[#355846]' : 'text-[#111111]'}`}>
                  {row.slide.title}
                </span>
              )}
              <button
                type="button"
                data-slide-menu-trigger
                onClick={(e) => { e.stopPropagation(); setMenuOpen(menuOpen === row.slide.id ? null : row.slide.id); }}
                className="w-5 h-5 rounded text-[#C9C6BD] hover:text-[#111111] hover:bg-[#F1F0EC] flex items-center justify-center flex-shrink-0"
                aria-label="Slide actions"
              >
                <MoreVertical className="w-3 h-3" />
              </button>
            </div>
          </div>
        </div>

        {menuOpen === row.slide.id && (
          <div
            data-slide-menu
            className="absolute right-1 top-7 z-30 w-44 bg-white border border-[#E3E1DA] rounded-lg shadow-2xl overflow-hidden text-xs"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => handleDuplicate(row.slide.id)}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#EDEBE6] text-[#111111]"
            >
              <Copy className="w-3 h-3" /> Duplicate
            </button>
            <button
              onClick={() => { setMenuOpen(null); setRenamingId(row.slide.id); }}
              className="flex items-center gap-2 w-full px-3 py-2 hover:bg-[#EDEBE6] text-[#111111]"
            >
              <Pencil className="w-3 h-3" /> Rename
            </button>
            {sections.length > 0 && (
              <div className="border-t border-[#F1F0EC]">
                <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-[#C9C6BD] tracking-wider">
                  Move to section
                </div>
                <button
                  onClick={() => handleAssignSection([row.slide.id], null)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#EDEBE6] text-[#111111]"
                >
                  <Folder className="w-3 h-3 text-[#C9C6BD]" /> Unsectioned
                </button>
                {sections.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleAssignSection([row.slide.id], s.id)}
                    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#EDEBE6] text-[#111111]"
                  >
                    <Folder className="w-3 h-3 text-purple-500" /> {s.name}
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => handleDelete(row.slide.id)}
              className="flex items-center gap-2 w-full px-3 py-2 border-t border-[#F1F0EC] text-[#7a2929] hover:bg-[#FCF1F1]"
            >
              <Trash2 className="w-3 h-3" /> Delete
            </button>
          </div>
        )}
      </div>
    );
  }
};

// =============================================================================
//  Bulk move-to-section dropdown
// =============================================================================

const BulkMoveMenu: React.FC<{ sections: Section[]; onMove: (id: string | null) => void }> = ({ sections, onMove }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);
  if (sections.length === 0) return null;
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((v) => !v)} title="Move to section"
              className="p-1 rounded hover:bg-[#DDE8E1]">
        <Folder className="w-3 h-3" />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 w-44 bg-white border border-[#E3E1DA] rounded-lg shadow-2xl z-30 text-xs">
          <button onClick={() => { setOpen(false); onMove(null); }}
                  className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#EDEBE6] text-[#111111]">
            <Folder className="w-3 h-3 text-[#C9C6BD]" /> Unsectioned
          </button>
          {sections.map((s) => (
            <button key={s.id} onClick={() => { setOpen(false); onMove(s.id); }}
                    className="flex items-center gap-2 w-full px-3 py-1.5 hover:bg-[#EDEBE6] text-[#111111]">
              <Folder className="w-3 h-3 text-purple-500" /> {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// =============================================================================
//  View toggle (thumbnails / outline) — same shape as the legacy sidebar
// =============================================================================

const ViewToggle: React.FC<{ value: 'thumbnails' | 'outline'; onChange: (v: 'thumbnails' | 'outline') => void }> = ({ value, onChange }) => (
  <div className="flex items-center bg-[#F1F0EC] rounded p-0.5">
    <button
      onClick={() => onChange('thumbnails')}
      className={`px-1.5 h-5 text-[10px] font-semibold rounded ${value === 'thumbnails' ? 'bg-white text-[#111111] shadow' : 'text-[#9A9A9A]'}`}
    >Thumbs</button>
    <button
      onClick={() => onChange('outline')}
      className={`px-1.5 h-5 text-[10px] font-semibold rounded ${value === 'outline' ? 'bg-white text-[#111111] shadow' : 'text-[#9A9A9A]'}`}
    >Outline</button>
  </div>
);
