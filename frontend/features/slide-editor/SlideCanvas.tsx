'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { SlideElementDTO } from '@/types/slide-element';
import { renderElement } from './renderers';

// =============================================================================
//  SlideCanvas — the 16:9 editable stage
//
//  Responsibilities:
//    - Render every element at its (%-based) position/size
//    - Selection model (single + shift-multi)
//    - Pointer-based drag (move x/y)
//    - Pointer-based resize via 8 handles
//    - Keyboard nudges, delete, duplicate, escape
//
//  Out of scope for Phase 2 MVP (handled later):
//    - Rotation handle (rotation in schema, no UI yet)
//    - Marquee multi-select
//    - Snap-to-other-element guides (only canvas-edge + center guides)
//    - Undo/redo stack (Phase 9)
// =============================================================================

const HANDLES: Array<{ id: HandleId; cursor: string; pos: React.CSSProperties }> = [
  { id: 'nw', cursor: 'nw-resize', pos: { top: -5,    left: -5  } },
  { id: 'n',  cursor: 'n-resize',  pos: { top: -5,    left: '50%', transform: 'translateX(-50%)' } },
  { id: 'ne', cursor: 'ne-resize', pos: { top: -5,    right: -5 } },
  { id: 'e',  cursor: 'e-resize',  pos: { top: '50%', right: -5,   transform: 'translateY(-50%)' } },
  { id: 'se', cursor: 'se-resize', pos: { bottom: -5, right: -5 } },
  { id: 's',  cursor: 's-resize',  pos: { bottom: -5, left: '50%', transform: 'translateX(-50%)' } },
  { id: 'sw', cursor: 'sw-resize', pos: { bottom: -5, left: -5  } },
  { id: 'w',  cursor: 'w-resize',  pos: { top: '50%', left: -5,    transform: 'translateY(-50%)' } },
];
type HandleId = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

/** Element types whose double-click triggers inline rich-text editing. */
const INLINE_EDITABLE_TYPES = new Set([
  'heading', 'subheading', 'paragraph', 'quote', 'caption', 'label', 'cta', 'footer',
  'bulletList', 'numberedList',
]);
function isInlineEditable(type: string): boolean { return INLINE_EDITABLE_TYPES.has(type); }

const SNAP_PX = 4;   // pixels considered "close enough" to snap
const MIN_W = 2;
const MIN_H = 2;

interface DragState {
  ids: string[];                // multi-select drag
  startMouseX: number;
  startMouseY: number;
  origs: Record<string, { x: number; y: number; width: number; height: number }>;
}

interface ResizeState {
  id: string;
  handle: HandleId;
  startMouseX: number;
  startMouseY: number;
  orig: { x: number; y: number; width: number; height: number };
}

export interface SlideCanvasProps {
  elements: SlideElementDTO[];
  selectedIds: string[];
  onSelect: (ids: string[]) => void;
  /** Called on each mouse-move during drag/resize — local-only, no save */
  onTransformLive: (updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => void;
  /** Called once when drag/resize commits — caller should debounce-save */
  onTransformCommit: (updates: Array<{ id: string; patch: Partial<SlideElementDTO> }>) => void;
  onDeleteSelected:    () => void;
  onDuplicateSelected: () => void;
  /** For pageNumber rendering */
  pageNumber?: number;
  totalPages?: number;
  /** Visual zoom — 1 = 100% */
  zoom?: number;
  /** Element currently in inline-edit mode (replaces its renderer). */
  editingId?: string | null;
  /** Called when the user requests edit mode (double-click on a text/list element). */
  onRequestEdit?: (id: string) => void;
  /** Rendered into the editing element's box (in place of its read-only renderer). */
  renderEditor?: (el: SlideElementDTO) => React.ReactNode;
}

export const SlideCanvas: React.FC<SlideCanvasProps> = ({
  elements,
  selectedIds,
  onSelect,
  onTransformLive,
  onTransformCommit,
  onDeleteSelected,
  onDuplicateSelected,
  pageNumber,
  totalPages,
  zoom = 1,
  editingId,
  onRequestEdit,
  renderEditor,
}) => {
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [stageSize, setStageSize] = useState({ w: 1280, h: 720 });
  const [guides, setGuides] = useState<{ x?: number; y?: number; cx?: boolean; cy?: boolean }>({});

  // Observe stage for accurate % → px math
  useEffect(() => {
    if (!stageRef.current) return;
    const ro = new ResizeObserver(([entry]) => {
      const r = entry.contentRect;
      setStageSize({ w: r.width, h: r.height });
    });
    ro.observe(stageRef.current);
    setStageSize({ w: stageRef.current.clientWidth, h: stageRef.current.clientHeight });
    return () => ro.disconnect();
  }, []);

  const idToElement = useMemo(() => {
    const m = new Map<string, SlideElementDTO>();
    for (const e of elements) m.set(e.id, e);
    return m;
  }, [elements]);

  const sorted = useMemo(
    () => [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0)),
    [elements],
  );

