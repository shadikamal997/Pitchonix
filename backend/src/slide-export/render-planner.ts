import type { SlideElementDTO, ElementStyle } from '../slides/element-types';
import type { ExportTextFit, PlannedSlideElement, RenderDeckInput, RenderPlanResult } from './render-types';

const SLIDE_W = 1280;
const SLIDE_H = 720;

const TYPOGRAPHY = {
  xs: 10,
  sm: 12,
  base: 14,
  md: 16,
  lg: 20,
  xl: 24,
  '2xl': 28,
  '3xl': 36,
  '4xl': 44,
  '5xl': 56,
  '6xl': 72,
  '7xl': 88,
  '8xl': 108,
  '9xl': 132,
} as const;

const WEIGHT = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

const LINE_HEIGHT = {
  tight: 1,
  snug: 1.12,
  normal: 1.35,
  relaxed: 1.55,
} as const;

const SAFE_AREA = {
  top: 6,
  bottom: 8,
} as const;

const SPACING = {
  2: 8,
} as const;

export type TextRole = 'heading' | 'subheading' | 'paragraph' | 'caption' | 'label' | 'footer' | 'quote' | 'cta' | 'metric';

const TYPE_STYLES: Record<TextRole, { size: number; weight: number; lineHeight: number; letterSpacing: number; maxLines?: number; minSize: number }> = {
  heading:    { size: TYPOGRAPHY['4xl'], weight: WEIGHT.bold,     lineHeight: LINE_HEIGHT.snug,    letterSpacing: -0.5, maxLines: 3, minSize: TYPOGRAPHY.xl },
  subheading: { size: TYPOGRAPHY.md,     weight: WEIGHT.semibold, lineHeight: LINE_HEIGHT.normal,  letterSpacing: 0,    maxLines: 3, minSize: TYPOGRAPHY.sm },
  paragraph:  { size: TYPOGRAPHY.base,   weight: WEIGHT.regular,  lineHeight: LINE_HEIGHT.relaxed, letterSpacing: 0,    maxLines: 8, minSize: TYPOGRAPHY.xs },
  caption:    { size: TYPOGRAPHY.xs,     weight: WEIGHT.medium,   lineHeight: LINE_HEIGHT.normal,  letterSpacing: 1,    maxLines: 3, minSize: TYPOGRAPHY.xs },
  label:      { size: TYPOGRAPHY.sm,     weight: WEIGHT.bold,     lineHeight: LINE_HEIGHT.snug,    letterSpacing: 2,    maxLines: 2, minSize: TYPOGRAPHY.xs },
  footer:     { size: TYPOGRAPHY.xs,     weight: WEIGHT.medium,   lineHeight: LINE_HEIGHT.normal,  letterSpacing: 1,    maxLines: 2, minSize: TYPOGRAPHY.xs },
  quote:      { size: TYPOGRAPHY['2xl'], weight: WEIGHT.medium,   lineHeight: LINE_HEIGHT.normal,  letterSpacing: -0.3, maxLines: 4, minSize: TYPOGRAPHY.sm },
  cta:        { size: TYPOGRAPHY.sm,     weight: WEIGHT.bold,     lineHeight: LINE_HEIGHT.snug,    letterSpacing: 2,    maxLines: 1, minSize: TYPOGRAPHY.xs },
  metric:     { size: TYPOGRAPHY['8xl'], weight: WEIGHT.black,    lineHeight: LINE_HEIGHT.tight,   letterSpacing: -3,   maxLines: 1, minSize: TYPOGRAPHY.lg },
};

export function createRenderPlan(deck: RenderDeckInput): RenderPlanResult {
  const warnings: string[] = [];
  const slides = deck.slides.map((slide) => {
    const visible = (slide.elements || [])
      .filter((e) => e.visible !== false)
      .map((el) => ({ ...el })) as PlannedSlideElement[];

    const validation = validateAndAdjust(visible);
    warnings.push(...validation.warnings.map((w) => `Slide ${slide.index + 1}: ${w}`));

    const planned = validation.elements.map((el) => {
      const fit = planTextFit(el);
      if (fit && !fit.fits) {
        warnings.push(`Slide ${slide.index + 1}: ${el.type} "${el.name || el.id}" required minimum typography and may need manual copy reduction.`);
      }
      return fit ? { ...el, exportFit: fit } : el;
    });

    return {
      ...slide,
      elements: planned,
    };
  });

  return { deck: { ...deck, slides }, warnings };
}

