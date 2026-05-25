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
import { SectionedSidebar } from './sidebar/SectionedSidebar';
import type { DeckMetadata } from './sidebar/sections';
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
import { useDeckPlan, logDeckPlan, type DeckSlideInput } from './templates/composition/deck-context';
import { useDeckElements } from './useDeckElements';
import { NarrativeDebugPanel } from './templates/composition/NarrativeDebugPanel';
import { CommentsPanel } from './comments/CommentsPanel';
import { useSlideComments } from './comments/useSlideComments';
import { ElementCommentBadge } from './comments/ElementCommentBadge';
import { CommentPinLayer } from './comments/CommentPinLayer';
import { CommentModeOverlay } from './comments/CommentModeOverlay';
import { Play, MessageSquare, Layers as LayersIcon, Send } from 'lucide-react';
import { LayersPanel } from './layers/LayersPanel';
import { selectSimilar } from './smart/select-utils';
import { applyLayout } from './layouts/applyLayout';
import { findLayout, type LayoutSpec } from './layouts/registry';
import { Undo2, Redo2, Sparkles } from 'lucide-react';
import type { SlideElementDTO, ElementStyle } from '@/types/slide-element';
// Phase 35 — Version History wiring
import {
  VersionPreviewProvider, useVersionPreview, useSlidesForRender,
} from './versions/useVersionPreview';
import { VersionPreviewBanner } from './versions/VersionPreviewBanner';
import { VersionHistoryPanel } from './versions/VersionHistoryPanel';
import { DeckVersionBadge } from './versions/DeckVersionBadge';
import { useVersionHistory } from './versions/useVersionHistory';
// Phase 36 — Reviews wiring
import { useDeckReviews } from './reviews/useDeckReviews';
import { ReviewStatusBadge } from './reviews/ReviewStatusBadge';
import { RequestReviewModal } from './reviews/RequestReviewModal';
// Phase 36.1B / 36.1F — Reviewer mode + dashboard
import { ReviewerBanner } from './reviews/ReviewerBanner';
import { ReviewDashboardPanel } from './reviews/ReviewDashboardPanel';
// Phase 39.1A — workspace switcher
import { WorkspaceSwitcher } from '@/features/workspaces/WorkspaceSwitcher';
// Phase 37K — apply brand kit menu
import { BrandKitPicker } from '@/features/brand-kits/BrandKitPicker';
import { useDeckBrandKit } from '@/features/brand-kits/useDeckBrandKit';
import { useConfirm } from '@/components/ConfirmDialog';
// Phase 34 — real-time collaboration
import { useCollaboration } from '@/features/collaboration/useCollaboration';
import { PresenceAvatars } from '@/features/collaboration/PresenceAvatars';
import { CursorOverlay } from '@/features/collaboration/CursorOverlay';
import { SelectionOverlay } from '@/features/collaboration/SelectionOverlay';
import { ConnectionBanner } from '@/features/collaboration/ConnectionBanner';
import { CollaborationPanel } from '@/features/collaboration/CollaborationPanel';
import { CollaborationCursorEmitter } from '@/features/collaboration/CollaborationCursorEmitter';
import { EditingAwarenessOverlay } from '@/features/collaboration/EditingAwarenessOverlay';
import { Users as UsersIcon } from 'lucide-react';
import { toastInfo } from '@/hooks/useToast';

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

