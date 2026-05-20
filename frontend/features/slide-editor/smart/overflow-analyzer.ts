// =============================================================================
//  Overflow analyzer (Phase 15)
//
//  Examines each element and decides whether its content overflows its bounds.
//  Pure / synchronous — uses content-length heuristics + element type defaults
//  to estimate height, so it can run on every state change without measuring
//  the DOM. (DOM-measured overflow would be more accurate but flicker.)
//
//  The analyzer returns severity per element:
//    - 'ok'         — fits comfortably
//    - 'warn'       — within 10% of the limit
//    - 'overflow'   — content exceeds bounds
//
//  Each report carries an explanation + an auto-fix suggestion the UI can
//  apply with a click ("shrink font", "grow box", "split next slide").
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';

export type OverflowSeverity = 'ok' | 'warn' | 'overflow';

export interface OverflowSuggestion {
  kind:        'shrinkFont' | 'growHeight' | 'splitList' | 'reduceItems' | 'truncate';
  description: string;
  /** Suggested patch to apply. UI calls api.updateElement(id, patch). */
  patch?: Partial<SlideElementDTO> & { style?: any; content?: any };
}

export interface OverflowReport {
  severity:    OverflowSeverity;
  reason:      string;
  suggestions: OverflowSuggestion[];
}

// Stage is rendered at ~1280×720 px on screen. % → px assumes that resolution.
const STAGE_W = 1280;
const STAGE_H = 720;

// Default font sizes used by the canvas renderers when no `style.fontSize` is set.
const DEFAULT_FONT_SIZE: Partial<Record<string, number>> = {
  heading:    32,
  subheading: 18,
  paragraph:  14,
  caption:    11,
  label:      11,
  cta:        14,
  footer:     10,
  pageNumber: 10,
  quote:      18,
  bulletList:    14,
  numberedList:  14,
};

// =============================================================================
//  Public — analyze every element on a slide
// =============================================================================

export function analyzeSlideOverflow(elements: SlideElementDTO[]): Record<string, OverflowReport> {
  const out: Record<string, OverflowReport> = {};
  for (const el of elements) {
    const rpt = analyzeElement(el);
    if (rpt.severity !== 'ok') out[el.id] = rpt;
  }
  return out;
}

export function analyzeElement(el: SlideElementDTO): OverflowReport {
  const widthPx  = (el.width  / 100) * STAGE_W;
  const heightPx = (el.height / 100) * STAGE_H;

  switch (el.type) {
    case 'heading': case 'subheading': case 'paragraph':
    case 'caption': case 'label':      case 'footer':
    case 'quote':   case 'cta':
      return analyzeText(el, widthPx, heightPx);

    case 'bulletList': case 'numberedList':
      return analyzeList(el, widthPx, heightPx);

    case 'table':
      return analyzeTable(el, widthPx, heightPx);

    case 'pricingCard':  return analyzeCount(el, heightPx, ((el.content as any)?.tiers || []).length,    'pricing tiers',  85);
    case 'featureGrid':  return analyzeCount(el, heightPx, ((el.content as any)?.items || []).length,    'feature cards',  70);
    case 'timeline':     return analyzeCount(el, heightPx, ((el.content as any)?.items || []).length,    'timeline items', 70);
    case 'roadmap':      return analyzeCount(el, heightPx, ((el.content as any)?.phases || []).length,   'roadmap phases', 70);
    case 'teamCard':     return analyzeCount(el, heightPx, ((el.content as any)?.members || []).length,  'team members',   90);
    case 'processSteps': return analyzeCount(el, heightPx, ((el.content as any)?.steps || []).length,    'process steps',  70);
    case 'comparison':   return analyzeCount(el, heightPx, ((el.content as any)?.rows || []).length + 1, 'rows',           40);
    case 'swot':         return analyzeSwot(el, heightPx);

    default:
      return { severity: 'ok', reason: '', suggestions: [] };
  }
}

// =============================================================================
//  Text + list estimators
// =============================================================================

function analyzeText(el: SlideElementDTO, widthPx: number, heightPx: number): OverflowReport {
  const c = (el.content as any) || {};
  const text: string = (c.text || stripHtml(c.html || '') || '').trim();
  if (!text) return { severity: 'ok', reason: '', suggestions: [] };

  const fontSize = ((el.style as any)?.fontSize) || DEFAULT_FONT_SIZE[el.type] || 14;
  const lineH    = ((el.style as any)?.lineHeight) || 1.35;

  // Approximate character width ~ 0.56 × fontSize (avg for sans-serif).
  const charsPerLine = Math.max(1, Math.floor(widthPx / (fontSize * 0.56)));
  const lines        = Math.ceil(text.length / charsPerLine);
  const lineHeightPx = fontSize * lineH;
  const needed       = lines * lineHeightPx;

  const ratio = needed / heightPx;
  const severity: OverflowSeverity = ratio > 1.0 ? 'overflow' : ratio > 0.9 ? 'warn' : 'ok';
  if (severity === 'ok') return { severity: 'ok', reason: '', suggestions: [] };

  // Suggested shrink: just enough to fit, clamped to a sensible min.
  const targetFont = Math.max(8, Math.floor(fontSize / ratio));
  const overflowPct = Math.round((ratio - 1) * 100);
  const reason = severity === 'overflow'
    ? `Text overflows by ~${overflowPct}% (${lines} lines, ${text.length} chars).`
    : `Text nearly overflows (${lines} lines at ${fontSize}px).`;

  const suggestions: OverflowSuggestion[] = [];
  if (targetFont < fontSize) {
    suggestions.push({
      kind: 'shrinkFont',
      description: `Shrink font to ${targetFont}px`,
      patch: { style: { ...(el.style as any), fontSize: targetFont } },
    });
  }
  suggestions.push({
    kind: 'growHeight',
    description: `Grow box to fit (~${Math.ceil(needed)}px)`,
    patch: { height: clampPct(((needed + 8) / STAGE_H) * 100) },
  });
  return { severity, reason, suggestions };
}