export function getPlannedTextFit(el: SlideElementDTO, role?: TextRole): ExportTextFit | undefined {
  const existing = (el as PlannedSlideElement).exportFit;
  if (existing) return existing;
  return role ? fitElementText(el, role) : planTextFit(el);
}

export function stripHtml(s: string): string {
  if (!s) return '';
  return s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim();
}

function validateAndAdjust(input: PlannedSlideElement[]): { elements: PlannedSlideElement[]; warnings: string[] } {
  const elements = input.map((el) => ({ ...el }));
  const warnings: string[] = [];

  const bottomLimit = 100 - SAFE_AREA.bottom;
  const rhythmGapPct = Math.max(0.8, (SPACING[2] / SLIDE_H) * 100);
  const isChrome = (type: string) => ['footer', 'pageNumber', 'logo'].includes(type);
  const isDecor = (type: string) => ['shape', 'line', 'divider'].includes(type);

  for (const el of elements) {
    const old = { x: el.x, y: el.y, width: el.width, height: el.height };
    el.x = clamp(el.x, 0, Math.max(0, 100 - el.width));
    el.y = clamp(el.y, 0, Math.max(0, 100 - el.height));

    if (!isChrome(el.type) && !isDecor(el.type)) {
      el.y = Math.max(SAFE_AREA.top, el.y);
      if (el.y + el.height > bottomLimit) {
        el.height = Math.max(2, bottomLimit - el.y);
      }
    }

    if (old.x !== el.x || old.y !== el.y || old.width !== el.width || old.height !== el.height) {
      el.exportAdjusted = true;
      warnings.push(`${el.type} "${el.name || el.id}" adjusted into safe export bounds.`);
    }

    if (isEmptyComposite(el)) {
      warnings.push(`${el.type} "${el.name || el.id}" has no content and may export as an empty card.`);
    }
  }

  const stackables = elements
    .filter((el) => !isChrome(el.type) && !isDecor(el.type))
    .sort((a, b) => (a.y - b.y) || (a.x - b.x));

  const overlapsX = (a: PlannedSlideElement, b: PlannedSlideElement) => Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x) > 0.5;
  for (let i = 1; i < stackables.length; i++) {
    const current = stackables[i];
    const blocker = stackables
      .slice(0, i)
      .filter((prev) => overlapsX(prev, current))
      .sort((a, b) => (b.y + b.height) - (a.y + a.height))[0];

    if (!blocker) continue;
    const minY = blocker.y + blocker.height + rhythmGapPct;
    if (current.y < minY) {
      current.y = minY;
      if (current.y + current.height > bottomLimit) {
        const available = bottomLimit - current.y;
        if (available >= 2) current.height = available;
        else current.y = Math.max(SAFE_AREA.top, bottomLimit - current.height);
      }
      current.exportAdjusted = true;
      warnings.push(`${current.type} "${current.name || current.id}" stacked below ${blocker.type} to prevent export overlap.`);
    }
  }

  return { elements, warnings };
}

function planTextFit(el: SlideElementDTO): ExportTextFit | undefined {
  const role = textRoleFor(el.type);
  if (!role) return undefined;
  return fitElementText(el, role);
}

