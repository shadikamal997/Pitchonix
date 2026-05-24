'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import type { SlideElementDTO } from '@/types/slide-element';
import { renderElement } from './renderers';
import { findCompositionFamily } from './templates/composition/registry';
import { findAllVariants } from './templates/composition/types';
import { analyzeContent } from './templates/composition/content-analyzer';
import { selectBestVariant } from './templates/composition/layout-scorer';
import type { DeckSlideContext } from './templates/composition/deck-context';
import { resolveFontStack } from '@/app/fonts';
import { validateSlideLayout } from './design-system/layout-validator';
import { SAFE_AREA, SPACING } from './design-system/tokens';
import { snapWithGuides, ignoreSetForDrag, type SnapGuide } from './smart/snap-engine';
import { isPositionLocked, isSizeLocked, isContentLocked } from './smart/lock-utils';

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

// SNAP_PX now lives in smart/snap-engine.ts (Phase 32E).
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
  /** Slide-level background spec (Phase 10 templates). When set, replaces the
   *  default white surface with solid / gradient / image background. */
  background?:  SlideBackgroundSpec | null;
  /** Slide-level theme tokens. We mainly use this as a fallback background
   *  if `background` isn't set but a theme background exists. */
  themeTokens?: { background?: string } | null;
  /** Slide type ('cover' / 'problem' / etc.) — used to pick the right family variant. */
  slideType?:  string;
  /** Slide index (0-based) and total slides — used by family chrome (page numbers, etc.). */
  slideIndex?: number;
  /** Composition family id (from applied template). When set, the canvas renders
   *  the slide as a composed family variant: background chrome, decorations, and
   *  slot-positioned elements with family typography. Editing still works. */
  compositionFamilyId?: string | null;
  /** Phase 35-final-B Task 3 — when true (Version History preview mode), the
   *  canvas dims, hides selection / drag / resize affordances, and routes
   *  pointer events into an inert overlay. The underlying mutators in
   *  useElementsApi are also guarded as a defense-in-depth measure. */
  readOnly?: boolean;
  /** Phase 26 — deck-level context for this slide. When provided, the layout
   *  scorer applies narrative/pacing/fatigue/transition biases. */
  deckContext?: DeckSlideContext;
}

