'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Plus, Copy, Trash2, MoreVertical, Search, LayoutGrid, List as ListIcon, GripVertical, Pencil,
} from 'lucide-react';
import type { SlideListItem, UseDeckSlides } from './useDeckSlides';
import { SlideThumbnail } from './SlideThumbnail';

// =============================================================================
//  SlideSidebar — left rail in the editor
//
//  Two view modes:
//    - thumbnails (default): full 16:9 mini-render of each slide
//    - outline:              text-only list, slide title + type
//
//  Interactions:
//    - click          → navigate to slide
//    - drag thumbnail → reorder
//    - ⋮ context menu → duplicate, delete, rename
//    - + button       → insert blank slide after current
// =============================================================================

interface SlideSidebarProps {
  api:         UseDeckSlides;
  currentSlideId: string | null;
  onNavigate:  (slideId: string) => void;
  /** Called after delete when current slide vanished — caller routes to neighbour. */
  onCurrentDeleted?: (nextSlideId: string | null) => void;
  /** Notify when a slide title was renamed in-sidebar (so the editor's local title updates). */
  onTitleRename?:    (slideId: string, newTitle: string) => Promise<void>;
}

export const SlideSidebar: React.FC<SlideSidebarProps> = ({
  api, currentSlideId, onNavigate, onCurrentDeleted, onTitleRename,
}) => {
  const [view, setView]       = useState<'thumbnails' | 'outline'>('thumbnails');
  const [search, setSearch]   = useState('');
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen]     = useState<string | null>(null);
  const [busy, setBusy]             = useState(false);

  const slides = api.slides;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return slides;
    return slides.filter((s) =>
      s.title.toLowerCase().includes(q) ||
      s.type.toLowerCase().includes(q),
    );
  }, [slides, search]);

  // ── Reorder via HTML5 drag/drop ────────────────────────────────────────────
  const dragId = useRef<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  const onDragStart = (e: React.DragEvent, id: string) => {
    dragId.current = id;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', id);
  };
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIdx(idx);
  };
  const onDrop = async (e: React.DragEvent, dropIdx: number) => {
    e.preventDefault();
    const id = dragId.current;
    setDragOverIdx(null);
    dragId.current = null;
    if (!id) return;

    const ordered = slides.map((s) => s.id);
    const from = ordered.indexOf(id);
    if (from < 0 || from === dropIdx) return;

    // Remove + insert at new index
    const next = [...ordered];
    next.splice(from, 1);
    next.splice(dropIdx, 0, id);

    await api.reorder(next);
  };

  // ── Slide actions ──────────────────────────────────────────────────────────
  const handleAdd = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const newSlide = currentSlideId
        ? await api.insertAfter(currentSlideId, 'New slide')
        : await api.insertAtEnd('New slide');
      if (newSlide) onNavigate(newSlide.id);
    } finally {
      setBusy(false);
    }
  };

  const handleDuplicate = async (slideId: string) => {
    setMenuOpen(null);
    setBusy(true);
    try {
      const dup = await api.duplicate(slideId);
      if (dup) onNavigate(dup.id);
    } finally { setBusy(false); }
  };

  const handleDelete = async (slideId: string) => {
    setMenuOpen(null);
    if (slides.length <= 1) {
      alert('Cannot delete the last slide.');
      return;
    }
    if (!confirm('Delete this slide?')) return;
    setBusy(true);
    try {
      // Pick a neighbour to land on before deletion
      const idx = slides.findIndex((s) => s.id === slideId);
      const neighbour = slides[idx + 1] || slides[idx - 1] || null;
      const ok = await api.remove(slideId);
      if (ok && slideId === currentSlideId) {
        onCurrentDeleted?.(neighbour?.id ?? null);
      }
    } finally { setBusy(false); }
  };

  const handleRenameCommit = async (slideId: string, newTitle: string) => {
    setRenamingId(null);
    if (!newTitle.trim()) return;
    api.updateLocal(slideId, { title: newTitle });
    if (onTitleRename) {
      await onTitleRename(slideId, newTitle);
    }
  };

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

  return (
    <aside className="w-[220px] flex-shrink-0 bg-slate-50 border-r border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="h-9 flex items-center px-3 gap-2 border-b border-slate-200 bg-white">
        <span className="text-[11px] font-bold uppercase tracking-wider text-slate-600">
          Slides
        </span>
        <span className="text-[10px] text-slate-400">{slides.length}</span>
        <div className="ml-auto flex items-center gap-1">
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      {/* Search */}
      {slides.length > 6 && (
        <div className="px-3 pt-2 pb-1">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search slides…"
              className="w-full h-7 pl-7 pr-2 text-xs bg-white border border-slate-200 rounded outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500/30"
            />
          </div>
        </div>
      )}

      {/* List */}
      <div className="flex-1 overflow-y-auto py-2 px-2">
        {api.loading && (
          <div className="text-center text-xs text-slate-400 py-8">Loading…</div>
        )}
        {!api.loading && filtered.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-8">
            {search ? 'No matches' : 'No slides yet'}
          </div>
        )}

        {view === 'thumbnails' ? (
          filtered.map((s, i) => (
            <ThumbnailRow
              key={s.id}
              slide={s}
              index={i + 1}
              total={slides.length}
              isActive={s.id === currentSlideId}
              isDragTarget={dragOverIdx === i}
              isRenaming={renamingId === s.id}
              menuOpen={menuOpen === s.id}
              onClick={() => onNavigate(s.id)}
              onDoubleClick={() => setRenamingId(s.id)}
              onRenameCommit={(v) => handleRenameCommit(s.id, v)}
              onDragStart={(e) => onDragStart(e, s.id)}
              onDragOver={(e) => onDragOver(e, i)}
              onDrop={(e) => onDrop(e, i)}
              onDragEnd={() => setDragOverIdx(null)}
              onMenuToggle={() => setMenuOpen(menuOpen === s.id ? null : s.id)}
              onDuplicate={() => handleDuplicate(s.id)}
              onDelete={() => handleDelete(s.id)}
            />
          ))
        ) : (
          filtered.map((s, i) => (
            <OutlineRow
              key={s.id}
              slide={s}
              index={i + 1}
              isActive={s.id === currentSlideId}
              onClick={() => onNavigate(s.id)}
              onDoubleClick={() => setRenamingId(s.id)}
              isRenaming={renamingId === s.id}
              onRenameCommit={(v) => handleRenameCommit(s.id, v)}
            />
          ))
        )}
      </div>

      {/* Add button */}
      <div className="p-2 border-t border-slate-200 bg-white">
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy}
          className="w-full h-8 flex items-center justify-center gap-1.5 text-xs font-semibold bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white rounded shadow-md shadow-green-500/30 disabled:opacity-50"
        >
          <Plus className="w-3.5 h-3.5" /> Add slide
        </button>
      </div>
    </aside>
  );
};