  // ── Selection ──────────────────────────────────────────────────────────────
  const selectOne = useCallback((id: string, additive: boolean) => {
    if (additive) {
      onSelect(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
    } else {
      onSelect([id]);
    }
  }, [onSelect, selectedIds]);

  // ── Drag (move) ────────────────────────────────────────────────────────────
  const handleElementMouseDown = (e: React.MouseEvent, el: SlideElementDTO) => {
    if (el.locked) return;
    // Click-only resize handles? They have their own onMouseDown stopPropagation
    e.stopPropagation();
    e.preventDefault();
    const additive = e.shiftKey;
    if (!selectedIds.includes(el.id)) {
      selectOne(el.id, additive);
    }
    const ids = (selectedIds.includes(el.id) && !additive)
      ? (selectedIds.length > 0 ? selectedIds : [el.id])
      : (additive ? Array.from(new Set([...selectedIds, el.id])) : [el.id]);

    dragRef.current = {
      ids,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origs: Object.fromEntries(ids.map((id) => {
        const x = idToElement.get(id)!;
        return [id, { x: x.x, y: x.y, width: x.width, height: x.height }];
      })),
    };
  };

  // ── Resize ─────────────────────────────────────────────────────────────────
  const handleResizeMouseDown = (e: React.MouseEvent, el: SlideElementDTO, handle: HandleId) => {
    if (el.locked) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      id: el.id, handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      orig: { x: el.x, y: el.y, width: el.width, height: el.height },
    };
  };

  // ── Global pointer listeners while dragging or resizing ───────────────────
  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (dragRef.current) {
        const d = dragRef.current;
        const dxPct = ((ev.clientX - d.startMouseX) / stageSize.w) * 100;
        const dyPct = ((ev.clientY - d.startMouseY) / stageSize.h) * 100;

        const updates: Array<{ id: string; patch: Partial<SlideElementDTO> }> = d.ids.map((id) => {
          const orig = d.origs[id];
          let nx = orig.x + dxPct;
          let ny = orig.y + dyPct;
          // Snap to canvas edges + center
          const snapped = snapToCanvas(nx, ny, orig.width, orig.height, stageSize);
          nx = snapped.x; ny = snapped.y;
          // Clamp to canvas
          nx = Math.max(0, Math.min(100 - orig.width, nx));
          ny = Math.max(0, Math.min(100 - orig.height, ny));
          return { id, patch: { x: nx, y: ny } };
        });
        // Show guides only if single element drag
        if (d.ids.length === 1) {
          const u = updates[0].patch;
          const el = idToElement.get(d.ids[0])!;
          setGuides(computeGuides(u.x ?? el.x, u.y ?? el.y, el.width, el.height));
        }
        onTransformLive(updates);
      }

