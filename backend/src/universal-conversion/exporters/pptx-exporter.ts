import { exportDeckToPptx } from '../../slide-export/element-pptx-exporter';
import type { RenderDeckInput, RenderSlideInput } from '../../slide-export/render-types';
import { UniversalDocument, DocumentNode } from '../document-model';

// =============================================================================
//  Phase 41H + 41I — UniversalDocument → PPTX exporter.
//
//  Maps each UDM PageNode onto a slide using the same render input shape
//  the Phase 38 export pipeline already understands. Heading/paragraph
//  nodes flow into individual text frames stacked vertically; lists become
//  bullet-list frames; tables and charts get full-element treatment with
//  proper geometry; images become image elements.
//
//  Layout strategy is intentionally simple (one column, top-down stack)
//  because Document → Presentation auto-layout is a creative-AI problem,
//  not a fidelity problem. Users tweak in the editor afterwards.
// =============================================================================

export async function exportPptx(doc: UniversalDocument): Promise<Buffer> {
  // Phase Ω.1 — derive themeTokens from doc.theme (populated by
  // applyBrandKit when a brandKitId is supplied) so the PPTX inherits
  // brand colors/fonts. Otherwise the deck falls back to the renderer's
  // built-in defaults.
  const themeTokens = buildThemeTokens(doc);

  const slides: RenderSlideInput[] = doc.pages
    .flatMap((page, idx) =>
      buildSlidesForPage(page.nodes, {
        pageIdx: idx,
        title: page.title,
        background: page.background as any,
        themeTokens,
        speakerNotes: page.notes ?? null,
      }),
    )
    .map((slide, index, all) => ({ ...slide, index, total: all.length }));

  const input: RenderDeckInput = {
    title: doc.metadata.title,
    slides,
  };
  return exportDeckToPptx(input);
}

function buildThemeTokens(doc: UniversalDocument): any {
  const t = doc.theme;
  if (!t || (!t.colors && !t.fonts)) return null;
  return {
    colors: {
      primary: t.colors?.primary || '#0F172A',
      secondary: t.colors?.secondary || '#64748B',
      accent: t.colors?.accent || '#2563EB',
      text: t.colors?.text || '#1F2937',
      background: t.colors?.background || '#FFFFFF',
    },
    fonts: {
      heading: t.fonts?.heading || 'Inter',
      body: t.fonts?.body || 'Inter',
    },
  };
}

