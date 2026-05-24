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

  const slides: RenderSlideInput[] = doc.pages.map((page, idx) => ({
    index: idx,
    total: doc.pages.length,
    title: page.title,
    background: page.background as any,
    themeTokens,
    elements: buildSlideElements(page.nodes, idx, themeTokens),
    speakerNotes: page.notes ?? null,
    transition: null,
  }));

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
      primary:    t.colors?.primary    || '#0F172A',
      secondary:  t.colors?.secondary  || '#64748B',
      accent:     t.colors?.accent     || '#2563EB',
      text:       t.colors?.text       || '#1F2937',
      background: t.colors?.background || '#FFFFFF',
    },
    fonts: {
      heading: t.fonts?.heading || 'Inter',
      body:    t.fonts?.body    || 'Inter',
    },
  };
}

function buildSlideElements(nodes: DocumentNode[], pageIdx: number, theme?: any | null): any[] {
  const out: any[] = [];
  let y = 8;                                // start 8% from top
  let order = 0;

  // Phase Ω.1 — derive per-element style overrides from theme so brand
  // colors apply even when the per-slide renderer doesn't consume
  // themeTokens (some downstream paths only read element.style).
  const headingStyle: any = theme?.colors?.primary || theme?.fonts?.heading ? {
    color:      theme.colors?.primary,
    fontFamily: theme.fonts?.heading,
  } : null;
  const bodyStyle: any = theme?.colors?.text || theme?.fonts?.body ? {
    color:      theme.colors?.text,
    fontFamily: theme.fonts?.body,
  } : null;

  // Track if there's a title heading; if so, give it the top row.
  const firstHeading = nodes.find((n) => n.type === 'heading');

  for (const node of nodes) {
    const id = `udm-${pageIdx}-${order}`;
    switch (node.type) {
      case 'heading': {
        const isTitle = node === firstHeading;
        const h = isTitle ? 12 : Math.max(6, 8 - (node.level || 2));
        out.push(mkText(id, isTitle ? 'heading' : 'subheading', node.text || '', node.runs, 5, y, 90, h, headingStyle));
        y += h + 2;
        break;
      }
      case 'paragraph': {
        const h = Math.max(8, Math.min(20, estimateTextHeight(node.text || '', 90)));
        out.push(mkText(id, 'paragraph', node.text || '', node.runs, 5, y, 90, h, bodyStyle));
        y += h + 1;
        break;
      }
      case 'list': {
        const items = (Array.isArray(node.items) ? node.items : []).map((i: any) => typeof i === 'string' ? i : i.text);
        const text = items.map((i: string) => `• ${i}`).join('\n');
        const h = Math.max(10, Math.min(60, items.length * 4));
        out.push(mkText(id, node.ordered ? 'numberedList' : 'bulletList', text, undefined, 5, y, 90, h));
        y += h + 1;
        break;
      }
      case 'quote':
      case 'callout':
        out.push(mkText(id, 'quote', node.text || '', undefined, 8, y, 84, 10));
        y += 11;
        break;
      case 'table': {
        const h = Math.max(15, Math.min(70, (node.rows?.length ?? 3) * 6));
        const headers = node.headerRow ? (node.rows?.[0] || []) : [];
        const rows    = node.headerRow ? (node.rows?.slice(1) || []) : (node.rows || []);
        out.push({
          id, slideId: 's-' + pageIdx,
          type: 'table', order: order++,
          x: 5, y, width: 90, height: h,
          rotation: 0, zIndex: 0, locked: false, visible: true,
          content: { headers, rows },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        y += h + 2;
        break;
      }
      case 'chart': {
        const h = 40;
        out.push({
          id, slideId: 's-' + pageIdx,
          type: 'chart', order: order++,
          x: 5, y, width: 90, height: h,
          rotation: 0, zIndex: 0, locked: false, visible: true,
          content: node.chart,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        y += h + 2;
        break;
      }
      case 'image': {
        const h = 30;
        out.push({
          id, slideId: 's-' + pageIdx,
          type: 'image', order: order++,
          x: 25, y, width: 50, height: h,
          rotation: 0, zIndex: 0, locked: false, visible: true,
          content: { src: node.src, url: node.src, alt: node.alt },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
        y += h + 2;
        break;
      }
      case 'code': {
        out.push(mkText(id, 'paragraph', node.text || '', undefined, 5, y, 90, 25, { fontFamily: 'monospace', fontSize: 12, color: '#1F2937', fill: '#F1F5F9' }));
        y += 26;
        break;
      }
      default:
        if (node.text) {
          out.push(mkText(id, 'paragraph', node.text, undefined, 5, y, 90, 8));
          y += 9;
        }
    }
    order++;
    if (y > 92) break;   // overflow protection — stop adding past slide bounds
  }
  return out;
}

function mkText(id: string, type: string, text: string, runs: any, x: number, y: number, w: number, h: number, style?: any) {
  return {
    id, slideId: 's',
    type, order: 0,
    x, y, width: w, height: h,
    rotation: 0, zIndex: 0, locked: false, visible: true,
    content: runs && runs.length > 0 ? { text, runs } : { text },
    style: style || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function estimateTextHeight(text: string, widthPct: number): number {
  // Very rough: assume ~70 chars per line at 14pt across 90% slide width.
  const charsPerLine = Math.max(20, widthPct * 0.78);
  const lines = Math.max(1, Math.ceil((text.length || 1) / charsPerLine));
  return Math.min(40, lines * 4);
}