// =============================================================================
//  Thumbnail row (thumbnails view)
// =============================================================================

const ThumbnailRow: React.FC<{
  slide:       SlideListItem;
  index:       number;
  total:       number;
  isActive:    boolean;
  isDragTarget: boolean;
  isRenaming:  boolean;
  menuOpen:    boolean;
  onClick:     () => void;
  onDoubleClick: () => void;
  onRenameCommit: (v: string) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragOver:  (e: React.DragEvent) => void;
  onDrop:      (e: React.DragEvent) => void;
  onDragEnd:   () => void;
  onMenuToggle: () => void;
  onDuplicate: () => void;
  onDelete:    () => void;
}> = ({ slide, index, total, isActive, isDragTarget, isRenaming, menuOpen,
        onClick, onDoubleClick, onRenameCommit, onDragStart, onDragOver, onDrop, onDragEnd,
        onMenuToggle, onDuplicate, onDelete }) => {

  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={`group relative mb-2 rounded cursor-pointer transition-all ${
        isActive ? 'ring-2 ring-green-600' : 'ring-1 ring-transparent hover:ring-slate-300'
      } ${isDragTarget ? 'opacity-50' : ''}`}
    >
      <div className="flex items-start gap-1.5 px-1">
        <span className="w-4 text-[10px] font-mono text-slate-400 mt-1 text-right flex-shrink-0">{index}</span>
        <div className="flex-1 min-w-0">
          <SlideThumbnail slideId={slide.id} width={170} pageNumber={index} totalPages={total} />
          <div className="mt-1 flex items-center gap-1">
            {isRenaming ? (
              <input
                autoFocus
                defaultValue={slide.title}
                onBlur={(e) => onRenameCommit(e.currentTarget.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onRenameCommit((e.target as HTMLInputElement).value);
                  if (e.key === 'Escape') onRenameCommit(slide.title);
                }}
                className="flex-1 h-5 bg-white border border-green-500 rounded px-1 text-[11px] outline-none focus:ring-1 focus:ring-green-500/30"
                onClick={(e) => e.stopPropagation()}
              />
            ) : (
              <span className={`flex-1 min-w-0 text-[11px] font-medium truncate ${isActive ? 'text-green-700' : 'text-slate-700'}`}>
                {slide.title}
              </span>
            )}
            <button
              type="button"
              data-slide-menu-trigger
              onClick={(e) => { e.stopPropagation(); onMenuToggle(); }}
              className="w-5 h-5 rounded text-slate-400 hover:text-slate-900 hover:bg-slate-100 flex items-center justify-center flex-shrink-0"
              aria-label="Slide actions"
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {menuOpen && (
        <div
          data-slide-menu
          className="absolute right-1 top-7 z-20 w-32 bg-white rounded-md shadow-xl border border-slate-200 overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <MenuItem icon={<Pencil className="w-3 h-3" />} onClick={onDoubleClick} label="Rename" />
          <MenuItem icon={<Copy className="w-3 h-3" />}    onClick={onDuplicate}  label="Duplicate" />
          <MenuItem icon={<Trash2 className="w-3 h-3" />}  onClick={onDelete}     label="Delete" danger />
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}> = ({ icon, label, onClick, danger }) => (
  <button
    type="button"
    onClick={onClick}
    className={`w-full px-2 py-1.5 text-[11px] flex items-center gap-1.5 hover:bg-slate-50 ${danger ? 'text-red-600 hover:bg-red-50' : 'text-slate-700'}`}
  >
    {icon}
    {label}
  </button>
);

// =============================================================================
//  Outline row (outline view)
// =============================================================================

const OutlineRow: React.FC<{
  slide:          SlideListItem;
  index:          number;
  isActive:       boolean;
  isRenaming:     boolean;
  onClick:        () => void;
  onDoubleClick:  () => void;
  onRenameCommit: (v: string) => void;
}> = ({ slide, index, isActive, isRenaming, onClick, onDoubleClick, onRenameCommit }) => (
  <div
    onClick={onClick}
    onDoubleClick={onDoubleClick}
    className={`mb-0.5 px-2 py-1.5 rounded cursor-pointer transition-colors ${
      isActive ? 'bg-green-50 ring-1 ring-green-200' : 'hover:bg-white'
    }`}
  >
    <div className="flex items-baseline gap-2">
      <span className="text-[10px] font-mono text-slate-400 w-5 text-right flex-shrink-0">{index}</span>
      <div className="flex-1 min-w-0">
        {isRenaming ? (
          <input
            autoFocus
            defaultValue={slide.title}
            onBlur={(e) => onRenameCommit(e.currentTarget.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onRenameCommit((e.target as HTMLInputElement).value);
              if (e.key === 'Escape') onRenameCommit(slide.title);
            }}
            className="w-full h-5 bg-white border border-green-500 rounded px-1 text-xs outline-none"
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className={`text-xs font-semibold truncate ${isActive ? 'text-green-700' : 'text-slate-800'}`}>
            {slide.title}
          </div>
        )}
        <div className="text-[10px] text-slate-400 capitalize truncate">{slide.type.replace(/_/g, ' ')}</div>
      </div>
    </div>
  </div>
);

// =============================================================================
//  View toggle
// =============================================================================

const ViewToggle: React.FC<{
  value: 'thumbnails' | 'outline';
  onChange: (v: 'thumbnails' | 'outline') => void;
}> = ({ value, onChange }) => (
  <div className="flex bg-slate-100 rounded p-0.5 gap-0.5">
    <button
      type="button"
      title="Thumbnail view"
      onClick={() => onChange('thumbnails')}
      className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${
        value === 'thumbnails' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <LayoutGrid className="w-3 h-3" />
    </button>
    <button
      type="button"
      title="Outline view"
      onClick={() => onChange('outline')}
      className={`w-6 h-5 flex items-center justify-center rounded transition-colors ${
        value === 'outline' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500 hover:text-slate-700'
      }`}
    >
      <ListIcon className="w-3 h-3" />
    </button>
  </div>
);