function buildSlidesForPage(
  nodes: DocumentNode[],
  ctx: {
    pageIdx: number;
    title?: string;
    background?: any;
    themeTokens?: any | null;
    speakerNotes?: string | null;
  },
): RenderSlideInput[] {
  const slides: RenderSlideInput[] = [];
  let elements: any[] = [];
  let y = 8;
  let slidePart = 0;
  let order = 0;

  // Phase Ω.1 — derive per-element style overrides from theme so brand
  // colors apply even when the per-slide renderer doesn't consume
  // themeTokens (some downstream paths only read element.style).
  const headingStyle: any =
    ctx.themeTokens?.colors?.primary || ctx.themeTokens?.fonts?.heading
      ? {
          color: ctx.themeTokens.colors?.primary,
          fontFamily: ctx.themeTokens.fonts?.heading,
        }
      : null;
  const bodyStyle: any =
    ctx.themeTokens?.colors?.text || ctx.themeTokens?.fonts?.body
      ? {
          color: ctx.themeTokens.colors?.text,
          fontFamily: ctx.themeTokens.fonts?.body,
        }
      : null;

  // Track if there's a title heading; if so, give it the top row.
  const firstHeading = nodes.find((n) => n.type === 'heading');
  const pushSlide = () => {
    if (!elements.length) return;
    const title =
      slidePart > 0 ? `${stripContinuation(ctx.title || 'Content')} (continued)` : ctx.title;
    slides.push({
      index: 0,
      total: 0,
      title,
      background: ctx.background,
      themeTokens: ctx.themeTokens,
      elements,
      speakerNotes: slidePart === 0 ? (ctx.speakerNotes ?? null) : null,
      transition: null,
    });
    slidePart++;
    elements = [];
    y = 8;
    order = 0;
  };

  for (const node of nodes) {
    const plannedHeight = estimateNodeHeight(node);
    if (y + plannedHeight > 92 && elements.length > 0) pushSlide();

    const id = `udm-${ctx.pageIdx}-${slidePart}-${order}`;
    const slideId = `s-${ctx.pageIdx}-${slidePart}`;
    switch (node.type) {
      case 'heading': {
        const isTitle = node === firstHeading;
        const h = isTitle ? 12 : Math.max(6, 8 - (node.level || 2));
        elements.push(
          mkText(
            id,
            slideId,
            isTitle ? 'heading' : 'subheading',
            node.text || '',
            node.runs,
            5,
            y,
            90,
            h,
            headingStyle,
          ),
        );
        y += h + 2;
        break;
      }
      case 'paragraph': {
        const h = Math.max(8, Math.min(20, estimateTextHeight(node.text || '', 90)));
        elements.push(
          mkText(id, slideId, 'paragraph', node.text || '', node.runs, 5, y, 90, h, bodyStyle),
        );
        y += h + 1;
        break;
      }
      case 'list': {
        const items = (Array.isArray(node.items) ? node.items : []).map((i: any) =>
          typeof i === 'string' ? i : i.text,
        );
        const text = items.map((i: string) => `• ${i}`).join('\n');
        const h = Math.max(10, Math.min(60, items.length * 4));
        elements.push(
          mkText(
            id,
            slideId,
            node.ordered ? 'numberedList' : 'bulletList',
            text,
            undefined,
            5,
            y,
            90,
            h,
          ),
        );
        y += h + 1;
        break;
      }
      case 'quote':
      case 'callout':
        elements.push(mkText(id, slideId, 'quote', node.text || '', undefined, 8, y, 84, 10));
        y += 11;
        break;
      case 'table': {
        const h = Math.max(15, Math.min(70, (node.rows?.length ?? 3) * 6));
        const headers = node.headerRow ? node.rows?.[0] || [] : [];
        const rows = node.headerRow ? node.rows?.slice(1) || [] : node.rows || [];
        elements.push({
          id,
          slideId,
          type: 'table',
          order: order++,
          x: 5,
          y,
          width: 90,
          height: h,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          content: { headers, rows },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        y += h + 2;
        break;
      }
      case 'chart': {
        const h = 40;
        elements.push({
          id,
          slideId,
          type: 'chart',
          order: order++,
          x: 5,
          y,
          width: 90,
          height: h,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          content: node.chart,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        y += h + 2;
        break;
      }
      case 'image': {
        const h = 30;
        elements.push({
          id,
          slideId,
          type: 'image',
          order: order++,
          x: 25,
          y,
          width: 50,
          height: h,
          rotation: 0,
          zIndex: 0,
          locked: false,
          visible: true,
          content: { src: node.src, url: node.src, alt: node.alt },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        y += h + 2;
        break;
      }
      case 'code': {
        elements.push(
          mkText(id, slideId, 'paragraph', node.text || '', undefined, 5, y, 90, 25, {
            fontFamily: 'monospace',
            fontSize: 12,
            color: '#1F2937',
            fill: '#F1F5F9',
          }),
        );
        y += 26;
        break;
      }
      default:
        if (node.text) {
          elements.push(mkText(id, slideId, 'paragraph', node.text, undefined, 5, y, 90, 8));
          y += 9;
        }
    }
    order++;
  }
  pushSlide();
  if (!slides.length) {
    slides.push({
      index: 0,
      total: 0,
      title: ctx.title,
      background: ctx.background,
      themeTokens: ctx.themeTokens,
      elements: [],
      speakerNotes: ctx.speakerNotes ?? null,
      transition: null,
    });
  }
  return slides;
}

function mkText(
  id: string,
  slideId: string,
  type: string,
  text: string,
  runs: any,
  x: number,
  y: number,
  w: number,
  h: number,
  style?: any,
) {
  return {
    id,
    slideId,
    type,
    order: 0,
    x,
    y,
    width: w,
    height: h,
    rotation: 0,
    zIndex: 0,
    locked: false,
    visible: true,
    content: runs && runs.length > 0 ? { text, runs } : { text },
    style: style || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function estimateNodeHeight(node: DocumentNode): number {
  switch (node.type) {
    case 'heading':
      return (node.level || 1) === 1 ? 14 : 10;
    case 'paragraph':
      return Math.max(9, Math.min(21, estimateTextHeight(node.text || '', 90) + 1));
    case 'list':
      return Math.max(11, Math.min(61, ((node.items || []) as any[]).length * 4 + 1));
    case 'quote':
    case 'callout':
      return 11;
    case 'table':
      return Math.max(17, Math.min(72, (node.rows?.length ?? 3) * 6 + 2));
    case 'chart':
      return 42;
    case 'image':
      return 32;
    case 'code':
      return 26;
    default:
      return node.text ? 9 : 0;
  }
}

function stripContinuation(title: string): string {
  return String(title || '')
    .replace(/\s*\(continued\)\s*$/i, '')
    .trim();
}

function estimateTextHeight(text: string, widthPct: number): number {
  // Very rough: assume ~70 chars per line at 14pt across 90% slide width.
  const charsPerLine = Math.max(20, widthPct * 0.78);
  const lines = Math.max(1, Math.ceil((text.length || 1) / charsPerLine));
  return Math.min(40, lines * 4);
}