      if (resizeRef.current) {
        const r = resizeRef.current;
        const dxPct = ((ev.clientX - r.startMouseX) / stageSize.w) * 100;
        const dyPct = ((ev.clientY - r.startMouseY) / stageSize.h) * 100;
        let { x, y, width, height } = r.orig;

        if (r.handle.includes('e')) width  = Math.max(MIN_W, r.orig.width  + dxPct);
        if (r.handle.includes('s')) height = Math.max(MIN_H, r.orig.height + dyPct);
        if (r.handle.includes('w')) {
          const newW = Math.max(MIN_W, r.orig.width  - dxPct);
          x = r.orig.x + (r.orig.width - newW);
          width = newW;
        }
        if (r.handle.includes('n')) {
          const newH = Math.max(MIN_H, r.orig.height - dyPct);
          y = r.orig.y + (r.orig.height - newH);
          height = newH;
        }

        // Clamp
        x = Math.max(0, x); y = Math.max(0, y);
        width  = Math.min(100 - x, width);
        height = Math.min(100 - y, height);

        onTransformLive([{ id: r.id, patch: { x, y, width, height } }]);
      }
    };

    const onUp = () => {
      if (dragRef.current) {
        const d = dragRef.current;
        const updates: Array<{ id: string; patch: Partial<SlideElementDTO> }> = d.ids.map((id) => {
          const el = idToElement.get(id)!;
          return { id, patch: { x: el.x, y: el.y } };
        });
        onTransformCommit(updates);
        dragRef.current = null;
        setGuides({});
      }
      if (resizeRef.current) {
        const el = idToElement.get(resizeRef.current.id)!;
        onTransformCommit([{ id: el.id, patch: { x: el.x, y: el.y, width: el.width, height: el.height } }]);
        resizeRef.current = null;
      }
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup',   onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup',   onUp);
    };
  }, [stageSize, idToElement, onTransformLive, onTransformCommit]);

  // ── Keyboard ───────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore if focus is inside an input/textarea/contenteditable (TipTap)
      const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (e.target as HTMLElement | null)?.isContentEditable) return;

      // Also ignore canvas-level shortcuts while any element is in edit mode
      if (editingId) return;

      if (selectedIds.length === 0) return;

      // Delete / Backspace
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        onDeleteSelected();
        return;
      }
      // Cmd/Ctrl + D = duplicate
      if (e.key.toLowerCase() === 'd' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        onDuplicateSelected();
        return;
      }
      // Esc = deselect
      if (e.key === 'Escape') {
        e.preventDefault();
        onSelect([]);
        return;
      }
      // Arrow nudges
      const step = e.shiftKey ? 5 : 1;
      let dx = 0, dy = 0;
      if (e.key === 'ArrowLeft')  dx = -step;
      if (e.key === 'ArrowRight') dx =  step;
      if (e.key === 'ArrowUp')    dy = -step;
      if (e.key === 'ArrowDown')  dy =  step;
      if (dx === 0 && dy === 0) return;

      e.preventDefault();
      const updates = selectedIds.flatMap((id) => {
        const el = idToElement.get(id); if (!el) return [];
        const nx = Math.max(0, Math.min(100 - el.width,  el.x + dx));
        const ny = Math.max(0, Math.min(100 - el.height, el.y + dy));
        return [{ id, patch: { x: nx, y: ny } }];
      });
      onTransformLive(updates);
      onTransformCommit(updates);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedIds, idToElement, onSelect, onDeleteSelected, onDuplicateSelected, onTransformLive, onTransformCommit, editingId]);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="relative bg-white shadow-2xl rounded-lg overflow-hidden select-none"
      style={{
        width:    `${1280 * zoom}px`,
        height:   `${720  * zoom}px`,
        maxWidth: '100%',
        aspectRatio: '16 / 9',
        transform: 'translateZ(0)',  // promote to its own layer
      }}
      ref={stageRef}
      onMouseDown={(e) => {
        // Click empty canvas → deselect
        if (e.target === e.currentTarget) onSelect([]);
      }}
    >
      {/* Elements */}
      {sorted.map((el) => {
        const selected = selectedIds.includes(el.id);
        const editing  = editingId === el.id;
        if (!el.visible) return null;
        return (
          <div
            key={el.id}
            data-element-id={el.id}
            onMouseDown={(e) => { if (!editing) handleElementMouseDown(e, el); }}
            onDoubleClick={(e) => {
              if (el.locked) return;
              if (!isInlineEditable(el.type)) return;
              e.stopPropagation();
              onRequestEdit?.(el.id);
            }}
            style={{
              position: 'absolute',
              left:   `${el.x}%`,
              top:    `${el.y}%`,
              width:  `${el.width}%`,
              height: `${el.height}%`,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              zIndex: el.zIndex,
              outline: editing ? '2px solid #16a34a'
                     : selected ? '2px solid #3b82f6'
                     : '2px solid transparent',
              outlineOffset: editing || selected ? 2 : 0,
              cursor: editing ? 'text' : el.locked ? 'not-allowed' : 'move',
              boxSizing: 'border-box',
            }}
          >
            {editing && renderEditor ? (
              <div style={{ width: '100%', height: '100%', pointerEvents: 'all' }}>
                {renderEditor(el)}
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                {renderElement(el, { pageNumber, total: totalPages })}
              </div>
            )}

            {/* Resize handles only on the selected element if exactly one is selected AND not editing */}
            {selected && !editing && selectedIds.length === 1 && !el.locked && (
              <>
                {HANDLES.map((h) => (
                  <div
                    key={h.id}
                    onMouseDown={(e) => handleResizeMouseDown(e, el, h.id)}
                    style={{
                      position: 'absolute',
                      width: 10, height: 10,
                      background: 'white',
                      border: '2px solid #3b82f6',
                      borderRadius: 2,
                      cursor: h.cursor,
                      zIndex: 99999,
                      pointerEvents: 'all',
                      ...h.pos,
                    }}
                  />
                ))}
              </>
            )}
          </div>
        );
      })}

      {/* Snap guides */}
      {guides.cx && (
        <div className="pointer-events-none" style={{ position: 'absolute', top: 0, bottom: 0, left: '50%', width: 1, background: '#ef4444', opacity: 0.7 }} />
      )}
      {guides.cy && (
        <div className="pointer-events-none" style={{ position: 'absolute', left: 0, right: 0, top: '50%', height: 1, background: '#ef4444', opacity: 0.7 }} />
      )}
    </div>
  );
};