function fitElementText(el: SlideElementDTO, role: TextRole): ExportTextFit {
  const style = (el.style || {}) as ElementStyle;
  const token = TYPE_STYLES[role];
  const text = textForRole(el, role);
  const maxSize = Number(style.fontSize || token.size);
  const minSize = Math.min(token.minSize, maxSize);
  const fontWeight = style.fontWeight ?? token.weight;
  const lineHeight = Number(style.lineHeight || token.lineHeight);
  const letterSpacing = Number(style.letterSpacing ?? token.letterSpacing);
  const boxWidth = Math.max(1, (el.width / 100) * SLIDE_W - horizontalPaddingFor(role));
  const boxHeight = Math.max(1, (el.height / 100) * SLIDE_H - verticalPaddingFor(role));

  let best = minSize;
  let bestLines = 1;
  for (let size = Math.floor(maxSize); size >= Math.floor(minSize); size--) {
    const lines = estimateLineCount(text, boxWidth, size, fontWeight, letterSpacing);
    const maxLineHeight = Math.min(
      boxHeight,
      token.maxLines ? token.maxLines * size * lineHeight : boxHeight,
    );
    if (lines * size * lineHeight <= maxLineHeight) {
      best = size;
      bestLines = lines;
      break;
    }
    bestLines = lines;
  }

  const finalLines = estimateLineCount(text, boxWidth, best, fontWeight, letterSpacing);
  const fits = finalLines * best * lineHeight <= Math.min(
    boxHeight,
    token.maxLines ? token.maxLines * best * lineHeight : boxHeight,
  );

  return {
    role,
    fontSize: best,
    minSize,
    maxSize,
    fontWeight,
    lineHeight,
    letterSpacing,
    maxLines: token.maxLines,
    fits,
    estimatedLines: finalLines || bestLines,
  };
}

function textRoleFor(type: string): TextRole | undefined {
  if (type === 'heading') return 'heading';
  if (type === 'subheading') return 'subheading';
  if (type === 'paragraph') return 'paragraph';
  if (type === 'caption') return 'caption';
  if (type === 'label') return 'label';
  if (type === 'footer') return 'footer';
  if (type === 'quote') return 'quote';
  if (type === 'cta') return 'cta';
  if (type === 'metric' || type === 'kpi') return 'metric';
  return undefined;
}

function textForRole(el: SlideElementDTO, role: TextRole): string {
  const content = (el.content || {}) as any;
  if (role === 'quote') return content.text || content.quote || '';
  if (role === 'metric') return `${content.value || '0'}${content.unit ? ` ${content.unit}` : ''}`;
  return stripHtml(content.html || content.text || '');
}

function estimateLineCount(text: string, widthPx: number, fontSize: number, fontWeight?: number | string, letterSpacing = 0): number {
  const normalized = (text || ' ').replace(/\s+/g, ' ').trim() || ' ';
  const weightNum = typeof fontWeight === 'number' ? fontWeight : String(fontWeight).toLowerCase() === 'bold' ? 700 : 400;
  const avgChar = fontSize * (weightNum >= 700 ? 0.57 : 0.53) + Math.max(0, letterSpacing);
  const charsPerLine = Math.max(4, Math.floor(widthPx / Math.max(1, avgChar)));
  const hardLines = normalized.split(/\n+/);
  return hardLines.reduce((sum, line) => sum + Math.max(1, Math.ceil(line.length / charsPerLine)), 0);
}

function horizontalPaddingFor(role: TextRole): number {
  if (role === 'cta') return 32;
  if (role === 'quote') return 32;
  return 0;
}

function verticalPaddingFor(role: TextRole): number {
  if (role === 'cta') return 8;
  if (role === 'quote') return 48;
  return 0;
}

function isEmptyComposite(el: SlideElementDTO): boolean {
  const c = (el.content || {}) as any;
  switch (el.type) {
    case 'teamCard': return !Array.isArray(c.members) || c.members.length === 0;
    case 'pricingCard': return !Array.isArray(c.tiers) || c.tiers.length === 0;
    case 'comparison': return !Array.isArray(c.rows) || c.rows.length === 0;
    case 'featureGrid': return !Array.isArray(c.items) || c.items.length === 0;
    case 'processSteps': return !Array.isArray(c.steps) || c.steps.length === 0;
    case 'timeline': return !Array.isArray(c.items) || c.items.length === 0;
    case 'roadmap': return !Array.isArray(c.phases) || c.phases.length === 0;
    case 'swot': return !(c.strengths?.length || c.weaknesses?.length || c.opportunities?.length || c.threats?.length);
    case 'chart': return !Array.isArray(c.series) || c.series.length === 0;
    case 'table': return !Array.isArray(c.rows) || c.rows.length === 0;
    case 'bulletList':
    case 'numberedList': return !Array.isArray(c.items) || c.items.length === 0;
    default: return false;
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