function analyzeList(el: SlideElementDTO, _widthPx: number, heightPx: number): OverflowReport {
  const items: any[] = ((el.content as any)?.items || []);
  if (items.length === 0) return { severity: 'ok', reason: '', suggestions: [] };
  const fontSize = ((el.style as any)?.fontSize) || 14;
  const lineH    = ((el.style as any)?.lineHeight) || 1.5;
  const perItem  = fontSize * lineH + 4;        // gap between items
  const needed   = items.length * perItem;

  const ratio = needed / heightPx;
  const severity: OverflowSeverity = ratio > 1.0 ? 'overflow' : ratio > 0.9 ? 'warn' : 'ok';
  if (severity === 'ok') return { severity: 'ok', reason: '', suggestions: [] };

  const visibleItems = Math.max(1, Math.floor(heightPx / perItem));
  const cutItems = items.length - visibleItems;
  const reason = severity === 'overflow'
    ? `List has ${items.length} items; only ~${visibleItems} fit.`
    : `List nearly overflows (${items.length} items at ${fontSize}px).`;

  const targetFont = Math.max(9, Math.floor(fontSize / ratio));
  const suggestions: OverflowSuggestion[] = [
    {
      kind: 'shrinkFont',
      description: `Shrink font to ${targetFont}px`,
      patch: { style: { ...(el.style as any), fontSize: targetFont } },
    },
    {
      kind: 'growHeight',
      description: `Grow box to fit all ${items.length} items`,
      patch: { height: clampPct(((needed + 8) / STAGE_H) * 100) },
    },
  ];
  if (cutItems > 0) {
    suggestions.push({
      kind: 'splitList',
      description: `Keep first ${visibleItems}; move ${cutItems} to a new slide`,
      // splitList is applied by the UI via a separate dialog/action (it needs
      // to create a new slide), so no `patch` is provided here.
    });
  }
  return { severity, reason, suggestions };
}

function analyzeTable(el: SlideElementDTO, _widthPx: number, heightPx: number): OverflowReport {
  const c = (el.content as any) || {};
  const rows = (c.rows || []).length + 1;       // +1 for header
  const rowH = 24;
  const needed = rows * rowH;
  const ratio = needed / heightPx;
  const severity: OverflowSeverity = ratio > 1.0 ? 'overflow' : ratio > 0.9 ? 'warn' : 'ok';
  if (severity === 'ok') return { severity: 'ok', reason: '', suggestions: [] };
  return {
    severity,
    reason: `Table has ${rows} row${rows === 1 ? '' : 's'} — exceeds box height.`,
    suggestions: [{
      kind: 'growHeight',
      description: `Grow box to fit ${rows} rows`,
      patch: { height: clampPct(((needed + 8) / STAGE_H) * 100) },
    }],
  };
}

function analyzeCount(el: SlideElementDTO, heightPx: number, count: number, label: string, perItem: number): OverflowReport {
  if (count <= 0) return { severity: 'ok', reason: '', suggestions: [] };
  const needed = count * perItem;
  const ratio = needed / heightPx;
  const severity: OverflowSeverity = ratio > 1.0 ? 'overflow' : ratio > 0.9 ? 'warn' : 'ok';
  if (severity === 'ok') return { severity: 'ok', reason: '', suggestions: [] };
  return {
    severity,
    reason: `${count} ${label} won't fit (~${Math.ceil(needed)}px vs ${Math.floor(heightPx)}px box).`,
    suggestions: [{
      kind: 'growHeight',
      description: `Grow box to fit (~${Math.ceil(needed)}px)`,
      patch: { height: clampPct(((needed + 16) / STAGE_H) * 100) },
    }],
  };
}

function analyzeSwot(el: SlideElementDTO, heightPx: number): OverflowReport {
  const c = (el.content as any) || {};
  const max = Math.max(
    (c.strengths || []).length, (c.weaknesses || []).length,
    (c.opportunities || []).length, (c.threats || []).length,
  );
  if (max === 0) return { severity: 'ok', reason: '', suggestions: [] };
  const cellH = heightPx / 2 - 4;
  const needed = max * 16 + 24;
  const ratio = needed / cellH;
  const severity: OverflowSeverity = ratio > 1.0 ? 'overflow' : ratio > 0.9 ? 'warn' : 'ok';
  if (severity === 'ok') return { severity: 'ok', reason: '', suggestions: [] };
  return {
    severity,
    reason: `One quadrant has ${max} items — too many to display.`,
    suggestions: [{
      kind: 'growHeight',
      description: `Grow box to fit (~${Math.ceil(needed * 2)}px)`,
      patch: { height: clampPct(((needed * 2 + 24) / STAGE_H) * 100) },
    }],
  };
}

// =============================================================================
//  Helpers
// =============================================================================

function stripHtml(s: string): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
}

function clampPct(n: number): number {
  return Math.max(1, Math.min(100, +n.toFixed(4)));
}
