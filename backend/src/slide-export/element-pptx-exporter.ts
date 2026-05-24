// =============================================================================
//  Element → PPTX exporter
//
//  Reads SlideElement rows (the Phase 1 authoritative source) and emits a
//  pptxgenjs document. Coordinates are 0..100 → inches at 13.333"×7.5".
//
//  Each ElementType maps to its closest native PPTX primitive:
//    - text-ish      → addText
//    - lists         → addText with bullet/number options
//    - chart         → addChart (data taken from ChartContent.series)
//    - table         → addTable
//    - image / logo  → addImage
//    - shape         → addShape (rect/ellipse/triangle/arrow/star)
//    - line          → addShape line
//    - composite     → built from multiple addText/addShape calls
// =============================================================================

// pptxgenjs ships as CJS with `module.exports = class PptxGenJS`. With our
// tsconfig (no esModuleInterop, allowSyntheticDefaultImports=true), the
// default import compiles to `.default` access that is undefined at runtime.
// Resolve through require() so it works under both ts-node and nest build.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const PptxGenJS: any = require('pptxgenjs');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: any = require('sharp');
import type { SlideElementDTO, ElementStyle, SlideBackground } from '../slides/element-types';
import type { RenderDeckInput } from './render-types';
import { postProcessAnimations } from './ooxml-animation-writer';
import { getPlannedTextFit, stripHtml as stripExportHtml } from './render-planner';
import { buildChartSvg } from '../generation/export/svg-chart-builder';
import type { ChartContent } from '../generation/export/chart-types';

const SLIDE_W = 13.333;   // inches at 16:9
const SLIDE_H = 7.5;

// Native pptxgenjs chart types only cover bar/line/pie/donut/area. Every
// other ChartKind (stackedBar / funnel / scatter / waterfall / radar /
// heatmap / bubble / gauge / treemap / dualAxis / stackedArea /
// percentStackedBar / percentStackedArea / matrix2x2 / kpi / comparison)
// is rendered via the shared SVG builder and embedded as PNG so the export
// matches the editor pixel-for-pixel.
type ChartImageMap = Map<string, string>;

export async function exportDeckToPptx(deck: RenderDeckInput): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE';
  pptx.author = 'Pitchonix';
  pptx.title = deck.title;

  const chartImages = await prerenderChartImages(deck);

  for (const slide of deck.slides) {
    const ps = pptx.addSlide();

    // Background
    if (slide.background) applyBackground(ps, slide.background);
    else if (slide.themeTokens?.background) ps.background = { color: stripHash(slide.themeTokens.background) };

    const sorted = [...(slide.elements || [])]
      .filter((e) => e.visible !== false)
      .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));

    for (const el of sorted) {
      try { addElement(pptx, ps, el, chartImages); } catch (err) {
        // Soft-fail per element so a broken row doesn't kill the export
        console.warn(`[pptx-export] element ${el.id} (${el.type}) failed:`, (err as Error).message);
      }
    }

    // Phase 38E — speaker notes (writes to <p:notesSlide>).
    if (slide.speakerNotes && slide.speakerNotes.trim().length > 0) {
      try { ps.addNotes(slide.speakerNotes); } catch (e) { /* pptxgenjs swallows missing */ }
    }

    // Phase 38I — per-slide transition. pptxgenjs v3 exposes `slide.transition`
    // for a subset of effects; we map ours to its API + silently no-op for
    // anything it doesn't recognise.
    if (slide.transition && (slide.transition as any).effect) {
      try {
        const t = slide.transition as any;
        const psAny = ps as any;
        if (typeof psAny.transition === 'function') {
          psAny.transition({ type: pptxTransitionType(t.effect), duration: (t.duration ?? 400) / 1000 });
        }
      } catch { /* unsupported in this pptxgenjs version */ }
    }
  }

  const buf = await pptx.write({ outputType: 'nodebuffer' });
  // Phase 38.1F + 38.1G — post-process the zip to inject OOXML <p:timing>
  // animation graphs and overwrite <p:transition> with the correct effect
  // for the cases pptxgenjs flattens (morph, directional push/reveal/cover).
  return postProcessAnimations(buf as Buffer, deck.slides);
}