// =============================================================================
//  Helpers
// =============================================================================

function snapToCanvas(
  x: number, y: number, w: number, h: number, stage: { w: number; h: number },
): { x: number; y: number } {
  const pxX  = (x / 100) * stage.w;
  const pxY  = (y / 100) * stage.h;
  const pxCX = pxX + (w / 100) * stage.w / 2;
  const pxCY = pxY + (h / 100) * stage.h / 2;

  let snappedX = x, snappedY = y;
  // Snap left/right edges to canvas edges
  if (Math.abs(pxX) < SNAP_PX) snappedX = 0;
  else if (Math.abs(pxX + (w / 100) * stage.w - stage.w) < SNAP_PX) snappedX = 100 - w;
  // Snap to horizontal center
  if (Math.abs(pxCX - stage.w / 2) < SNAP_PX) snappedX = 50 - w / 2;

  if (Math.abs(pxY) < SNAP_PX) snappedY = 0;
  else if (Math.abs(pxY + (h / 100) * stage.h - stage.h) < SNAP_PX) snappedY = 100 - h;
  if (Math.abs(pxCY - stage.h / 2) < SNAP_PX) snappedY = 50 - h / 2;

  return { x: snappedX, y: snappedY };
}

function computeGuides(x: number, y: number, w: number, h: number) {
  const cx = Math.abs((x + w / 2) - 50) < 0.4;
  const cy = Math.abs((y + h / 2) - 50) < 0.4;
  return { cx, cy };
}
