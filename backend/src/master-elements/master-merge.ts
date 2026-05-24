// =============================================================================
//  Master → Slide merge — Phase 32.75
//
//  Takes a deck's master elements + master settings and produces, for each
//  slide, a synthetic SlideElement list that the renderer treats exactly like
//  any other element. This is the single place where masters become visible:
//
//    - Adds masters to the front of each slide's element list (so they sit
//      below slide content by default), or to the back when sendToFront=true.
//    - Skips masters where the deck-level switch is off (showLogo=false, etc).
//    - Skips masters where the slide id is in excludedSlides.
//    - Skips masters where master.visible === false.
//    - Maps `pageNumber` master → a `pageNumber` SlideElement so the page
//      renderers' existing token-substitution kicks in.
//    - Maps `watermark` / `confidential` → a `paragraph` element with
//      reduced opacity.
//    - Translates other master types into their nearest SlideElement type
//      (logo → logo, footer → footer, etc).
//
//  Master ids are prefixed with `master:` so they can be filtered out by any
//  caller that wants to distinguish them from real slide elements.
// =============================================================================

import type { SlideElementDTO, ElementType } from '../slides/element-types';
import type {
  MasterElementDTO, MasterElementType, DeckMasterSettings,
} from './master-element-types';
import { MASTER_SETTING_FOR_TYPE } from './master-element-types';
import { mergeSettings } from './master-elements.service';

/** Translation table: master family → renderer-friendly element type. */
const TYPE_MAP: Record<MasterElementType, ElementType> = {
  logo:            'logo',
  companyName:     'paragraph',
  header:          'paragraph',
  footer:          'footer',
  pageNumber:      'pageNumber',
  date:            'paragraph',
  copyright:       'footer',
  watermark:       'paragraph',
  backgroundShape: 'shape',
  backgroundImage: 'image',
  brandBanner:     'paragraph',
  contact:         'paragraph',
  confidential:    'paragraph',
  custom:          'paragraph',
};

/**
 * For each master, what zIndex do we render it at relative to slide content?
 *
 *   - Backgrounds (shape/image) → -100 (well below everything)
 *   - Watermark / confidential  → -50  (below content, above backgrounds)
 *   - All others (logo/footer/page#/header/etc) → -10 by default, or +1000
 *     if sendToFront so they sit above slide content.
 *
 * Slide elements use their own zIndex in [0, ...], so masters always land
 * cleanly under or above without collision.
 */
function masterZIndex(m: MasterElementDTO): number {
  if (m.sendToFront) return 1000 + m.zIndex;
  switch (m.type) {
    case 'backgroundShape':
    case 'backgroundImage':
      return -100 + m.zIndex;
    case 'watermark':
    case 'confidential':
      return -50 + m.zIndex;
    default:
      return -10 + m.zIndex;
  }
}

/** Default content fillers when the user hasn't supplied any. */
function defaultContent(type: MasterElementType): Record<string, any> {
  switch (type) {
    case 'pageNumber':   return { format: 'pageOfTotal' };
    case 'confidential': return { text: 'CONFIDENTIAL' };
    case 'date':         return { format: 'short' };
    case 'watermark':    return { text: 'DRAFT', opacity: 0.08 };
    default:             return {};
  }
}