// =============================================================================
//  Chart pre-render (Phase 33.75)
//
//  pptxgenjs's native addChart() only knows bar/line/pie/donut/area. Anything
//  else used to fall through to a rounded-rect placeholder, so the editor and
//  export visibly diverged. We now build the SVG for every chart element via
//  the shared `buildChartSvg`, convert SVG→PNG via sharp, and embed the PNG
//  as a regular image so any ChartKind renders correctly.
//
//  Pre-render once at the top of the export so the per-element loop can stay
//  synchronous (pptxgenjs's addImage accepts a data URL, no I/O needed).
// =============================================================================
async function prerenderChartImages(deck: RenderDeckInput): Promise<ChartImageMap> {
  const map: ChartImageMap = new Map();
  const jobs: Array<Promise<void>> = [];

  for (const slide of deck.slides) {
    for (const el of slide.elements || []) {
      if (el.type !== 'chart' || el.visible === false) continue;
      jobs.push(renderChartToDataUrl(el).then((url) => {
        if (url) map.set(el.id, url);
      }).catch((err) => {
        console.warn(`[pptx-export] chart pre-render failed for ${el.id}:`, (err as Error).message);
      }));
    }
  }

  await Promise.all(jobs);
  return map;
}

async function renderChartToDataUrl(el: SlideElementDTO): Promise<string | null> {
  const raw = (el.content as any) || {};
  const content: ChartContent = {
    type:         raw.type || 'bar',
    title:        typeof raw.title === 'string' ? raw.title : undefined,
    categories:   Array.isArray(raw.categories) ? raw.categories.map(String) : [],
    series:       Array.isArray(raw.series) ? raw.series : [],
    axes:         raw.axes,
    legend:       raw.legend ?? { visible: true, position: 'bottom' },
    showValues:   raw.showValues,
    showGrid:     raw.showGrid,
    insight:      raw.insight,
    familyId:     raw.familyId,
    numberFormat: raw.numberFormat,
  };

  // Match the on-slide aspect ratio so SVG geometry isn't squashed when
  // pptxgenjs scales the image into the element's bounding box. Cap the
  // pixel width so we don't ship 5MP PNGs into the .pptx for tiny charts.
  const aspect = el.width > 0 && el.height > 0 ? el.width / el.height : 16 / 9;
  const pxW = Math.max(480, Math.min(1920, Math.round(aspect * 720)));
  const pxH = Math.round(pxW / aspect);

  const svg = buildChartSvg(content, { width: pxW, height: pxH });
  const png: Buffer = await sharp(Buffer.from(svg))
    .resize(pxW, pxH, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
    .png()
    .toBuffer();
  return `data:image/png;base64,${png.toString('base64')}`;
}

// =============================================================================
//  Geometry
// =============================================================================

function rect(el: SlideElementDTO) {
  return {
    x: (el.x / 100) * SLIDE_W,
    y: (el.y / 100) * SLIDE_H,
    w: (el.width  / 100) * SLIDE_W,
    h: (el.height / 100) * SLIDE_H,
  };
}

/** Phase 38I — map Pitchonix transition effects to pptxgenjs identifiers. */
function pptxTransitionType(effect: string): string {
  switch (effect) {
    case 'fade':   return 'fade';
    case 'push':   return 'push';
    case 'reveal': return 'reveal';
    case 'cover':  return 'cover';
    case 'morph':  return 'fade';  // morph isn't a v3 native; fade is the closest fallback
    default:       return 'fade';
  }
}

function stripHash(c?: string | null): string {
  if (!c) return 'FFFFFF';
  return c.replace('#', '').slice(0, 6).toUpperCase().padEnd(6, '0');
}

function isBoldWeight(weight: unknown): boolean {
  if (weight === true) return true;
  if (typeof weight === 'number') return weight >= 600;
  if (typeof weight === 'string') {
    const normalized = weight.toLowerCase();
    return normalized === 'bold' || normalized === 'bolder' || Number(normalized) >= 600;
  }
  return false;
}

function applyBackground(slide: any, bg: SlideBackground) {
  if (bg.type === 'solid' && bg.color) {
    slide.background = { color: stripHash(bg.color) };
  } else if (bg.type === 'image' && bg.image?.src) {
    slide.background = { path: bg.image.src };
  } else if (bg.type === 'gradient' && bg.gradient?.stops?.length) {
    // PPTX doesn't expose true gradients via pptxgenjs background; fall back to first stop.
    slide.background = { color: stripHash(bg.gradient.stops[0].color) };
  }
}

// =============================================================================
//  Add element
// =============================================================================

function addElement(_pptx: any, slide: any, el: SlideElementDTO, chartImages: ChartImageMap) {
  switch (el.type) {
    case 'heading':       return addText(slide, el, { fontSize: 32, bold: true });
    case 'subheading':    return addText(slide, el, { fontSize: 18, bold: false, color: '475569' });
    case 'paragraph':     return addText(slide, el, { fontSize: 14 });
    case 'caption':       return addText(slide, el, { fontSize: 11, color: '6B7280' });
    case 'label':         return addText(slide, el, { fontSize: 11, bold: true, color: '475569' });
    case 'cta':           return addCta(slide, el);
    case 'quote':         return addQuote(slide, el);
    case 'testimonial':   return addTestimonial(slide, el);
    case 'bulletList':    return addBulletList(slide, el, false);
    case 'numberedList':  return addBulletList(slide, el, true);
    case 'metric':        return addMetric(slide, el);
    case 'kpi':           return addKpi(slide, el);
    case 'chart':         return addChart(slide, el, chartImages);
    case 'table':         return addTable(slide, el);
    case 'image':         return addImage(slide, el);
    case 'logo':          return addImage(slide, el);
    case 'shape':         return addShape(slide, el);
    case 'line':          return addLine(slide, el);
    case 'divider':       return addDivider(slide, el);
    case 'footer':        return addText(slide, el, { fontSize: 10, color: '94A3B8' });
    case 'pageNumber':    return addText(slide, el, { fontSize: 10, color: '94A3B8', align: 'right' });
    case 'pricingCard':   return addPricing(slide, el);
    case 'featureGrid':   return addFeatureGrid(slide, el);
    case 'timeline':      return addTimeline(slide, el);
    case 'roadmap':       return addRoadmap(slide, el);
    case 'teamCard':      return addTeam(slide, el);
    case 'swot':          return addSwot(slide, el);
    case 'comparison':    return addComparison(slide, el);
    case 'processSteps':  return addProcess(slide, el);
    default:              return addText(slide, el, { fontSize: 14 });
  }
}

// =============================================================================
//  Text-ish
// =============================================================================

function pickTextStyle(el: SlideElementDTO, base: { fontSize?: number; bold?: boolean; color?: string; align?: 'left'|'center'|'right' }) {
  const s = (el.style || {}) as ElementStyle;
  const fit = getPlannedTextFit(el);
  const fittedWeight = fit?.fontWeight;
  return {
    fontSize: fit?.fontSize ?? s.fontSize ?? base.fontSize ?? 14,
    bold:     isBoldWeight(s.fontWeight ?? fittedWeight) || !!base.bold,
    italic:   s.fontStyle === 'italic',
    color:    s.color ? stripHash(s.color) : (base.color || '111827'),
    fontFace: s.fontFamily || undefined,
    align:    (s.textAlign as any) || base.align || 'left',
    valign:   'top',
    breakLine: false,
    fit:       'shrink' as any,
  };
}

function addText(slide: any, el: SlideElementDTO, base: { fontSize?: number; bold?: boolean; color?: string; align?: 'left'|'center'|'right' }) {
  const c = (el.content as any) || {};
  const ts = pickTextStyle(el, base);
  const fit = getPlannedTextFit(el);

  // Phase 38.5G — emit per-run formatting when imported text carried runs.
  // pptxgenjs accepts an array of `{ text, options }` so each run can carry
  // its own bold/italic/colour/size/font. Fall back to flat text otherwise.
  const richRuns = Array.isArray(c.runs) ? (c.runs as any[]).filter((r) => r && typeof r.text === 'string') : null;
  if (richRuns && richRuns.length > 0) {
    const blocks = richRuns.map((r) => ({
      text: r.text,
      options: {
        bold:      !!r.bold,
        italic:    !!r.italic,
        underline: r.underline ? { style: 'sng' } : undefined,
        fontSize:  Number.isFinite(r.size) ? r.size : ts.fontSize,
        color:     r.color && typeof r.color === 'string' && !r.color.startsWith('scheme:')
          ? stripHash(r.color) : ts.color,
        fontFace:  r.font || ts.fontFace,
      },
    }));
    slide.addText(blocks as any, {
      ...rect(el),
      ...ts,
      margin: 0,
      paraSpaceAfterPt: 0,
      breakLine: false,
      fit: 'shrink',
      lineSpacingMultiple: fit?.lineHeight,
      charSpace: fit?.letterSpacing,
      fill: bgFill(el.style),
    });
    return;
  }

  const text = stripExportHtml(c.html || c.text || '');
  slide.addText(text, {
    ...rect(el),
    ...ts,
    margin: 0,
    paraSpaceAfterPt: 0,
    breakLine: false,
    fit: 'shrink',
    lineSpacingMultiple: fit?.lineHeight,
    charSpace: fit?.letterSpacing,
    fill: bgFill(el.style),
  });
}

function bgFill(s?: ElementStyle | null): any {
  if (!s) return undefined;
  if (s.fill && s.fill !== 'transparent') return { color: stripHash(s.fill) };
  return undefined;
}

function addCta(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const variant = c.variant || 'primary';
  const fill = variant === 'primary' ? '16A34A' : variant === 'outline' ? 'FFFFFF' : 'F3F4F6';
  const color = variant === 'primary' ? 'FFFFFF' : '111827';
  const fit = getPlannedTextFit(el, 'cta');
  slide.addShape('roundRect', { ...rect(el), fill: { color: fill }, line: variant === 'outline' ? { color: '16A34A', width: 2 } : { color: fill }, rectRadius: 0.08 });
  slide.addText(c.text || 'Call to action', {
    ...rect(el),
    fontSize: fit?.fontSize ?? 12,
    bold: true,
    color,
    align: 'center',
    valign: 'middle',
    margin: 0,
    fit: 'shrink',
    lineSpacingMultiple: fit?.lineHeight,
    charSpace: fit?.letterSpacing,
  });
}

function addQuote(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  const fit = getPlannedTextFit(el, 'quote');
  slide.addText(`"`, { x: r.x, y: r.y, w: 0.5, h: 0.5, fontSize: 36, color: '16A34A', bold: true });
  slide.addText(c.text || '', {
    x: r.x,
    y: r.y + 0.5,
    w: r.w,
    h: r.h - 0.9,
    fontSize: fit?.fontSize ?? 18,
    italic: true,
    color: '1F2937',
    fit: 'shrink',
    margin: 0,
    lineSpacingMultiple: fit?.lineHeight,
    charSpace: fit?.letterSpacing,
  });
  if (c.attribution) {
    slide.addText(`— ${c.attribution}${c.role ? `, ${c.role}` : ''}`, { x: r.x, y: r.y + r.h - 0.4, w: r.w, h: 0.4, fontSize: 12, bold: true, color: '6B7280' });
  }
}

function addTestimonial(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  slide.addShape('roundRect', { ...r, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.1 });
  slide.addText(c.quote || '', { x: r.x + 0.2, y: r.y + 0.3, w: r.w - 0.4, h: r.h - 1.1, fontSize: 14, italic: true, color: '1F2937' });
  slide.addText(c.author || '', { x: r.x + 0.2, y: r.y + r.h - 0.8, w: r.w - 0.4, h: 0.3, fontSize: 13, bold: true, color: '111827' });
  if (c.role || c.company) {
    slide.addText([c.role, c.company].filter(Boolean).join(' · '), { x: r.x + 0.2, y: r.y + r.h - 0.45, w: r.w - 0.4, h: 0.3, fontSize: 11, color: '6B7280' });
  }
}

function addBulletList(slide: any, el: SlideElementDTO, numbered: boolean) {
  const items: any[] = ((el.content as any)?.items || []);
  const ts = pickTextStyle(el, { fontSize: 14 });
  const text = items.map((it) => ({
    text: stripExportHtml(it.html || it.text || ''),
    options: { bullet: numbered ? { type: 'number' } : { type: 'bullet' } },
  }));
  slide.addText(text, { ...rect(el), ...ts, margin: 0, fit: 'shrink' });
}

function addMetric(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  const accent = (el.style as any)?.color ? stripHash((el.style as any).color) : '16A34A';
  const fit = getPlannedTextFit(el, 'metric');
  slide.addText(`${c.value || '—'}${c.unit ? ` ${c.unit}` : ''}`, { x: r.x, y: r.y, w: r.w, h: r.h * 0.55, fontSize: fit?.fontSize ?? 36, bold: true, color: accent, valign: 'middle', fit: 'shrink', margin: 0, charSpace: fit?.letterSpacing });
  slide.addText(c.label || '', { x: r.x, y: r.y + r.h * 0.55, w: r.w, h: r.h * 0.25, fontSize: 12, color: '6B7280' });
  if (c.delta) {
    const dc = c.deltaDirection === 'up' ? '16A34A' : c.deltaDirection === 'down' ? 'DC2626' : '6B7280';
    slide.addText(c.delta, { x: r.x, y: r.y + r.h * 0.8, w: r.w, h: r.h * 0.2, fontSize: 11, color: dc });
  }
}

function addKpi(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  const fit = getPlannedTextFit(el, 'metric');
  slide.addShape('roundRect', { ...r, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.08 });
  slide.addText(c.value || '—', { x: r.x + 0.15, y: r.y + 0.1, w: r.w - 0.3, h: r.h * 0.55, fontSize: Math.min(fit?.fontSize ?? 28, 40), bold: true, color: '16A34A', fit: 'shrink', margin: 0, charSpace: fit?.letterSpacing });
  slide.addText(c.label || '', { x: r.x + 0.15, y: r.y + r.h * 0.6, w: r.w - 0.3, h: r.h * 0.25, fontSize: 12, bold: true, color: '111827' });
  if (c.sublabel) slide.addText(c.sublabel, { x: r.x + 0.15, y: r.y + r.h * 0.8, w: r.w - 0.3, h: r.h * 0.2, fontSize: 11, color: '6B7280' });
}

function addChart(slide: any, el: SlideElementDTO, chartImages: ChartImageMap) {
  const r = rect(el);
  const dataUrl = chartImages.get(el.id);

  if (dataUrl) {
    // Shared SVG → PNG path. Covers all 21 ChartKinds (Phase 33.75) with
    // pixel-equivalent output to the editor canvas.
    slide.addImage({ data: dataUrl, ...r });
    return;
  }

  // Pre-render failed (sharp threw, malformed content, etc.). Surface a
  // visible placeholder rather than swallowing the failure silently so the
  // bug is caught in QA instead of in front of the customer.
  const c = (el.content as any) || {};
  slide.addShape('roundRect', { ...r, fill: { color: 'FEF3F2' }, line: { color: 'F87171', width: 1 }, rectRadius: 0.08 });
  slide.addText(`Chart render failed (${c.type || 'unknown'})`, {
    ...r, fontSize: 12, italic: true, color: '991B1B', align: 'center', valign: 'middle',
  });
}

function addTable(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const headers: any[]  = c.headers || [];
  const rows: any[][]   = c.rows || [];
  const tableRows = [
    headers.map((h) => ({
      text: h?.text || '',
      options: { bold: true, fill: { color: stripHash(h?.fill || 'F1F5F9') }, color: stripHash(h?.color || '0F172A'), align: (h?.align || 'left') as any },
    })),
    ...rows.map((row, ri) => row.map((cell: any) => ({
      text: cell?.text || '',
      options: {
        bold: !!cell?.bold,
        color: cell?.color ? stripHash(cell.color) : '1F2937',
        fill: cell?.fill ? { color: stripHash(cell.fill) } : (c.zebra && ri % 2 === 1 ? { color: 'F8FAFC' } : undefined),
        align: (cell?.align || 'left') as any,
      },
    }))),
  ];
  slide.addTable(tableRows, { ...rect(el), border: { color: stripHash(c.borders?.color || 'E2E8F0'), pt: c.borders?.width || 1 }, fontSize: 11 });
}

function addImage(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  if (c.src && /^(https?:|data:)/.test(c.src)) {
    slide.addImage({ path: c.src, ...r, sizing: { type: c.fit === 'contain' ? 'contain' : 'cover', w: r.w, h: r.h } });
  } else if (c.src) {
    slide.addImage({ path: c.src, ...r });
  } else {
    slide.addShape('rect', { ...r, fill: { color: 'E2E8F0' }, line: { color: 'CBD5E1', width: 1 } });
    slide.addText(c.name || 'Image', { ...r, fontSize: 11, color: '94A3B8', align: 'center', valign: 'middle' });
  }
}

function addShape(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const fill = c.fill || (el.style as any)?.fill || '16A34A';
  const map: Record<string, string> = {
    rect: 'rect', roundedRect: 'roundRect', circle: 'ellipse', ellipse: 'ellipse',
    triangle: 'triangle', arrow: 'rightArrow', star: 'star5',
  };
  const shape = map[c.kind || 'rect'] || 'rect';
  slide.addShape(shape, {
    ...rect(el),
    fill: { color: stripHash(fill) },
    line: c.stroke ? { color: stripHash(c.stroke), width: c.strokeWidth ?? 1 } : { type: 'none' as any },
    rectRadius: c.kind === 'roundedRect' ? 0.1 : undefined,
  });
}

function addLine(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  slide.addShape('line', {
    ...rect(el),
    line: { color: stripHash(c.stroke || 'CBD5E1'), width: c.strokeWidth || 1, dashType: c.dashed ? 'dash' : 'solid' },
  });
}

function addDivider(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  if (c.label) {
    slide.addShape('line', { x: r.x, y: r.y + r.h / 2, w: r.w * 0.4, h: 0, line: { color: stripHash(c.stroke || 'E2E8F0'), width: c.strokeWidth || 1 } });
    slide.addText(c.label, { x: r.x + r.w * 0.4, y: r.y, w: r.w * 0.2, h: r.h, fontSize: 11, align: 'center', valign: 'middle', color: '6B7280' });
    slide.addShape('line', { x: r.x + r.w * 0.6, y: r.y + r.h / 2, w: r.w * 0.4, h: 0, line: { color: stripHash(c.stroke || 'E2E8F0'), width: c.strokeWidth || 1 } });
  } else {
    slide.addShape('line', { x: r.x, y: r.y + r.h / 2, w: r.w, h: 0, line: { color: stripHash(c.stroke || 'E2E8F0'), width: c.strokeWidth || 1 } });
  }
}

function addPricing(slide: any, el: SlideElementDTO) {
  const tiers: any[] = ((el.content as any)?.tiers || []);
  const r = rect(el);
  if (tiers.length === 0) return;
  const tw = (r.w - 0.2 * (tiers.length - 1)) / tiers.length;
  tiers.forEach((t, i) => {
    const x = r.x + i * (tw + 0.2);
    slide.addShape('roundRect', { x, y: r.y, w: tw, h: r.h, fill: { color: 'FFFFFF' }, line: { color: t.highlight ? '16A34A' : 'E2E8F0', width: t.highlight ? 2 : 1 }, rectRadius: 0.1 });
    slide.addText(t.name || '', { x: x + 0.15, y: r.y + 0.15, w: tw - 0.3, h: 0.4, fontSize: 14, bold: true, color: '111827' });
    slide.addText(`${t.price || ''}${t.period ? `/${t.period}` : ''}`, { x: x + 0.15, y: r.y + 0.6, w: tw - 0.3, h: 0.6, fontSize: 22, bold: true, color: '16A34A' });
    const features = (t.features || []).map((f: string) => ({ text: f, options: { bullet: true } }));
    if (features.length) slide.addText(features, { x: x + 0.2, y: r.y + 1.3, w: tw - 0.4, h: r.h - 1.4, fontSize: 11, color: '475569' });
  });
}

function addFeatureGrid(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const items: any[] = c.items || [];
  const cols = c.columns || 3;
  const rows = Math.ceil(items.length / cols);
  const r = rect(el);
  const cw = (r.w - 0.15 * (cols - 1)) / cols;
  const ch = (r.h - 0.15 * (rows - 1)) / Math.max(1, rows);
  items.forEach((it, idx) => {
    const ci = idx % cols, ri = Math.floor(idx / cols);
    const x = r.x + ci * (cw + 0.15);
    const y = r.y + ri * (ch + 0.15);
    slide.addShape('roundRect', { x, y, w: cw, h: ch, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.06 });
    slide.addText(it.title || '', { x: x + 0.1, y: y + 0.1, w: cw - 0.2, h: 0.3, fontSize: 12, bold: true, color: '111827' });
    if (it.description) slide.addText(it.description, { x: x + 0.1, y: y + 0.42, w: cw - 0.2, h: ch - 0.5, fontSize: 11, color: '6B7280' });
  });
}

function addTimeline(slide: any, el: SlideElementDTO) {
  const items: any[] = ((el.content as any)?.items || []);
  const r = rect(el);
  if (items.length === 0) return;
  const w = (r.w - 0.15 * (items.length - 1)) / items.length;
  items.forEach((it, i) => {
    const x = r.x + i * (w + 0.15);
    slide.addShape('roundRect', { x, y: r.y, w, h: r.h, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.06 });
    if (it.date) slide.addText(it.date, { x: x + 0.12, y: r.y + 0.1, w: w - 0.24, h: 0.3, fontSize: 11, bold: true, color: '16A34A' });
    slide.addText(it.title || '', { x: x + 0.12, y: r.y + 0.42, w: w - 0.24, h: 0.4, fontSize: 13, bold: true, color: '111827' });
    if (it.description) slide.addText(it.description, { x: x + 0.12, y: r.y + 0.85, w: w - 0.24, h: r.h - 0.95, fontSize: 11, color: '6B7280' });
  });
}

function addRoadmap(slide: any, el: SlideElementDTO) {
  const phases: any[] = ((el.content as any)?.phases || []);
  const r = rect(el);
  if (phases.length === 0) return;
  const w = (r.w - 0.15 * (phases.length - 1)) / phases.length;
  phases.forEach((p, i) => {
    const x = r.x + i * (w + 0.15);
    slide.addShape('roundRect', { x, y: r.y, w, h: r.h, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.06 });
    if (p.period) slide.addText(p.period, { x: x + 0.12, y: r.y + 0.1, w: w - 0.24, h: 0.3, fontSize: 11, bold: true, color: '16A34A' });
    slide.addText(p.phase || '', { x: x + 0.12, y: r.y + 0.42, w: w - 0.24, h: 0.4, fontSize: 13, bold: true, color: '111827' });
    const bullets = (p.bullets || []).map((b: string) => ({ text: b, options: { bullet: true } }));
    if (bullets.length) slide.addText(bullets, { x: x + 0.18, y: r.y + 0.9, w: w - 0.36, h: r.h - 1.0, fontSize: 11, color: '475569' });
  });
}

function addTeam(slide: any, el: SlideElementDTO) {
  const members: any[] = ((el.content as any)?.members || []);
  const r = rect(el);
  if (members.length === 0) return;
  const cols = Math.min(3, members.length);
  const rows = Math.ceil(members.length / cols);
  const cw = (r.w - 0.15 * (cols - 1)) / cols;
  const ch = (r.h - 0.15 * (rows - 1)) / rows;
  members.forEach((m, i) => {
    const ci = i % cols, ri = Math.floor(i / cols);
    const x = r.x + ci * (cw + 0.15);
    const y = r.y + ri * (ch + 0.15);
    slide.addShape('roundRect', { x, y, w: cw, h: ch, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.06 });
    slide.addText(m.name || '', { x: x + 0.1, y: y + 0.1, w: cw - 0.2, h: 0.4, fontSize: 13, bold: true, color: '111827', align: 'center' });
    if (m.role) slide.addText(m.role, { x: x + 0.1, y: y + 0.5, w: cw - 0.2, h: 0.3, fontSize: 11, color: '16A34A', align: 'center' });
    if (m.bio)  slide.addText(m.bio,  { x: x + 0.1, y: y + 0.85, w: cw - 0.2, h: ch - 0.95, fontSize: 10, color: '6B7280', align: 'center' });
  });
}

function addSwot(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const r = rect(el);
  const cw = (r.w - 0.1) / 2;
  const ch = (r.h - 0.1) / 2;
  const cells = [
    { x: r.x,            y: r.y,            label: 'Strengths',     items: c.strengths,    fill: 'F0FDF4', color: '14532D' },
    { x: r.x + cw + 0.1, y: r.y,            label: 'Weaknesses',    items: c.weaknesses,   fill: 'FEF2F2', color: '7F1D1D' },
    { x: r.x,            y: r.y + ch + 0.1, label: 'Opportunities', items: c.opportunities, fill: 'EFF6FF', color: '1E3A8A' },
    { x: r.x + cw + 0.1, y: r.y + ch + 0.1, label: 'Threats',       items: c.threats,      fill: 'FEFCE8', color: '713F12' },
  ];
  cells.forEach((cell) => {
    slide.addShape('roundRect', { x: cell.x, y: cell.y, w: cw, h: ch, fill: { color: cell.fill }, line: { type: 'none' as any }, rectRadius: 0.06 });
    slide.addText(cell.label, { x: cell.x + 0.1, y: cell.y + 0.08, w: cw - 0.2, h: 0.3, fontSize: 11, bold: true, color: cell.color });
    const bullets = (cell.items || []).map((it: string) => ({ text: it, options: { bullet: true } }));
    if (bullets.length) slide.addText(bullets, { x: cell.x + 0.15, y: cell.y + 0.4, w: cw - 0.3, h: ch - 0.5, fontSize: 11, color: cell.color });
  });
}

function addComparison(slide: any, el: SlideElementDTO) {
  const c = (el.content as any) || {};
  const cols: string[] = c.columns || [];
  const rows: any[]    = c.rows || [];
  const tableRows = [
    [{ text: '', options: { bold: true, fill: { color: 'F1F5F9' } } }, ...cols.map((col, i) => ({
      text: col,
      options: { bold: true, fill: { color: c.highlightColumn === i ? 'DCFCE7' : 'F1F5F9' }, color: c.highlightColumn === i ? '14532D' : '0F172A' },
    }))],
    ...rows.map((r) => [
      { text: r.feature || '', options: { bold: true, fill: { color: 'FFFFFF' } } },
      ...((r.values || []) as string[]).map((v, i) => ({ text: v, options: { fill: { color: c.highlightColumn === i ? 'F0FDF4' : 'FFFFFF' } } })),
    ]),
  ];
  slide.addTable(tableRows, { ...rect(el), border: { color: 'E2E8F0', pt: 1 }, fontSize: 11 });
}

function addProcess(slide: any, el: SlideElementDTO) {
  const steps: any[] = ((el.content as any)?.steps || []);
  const r = rect(el);
  if (steps.length === 0) return;
  const w = (r.w - 0.15 * (steps.length - 1)) / steps.length;
  steps.forEach((s, i) => {
    const x = r.x + i * (w + 0.15);
    slide.addShape('roundRect', { x, y: r.y, w, h: r.h, fill: { color: 'F8FAFC' }, line: { color: 'E2E8F0', width: 1 }, rectRadius: 0.06 });
    slide.addText(String(i + 1), { x: x + 0.1, y: r.y + 0.1, w: w - 0.2, h: 0.6, fontSize: 22, bold: true, color: '16A34A' });
    slide.addText(s.title || '', { x: x + 0.1, y: r.y + 0.75, w: w - 0.2, h: 0.4, fontSize: 13, bold: true, color: '111827' });
    if (s.description) slide.addText(s.description, { x: x + 0.1, y: r.y + 1.2, w: w - 0.2, h: r.h - 1.3, fontSize: 11, color: '6B7280' });
  });
}