// Internal type — mirrors backend/element-types.ts SlideBackground.
interface SlideBackgroundSpec {
  type:     'solid' | 'gradient' | 'image';
  color?:   string;
  gradient?: {
    kind:  'linear' | 'radial';
    angle?: number;
    stops: Array<{ color: string; offset: number }>;
  };
  image?:   { src: string; fit?: 'cover' | 'contain' };
  opacity?: number;
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
  background,
  themeTokens,
  slideType,
  slideIndex = 0,
  compositionFamilyId,
  deckContext,
  readOnly = false,
}) => {
  // Compute the actual CSS background for the slide stage. Order:
  //   1. Explicit slide.background (solid / gradient / image)
  //   2. Theme tokens' background colour (template fallback)
  //   3. White
  const stageBackground: React.CSSProperties = (() => {
    if (background) {
      if (background.type === 'solid' && background.color) return { background: background.color };
      if (background.type === 'gradient' && background.gradient) {
        const g = background.gradient;
        const stops = (g.stops || []).map((s) => `${s.color} ${Math.round((s.offset || 0) * 100)}%`).join(', ');
        const css = g.kind === 'radial' ? `radial-gradient(circle, ${stops})` : `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
        return { background: css };
      }
      if (background.type === 'image' && background.image?.src) {
        return { background: `url('${background.image.src}') center/${background.image.fit || 'cover'} no-repeat` };
      }
    }
    if (themeTokens?.background) return { background: themeTokens.background };
    return { background: '#ffffff' };
  })();
  const stageRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const resizeRef = useRef<ResizeState | null>(null);
  const [stageSize, setStageSize] = useState({ w: 1280, h: 720 });
  // Phase 32E — snap guide lines. Each guide is rendered as a coloured line
  // spanning the canvas; vertical guides at a given x%, horizontal at y%.
  const [guides, setGuides] = useState<SnapGuide[]>([]);

  // Marquee multi-select state — set on empty-canvas mousedown
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const marqueeStart = useRef<{ x: number; y: number } | null>(null);

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

  // ── Composition family (Phase 18) ─────────────────────────────────────────
  // When a recognized family is active, each slot-matched element is rendered
  // at the family's slot position with family typography. Free (overflow)
  // elements keep their original geometry. Selection / inline edit still work.
  const family = useMemo(() => findCompositionFamily(compositionFamilyId), [compositionFamilyId]);
  const contentProfile  = useMemo(() => analyzeContent(sorted), [sorted]);
  const variantCandidates = useMemo(
    () => family ? findAllVariants(family, slideType || 'default') : [],
    [family, slideType],
  );
  const variant = useMemo(
    () => variantCandidates.length
      ? selectBestVariant(variantCandidates, contentProfile, family?.id ?? '', deckContext).chosen
      : null,
    [variantCandidates, contentProfile, family, deckContext],
  );
  const variantChrome = (variant?.chrome) || family?.chrome || null;
  const variantTypography = variant?.typography || family?.typography || null;

  // Slot map: elementId → { slot geometry, family typography overrides }
  const slotMap = useMemo(() => {
    const map = new Map<string, { x: number; y: number; w: number; h: number; role?: string }>();
    if (!variant) return map;
    const visible = sorted.filter((e) => e.visible !== false);
    const pool = [...visible];
    const claimed = new Set<string>();
    for (const slot of variant.slots) {
      for (const t of slot.acceptsTypes) {
        const found = pool.find((el) => !claimed.has(el.id) && el.type === t);
        if (found) {
          claimed.add(found.id);
          map.set(found.id, { x: slot.x, y: slot.y, w: slot.w, h: slot.h, role: slot.role });
          break;
        }
      }
    }
    return map;
  }, [variant, sorted]);

  // Per-element family typography (only applied to slot-matched elements).
  // Font families are routed through `resolveFontStack` so the template's
  // declared font name (e.g. "Playfair Display") is mapped to the actual CSS
  // variable next/font loaded.
  const familyTypoFor = useCallback((type: string): React.CSSProperties => {
    if (!variantTypography?.perType) return {};
    const t = (variantTypography.perType as any)[type];
    if (!t) return {};
    const s: React.CSSProperties = {};
    if (t.fontSize       !== undefined) s.fontSize       = t.fontSize;
    if (t.fontWeight     !== undefined) s.fontWeight     = t.fontWeight;
    if (t.letterSpacing  !== undefined) s.letterSpacing  = t.letterSpacing;
    if (t.textTransform  !== undefined) s.textTransform  = t.textTransform as any;
    if (t.lineHeight     !== undefined) s.lineHeight     = t.lineHeight;
    if (t.color)                        s.color          = t.color;
    if (t.fontFamily)                   s.fontFamily     = resolveFontStack(t.fontFamily) as any;
    return s;
  }, [variantTypography]);

  // Family-level body/heading font fallbacks — applied as a stage-wide default
  // so all text inherits the loaded font even when a perType entry doesn't
  // explicitly set fontFamily.
  const familyFontDefaults = useMemo((): React.CSSProperties => {
    if (!family) return {};
    return {
      // Body font sets the default on the stage; headings override per element.
      fontFamily: resolveFontStack(family.theme.fontBody) as any,
    };
  }, [family]);

  const renderPlan = useMemo(() => {
    type Planned = { id: string; type: string; x: number; y: number; w: number; h: number; content?: any };
    const planned: Planned[] = sorted
      .filter((el) => el.visible !== false)
      .map((el) => {
        const slot = slotMap.get(el.id);
        if (slot) return { id: el.id, type: el.type, x: slot.x, y: slot.y, w: slot.w, h: slot.h, content: el.content };
        return { id: el.id, type: el.type, x: el.x, y: el.y, w: el.width, h: el.height, content: el.content };
      });

    const issues = validateSlideLayout(planned);
    const byId = new Map(planned.map((el) => [el.id, { ...el }]));
    if (issues.length === 0) return { byId, issues };

    const rhythmGapPct = Math.max(0.8, (SPACING[2] / 720) * 100);
    const bottomLimit = 100 - SAFE_AREA.bottom;
    const isChrome = (type: string) => type === 'footer' || type === 'pageNumber' || type === 'logo';
    const isDecor = (type: string) => ['shape', 'line', 'divider'].includes(type);

    for (const geom of byId.values()) {
      geom.x = Math.max(0, Math.min(100 - geom.w, geom.x));
      geom.y = Math.max(0, Math.min(100 - geom.h, geom.y));
      if (!isChrome(geom.type) && !isDecor(geom.type)) {
        geom.y = Math.max(SAFE_AREA.top, geom.y);
        if (geom.y + geom.h > bottomLimit) {
          geom.h = Math.max(2, bottomLimit - geom.y);
        }
      }
    }

    const stackables = [...byId.values()]
      .filter((el) => !isChrome(el.type) && !isDecor(el.type))
      .sort((a, b) => (a.y - b.y) || (a.x - b.x));

    const overlapsX = (a: Planned, b: Planned) => Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x) > 0.5;
    for (let i = 1; i < stackables.length; i++) {
      const current = stackables[i];
      const blockingPrevious = stackables
        .slice(0, i)
        .filter((prev) => overlapsX(prev, current))
        .sort((a, b) => (b.y + b.h) - (a.y + a.h))[0];
      if (!blockingPrevious) continue;

      const minY = blockingPrevious.y + blockingPrevious.h + rhythmGapPct;
      if (current.y < minY) {
        current.y = minY;
        if (current.y + current.h > bottomLimit) {
          const available = bottomLimit - current.y;
          if (available >= 2) current.h = available;
          else current.y = Math.max(SAFE_AREA.top, bottomLimit - current.h);
        }
        byId.set(current.id, current);
      }
    }

    return { byId, issues };
  }, [sorted, slotMap]);

  // Runtime layout validation — warns in dev and feeds renderPlan, which clamps
  // unsafe bounds and stacks colliding content before final render.
  useEffect(() => {
    if (process.env.NODE_ENV === 'production') return;
    const issues = renderPlan.issues;
    if (issues.length > 0) {
      const grouped = issues.reduce((acc, i) => { (acc[i.kind] = acc[i.kind] || []).push(i); return acc; }, {} as Record<string, typeof issues>);
      console.group(`[layout-validator] ${issues.length} issue(s) on this slide; safe render plan applied`);
      for (const [kind, list] of Object.entries(grouped)) {
        console.warn(`  ${kind}: ${list.length}`, list.map((i) => i.message));
      }
      console.groupEnd();
    }
  }, [renderPlan]);

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
    // Phase 32A/H — additive on Shift OR Cmd/Ctrl. Position-locked still blocks
    // drag but the element can still be selected (so user can unlock from the
    // inspector / layers panel).
    const additive = e.shiftKey || e.metaKey || e.ctrlKey;
    e.stopPropagation();
    e.preventDefault();
    if (!selectedIds.includes(el.id)) {
      selectOne(el.id, additive);
    } else if (additive) {
      // Toggle off in the additive case
      selectOne(el.id, additive);
      return;
    }
    if (isPositionLocked(el)) return;
    const ids = (selectedIds.includes(el.id) && !additive)
      ? (selectedIds.length > 0 ? selectedIds : [el.id])
      : (additive ? Array.from(new Set([...selectedIds, el.id])) : [el.id]);

    // Drop position-locked siblings from the drag so they stay put
    const draggable = ids.filter((id) => !isPositionLocked(idToElement.get(id)));
    if (draggable.length === 0) return;

    dragRef.current = {
      ids: draggable,
      startMouseX: e.clientX,
      startMouseY: e.clientY,
      origs: Object.fromEntries(draggable.map((id) => {
        const x = idToElement.get(id)!;
        return [id, { x: x.x, y: x.y, width: x.width, height: x.height }];
      })),
    };
  };

  // ── Resize ─────────────────────────────────────────────────────────────────
  const handleResizeMouseDown = (e: React.MouseEvent, el: SlideElementDTO, handle: HandleId) => {
    if (isSizeLocked(el)) return;
    e.stopPropagation();
    e.preventDefault();
    resizeRef.current = {
      id: el.id, handle,
      startMouseX: e.clientX, startMouseY: e.clientY,
      orig: { x: el.x, y: el.y, width: el.width, height: el.height },
    };
  };

  // ── Global pointer listeners while dragging, resizing, or marqueeing ─────
  useEffect(() => {
    const onMove = (ev: MouseEvent) => {
      if (marqueeStart.current && stageRef.current) {
        const box = stageRef.current.getBoundingClientRect();
        const x1 = marqueeStart.current.x - box.left;
        const y1 = marqueeStart.current.y - box.top;
        const x2 = ev.clientX - box.left;
        const y2 = ev.clientY - box.top;
        setMarquee({
          x: Math.min(x1, x2), y: Math.min(y1, y2),
          w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
        });
      }
      if (dragRef.current) {
        const d = dragRef.current;
        const dxPct = ((ev.clientX - d.startMouseX) / stageSize.w) * 100;
        const dyPct = ((ev.clientY - d.startMouseY) / stageSize.h) * 100;

        // Phase 32E — snap-to-element on the "leader" of the drag (the first
        // element). The same delta is applied to the rest of the selection so
        // multi-drag stays rigid. Group members are added to the ignore set.
        const ignore = ignoreSetForDrag(elements, d.ids);
        const leaderId = d.ids[0];
        const leaderOrig = d.origs[leaderId];
        const naiveX = leaderOrig.x + dxPct;
        const naiveY = leaderOrig.y + dyPct;
        const snap = snapWithGuides(
          naiveX, naiveY, leaderOrig.width, leaderOrig.height,
          elements, ignore, stageSize.w, stageSize.h,
        );
        const snapDx = snap.x - leaderOrig.x;
        const snapDy = snap.y - leaderOrig.y;

        const updates: Array<{ id: string; patch: Partial<SlideElementDTO> }> = d.ids.map((id) => {
          const orig = d.origs[id];
          let nx = orig.x + snapDx;
          let ny = orig.y + snapDy;
          // Clamp to canvas
          nx = Math.max(0, Math.min(100 - orig.width, nx));
          ny = Math.max(0, Math.min(100 - orig.height, ny));
          return { id, patch: { x: nx, y: ny } };
        });
        setGuides(snap.guides);
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
        setGuides([]);
      }
      if (resizeRef.current) {
        const el = idToElement.get(resizeRef.current.id)!;
        onTransformCommit([{ id: el.id, patch: { x: el.x, y: el.y, width: el.width, height: el.height } }]);
        resizeRef.current = null;
      }
      if (marqueeStart.current) {
        // Resolve marquee: select every element whose box intersects the rect.
        const rect = marquee;
        marqueeStart.current = null;
        setMarquee(null);
        if (rect && rect.w > 4 && rect.h > 4 && stageSize.w > 0 && stageSize.h > 0) {
          const xPct = (rect.x / stageSize.w) * 100;
          const yPct = (rect.y / stageSize.h) * 100;
          const wPct = (rect.w / stageSize.w) * 100;
          const hPct = (rect.h / stageSize.h) * 100;
          const hits = elements.filter((e) =>
            e.visible &&
            e.x + e.width  > xPct &&
            e.x            < xPct + wPct &&
            e.y + e.height > yPct &&
            e.y            < yPct + hPct,
          );
          if (hits.length > 0) onSelect(hits.map((e) => e.id));
        }
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
  // When a family is active, its chrome background overrides the slide-level one.
  const finalStageBg: React.CSSProperties = variantChrome?.background
    ? { background: variantChrome.background }
    : stageBackground;

  return (
    <div
      className={`relative shadow-2xl rounded-lg overflow-hidden select-none ${readOnly ? 'pointer-events-none' : ''}`}
      style={{
        width:    `${1280 * zoom}px`,
        height:   `${720  * zoom}px`,
        maxWidth: '100%',
        aspectRatio: '16 / 9',
        transform: 'translateZ(0)',  // promote to its own layer
        ...finalStageBg,
        ...familyFontDefaults,
      }}
      ref={stageRef}
      onMouseDown={(e) => {
        // Phase 35-final-B Task 3 — never start marquee selection or clear
        // selection during preview; the stage is inert.
        if (readOnly) return;
        // Click empty canvas → either start marquee (and clear selection) or just deselect
        if (e.target !== e.currentTarget) return;
        if (!stageRef.current) { onSelect([]); return; }
        const box = stageRef.current.getBoundingClientRect();
        marqueeStart.current = { x: e.clientX, y: e.clientY };
        onSelect([]);
        setMarquee({ x: e.clientX - box.left, y: e.clientY - box.top, w: 0, h: 0 });
      }}
    >
      {/* Family decorations (background graphics: gradients, frames, lines) */}
      {variantChrome?.decorations && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <variantChrome.decorations slideIndex={slideIndex} total={Math.max(slideIndex + 1, totalPages || slideIndex + 1)} />
        </div>
      )}
      {/* Elements */}
      {sorted.map((el) => {
        const selected = selectedIds.includes(el.id);
        const editing  = editingId === el.id;
        if (!el.visible) return null;
        // If a family slot owns this element, use slot geometry + family typography.
        const slot = slotMap.get(el.id);
        const useSlot = !!slot;
        // CRITICAL — when family is active, hide UNMATCHED content elements so
        // they can't overlap slot-positioned ones. Decorative element types
        // (shapes/lines/dividers/icons/images) stay visible at DB positions.
        const isDecorative = ['shape', 'line', 'divider', 'icon', 'image', 'logo'].includes(el.type);
        if (family && !useSlot && !isDecorative) return null;
        const geom = renderPlan.byId.get(el.id) || (useSlot ? slot! : { x: el.x, y: el.y, w: el.width, h: el.height });
        const familyStyle = useSlot ? familyTypoFor(el.type) : {};
        return (
          <div
            key={el.id}
            data-element-id={el.id}
            onMouseDown={(e) => { if (!editing) handleElementMouseDown(e, el); }}
            onDoubleClick={(e) => {
              if (isContentLocked(el)) return;
              if (!isInlineEditable(el.type)) return;
              e.stopPropagation();
              onRequestEdit?.(el.id);
            }}
            style={{
              position: 'absolute',
              left:   `${geom.x}%`,
              top:    `${geom.y}%`,
              width:  `${geom.w}%`,
              height: `${geom.h}%`,
              transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
              zIndex: el.zIndex,
              outline: editing ? '2px solid #16a34a'
                     : selected ? '2px solid #3b82f6'
                     : '2px solid transparent',
              outlineOffset: editing || selected ? 2 : 0,
              // Family typography is the base; element's own style overrides on top
              // (renderElement reads el.style which wins). This sets the inherited
              // CSS context for child renderers.
              ...familyStyle,
              cursor: editing ? 'text' : isPositionLocked(el) ? 'not-allowed' : 'move',
              boxSizing: 'border-box',
            }}
          >
            {editing && renderEditor ? (
              <div style={{ width: '100%', height: '100%', pointerEvents: 'all' }}>
                {renderEditor(el)}
              </div>
            ) : (
              <div style={{ width: '100%', height: '100%', pointerEvents: 'none' }}>
                {renderElement(el, { pageNumber, total: totalPages, familyId: compositionFamilyId ?? undefined })}
              </div>
            )}

            {/* Resize handles only on the selected element if exactly one is selected AND not editing.
                Slot-managed elements are locked to the family's layout — no resize. */}
            {selected && !editing && selectedIds.length === 1 && !isSizeLocked(el) && !useSlot && (
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

      {/* Phase 32E — Snap guide lines. Red = canvas / center alignment,
          fuchsia = element edge, sky = element center. Lines span the canvas. */}
      {guides.map((g, i) => {
        const color = g.kind === 'canvas'         ? '#ef4444'
                    : g.kind === 'element-center' ? '#0ea5e9'
                    :                                '#d946ef';
        const common: React.CSSProperties = {
          position: 'absolute', background: color, opacity: 0.85, zIndex: 99997,
        };
        if (g.axis === 'vertical') {
          return (
            <div key={`g${i}`} className="pointer-events-none"
                 style={{ ...common, top: 0, bottom: 0, left: `${g.pos}%`, width: 1 }} />
          );
        }
        return (
          <div key={`g${i}`} className="pointer-events-none"
               style={{ ...common, left: 0, right: 0, top: `${g.pos}%`, height: 1 }} />
        );
      })}

      {/* Marquee selection rectangle */}
      {marquee && marquee.w > 0 && marquee.h > 0 && (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute',
            left: marquee.x, top: marquee.y, width: marquee.w, height: marquee.h,
            border: '1px solid #3b82f6',
            background: 'rgba(59, 130, 246, 0.08)',
            zIndex: 99998,
          }}
        />
      )}

      {/* Phase 32A — selection count chip */}
      {selectedIds.length >= 2 && (
        <div
          className="pointer-events-none"
          style={{
            position: 'absolute', top: 10, left: '50%', transform: 'translateX(-50%)',
            zIndex: 99996,
            background: '#3b82f6', color: 'white',
            padding: '3px 10px', borderRadius: 999,
            fontSize: 11, fontWeight: 600,
            boxShadow: '0 2px 8px rgba(59, 130, 246, 0.35)',
          }}
        >
          {selectedIds.length} selected
        </div>
      )}

      {/* Family overlays (page numbers, brand marks) — sit ABOVE element content */}
      {variantChrome?.overlays && (
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 50 }}>
          <variantChrome.overlays slideIndex={slideIndex} total={totalPages || slideIndex + 1} />
        </div>
      )}
    </div>
  );
};

// (Helpers `snapToCanvas` / `computeGuides` were superseded by
//  `snapWithGuides` in `smart/snap-engine.ts` — Phase 32E.)