/** Build the SlideElement-shaped content payload from a master row. */
function buildContent(m: MasterElementDTO, slideIndex: number, slideTotal: number): Record<string, any> {
  const base = (m.elementData || {}) as Record<string, any>;
  const filled = { ...defaultContent(m.type), ...base };

  // Token substitution — works for any text-bearing master.
  if (typeof filled.text === 'string') {
    filled.text = expandTokens(filled.text, slideIndex, slideTotal);
  }

  switch (m.type) {
    // date — synthesise a display string at render time if not supplied
    case 'date': {
      if (!filled.text) filled.text = formatDate(filled.format || 'short');
      return filled;
    }
    case 'copyright':
      if (!filled.text) filled.text = `© ${new Date().getFullYear()}`;
      return filled;
    case 'companyName':
      if (!filled.text) filled.text = '';
      return filled;
    case 'pageNumber': {
      // The HTML renderer resolves {page}/{total} from format at render-time,
      // but the PPTX exporter has no such hook and just reads `.text`. We
      // pre-compute the substituted text here so both renderers produce the
      // same string ("3 / 50" on slide 3 of a 50-slide deck). The HTML path
      // happily ignores the extra `text` field and keeps using format-based
      // logic; the PPTX path uses `text` directly.
      const fmt = filled.format || 'pageOfTotal';
      const page = slideIndex + 1;
      const text = fmt === 'pageOfTotal' ? `${page} / ${slideTotal}` : `${page}`;
      return { format: fmt, text };
    }
    default:
      return filled;
  }
}

/** Mix master style with low opacity for watermarks. */
function buildStyle(m: MasterElementDTO): any {
  if (m.type === 'watermark') {
    const userOpacity = (m.elementData as any)?.opacity;
    return { opacity: userOpacity ?? 0.08, color: '#94a3b8', fontWeight: 700, fontSize: 72, textAlign: 'center', ...(m.style || {}) };
  }
  if (m.type === 'confidential') {
    return { opacity: 0.6, color: '#dc2626', fontWeight: 700, fontSize: 11, letterSpacing: 2, textTransform: 'uppercase', ...(m.style || {}) };
  }
  return m.style || null;
}

/**
 * Decide whether a master should be rendered on a given slide.
 *
 *   - Per-row visible flag must be true
 *   - excludedSlides must not contain the slideId
 *   - The corresponding deck-level switch (if any) must be true
 */
function isVisibleOnSlide(
  m: MasterElementDTO,
  slideId: string,
  settings: Required<DeckMasterSettings>,
): boolean {
  if (!m.visible) return false;
  if (m.excludedSlides?.includes(slideId)) return false;
  const flag = MASTER_SETTING_FOR_TYPE[m.type];
  if (flag && settings[flag] === false) return false;
  return true;
}

export interface MasterMergeInput {
  /** Stable slide id (used for excludedSlides). */
  slideId: string;
  /** 0-based index of the slide in the deck. */
  slideIndex: number;
  /** Total slides in the deck. */
  slideTotal: number;
}

/**
 * Produce the SlideElement rows that represent the masters as they should
 * appear on a specific slide.
 */
export function buildMasterElementsForSlide(
  masters: MasterElementDTO[],
  ctx: MasterMergeInput,
  storedSettings?: DeckMasterSettings | null,
): SlideElementDTO[] {
  const settings = mergeSettings(storedSettings || null);
  const now = new Date().toISOString();

  return masters
    .filter((m) => isVisibleOnSlide(m, ctx.slideId, settings))
    .map((m): SlideElementDTO => ({
      id:        `master:${m.id}:${ctx.slideId}`,
      slideId:   ctx.slideId,
      type:      TYPE_MAP[m.type],
      name:      m.name || `Master ${m.type}`,
      order:     0,
      x:         m.x,
      y:         m.y,
      width:     m.width,
      height:    m.height,
      rotation:  m.rotation,
      zIndex:    masterZIndex(m),
      locked:    true,
      visible:   true,
      content:   buildContent(m, ctx.slideIndex, ctx.slideTotal) as any,
      data:      null,
      style:     buildStyle(m),
      animations: null,
      accessibility: null,
      createdAt: now,
      updatedAt: now,
    }));
}

// =============================================================================
//  Token helpers
// =============================================================================

function expandTokens(text: string, slideIndex: number, slideTotal: number): string {
  const page = slideIndex + 1;
  return text
    .replace(/\{page\}/g, String(page))
    .replace(/\{total\}/g, String(slideTotal))
    .replace(/\{date\}/g, formatDate('short'));
}

function formatDate(format: string): string {
  const d = new Date();
  if (format === 'iso')  return d.toISOString().slice(0, 10);
  if (format === 'long') return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleDateString();
}