// Phase 35.1C Task 1 — visual disable wrapper for toolbar clusters during
// Version History preview. When `disabled`, swallows pointer events on the
// children and dims them, while the wrapper itself carries cursor-not-allowed
// + a tooltip so hovering anywhere over the cluster explains why.
const PREVIEW_DISABLE_TIP = 'Editing disabled while previewing a historical version';
const DisabledWhilePreviewing: React.FC<{
  disabled: boolean;
  children: React.ReactNode;
  className?: string;
}> = ({ disabled, children, className }) => {
  if (!disabled) return <>{children}</>;
  return (
    <div
      className={`relative cursor-not-allowed ${className || ''}`}
      title={PREVIEW_DISABLE_TIP}
      aria-disabled="true"
    >
      <div className="opacity-40 pointer-events-none select-none">
        {children}
      </div>
    </div>
  );
};

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
  // Phase 36E — comment creation mode. Toggle with the toolbar Comment-Mode
  // button or the bare `c` shortcut; Esc exits. Disabled while previewing.
  const [commentMode, setCommentMode] = useState(false);
  const [layersOpen, setLayersOpen]     = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [commentsFocusElementId, setCommentsFocusElementId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  // Read the currently-applied template from the slide's metadata
  const appliedTemplate = (slide?.metadata as any)?.appliedTemplateId
    ? findTemplate((slide?.metadata as any).appliedTemplateId)
    : null;

  // Read the current layout from metadata
  const appliedLayoutId: string | null = (slide?.metadata as any)?.layoutId || null;

  // Phase 35 — Version History state. `preview` is shared via the Provider
  // wrapping SlideEditorWithBoundary so mutation hooks see the same value.
  const preview = useVersionPreview();
  const confirmDialog = useConfirm();
  const versionHistory = useVersionHistory(slide?.deckId || null);
  const deckSlides = useDeckSlides(slide?.deckId || null);
  const deckBrand  = useDeckBrandKit(slide?.deckId || null);
  const slidesForRender = useSlidesForRender(deckSlides.slides);
  const [versionPanelOpen, setVersionPanelOpen] = useState(false);
  // Phase 36 — Reviews surface
  const reviews = useDeckReviews(slide?.deckId || null);
  const [reviewModalOpen,     setReviewModalOpen]     = useState(false);
  const [reviewDashboardOpen, setReviewDashboardOpen] = useState(false);
  // Phase 34 — collaboration session for this deck. Cursor + selection
  // events get throttled at emission sites; the hook owns reconnection.
  const collab = useCollaboration(slide?.deckId || null, slideId);
  const [collaborationPanelOpen, setCollaborationPanelOpen] = useState(false);
  // Phase 36.1B — Reviewer Mode is active when the current user IS the
  // assigned reviewer on the active request. Combined with version preview,
  // editing affordances are suppressed; commenting remains enabled.
  const isReviewerMode  = reviews.isReviewerForMe(currentUserId);
  const editingDisabled = preview.isPreviewing || isReviewerMode;
  const editDisableTip  = preview.isPreviewing
    ? PREVIEW_DISABLE_TIP
    : (isReviewerMode ? 'Editing disabled — you are reviewing this deck' : '');

  // Phase 35-final-B Task 1 — when previewing, locate the snapshot slide
  // that corresponds to the active live slideId (matched by order, not id,
  // since snapshot ids are historical) and pin its elements as the canvas
  // data source. The hook short-circuits its network paths too.
  const previewElements = useMemo(() => {
    if (!preview.isPreviewing || !preview.snapshot) return undefined;
    const liveOrder = deckSlides.slides.findIndex((s) => s.id === slideId);
    if (liveOrder < 0) return undefined;
    const snapSlide = (preview.snapshot.slides || [])[liveOrder];
    return snapSlide?.elements as SlideElementDTO[] | undefined;
  }, [preview.isPreviewing, preview.snapshot, deckSlides.slides, slideId]);

  // Phase 35.1A — pass `deckId` so useElementsApi can capture safety
  // snapshots before destructive element deletes.
  // Phase 35-final-B Task 1 — `previewElements` pins the snapshot data
  // source onto the canvas during preview.
  const api$ = useElementsApi(slideId, slide?.deckId || null, previewElements);

  // Phase 35-final-B Task 2 — give the sidebar a preview-aware view of the
  // slides list. Shallow-clone deckSlides and replace just `slides`; all
  // mutators stay intact (they already short-circuit during preview).
  const sidebarApi = useMemo(() => ({
    ...deckSlides,
    slides: slidesForRender as typeof deckSlides.slides,
  }), [deckSlides, slidesForRender]);

  // Phase 32M — in-memory clipboard for ⌘C / ⌘V (slide-scoped; survives until
  // the next copy or page reload). Holds full SlideElementDTO snapshots so a
  // future cross-slide paste can read them.
  const clipboardRef = useRef<SlideElementDTO[] | null>(null);

  // Phase 32F — deck-level metadata (sections catalog). Fetched once per deck
  // and patched via the SectionedSidebar's onPatchDeckMetadata callback.
  const [deckMetadata, setDeckMetadata] = useState<DeckMetadata | null>(null);
  useEffect(() => {
    if (!slide?.deckId) return;
    let cancelled = false;
    api.get(`/decks/${slide.deckId}`).then(({ data }) => {
      if (!cancelled) setDeckMetadata((data?.metadata as DeckMetadata) || {});
    }).catch(() => { /* non-blocking */ });
    return () => { cancelled = true; };
  }, [slide?.deckId]);
  const handlePatchDeckMetadata = useCallback(async (patch: Partial<DeckMetadata>) => {
    if (!slide?.deckId) return;
    const next = { ...(deckMetadata || {}), ...patch };
    setDeckMetadata(next);   // optimistic
    try {
      await api.patch(`/decks/${slide.deckId}`, { metadata: next });
    } catch {
      // Restore on failure by re-fetching
      try {
        const { data } = await api.get(`/decks/${slide.deckId}`);
        setDeckMetadata((data?.metadata as DeckMetadata) || {});
      } catch { /* keep optimistic if both calls fail */ }
    }
  }, [slide?.deckId, deckMetadata]);

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
      const confirmed = await confirmDialog({ title: 'Apply blank layout?', message: 'Every element on this slide will be removed.', confirmLabel: 'Apply blank', tone: 'warning' });
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

  // Phase 34.1C — broadcast editing.started / .stopped whenever the user
  // enters / leaves inline-edit mode. Field hint comes from the element type
  // so collaborators see "John editing · heading".
  useEffect(() => {
    if (!editingId || !slideId) return;
    const el = api$.elements.find((e) => e.id === editingId);
    collab.sendEditingStart(slideId, editingId, el?.type);
    return () => { collab.sendEditingStop(slideId, editingId); };
  }, [editingId, slideId, collab.sendEditingStart, collab.sendEditingStop, api$.elements]);

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

  // Phase 34F — tell collaborators which slide I'm viewing.
  useEffect(() => { if (slideId) collab.sendSlideView(slideId); }, [slideId, collab.sendSlideView]);

  // Phase 34E — broadcast my selection whenever it changes.
  useEffect(() => {
    if (slideId) collab.sendSelection(slideId, selectedIds);
  }, [selectedIds, slideId, collab.sendSelection]);

  // Phase 34G — apply remote element changes by refetching. We rely on the
  // hook chokepoint (useElementsApi) to debounce; a single refresh per
  // remote event is cheap enough.
  useEffect(() => {
    const off = collab.onElement((event) => {
      if (event === 'element.created' || event === 'element.updated' || event === 'element.deleted') {
        try { api$.refresh?.(); } catch { /* ignore */ }
      }
    });
    return off;
  }, [collab.onElement, api$]);

  // Phase 34.1A — apply remote slide structure changes (create/delete/reorder)
  // by refreshing the deck sidebar. Slide-content updates also trigger a
  // sidebar refresh so titles + thumbnails stay in sync.
  useEffect(() => {
    const off = collab.onSlide(() => {
      try { deckSlides.refresh?.(); } catch { /* ignore */ }
    });
    return off;
  }, [collab.onSlide, deckSlides]);

  // Phase 34.1B — version.* events surface as live toasts so every
  // collaborator sees "John restored 'Approved Version'" without polling.
  useEffect(() => {
    const off = collab.onVersion((event, payload) => {
      try { versionHistory.refresh?.(); } catch { /* ignore */ }
      const name = payload?.version?.name ?? payload?.sourceVersionName;
      if (event === 'version.snapshot_created' && name) {
        toastInfo('New snapshot', `${name}`);
      } else if (event === 'version.restored' && name) {
        toastInfo('Version restored', `Deck reverted to "${name}"`);
        // Phase Ω.1 — after a restore the slide's elements have changed on
        // the server. Without this refresh, the canvas keeps showing the
        // pre-restore state until the user manually reloads.
        try { api$.refresh?.(); } catch { /* ignore */ }
        try { deckSlides.refresh?.(); } catch { /* ignore */ }
      } else if (event === 'version.renamed' && name) {
        toastInfo('Version renamed', `${name}`);
      }
    });
    return off;
  }, [collab.onVersion, versionHistory, api$, deckSlides]);

  // (Phase 34L/M bus-event subscription is mounted AFTER slideComments is
  //  declared further down, since useEffect closures otherwise hit the TDZ.)

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

  // Phase 34L/M — bridge ReviewEventBus emissions into local refreshes so
  // comments + review status update instantly across every connected client.
  useEffect(() => {
    const offs: Array<() => void> = [];
    for (const t of ['comment.created', 'comment.resolved', 'comment.reopened',
                     'comment.assigned', 'comments.resolved_all']) {
      offs.push(collab.onBusEvent(t, () => slideComments.refresh?.()));
    }
    for (const t of ['review.requested', 'review.started', 'review.approved',
                     'review.changes_requested', 'review.withdrawn', 'review.reopened']) {
      offs.push(collab.onBusEvent(t, () => reviews.refresh?.()));
    }
    return () => { for (const o of offs) o(); };
  }, [collab.onBusEvent, slideComments, reviews]);

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
    if (!(await confirmDialog({ title: `Tidy slide → ${decision.layoutName}`, message: `${decision.reason}\n\nElements will be re-positioned.`, confirmLabel: 'Tidy slide' }))) return;
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
          collaborator={collab.you ? { name: collab.you.name, color: collab.you.color } : undefined}
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
          collaborator={collab.you ? { name: collab.you.name, color: collab.you.color } : undefined}
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
        // Phase 34.2C — thread the editor's own collaboration session
        // identity into the CollaborationCaret label so other users see
        // who's typing without spawning a duplicate socket inside the editor.
        collaborator={collab.you ? { name: collab.you.name, color: collab.you.color } : undefined}
      />
    );
  }, [api$, collab.you]);

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

      // Phase 32M — Group / Ungroup
      // ⌘/Ctrl + G        → group selection
      // ⌘/Ctrl + ⇧ + G    → ungroup
      if (meta && e.key.toLowerCase() === 'g') {
        e.preventDefault();
        if (e.shiftKey) handleUngroupSelection();
        else            handleGroupSelection();
        return;
      }

      // Phase 32A — Select similar
      // ⌘/Ctrl + ⇧ + A    → select all elements of the same type as the first selected
      if (meta && e.shiftKey && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        if (selectedIds.length > 0) {
          setSelectedIds(selectSimilar(api$.elements, selectedIds));
        }
        return;
      }

      // Phase 32M — Copy / paste
      // ⌘/Ctrl + C → copy selection geometry/content (in-memory only)
      // ⌘/Ctrl + V → paste — creates new elements offset by (2%, 2%)
      if (meta && e.key.toLowerCase() === 'c' && selectedIds.length > 0) {
        e.preventDefault();
        clipboardRef.current = api$.elements
          .filter((el) => selectedIds.includes(el.id))
          .map((el) => ({ ...el }));
        return;
      }
      if (meta && e.key.toLowerCase() === 'v' && clipboardRef.current && clipboardRef.current.length > 0) {
        e.preventDefault();
        (async () => {
          const newIds: string[] = [];
          for (const src of clipboardRef.current!) {
            // duplicateElement is the simplest path to a server-side clone with
            // a new id + offset, which mirrors how ⌘D already works.
            const dup = await api$.duplicateElement(src.id);
            if (dup) newIds.push(dup.id);
          }
          if (newIds.length > 0) setSelectedIds(newIds);
          history.commit(apiRef.current.elements);
        })();
        return;
      }

      // Phase 32M — Bring forward / send back via ⌘+] / ⌘+[
      if (meta && (e.key === ']' || e.key === '[')) {
        if (selectedIds.length === 0) return;
        e.preventDefault();
        const delta = e.key === ']' ? 1 : -1;
        const updates = selectedIds.flatMap((id) => {
          const el = api$.elements.find((x) => x.id === id);
          if (!el) return [];
          return [{ id, patch: { zIndex: (el.zIndex ?? 0) + delta } }];
        });
        api$.updateMany(updates);
        history.commit(apiRef.current.elements);
        return;
      }

      // Phase 36E — bare `c` toggles comment creation mode (only when no
      // modifier; ⌘C above already handled the copy path).
      if (!meta && !e.shiftKey && !e.altKey && e.key.toLowerCase() === 'c' && !editingId) {
        if (preview.isPreviewing) return;  // editing affordances suppressed
        e.preventDefault();
        setCommentMode((v) => !v);
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
    // The handlers (handleDuplicateSelected / handleGroupSelection /
    // handleUngroupSelection) are declared *below* this effect, but the
    // closure resolves them at fire time. They depend on selectedIds, which
    // is already in deps, so the effect re-attaches the listener whenever
    // the selection changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ── Phase 26.5 / 26.6 — Deck-level narrative plan ─────────────────────────
  // Load elements for every slide in the deck so the narrative engine can
  // analyse the full deck. The current slide's elements come from api$ (live,
  // includes in-progress edits); other slides come from a per-slide fetch
  // cached in useDeckElements.
  const deckElements = useDeckElements(deckSlides.slides);
  const compositionFamilyId = (slide?.metadata as any)?.appliedTemplateId || null;

  // Fix 2 — when the user navigates to a different slide we already have
  // cached, re-fetch in case it was edited elsewhere (another tab/session
  // or a sibling editor instance).
  const lastRefreshedSlide = useRef<string | null>(null);
  useEffect(() => {
    if (!slideId) return;
    if (lastRefreshedSlide.current === slideId) return;
    lastRefreshedSlide.current = slideId;
    if (slideId in deckElements.byId) {
      // Re-fetch in background; the live api$.elements still drive the active
      // slide so this is purely about correcting other-slide staleness.
      void deckElements.refresh(slideId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideId]);

  // Fix 3 — debounce active-slide element changes by 350ms so analyzeDeck
  // doesn't re-run on every keystroke. The active slide still renders
  // immediately (it reads api$.elements directly through SlideCanvas);
  // only the deck-plan view of it lags behind by a third of a second.
  const [debouncedActiveElements, setDebouncedActiveElements] = useState<SlideElementDTO[]>(api$.elements);
  useEffect(() => {
    const handle = setTimeout(() => setDebouncedActiveElements(api$.elements), 350);
    return () => clearTimeout(handle);
  }, [api$.elements]);

  const deckSlideInputs: DeckSlideInput[] = useMemo(() => {
    return deckSlides.slides.map((s) => {
      const elements = s.id === slideId
        ? debouncedActiveElements
        : (deckElements.byId[s.id] || []);
      return { slideType: s.type, title: s.title, elements };
    });
  }, [deckSlides.slides, slideId, debouncedActiveElements, deckElements.byId]);

  const deckPlan = useDeckPlan(deckSlideInputs, compositionFamilyId || undefined);

  // Dev-mode console log when the deck plan changes
  useEffect(() => {
    if (deckPlan.slides.length > 0 && deckElements.ready) logDeckPlan(deckPlan);
  }, [deckPlan, deckElements.ready]);

  const currentSlideContext = slideIdx >= 0 ? deckPlan.slides[slideIdx] : undefined;

  // ── Save status pill ──────────────────────────────────────────────────────
  const SaveStatus = () => {
    if (api$.saveStatus === 'saving')
      return <span className="text-xs text-[#9A9A9A] flex items-center gap-1.5"><Loader2 className="w-3 h-3 animate-spin" />Saving…</span>;
    if (api$.saveStatus === 'error')
      return <span className="text-xs text-[#9a3737] flex items-center gap-1.5"><AlertCircle className="w-3 h-3" />Save failed</span>;
    if (api$.saveStatus === 'dirty')
      return <span className="text-xs text-[#8c6210] flex items-center gap-1.5"><Save className="w-3 h-3" />Unsaved changes</span>;
    return <span className="text-xs text-[#355846] flex items-center gap-1.5"><CheckCircle2 className="w-3 h-3" />Saved</span>;
  };

  if (loadingSlide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F0EC]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F7563]" />
      </div>
    );
  }
  if (!slide) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F1F0EC] flex-col gap-3">
        <p className="text-[#111111]">Slide not found.</p>
        <Link href={`/projects/${projectId}`} className="text-sm text-[#355846] hover:underline">← Back to project</Link>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#F1F0EC] overflow-hidden">
      {/* ── Top toolbar ───────────────────────────────────────────────────── */}
      <header className="bg-white border-b border-[#E3E1DA] px-4 h-12 flex items-center gap-3 shadow-sm flex-shrink-0">
        <Link href={`/projects/${projectId}`} className="flex items-center gap-1.5 text-sm text-[#6B6B6B] hover:text-[#111111]">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
        <div className="h-5 w-px bg-[#E3E1DA]" />
        {/* Phase 39.1A — workspace switcher (read-only here; no create modal slot) */}
        <WorkspaceSwitcher settingsHref={(id) => `/workspaces/${id}/settings`} />
        <div className="h-5 w-px bg-[#E3E1DA]" />
        <div className="flex items-center gap-1.5 text-sm font-semibold text-[#111111] truncate max-w-xs">
          {slide.title}
        </div>
        <span className="text-[11px] text-[#C9C6BD] font-mono uppercase">{slide.type}</span>

        {/* Slide nav */}
        <div className="ml-3 flex items-center gap-1">
          <button
            disabled={!prevSlide}
            onClick={() => prevSlide && gotoSlide(prevSlide.id)}
            className="p-1 rounded text-[#6B6B6B] hover:bg-[#F1F0EC] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Previous slide"
          >
            <MoveLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#9A9A9A] w-16 text-center">
            {slideIdx >= 0 ? `${slideIdx + 1} / ${slidesForRender.length}` : '—'}
          </span>
          <button
            disabled={!nextSlide}
            onClick={() => nextSlide && gotoSlide(nextSlide.id)}
            className="p-1 rounded text-[#6B6B6B] hover:bg-[#F1F0EC] disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="Next slide"
          >
            <MoveRight className="w-4 h-4" />
          </button>
        </div>

        <div className="h-5 w-px bg-[#E3E1DA]" />

        {/* Template gallery */}
        <DisabledWhilePreviewing disabled={editingDisabled}>
          <button
            type="button"
            onClick={() => setTemplateGalleryOpen(true)}
            title="Browse templates"
            className="h-7 px-2.5 bg-white border border-[#E3E1DA] hover:border-green-400 hover:bg-[#EEF5F1] text-[#111111] text-xs font-semibold rounded flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#4F7563]" />
            {appliedTemplate ? appliedTemplate.name : 'Templates'}
          </button>
        </DisabledWhilePreviewing>

        {/* Phase 37.3C — Choose Brand Kit (canonical picker, apply mode) */}
        {slide?.deckId && (
          <DisabledWhilePreviewing disabled={editingDisabled}>
            <BrandKitPicker
              mode="apply"
              deckId={slide.deckId}
              value={deckBrand.brandKitId}
              compact
              onApplied={async (newKitId) => {
                // Apply call already wrote brandKitId server-side; if the user
                // cleared, we PATCH /decks/:id with brandKitId=null.
                if (newKitId === null) {
                  try { await api.patch(`/decks/${slide.deckId}`, { brandKitId: null }); }
                  catch { /* surfaced by picker alert */ }
                }
                deckBrand.refresh();
                deckSlides.refresh?.();
              }}
            />
          </DisabledWhilePreviewing>
        )}

        {/* Layout switcher */}
        <DisabledWhilePreviewing disabled={editingDisabled}>
          <LayoutSwitcher
            currentLayoutId={appliedLayoutId}
            onPick={handleApplyLayout}
          />
        </DisabledWhilePreviewing>

        <div className="h-5 w-px bg-[#E3E1DA]" />

        {/* Insert menu */}
        <DisabledWhilePreviewing disabled={editingDisabled}>
          <InsertMenu onInsert={handleInsertElement} />
        </DisabledWhilePreviewing>

        <div className="h-5 w-px bg-[#E3E1DA]" />

        {/* Smart tools (Phase 15): tidy, group, overflow stats */}
        <DisabledWhilePreviewing disabled={editingDisabled}>
          <SmartTools
            elements={api$.elements}
            selectedIds={selectedIds}
            overflowCount={overflowCount}
            onGroup={handleGroupSelection}
            onUngroup={handleUngroupSelection}
            onTidy={handleTidySlide}
          />
        </DisabledWhilePreviewing>

        <div className="h-5 w-px bg-[#E3E1DA]" />

        {/* Undo / redo */}
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => history.undo()}
            disabled={!history.canUndo || editingDisabled}
            title={editingDisabled ? editDisableTip : 'Undo (⌘Z)'}
            className="w-7 h-6 flex items-center justify-center rounded text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => history.redo()}
            disabled={!history.canRedo || editingDisabled}
            title={editingDisabled ? editDisableTip : 'Redo (⌘⇧Z)'}
            className="w-7 h-6 flex items-center justify-center rounded text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="h-5 w-px bg-[#E3E1DA]" />

        {/* Align */}
        <DisabledWhilePreviewing disabled={editingDisabled}>
          <AlignTools
            selected={api$.elements.filter((e) => selectedIds.includes(e.id))}
            onUpdateMany={(u) => { api$.updateMany(u); history.commit(apiRef.current.elements); }}
          />
        </DisabledWhilePreviewing>

        <div className="h-5 w-px bg-[#E3E1DA]" />

        {/* Arrange */}
        <DisabledWhilePreviewing disabled={editingDisabled}>
          <ArrangeTools
            allElements={api$.elements}
            selected={api$.elements.filter((e) => selectedIds.includes(e.id))}
            onUpdateMany={(u) => { api$.updateMany(u); history.commit(apiRef.current.elements); }}
          />
        </DisabledWhilePreviewing>

        <div className="ml-auto flex items-center gap-3">
          <SaveStatus />

          <div className="h-5 w-px bg-[#E3E1DA]" />

          <button
            onClick={() => setZoom((z) => Math.max(0.3, +(z - 0.1).toFixed(2)))}
            className="p-1 rounded text-[#6B6B6B] hover:bg-[#F1F0EC]"
            aria-label="Zoom out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#9A9A9A] w-10 text-center">{Math.round(zoom * 100)}%</span>
          <button
            onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}
            className="p-1 rounded text-[#6B6B6B] hover:bg-[#F1F0EC]"
            aria-label="Zoom in"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          <div className="h-5 w-px bg-[#E3E1DA]" />

          <button
            disabled={selectedIds.length === 0 || editingDisabled}
            onClick={handleDuplicateSelected}
            title={editingDisabled ? editDisableTip : 'Duplicate (Cmd/Ctrl+D)'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#111111] hover:bg-[#F1F0EC] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Copy className="w-3.5 h-3.5" />
            Duplicate
          </button>
          <button
            disabled={selectedIds.length === 0 || editingDisabled}
            onClick={handleDeleteSelected}
            title={editingDisabled ? editDisableTip : 'Delete (Del)'}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold text-[#7a2929] hover:bg-[#FCF1F1] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Delete
          </button>

          <button
            type="button"
            onClick={() => { setLayersOpen((v) => !v); if (!layersOpen) setCommentsOpen(false); }}
            title="Layers panel"
            className={`relative h-7 px-2.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
              layersOpen
                ? 'bg-[#EEF5F1] text-[#355846] border border-[#A8B9AE]'
                : 'bg-white border border-[#E3E1DA] hover:border-[#A8B9AE] hover:bg-[#EEF5F1] text-[#111111]'
            }`}
          >
            <LayersIcon className="w-3.5 h-3.5 text-[#4F7563]" />
            Layers
          </button>

          {slide?.deckId && (
            <>
              <div className="h-5 w-px bg-[#E3E1DA]" />
              <button
                type="button"
                onClick={() => { setCommentsOpen((v) => !v); if (!commentsOpen) setLayersOpen(false); }}
                title="Comments"
                className={`relative h-7 px-2.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors ${
                  commentsOpen
                    ? 'bg-[#EEF5F1] text-[#355846] border border-[#A8B9AE]'
                    : 'bg-white border border-[#E3E1DA] hover:border-green-400 hover:bg-[#EEF5F1] text-[#111111]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#4F7563]" />
                Comments
                {totalOpenComments > 0 && (
                  <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-1 rounded-full bg-[#D9A441] text-white text-[9px] font-bold ring-2 ring-white">
                    {totalOpenComments}
                  </span>
                )}
              </button>
              {/* Phase 36E — comment creation mode toggle */}
              <button
                type="button"
                onClick={() => setCommentMode((v) => !v)}
                disabled={preview.isPreviewing}
                title={preview.isPreviewing
                  ? PREVIEW_DISABLE_TIP
                  : commentMode ? 'Exit comment mode (Esc)' : 'Add comment to slide or element (C)'}
                className={`relative h-7 px-2.5 text-xs font-semibold rounded flex items-center gap-1.5 transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                  commentMode
                    ? 'bg-[#D9A441] text-white border border-amber-600 hover:bg-amber-600'
                    : 'bg-white border border-[#E3E1DA] hover:border-amber-400 hover:bg-[#FAEEDB] text-[#111111]'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {commentMode ? 'Click to place' : 'Comment'}
              </button>
              <button
                type="button"
                onClick={() => setPresenterOpen(true)}
                disabled={deckSlides.slides.length === 0}
                title="Present (P)"
                className="h-7 px-2.5 bg-white border border-[#E3E1DA] hover:border-green-400 hover:bg-[#EEF5F1] text-[#111111] text-xs font-semibold rounded flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Play className="w-3.5 h-3.5 text-[#4F7563] fill-green-600" />
                Present
              </button>
              {/* Phase 35 — version history badge opens the panel drawer. */}
              <DeckVersionBadge
                versions={versionHistory.versions}
                onClick={() => setVersionPanelOpen((v) => !v)}
              />
              {/* Phase 36I — review status badge; click opens Request Review modal. */}
              <ReviewStatusBadge
                status={reviews.status}
                onClick={() => setReviewModalOpen(true)}
              />
              {/* Phase 36.1F — Reviews dashboard toggle (assigned-to-me / by-me / by-status). */}
              <button
                type="button"
                onClick={() => {
                  setReviewDashboardOpen((v) => !v);
                  if (!reviewDashboardOpen) { setCommentsOpen(false); setLayersOpen(false); setCollaborationPanelOpen(false); }
                }}
                title="Review queue"
                className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                  reviewDashboardOpen
                    ? 'bg-[#DDE8E1] text-[#355846] border border-[#A8B9AE]'
                    : 'text-[#6B6B6B] hover:bg-[#F1F0EC]'
                }`}
                aria-label="Review queue"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
              {/* Phase 34C — live presence avatars + panel toggle */}
              <PresenceAvatars users={Object.values(collab.users)} you={collab.you} />
              <button
                type="button"
                onClick={() => {
                  setCollaborationPanelOpen((v) => !v);
                  if (!collaborationPanelOpen) { setCommentsOpen(false); setLayersOpen(false); setReviewDashboardOpen(false); }
                }}
                title="Collaboration"
                aria-label="Collaboration panel"
                className={`h-7 w-7 flex items-center justify-center rounded transition-colors ${
                  collaborationPanelOpen
                    ? 'bg-[#DDE8E1] text-[#355846] border border-[#A8B9AE]'
                    : 'text-[#6B6B6B] hover:bg-[#F1F0EC]'
                }`}
              >
                <UsersIcon className="w-3.5 h-3.5" />
              </button>
              <ExportMenu deckId={slide.deckId} deckTitle={slide.title} />
              <button
                type="button"
                onClick={() => setShortcutsOpen(true)}
                title="Keyboard shortcuts (⌘/)"
                aria-label="Keyboard shortcuts"
                className="h-7 w-7 flex items-center justify-center rounded text-[#6B6B6B] hover:bg-[#F1F0EC] hover:text-[#111111]"
              >
                <Keyboard className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </header>

      {/* Phase 35 — Preview banner. Sticks above the editor body whenever
          the user is viewing a historical version. Mutation hooks are
          already blocked during preview by the chokepoint guards (35.1A). */}
      {preview.isPreviewing && preview.meta && (
        <VersionPreviewBanner
          meta={preview.meta}
          onRestore={async () => {
            if (!preview.versionId) return;
            await versionHistory.restore(preview.versionId);
            preview.exit();
          }}
          onExit={preview.exit}
        />
      )}

      {/* Phase 34O/P — connection-state banner. Shown only when the
          collaboration socket is reconnecting / disconnected / forbidden. */}
      <ConnectionBanner state={collab.state} />

      {/* Phase 36.1B — Reviewer banner. Shown when the current user is the
          assigned reviewer on the active request. Carries Approve / Request
          Changes / Reopen actions; edit affordances elsewhere are already
          suppressed via `editingDisabled`. */}
      {isReviewerMode && reviews.activeRequest && (
        <ReviewerBanner
          request={reviews.activeRequest}
          onOpen={async () => { if (reviews.activeRequest) await reviews.open(reviews.activeRequest.id); }}
          onApprove={async () => { if (reviews.activeRequest) await reviews.approve(reviews.activeRequest.id); }}
          onRequestChanges={async () => { if (reviews.activeRequest) await reviews.requestChanges(reviews.activeRequest.id); }}
          onReopen={async () => { if (reviews.activeRequest) await reviews.reopen(reviews.activeRequest.id); }}
        />
      )}

      {/* ── Sidebar + Stage + Inspector ───────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left sidebar — sectioned + virtualized + multi-select (Phase 32F/G/L) */}
        <SectionedSidebar
          // Phase 35-final-B — sidebarApi swaps slides for snapshot during preview;
          // readOnly suppresses add/delete/bulk affordances.
          api={sidebarApi}
          currentSlideId={slideId}
          onNavigate={gotoSlide}
          onCurrentDeleted={handleCurrentDeleted}
          onTitleRename={async (id, newTitle) => {
            await api.patch(`/slides/${id}`, { title: newTitle });
            if (id === slideId) setSlide((prev) => prev ? { ...prev, title: newTitle } : prev);
          }}
          deckMetadata={deckMetadata}
          onPatchDeckMetadata={handlePatchDeckMetadata}
          readOnly={editingDisabled}
        />
        <div className="flex-1 overflow-auto flex items-center justify-center p-8 relative">
          {api$.loading ? (
            <Loader2 className="w-8 h-8 animate-spin text-[#4F7563]" />
          ) : api$.error ? (
            <div className="text-[#9a3737] flex items-center gap-2">
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
              totalPages={slidesForRender.length || undefined}
              zoom={zoom}
              editingId={editingId}
              onRequestEdit={(id) => { setSelectedIds([id]); setEditingId(id); }}
              renderEditor={renderInlineEditor}
              background={slide?.background || null}
              themeTokens={slide?.themeTokens || null}
              slideType={(slide as any)?.type || undefined}
              slideIndex={slideIdx >= 0 ? slideIdx : 0}
              compositionFamilyId={compositionFamilyId}
              deckContext={currentSlideContext}
              // Phase 35-final-B Task 3 — pointer-events-disabled overlay
              // makes the canvas visually inert during preview.
              readOnly={editingDisabled}
            />
          )}

          {/* Floating formatting toolbar follows the editing element.
              Phase 35.1C Task 2 — suppress during Version History preview
              so the historical version has zero editing affordances. */}
          {editingId && !editingDisabled && (
            <FloatingToolbar
              editor={activeEditor}
              element={api$.elements.find((e) => e.id === editingId) || null}
              anchorRect={anchorRect}
              onStyleChange={(patch) => handleStyleChange(editingId, patch)}
            />
          )}

          {/* Phase 26.5 — Narrative debug panel (dev-only) */}
          <NarrativeDebugPanel plan={deckPlan} currentContext={currentSlideContext} ready={deckElements.ready} />

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

          {/* Phase 36D — Slide-level comment pins at (anchorX, anchorY).
              Numbered + amber for open, slate for resolved. Click opens the
              Comments panel (slide-scope) and clears any element filter so
              the matching thread is visible at the top of the unresolved list. */}
          <CommentPinLayer
            comments={slideComments.comments}
            showResolved={false}
            onOpenThread={() => {
              setCommentsFocusElementId(null);
              setCommentsOpen(true);
            }}
          />

          {/* Phase 36E — comment creation mode overlay. Mounts above the
              canvas when active; captures clicks and hit-tests elements to
              produce slide-level (anchorX/Y) or element-attached comments. */}
          <CommentModeOverlay
            active={commentMode && !preview.isPreviewing}
            elements={api$.elements}
            onCancel={() => setCommentMode(false)}
            onSubmit={async (input) => {
              await slideComments.addComment(input);
            }}
          />

          {/* Phase 34D/E — live cursors + selections from remote collaborators.
              Coordinates are 0..100% of the stage; the host wrapper shares the
              same coordinate space with SlideCanvas. */}
          <CursorOverlay cursors={collab.cursors} slideId={slideId} />
          <SelectionOverlay
            selections={collab.selections}
            slideId={slideId}
            elements={api$.elements}
          />
          {/* Phase 34.1C/H — "John editing" pill over actively-edited elements */}
          <EditingAwarenessOverlay
            editing={collab.editing}
            slideId={slideId}
            elements={api$.elements}
          />

          {/* Phase 34D — capture mouse position over the stage and emit at
              ~60fps. We piggyback on the existing inset-0 capture container. */}
          <CollaborationCursorEmitter
            slideId={slideId}
            sendCursor={collab.sendCursor}
            connected={collab.state === 'connected'}
          />

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
                <span className="absolute -top-5 left-0 text-[10px] font-bold text-[#355846] bg-[#EEF5F1] border border-[#DDE8E1] rounded px-1.5 py-0.5">
                  Group · {members.length}
                </span>
              </div>
            );
          })()}
        </div>

        {/* Right rail — Collaboration | Reviews | Comments | Layers | Inspector (mutually exclusive) */}
        {collaborationPanelOpen && slide?.deckId ? (
          <CollaborationPanel
            users={Object.values(collab.users)}
            you={collab.you}
            selections={collab.selections}
            state={collab.state}
            slideTitleById={Object.fromEntries(slidesForRender.map((s) => [s.id, s.title]))}
            onClose={() => setCollaborationPanelOpen(false)}
          />
        ) : reviewDashboardOpen && slide?.deckId ? (
          <ReviewDashboardPanel
            deckId={slide.deckId}
            requests={reviews.requests}
            currentUserId={currentUserId || undefined}
            onClose={() => setReviewDashboardOpen(false)}
          />
        ) : commentsOpen && slide?.deckId ? (
          <CommentsPanel
            projectId={projectId}
            slideId={slideId}
            slideTitle={slide.title}
            elements={api$.elements}
            focusedElementId={commentsFocusElementId}
            onClose={() => { setCommentsOpen(false); setCommentsFocusElementId(null); }}
            currentUserId={currentUserId || undefined}
            reviewerMode={isReviewerMode}
          />
        ) : layersOpen ? (
          <aside className="w-[280px] flex-shrink-0 bg-white border-l border-[#E3E1DA] flex flex-col h-full">
            <LayersPanel
              elements={api$.elements}
              selectedIds={selectedIds}
              onSelect={(ids) => handleSelectIds(ids)}
              onPatch={(updates) => {
                api$.updateMany(updates);
                history.commit(apiRef.current.elements);
              }}
            />
          </aside>
        ) : (
          <Inspector
            elements={api$.elements}
            selectedIds={selectedIds}
            onPatchElement={(id, patch) => api$.updateElement(id, patch)}
            onStyleElement={handleStyleChange}
            slide={slide}
            onPatchSlide={handlePatchSlide}
            // Phase 35-final-B Task 4 — replace inspector with a lock pane
            // during preview so editable controls are visually absent.
            readOnly={editingDisabled}
            readOnlyContext={preview.meta ? {
              label: preview.meta.name,
              timestamp: new Date(preview.meta.createdAt).toLocaleString(),
            } : null}
          />
        )}
      </div>

      {/* ── Bottom info bar ────────────────────────────────────────────── */}
      <footer className="bg-white border-t border-[#E3E1DA] px-4 h-9 flex items-center gap-4 text-[11px] text-[#9A9A9A] flex-shrink-0">
        <span>{api$.elements.length} elements</span>
        {selectedIds.length > 0 && (
          <span className="text-[#355846] font-semibold">
            {selectedIds.length} selected
          </span>
        )}
        <span className="ml-auto flex items-center gap-3">
          <kbd className="px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px]">←↑↓→</kbd> nudge
          <kbd className="px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px]">⌘C/V</kbd> copy/paste
          <kbd className="px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px]">⌘G</kbd> group
          <kbd className="px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px]">⌘D</kbd> duplicate
          <kbd className="px-1.5 py-0.5 bg-[#F1F0EC] border border-[#E3E1DA] rounded text-[10px]">⌘/</kbd> shortcuts
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

      {/* Phase 35 — Version History drawer. Triggered by the toolbar badge.
          Mounted at the editor root so it overlays the inspector. */}
      {versionPanelOpen && slide?.deckId && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/10"
            onClick={() => setVersionPanelOpen(false)}
          />
          <aside className="fixed right-0 top-0 bottom-0 z-50 w-80 bg-white border-l border-[#E3E1DA] shadow-xl flex flex-col">
            <div className="flex items-center justify-between px-3 h-10 border-b border-[#E3E1DA]">
              <span className="text-xs font-semibold text-[#111111]">Version history</span>
              <button
                type="button"
                onClick={() => setVersionPanelOpen(false)}
                className="text-[#9A9A9A] hover:text-[#111111] text-lg leading-none"
                aria-label="Close version history"
              >
                ×
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <VersionHistoryPanel
                deckId={slide.deckId}
                onPreview={(versionId) => {
                  preview.enter(versionId);
                  setVersionPanelOpen(false);
                }}
                onRestored={() => {
                  // Phase Ω.1 — local-user restore needs to reload elements
                  // + sidebar; remote-user restore is handled via collab.onVersion.
                  try { api$.refresh?.(); } catch { /* ignore */ }
                  try { deckSlides.refresh?.(); } catch { /* ignore */ }
                }}
              />
            </div>
          </aside>
        </>
      )}

      {/* Presenter mode overlay (Phase 13) */}
      {presenterOpen && deckSlides.slides.length > 0 && (
        <PresenterMode
          slides={deckSlides.slides}
          initialSlideId={slideId}
          onClose={() => setPresenterOpen(false)}
        />
      )}

      {/* Phase 36H — Request Review modal. Source-of-truth status comes from
          useDeckReviews; submit/withdraw also route through the hook so the
          toolbar badge updates immediately on transition. */}
      <RequestReviewModal
        open={reviewModalOpen}
        status={reviews.status}
        onClose={() => setReviewModalOpen(false)}
        onSubmit={(input) => reviews.create(input)}
        onWithdraw={(id) => reviews.withdraw(id)}
      />

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
  // Phase 35 — VersionPreviewProvider wraps the boundary so every descendant
  // (canvas, sidebar, inspector, mutation hooks) shares the same preview
  // state and read-only enforcement.
  <VersionPreviewProvider>
    <EditorErrorBoundary contextLabel={`slide ${props.slideId}`}>
      <SlideEditorInner {...props} />
    </EditorErrorBoundary>
  </VersionPreviewProvider>
);
export default SlideEditorWithBoundary;
