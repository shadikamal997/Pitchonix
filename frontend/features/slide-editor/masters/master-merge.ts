// =============================================================================
//  Master → Slide merge — Phase 32.75 (frontend mirror)
//
//  Mirrors backend/src/master-elements/master-merge.ts so the canvas can
//  render masters with the same geometry, token expansion, and visibility
//  rules the export pipeline uses. Keep in sync manually.
// =============================================================================

import type { SlideElementDTO, ElementType } from '@/types/slide-element';
import type {
  MasterElementDTO, MasterElementType, DeckMasterSettings,
} from '@/types/master-element';
import {
  DEFAULT_MASTER_SETTINGS, MASTER_SETTING_FOR_TYPE,
} from '@/types/master-element';

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

function defaultContent(type: MasterElementType): Record<string, any> {
  switch (type) {
    case 'pageNumber':   return { format: 'pageOfTotal' };
    case 'confidential': return { text: 'CONFIDENTIAL' };
    case 'date':         return { format: 'short' };
    case 'watermark':    return { text: 'DRAFT', opacity: 0.08 };
    default:             return {};
  }
}

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

function buildContent(m: MasterElementDTO, slideIndex: number, slideTotal: number): Record<string, any> {
  const base = (m.elementData || {}) as Record<string, any>;
  const filled = { ...defaultContent(m.type), ...base };

  if (typeof filled.text === 'string') {
    filled.text = expandTokens(filled.text, slideIndex, slideTotal);
  }

  switch (m.type) {
    case 'date':
      if (!filled.text) filled.text = formatDate(filled.format || 'short');
      return filled;
    case 'copyright':
      if (!filled.text) filled.text = `© ${new Date().getFullYear()}`;
      return filled;
    case 'companyName':
      if (!filled.text) filled.text = '';
      return filled;
    case 'pageNumber': {
      const fmt = filled.format || 'pageOfTotal';
      const page = slideIndex + 1;
      const text = fmt === 'pageOfTotal' ? `${page} / ${slideTotal}` : `${page}`;
      return { format: fmt, text };
    }
    default:
      return filled;
  }
}

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
  slideId: string;
  slideIndex: number;
  slideTotal: number;
}

export function buildMasterElementsForSlide(
  masters: MasterElementDTO[],
  ctx: MasterMergeInput,
  storedSettings?: DeckMasterSettings | null,
): SlideElementDTO[] {
  const settings = { ...DEFAULT_MASTER_SETTINGS, ...(storedSettings || {}) };
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
