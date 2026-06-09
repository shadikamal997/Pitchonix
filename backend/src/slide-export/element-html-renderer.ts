// =============================================================================
//  Element → HTML renderer (server-side)
//
//  Single source of truth for the visual form of an element-based slide as
//  used by:
//     - PDF export   (Puppeteer prints the same HTML)
//     - PNG export   (Puppeteer screenshots the same HTML)
//     - JPEG export  (PNG → Sharp re-encode)
//
//  Coordinates: SlideElement.x/y/w/h are 0..100 (percent of slide). We render
//  inside a 1280×720 (16:9) viewport so % maps directly onto px values.
// =============================================================================

import type {
  SlideElementDTO,
  ElementStyle,
  SlideBackground,
  SlideThemeTokens,
} from '../slides/element-types';
import type { RenderDeckInput, RenderSlideInput } from './render-types';
import { getPlannedTextFit } from './render-planner';
import { buildChartSvg } from '../generation/export/svg-chart-builder';
import type { ChartContent } from '../generation/export/chart-types';

export const SLIDE_VIEWPORT_WIDTH = 1280;
export const SLIDE_VIEWPORT_HEIGHT = 720;
export const SLIDE_PAGE_WIDTH_IN = 13.333;
export const SLIDE_PAGE_HEIGHT_IN = 7.5;

// =============================================================================
//  Public — render full HTML document for the deck (every slide as its own
//  page-sized div). PDF / screenshot tooling slices it page-by-page.
// =============================================================================

export function renderDeckHtml(deck: RenderDeckInput): string {
  const pages = deck.slides.map((slide) => renderSlidePage(slide)).join('');

  return /* html */ `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(deck.title || 'Presentation')}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Playfair+Display:wght@600;700&family=Lora:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    @page { size: ${SLIDE_PAGE_WIDTH_IN}in ${SLIDE_PAGE_HEIGHT_IN}in; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${SLIDE_VIEWPORT_WIDTH}px; background: #f0f0f0; }
    body { font-family: Inter, -apple-system, BlinkMacSystemFont, sans-serif; color: var(--text, #111827); -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    .slide-page {
      position: relative;
      width: ${SLIDE_VIEWPORT_WIDTH}px;
      height: ${SLIDE_VIEWPORT_HEIGHT}px;
      overflow: hidden;
      background: #ffffff;
      page-break-after: always;
      page-break-inside: avoid;
      break-after: page;
      break-inside: avoid;
    }
    .slide-page:last-child { page-break-after: auto; break-after: auto; }
    .el { position: absolute; overflow: hidden; }
    .el-rt { width: 100%; height: 100%; display: block; word-break: break-word; }
    .el-rt ul, .el-rt ol { padding-left: 20px; }
    .el-rt p { margin: 0; }
    /* --- Lists --- */
    .el-list { list-style: none; padding: 0; margin: 0; }
    .el-list li { display: flex; gap: 8px; margin-bottom: 5px; line-height: 1.5; font-size: 13px; color: var(--text, #111827); }
    .el-list .marker { flex: 0 0 auto; margin-top: 8px; color: var(--accent, #16a34a); }
    .el-list .marker-dot { width: 5px; height: 5px; border-radius: 50%; background: currentColor; }
    .el-numbered { counter-reset: li; }
    .el-numbered li { counter-increment: li; }
    .el-numbered .marker::before { content: counter(li) "."; font-weight: 600; color: var(--accent, #16a34a); }
    /* --- Metric --- */
    .metric .v { font-weight: 900; line-height: 1; white-space: nowrap; }
    .metric .l { font-size: 12px; color: var(--muted, #6b7280); margin-top: 5px; text-transform: uppercase; letter-spacing: 0.05em; }
    .metric .d { font-size: 12px; color: var(--muted, #6b7280); margin-top: 2px; }
    /* --- KPI card --- */
    .kpi-card { display: flex; flex-direction: column; justify-content: center; padding: 14px 16px; border-radius: 10px; background: var(--surface, #f8fafc); border: 1px solid var(--border, #e2e8f0); }
    /* --- Quote / Testimonial --- */
    .quote-mark { font-size: 44px; line-height: 1; color: var(--accent, #16a34a); opacity: 0.35; margin-bottom: 6px; flex: 0 0 auto; }
    .testimonial { padding: 18px; border-radius: 10px; background: var(--surface, #f8fafc); border: 1px solid var(--border, #e2e8f0); }
    .testimonial-author { font-size: 13px; font-weight: 700; margin-top: 12px; color: var(--text, #111827); }
    .testimonial-role  { font-size: 12px; color: var(--muted, #6b7280); }
    /* --- Table --- */
    table { border-collapse: collapse; width: 100%; height: 100%; font-size: 13px; }
    table th { padding: 9px 12px; background: var(--surface, #f1f5f9); font-weight: 700; color: var(--text, #0f172a); border-bottom: 2px solid var(--border, #e2e8f0); text-align: left; }
    table td { padding: 8px 12px; border-bottom: 1px solid var(--border, #e2e8f0); color: var(--text, #111827); }
    table tr:last-child td { border-bottom: none; }
    /* --- Feature grid --- */
    .feature-grid { display: grid; gap: 12px; width: 100%; height: 100%; }
    .feature-card { padding: 14px 16px; border-radius: 8px; background: var(--surface, #f8fafc); border: 1px solid var(--border, #e2e8f0); display: flex; flex-direction: column; }
    .feature-card .t { font-weight: 700; font-size: 14px; color: var(--text, #111827); line-height: 1.3; }
    .feature-card .d { font-size: 13px; color: var(--muted, #6b7280); margin-top: 5px; line-height: 1.45; }
    /* --- Timeline --- */
    .timeline { display: flex; gap: 14px; width: 100%; height: 100%; align-items: stretch; }
    .timeline-item { flex: 1; display: flex; flex-direction: column; gap: 5px; padding: 13px 14px; border-radius: 8px; background: var(--surface, #f8fafc); border: 1px solid var(--border, #e2e8f0); }
    .timeline-item .d { font-size: 12px; color: var(--accent, #16a34a); font-weight: 700; letter-spacing: 0.04em; text-transform: uppercase; }
    .timeline-item .t { font-size: 14px; font-weight: 700; color: var(--text, #111827); line-height: 1.25; }
    .timeline-item .x { font-size: 13px; color: var(--muted, #6b7280); line-height: 1.4; }
    /* --- SWOT (intentional semantic colors — kept fixed) --- */
    .swot { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; width: 100%; height: 100%; }
    .swot-cell { padding: 12px; border-radius: 8px; }
    .swot-cell .h { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em; margin-bottom: 6px; }
    .swot-cell.s { background: #f0fdf4; color: #14532d; }
    .swot-cell.w { background: #fef2f2; color: #7f1d1d; }
    .swot-cell.o { background: #eff6ff; color: #1e3a8a; }
    .swot-cell.t { background: #fefce8; color: #713f12; }
    .swot-cell ul { list-style: disc; padding-left: 14px; font-size: 12px; line-height: 1.5; }
    /* --- Process steps (redesigned: badge number, larger title, connectors) --- */
    .process { display: flex; align-items: stretch; width: 100%; height: 100%; gap: 0; }
    .process-step { flex: 1; padding: 16px 15px; border-radius: 10px; background: var(--surface, #f8fafc); border: 1px solid var(--border, #e2e8f0); display: flex; flex-direction: column; gap: 7px; }
    .process-step .nbadge { width: 28px; height: 28px; border-radius: 50%; background: var(--accent, #16a34a); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 800; flex-shrink: 0; }
    .process-step .t { font-size: 16px; font-weight: 700; color: var(--text, #111827); line-height: 1.2; }
    .process-step .d { font-size: 13px; color: var(--muted, #6b7280); line-height: 1.4; }
    .process-arrow { display: flex; align-items: center; flex-shrink: 0; width: 30px; justify-content: center; color: var(--accent, #16a34a); font-size: 20px; font-weight: 300; opacity: 0.7; }
    /* --- Images --- */
    .img-wrap { width: 100%; height: 100%; overflow: hidden; }
    .img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .icon-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
    .icon-wrap svg { width: 55%; height: 55%; }
    /* --- Footer / page number --- */
    .footer-text { font-size: 11px; color: var(--muted, #94a3b8); }
    .page-num { display: flex; align-items: center; justify-content: flex-end; font-size: 11px; color: var(--muted, #94a3b8); }
    /* --- Fit-text clamp --- */
    .fit-text {
      width: 100%;
      height: 100%;
      overflow: hidden;
      word-break: break-word;
      overflow-wrap: anywhere;
      display: -webkit-box;
      -webkit-box-orient: vertical;
      white-space: pre-wrap;
    }
  </style>
</head>
<body>
${pages}
</body>
</html>`;
}

// =============================================================================
//  Slide page
// =============================================================================

function accentLight(hex: string): string {
  const h = hex.replace('#', '');
  if (h.length !== 6) return 'rgba(22,163,74,0.09)';
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},0.09)`;
}

function renderSlidePage(slide: RenderSlideInput): string {
  const bg = renderBackground(slide.background, slide.themeTokens);
  const tok = slide.themeTokens;
  // Inject CSS custom properties from theme tokens so CSS classes get the correct family accent
  const cssVars = tok
    ? `--accent:${tok.accent || '#16a34a'};--accent2:${tok.accent2 || '#06b6d4'};--text:${tok.text || '#111111'};--muted:${tok.muted || '#6b7280'};--surface:${tok.surface || '#ffffff'};--border:${tok.border || '#e2e8f0'};--accent-light:${accentLight(tok.accent || '#16a34a')};`
    : '';
  const els = (slide.elements || [])
    .filter((e) => e.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    .map((e) => renderElement(e, slide.index + 1, slide.total))
    .join('');
  return `<section class="slide-page" data-index="${slide.index}" style="${bg}${cssVars}">${els}</section>`;
}

function renderBackground(bg?: SlideBackground | null, theme?: SlideThemeTokens | null): string {
  // Theme background acts as a fallback if no explicit slide background.
  if (bg) {
    if (bg.type === 'solid' && bg.color) return `background:${bg.color};`;
    if (bg.type === 'gradient' && bg.gradient)
      return `background:${gradientCss(bg.gradient as any)};`;
    if (bg.type === 'image' && bg.image?.src) {
      return `background:url('${escapeAttr(bg.image.src)}') center/${bg.image.fit || 'cover'} no-repeat;`;
    }
  }
  if (theme?.background) return `background:${theme.background};`;
  return 'background:#ffffff;';
}

function gradientCss(g: any): string {
  if (!g?.stops || g.stops.length === 0) return '#ffffff';
  const stops = g.stops
    .map((s: any) => `${s.color} ${Math.round((s.offset || 0) * 100)}%`)
    .join(', ');
  if (g.kind === 'radial') return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
}

// =============================================================================
//  Per-element renderers
// =============================================================================

function renderElement(el: SlideElementDTO, pageNumber: number, total: number): string {
  const left = `${el.x.toFixed(4)}%`;
  const top = `${el.y.toFixed(4)}%`;
  const width = `${el.width.toFixed(4)}%`;
  const height = `${el.height.toFixed(4)}%`;
  const transform = el.rotation ? `transform:rotate(${el.rotation}deg);` : '';

  const inner = renderElementInner(el, pageNumber, total);
  const style = `left:${left};top:${top};width:${width};height:${height};${transform}${styleAttr(el.style)}`;
  return `<div class="el el-${el.type}" data-id="${el.id}" data-type="${el.type}" style="${style}">${inner}</div>`;
}

function renderElementInner(el: SlideElementDTO, pageNumber: number, total: number): string {
  switch (el.type) {
    case 'heading':
      return renderText(el, { defaultSize: 32, defaultWeight: 700 });
    case 'subheading':
      return renderText(el, { defaultSize: 18, defaultWeight: 500 });
    case 'paragraph':
      return renderText(el, { defaultSize: 14, defaultWeight: 400 });
    case 'caption':
      return renderText(el, { defaultSize: 11, defaultWeight: 400 });
    case 'label':
      return renderText(el, { defaultSize: 11, defaultWeight: 600 });
    case 'cta':
      return renderCta(el);
    case 'quote':
      return renderQuote(el);
    case 'testimonial':
      return renderTestimonial(el);
    case 'bulletList':
      return renderBulletList(el);
    case 'numberedList':
      return renderNumberedList(el);
    case 'metric':
      return renderMetric(el);
    case 'kpi':
      return renderKpi(el);
    case 'chart':
      return renderChart(el);
    case 'table':
      return renderTable(el);
    case 'image':
      return renderImage(el);
    case 'logo':
      return renderLogo(el);
    case 'icon':
      return renderIconPlaceholder(el);
    case 'shape':
      return renderShape(el);
    case 'line':
      return renderLine(el);
    case 'divider':
      return renderDivider(el);
    case 'footer':
      return renderFooter(el);
    case 'pageNumber':
      return renderPageNumber(el, pageNumber, total);
    case 'pricingCard':
      return renderPricingCard(el);
    case 'featureGrid':
      return renderFeatureGrid(el);
    case 'timeline':
      return renderTimeline(el);
    case 'roadmap':
      return renderRoadmap(el);
    case 'teamCard':
      return renderTeamCard(el);
    case 'swot':
      return renderSwot(el);
    case 'comparison':
      return renderComparison(el);
    case 'processSteps':
      return renderProcessSteps(el);
    case 'fundsAllocation':
      return renderFundsAllocation(el);
    case 'videoPlaceholder':
      return renderVideoPlaceholder(el);
    case 'embeddedMediaPlaceholder':
      return renderEmbedPlaceholder(el);
    default:
      return renderText(el, { defaultSize: 14, defaultWeight: 400 });
  }
}

function renderText(
  el: SlideElementDTO,
  opts: { defaultSize: number; defaultWeight?: number },
): string {
  const c = (el.content as any) || {};
  const html: string | undefined = c.html;
  const text: string = c.text || '';
  const fit =
    getPlannedTextFit(el) ||
    getPlannedTextFit({
      ...el,
      style: { ...(el.style || {}), fontSize: opts.defaultSize, fontWeight: opts.defaultWeight },
    } as SlideElementDTO);
  const size = fit?.fontSize || opts.defaultSize;
  const weight = (el.style as any)?.fontWeight ?? fit?.fontWeight ?? opts.defaultWeight;
  const lineHeight = fit?.lineHeight || (el.style as any)?.lineHeight || 1.35;
  const clamp = fit?.maxLines ? `-webkit-line-clamp:${fit.maxLines};` : '';
  const spacing = fit?.letterSpacing != null ? `letter-spacing:${fit.letterSpacing}px;` : '';
  const style = `font-size:${size}px;${weight ? `font-weight:${weight};` : ''}line-height:${lineHeight};${spacing}${clamp}color:#111827;${textStyleAttr(el.style)}`;
  if (html && html.trim()) {
    return `<div class="el-rt fit-text" style="${style}">${html}</div>`;
  }
  return `<div class="el-rt fit-text" style="${style}">${escapeHtml(text)}</div>`;
}

function renderCta(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const variant = c.variant || 'primary';
  const accentCol =
    (el.style as any)?.color || (el.style as any)?.stroke || 'var(--accent, #16a34a)';
  const bg = variant === 'primary' ? accentCol : variant === 'outline' ? 'transparent' : '#f3f4f6';
  const color = variant === 'primary' ? '#fff' : '#111827';
  const border = variant === 'outline' ? `2px solid ${accentCol}` : 'none';
  const fit = getPlannedTextFit(el, 'cta');
  return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:${fit?.fontSize || 12}px;font-weight:${fit?.fontWeight || 700};line-height:${fit?.lineHeight || 1.12};letter-spacing:${fit?.letterSpacing || 0}px;text-transform:uppercase;border-radius:8px;padding:0 16px;background:${bg};color:${color};border:${border};overflow:hidden;${textStyleAttr(el.style)}">${escapeHtml(c.text || 'Call to action')}</div>`;
}

function renderQuote(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const fit = getPlannedTextFit(el, 'quote');
  return `<div style="display:flex;flex-direction:column;justify-content:center;width:100%;height:100%;padding:16px;${textStyleAttr(el.style)}">
    <div class="quote-mark">"</div>
    <div class="fit-text" style="font-size:${fit?.fontSize || 18}px;font-style:italic;color:#1f2937;line-height:${fit?.lineHeight || 1.35};${fit?.maxLines ? `-webkit-line-clamp:${fit.maxLines};` : ''}">${escapeHtml(c.text || '')}</div>
    ${c.attribution ? `<div style="font-size:12px;font-weight:600;color:#6b7280;margin-top:8px;">— ${escapeHtml(c.attribution)}${c.role ? `, ${escapeHtml(c.role)}` : ''}</div>` : ''}
  </div>`;
}

function renderTestimonial(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  return `<div class="testimonial" style="width:100%;height:100%;${textStyleAttr(el.style)}">
    <div class="quote-mark">"</div>
    <div style="font-size:14px;font-style:italic;color:#1f2937;line-height:1.5;">${escapeHtml(c.quote || '')}</div>
    <div class="testimonial-author">${escapeHtml(c.author || '')}</div>
    ${c.role || c.company ? `<div class="testimonial-role">${escapeHtml([c.role, c.company].filter(Boolean).join(' · '))}</div>` : ''}
  </div>`;
}

function renderBulletList(el: SlideElementDTO): string {
  const items: any[] = (el.content as any)?.items || [];
  const li = items
    .map((it) => {
      const body = it.html && it.html.trim() ? it.html : escapeHtml(it.text || '');
      return `<li><span class="marker marker-dot"></span><span>${body}</span></li>`;
    })
    .join('');
  return `<ul class="el-list" style="width:100%;height:100%;font-size:14px;color:#1f2937;${textStyleAttr(el.style)}">${li || '<li style="color:#9ca3af;">(empty list)</li>'}</ul>`;
}

function renderNumberedList(el: SlideElementDTO): string {
  const items: any[] = (el.content as any)?.items || [];
  const li = items
    .map((it) => {
      const body = it.html && it.html.trim() ? it.html : escapeHtml(it.text || '');
      return `<li><span class="marker"></span><span>${body}</span></li>`;
    })
    .join('');
  return `<ol class="el-list el-numbered" style="width:100%;height:100%;font-size:14px;color:#1f2937;${textStyleAttr(el.style)}">${li || '<li style="color:#9ca3af;">(empty list)</li>'}</ol>`;
}

function renderMetric(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const fit = getPlannedTextFit(el, 'metric');
  const accent = (el.style as any)?.color || '#16a34a';
  const dir = c.deltaDirection as string | undefined;
  const arrow = dir === 'up' ? '▲ ' : dir === 'down' ? '▼ ' : '';
  const dColor = dir === 'up' ? '#22c55e' : dir === 'down' ? '#ef4444' : '#6b7280';
  return `<div class="metric" style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;${textStyleAttr(el.style)}">
    <div class="v fit-text" style="font-size:${fit?.fontSize || 36}px;line-height:${fit?.lineHeight || 1};-webkit-line-clamp:1;color:${accent};letter-spacing:-0.02em;">${escapeHtml(c.value || '—')}${c.unit ? `<span style="font-size:0.5em;color:#6b7280;margin-left:4px;">${escapeHtml(c.unit)}</span>` : ''}</div>
    <div class="l" style="margin-top:4px;">${escapeHtml(c.label || '')}</div>
    ${c.delta ? `<div class="d" style="color:${dColor};font-size:11px;font-weight:600;margin-top:3px;">${arrow}${escapeHtml(c.delta)}</div>` : ''}
  </div>`;
}

function renderKpi(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const fit = getPlannedTextFit(el, 'metric');
  const accent = (el.style as any)?.color || '#16a34a';
  const textCol = (el.style as any)?.textColor || '#111827';
  const mutedCol = (el.style as any)?.mutedColor || '#6b7280';
  return `<div class="kpi-card" style="width:100%;height:100%;${textStyleAttr(el.style)}">
    <div class="fit-text" style="font-size:${fit?.fontSize || 28}px;font-weight:${fit?.fontWeight || 800};line-height:${fit?.lineHeight || 1};-webkit-line-clamp:1;color:${accent};letter-spacing:-0.02em;">${escapeHtml(c.value || '—')}</div>
    <div style="font-size:12px;font-weight:600;color:${textCol};margin-top:4px;">${escapeHtml(c.label || '')}</div>
    ${c.sublabel ? `<div style="font-size:11px;color:${mutedCol};">${escapeHtml(c.sublabel)}</div>` : ''}
  </div>`;
}

function renderChart(el: SlideElementDTO): string {
  const raw = (el.content as any) || {};
  const content: ChartContent = {
    type: raw.type || 'bar',
    title: typeof raw.title === 'string' ? raw.title : undefined,
    categories: Array.isArray(raw.categories) ? raw.categories.map(String) : [],
    series: Array.isArray(raw.series) ? raw.series : [],
    axes: raw.axes,
    legend: raw.legend ?? { visible: true, position: 'bottom' },
    showValues: raw.showValues,
    showGrid: raw.showGrid,
    insight: raw.insight,
    familyId: raw.familyId,
    numberFormat: raw.numberFormat,
  };
  // Shared SVG builder — same code path the editor uses, so all 21 chart
  // types render identically in HTML/PDF/PNG/JPEG export.
  const svg = buildChartSvg(content);
  return `<div style="width:100%;height:100%;${textStyleAttr(el.style)}">${svg}</div>`;
}

function renderTable(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const headers: any[] = c.headers || [];
  const rows: any[][] = c.rows || [];
  const zebra = !!c.zebra;
  const head = `<thead><tr>${headers.map((h) => `<th style="text-align:${h?.align || 'left'};${h?.fill ? `background:${h.fill};` : ''}${h?.color ? `color:${h.color};` : ''}">${escapeHtml(h?.text || '')}</th>`).join('')}</tr></thead>`;
  const body = `<tbody>${rows.map((row, ri) => `<tr${zebra && ri % 2 === 1 ? ' style="background:#f8fafc;"' : ''}>${row.map((cell: any) => `<td style="text-align:${cell?.align || 'left'};${cell?.fill ? `background:${cell.fill};` : ''}${cell?.color ? `color:${cell.color};` : ''}${cell?.bold ? 'font-weight:700;' : ''}"${cell?.colspan ? ` colspan="${cell.colspan}"` : ''}${cell?.rowspan ? ` rowspan="${cell.rowspan}"` : ''}>${escapeHtml(cell?.text || '')}</td>`).join('')}</tr>`).join('')}</tbody>`;
  return `<table>${head}${body}</table>`;
}

function renderImage(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  if (!c.src) {
    const placeholderBg = (el.style as any)?.fill || '#e2e8f0';
    const placeholderCol = (el.style as any)?.stroke || '#94a3b8';
    const radius = el.style?.borderRadius ? `border-radius:${el.style.borderRadius}px;` : '';
    return `<div style="width:100%;height:100%;background:${placeholderBg};${radius}display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;">
      <svg viewBox="0 0 24 24" fill="none" stroke="${placeholderCol}" stroke-width="1.5" style="width:28px;height:28px;opacity:0.5;"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21,15 16,10 5,21"/></svg>
      <span style="font-size:10px;color:${placeholderCol};opacity:0.6;">${escapeHtml(c.alt || 'Image')}</span>
    </div>`;
  }
  const filters = c.filters || {};
  const filterStr = [
    filters.blur ? `blur(${filters.blur}px)` : '',
    filters.brightness !== undefined ? `brightness(${filters.brightness})` : '',
    filters.saturate !== undefined ? `saturate(${filters.saturate})` : '',
    filters.grayscale ? `grayscale(${filters.grayscale})` : '',
  ]
    .filter(Boolean)
    .join(' ');
  const fit = c.fit || 'cover';
  const focal = `object-position:${(c.focalX ?? 0.5) * 100}% ${(c.focalY ?? 0.5) * 100}%`;
  const radius =
    c.borderRadius || el.style?.borderRadius
      ? `border-radius:${c.borderRadius ?? el.style?.borderRadius}px;`
      : '';
  return `<div class="img-wrap" style="${radius}">
    <img src="${escapeAttr(c.src)}" alt="${escapeAttr(c.alt || '')}" style="object-fit:${fit};${focal};${filterStr ? `filter:${filterStr};` : ''}" />
  </div>`;
}

function renderLogo(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  if (c.src) {
    const radius = el.style?.borderRadius ? `border-radius:${el.style.borderRadius}px;` : '';
    return `<div class="img-wrap" style="${radius}"><img src="${escapeAttr(c.src)}" alt="${escapeAttr(c.name || 'Logo')}" style="object-fit:contain;" /></div>`;
  }
  // Text fallback: use accent from style if available
  const textColor = (el.style as any)?.color || '#111827';
  const borderColor = (el.style as any)?.stroke || '#cbd5e1';
  return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:16px;font-weight:800;color:${textColor};border:1px dashed ${borderColor};border-radius:8px;">${escapeHtml(c.name || 'Logo')}</div>`;
}

function renderIconPlaceholder(el: SlideElementDTO): string {
  // Server can't render lucide icons (they're React components). Use a circle
  // tag placeholder + name. The canvas-renders-best path is PPTX where shapes
  // are first-class; for HTML-based exports the placeholder is acceptable.
  const c = (el.content as any) || {};
  const color = (el.style as any)?.color || c.color || '#16a34a';
  return `<div class="icon-wrap" style="color:${color};">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${c.strokeWidth || 2}"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>
    ${c.name ? `<span style="position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:9px;color:currentColor;opacity:0.6;">${escapeHtml(c.name)}</span>` : ''}
  </div>`;
}

function renderShape(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const fill = c.fill || (el.style as any)?.fill || '#16a34a';
  const stroke = c.stroke || (el.style as any)?.stroke || 'transparent';
  const strokeW = c.strokeWidth ?? (el.style as any)?.strokeWidth ?? 0;
  const grad = c.gradient
    ? `<defs><linearGradient id="g${el.id.slice(0, 8)}" x1="0%" y1="0%" x2="100%" y2="0%">${(c.gradient.stops || []).map((s: any) => `<stop offset="${Math.round((s.offset || 0) * 100)}%" stop-color="${s.color}" />`).join('')}</linearGradient></defs>`
    : '';
  const fillRef = c.gradient ? `url(#g${el.id.slice(0, 8)})` : fill;
  switch (c.kind || 'rect') {
    case 'circle':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<circle cx="50" cy="50" r="48" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
    case 'ellipse':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<ellipse cx="50" cy="50" rx="48" ry="38" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
    case 'triangle':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<polygon points="50,4 96,96 4,96" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
    case 'arrow':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<polygon points="4,40 60,40 60,18 96,50 60,82 60,60 4,60" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
    case 'star':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<polygon points="50,5 61,38 96,38 68,58 79,92 50,72 21,92 32,58 4,38 39,38" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
    case 'roundedRect':
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<rect x="2" y="2" width="96" height="96" rx="10" ry="10" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
    default:
      return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">${grad}<rect x="0" y="0" width="100" height="100" fill="${fillRef}" stroke="${stroke}" stroke-width="${strokeW}" /></svg>`;
  }
}

function renderLine(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  return `<svg viewBox="0 0 100 100" preserveAspectRatio="none" style="width:100%;height:100%;">
    <line x1="0" y1="50" x2="100" y2="50" stroke="${c.stroke || '#cbd5e1'}" stroke-width="${c.strokeWidth || 1}" ${c.dashed ? 'stroke-dasharray="4 4"' : ''} />
  </svg>`;
}

function renderDivider(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  if (c.label) {
    return `<div style="width:100%;height:100%;display:flex;align-items:center;gap:8px;">
      <div style="flex:1;height:1px;background:${c.stroke || '#e2e8f0'};"></div>
      <span style="font-size:11px;text-transform:uppercase;letter-spacing:0.08em;color:#6b7280;">${escapeHtml(c.label)}</span>
      <div style="flex:1;height:1px;background:${c.stroke || '#e2e8f0'};"></div>
    </div>`;
  }
  return `<div style="width:100%;height:100%;display:flex;align-items:center;"><div style="width:100%;height:${c.strokeWidth || 1}px;background:${c.stroke || '#e2e8f0'};"></div></div>`;
}

function renderFooter(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  return `<div class="footer-text" style="width:100%;height:100%;display:flex;align-items:center;${textStyleAttr(el.style)}">${escapeHtml(c.text || '')}</div>`;
}

function renderPageNumber(el: SlideElementDTO, page: number, total: number): string {
  const c = (el.content as any) || {};
  const text = c.format === 'pageOfTotal' ? `${page} / ${total}` : `${page}`;
  return `<div class="page-num" style="width:100%;height:100%;">${text}</div>`;
}

function renderPricingCard(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const tiers: any[] = c.tiers || [];
  const accent = c.accent || '#dc2626';
  const accent2 = c.accent2 || '#06b6d4';
  const textCol = c.textColor || '#111111';
  const mutedCol = c.mutedColor || '#5f646d';
  const panelBg = c.panelColor || '#ffffff';
  const lineCol = c.lineColor || '#e5e7eb';
  const count = tiers.length || 1;
  const gap = count <= 3 ? 12 : 8;
  const padV = count <= 3 ? 18 : 12;
  const padH = count <= 3 ? 16 : 12;
  const priceSize = count <= 3 ? 22 : 17;
  const nameSize = count <= 3 ? 12 : 10;
  const featSize = count <= 3 ? 10 : 9;

  return `<div style="display:flex;gap:${gap}px;width:100%;height:100%;align-items:stretch;">${tiers
    .map((t: any) => {
      const isHL = !!t.highlight;
      const bg = isHL ? accent : panelBg;
      const bdr = isHL ? accent : lineCol;
      const nameC = isHL ? '#ffffff' : mutedCol;
      const priceC = isHL ? '#ffffff' : textCol;
      const featC = isHL ? 'rgba(255,255,255,0.85)' : mutedCol;
      const checkC = isHL ? 'rgba(255,255,255,0.9)' : accent;
      const badgeHtml = isHL
        ? `<div style="position:absolute;top:-11px;left:50%;transform:translateX(-50%);background:${accent2};color:#fff;font-size:9px;font-weight:700;padding:2px 10px;border-radius:20px;white-space:nowrap;letter-spacing:0.05em;">BEST VALUE</div>`
        : '';
      return `<div style="position:relative;flex:1;padding:${padV}px ${padH}px;background:${bg};border:1.5px solid ${bdr};border-radius:10px;display:flex;flex-direction:column;gap:${count <= 3 ? 8 : 5}px;box-shadow:${isHL ? `0 4px 18px rgba(0,0,0,0.13)` : `0 1px 4px rgba(0,0,0,0.06)`};">
      ${badgeHtml}
      <div style="font-size:${nameSize}px;font-weight:600;color:${nameC};letter-spacing:0.03em;text-transform:uppercase;">${escapeHtml(t.name || '')}</div>
      <div style="font-size:${priceSize}px;font-weight:800;color:${priceC};line-height:1;">${escapeHtml(t.price || '')}${t.period ? `<span style="font-size:${Math.round(priceSize * 0.55)}px;font-weight:500;opacity:0.7;"> /${escapeHtml(t.period)}</span>` : ''}</div>
      <div style="width:100%;height:1px;background:${isHL ? 'rgba(255,255,255,0.25)' : lineCol};margin:2px 0;"></div>
      <div style="display:flex;flex-direction:column;gap:${count <= 3 ? 5 : 3}px;">${(
        t.features || []
      )
        .map(
          (f: string) => `
        <div style="display:flex;align-items:flex-start;gap:5px;">
          <span style="color:${checkC};font-size:${featSize + 1}px;font-weight:700;flex-shrink:0;margin-top:1px;">✓</span>
          <span style="font-size:${featSize}px;color:${featC};line-height:1.35;">${escapeHtml(f)}</span>
        </div>`,
        )
        .join('')}
      </div>
    </div>`;
    })
    .join('')}</div>`;
}

function renderFeatureGrid(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const items: any[] = c.items || [];
  const cols = c.columns || 3;
  return `<div class="feature-grid" style="grid-template-columns:repeat(${cols},1fr);">${items
    .map(
      (it) => `
    <div class="feature-card">
      <div class="t">${escapeHtml(it.title || '')}</div>
      ${it.description ? `<div class="d">${escapeHtml(it.description)}</div>` : ''}
    </div>
  `,
    )
    .join('')}</div>`;
}

function renderTimeline(el: SlideElementDTO): string {
  const items: any[] = (el.content as any)?.items || [];
  return `<div class="timeline">${items
    .map(
      (it) => `
    <div class="timeline-item">
      ${it.date ? `<div class="d">${escapeHtml(it.date)}</div>` : ''}
      <div class="t">${escapeHtml(it.title || '')}</div>
      ${it.description ? `<div class="x">${escapeHtml(it.description)}</div>` : ''}
    </div>`,
    )
    .join('')}</div>`;
}

function renderRoadmap(el: SlideElementDTO): string {
  const phases: any[] = (el.content as any)?.phases || [];
  if (phases.length === 0) return '<div style="width:100%;height:100%;"></div>';
  // Axis line sits at 22px from top of each column; dot is 14px (r=7), margin-top=15 → center at 22px
  return `<div style="display:flex;width:100%;height:100%;position:relative;gap:0;align-items:stretch;">
    <div style="position:absolute;top:22px;left:3%;right:3%;height:2px;background:var(--border,#e2e8f0);z-index:0;"></div>
    ${phases
      .map(
        (p) => `
    <div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:8px;padding:0 6px;position:relative;z-index:1;">
      <div style="width:14px;height:14px;border-radius:50%;background:var(--accent,#16a34a);margin-top:15px;flex-shrink:0;box-shadow:0 0 0 3px var(--accent-light,rgba(22,163,74,0.18));"></div>
      <div style="flex:1;width:100%;padding:10px 12px;background:var(--surface,#f8fafc);border:1px solid var(--border,#e2e8f0);border-top:2px solid var(--accent,#16a34a);border-radius:8px;overflow:hidden;display:flex;flex-direction:column;gap:4px;">
        ${p.period ? `<div style="font-size:10px;color:var(--accent,#16a34a);font-weight:700;letter-spacing:0.04em;text-transform:uppercase;">${escapeHtml(p.period)}</div>` : ''}
        <div style="font-size:13px;font-weight:700;color:var(--text,#111827);line-height:1.25;">${escapeHtml(p.phase || '')}</div>
        <ul style="font-size:11px;color:var(--muted,#6b7280);list-style:none;padding:0;margin:0;display:flex;flex-direction:column;gap:3px;">${(p.bullets || []).map((b: string) => `<li style="display:flex;gap:4px;align-items:flex-start;"><span style="color:var(--accent,#16a34a);flex-shrink:0;">·</span><span>${escapeHtml(b)}</span></li>`).join('')}</ul>
      </div>
    </div>`,
      )
      .join('')}
  </div>`;
}

function renderTeamCard(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const members: any[] = c.members || [];
  const accent = c.accent || 'var(--accent, #059669)';
  const textCol = c.textColor || 'var(--text, #111827)';
  const mutedCol = c.mutedColor || 'var(--muted, #6b7280)';
  const surfBg = el.style?.fill || 'var(--surface, #f8fafc)';
  const surfBdr = `var(--border, #e2e8f0)`;
  const count = members.length;

  // Avatar scales: 2→120px, 3→90px, 4→72px, 5-6→56px
  const avSize = count <= 2 ? 120 : count <= 3 ? 90 : count <= 4 ? 72 : 56;
  // 3 members → 3 cols so all fit in one row (2-col creates overflow with 3rd card)
  const cols = count <= 2 ? count : count === 3 ? 3 : count <= 4 ? 2 : 3;
  const pad = count <= 2 ? 20 : count <= 4 ? 16 : 12;
  const nSize = count <= 2 ? 16 : count <= 4 ? 14 : 13;
  const rSize = count <= 2 ? 13 : 12;
  const bSize = 13;
  // Limit bio to 100 chars for 2-col, 80 for 3-col
  const bioMax = count <= 4 ? 100 : 0;

  const cardCss = `flex:1 1 calc(${100 / cols}% - 12px);padding:${pad}px 14px;background:${surfBg};border:1px solid ${surfBdr};border-radius:10px;display:flex;flex-direction:column;align-items:center;gap:${count <= 2 ? 10 : 6}px;overflow:hidden;`;

  return `<div style="display:flex;gap:12px;width:100%;height:100%;flex-wrap:wrap;align-content:flex-start;">${members
    .map(
      (m: any) => `
    <div style="${cardCss}">
      ${
        m.photoUrl
          ? `<img src="${escapeAttr(m.photoUrl)}" alt="${escapeAttr(m.name || '')}" style="width:${avSize}px;height:${avSize}px;border-radius:50%;object-fit:cover;flex-shrink:0;border:3px solid ${surfBdr};" />`
          : `<div style="width:${avSize}px;height:${avSize}px;border-radius:50%;background:${accent};display:flex;align-items:center;justify-content:center;color:#fff;font-weight:800;font-size:${Math.round(avSize * 0.38)}px;flex-shrink:0;letter-spacing:-1px;">${escapeHtml((m.name || '?').slice(0, 2).toUpperCase())}</div>`
      }
      <div style="font-size:${nSize}px;font-weight:700;color:${textCol};text-align:center;line-height:1.2;">${escapeHtml(m.name || '')}</div>
      ${m.role ? `<div style="font-size:${rSize}px;font-weight:600;color:${accent};text-align:center;letter-spacing:0.02em;">${escapeHtml(m.role)}</div>` : ''}
      ${m.bio && bioMax > 0 ? `<div style="font-size:${bSize}px;color:${mutedCol};text-align:center;line-height:1.4;overflow:hidden;">${escapeHtml((m.bio || '').slice(0, bioMax))}</div>` : ''}
    </div>`,
    )
    .join('')}</div>`;
}

function renderSwot(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const cell = (h: string, cls: string, items: string[]) =>
    `<div class="swot-cell ${cls}"><div class="h">${h}</div><ul>${(items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`;
  return `<div class="swot">${cell('Strengths', 's', c.strengths)}${cell('Weaknesses', 'w', c.weaknesses)}${cell('Opportunities', 'o', c.opportunities)}${cell('Threats', 't', c.threats)}</div>`;
}

function renderFundsAllocation(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const items: any[] = c.items || [];
  const textCol = c.textColor || '#111111';
  const mutedCol = c.mutedColor || '#5f646d';
  const lineCol = c.lineColor || '#e5e7eb';
  const maxPct = Math.max(...items.map((i: any) => Number(i.percentage) || 0), 1);

  return `<div style="display:flex;flex-direction:column;justify-content:center;gap:10px;width:100%;height:100%;padding:4px 0;">${items
    .map((item: any) => {
      const pct = Number(item.percentage) || 0;
      const barW = Math.round((pct / maxPct) * 100);
      const color = item.color || '#dc2626';
      return `<div style="display:flex;flex-direction:column;gap:4px;">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:7px;">
            <div style="width:10px;height:10px;border-radius:50%;background:${color};flex-shrink:0;"></div>
            <span style="font-size:11px;font-weight:600;color:${textCol};">${escapeHtml(item.category || '')}</span>
          </div>
          <span style="font-size:11px;font-weight:700;color:${color};">${pct}%</span>
        </div>
        <div style="width:100%;height:6px;background:${lineCol};border-radius:4px;overflow:hidden;">
          <div style="width:${barW}%;height:100%;background:${color};border-radius:4px;transition:width 0.3s;"></div>
        </div>
      </div>`;
    })
    .join('')}</div>`;
}

function renderComparison(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const cols: string[] = c.columns || [];
  const rows: any[] = c.rows || [];
  const accent = c.accentColor || 'var(--accent, #16a34a)';
  const accentBg = c.accentLightBg || 'var(--accent-light, rgba(22,163,74,0.09))';
  return `<table class="comparison" style="font-size:13px;">
    <thead>
      <tr>
        <th style="width:30%;"></th>
        ${cols
          .map((col, i) =>
            i === c.highlightColumn
              ? `<th style="background:${accent};color:#ffffff;text-align:center;border-bottom:none;">${escapeHtml(col)}</th>`
              : `<th style="text-align:center;color:var(--muted,#6b7280);">${escapeHtml(col)}</th>`,
          )
          .join('')}
      </tr>
    </thead>
    <tbody>
      ${rows
        .map(
          (r) => `
        <tr>
          <td style="font-weight:600;color:var(--text,#111827);">${escapeHtml(r.feature || '')}</td>
          ${(r.values || [])
            .map(
              (v: string, i: number) => `
            <td style="text-align:center;${i === c.highlightColumn ? `background:${accentBg};font-weight:700;color:${accent};` : `color:var(--muted,#6b7280);`}">${escapeHtml(v)}</td>
          `,
            )
            .join('')}
        </tr>`,
        )
        .join('')}
    </tbody>
  </table>`;
}

function renderProcessSteps(el: SlideElementDTO): string {
  const steps: any[] = (el.content as any)?.steps || [];
  const parts: string[] = [];
  for (let i = 0; i < steps.length; i++) {
    const s = steps[i];
    parts.push(`<div class="process-step">
      <div class="nbadge">${i + 1}</div>
      <div class="t">${escapeHtml(s.title || '')}</div>
      ${s.description ? `<div class="d">${escapeHtml(s.description)}</div>` : ''}
    </div>`);
    if (i < steps.length - 1) parts.push(`<div class="process-arrow">→</div>`);
  }
  return `<div class="process">${parts.join('')}</div>`;
}

function renderVideoPlaceholder(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  if (c.posterUrl) {
    return `<div class="img-wrap"><img src="${escapeAttr(c.posterUrl)}" alt="video poster" style="object-fit:cover;" /></div>`;
  }
  return `<div style="width:100%;height:100%;background:#0f172a;color:#fff;display:flex;align-items:center;justify-content:center;border-radius:8px;font-size:13px;">▶ ${escapeHtml(c.caption || 'Video')}</div>`;
}

function renderEmbedPlaceholder(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  return `<div style="width:100%;height:100%;background:#f1f5f9;border:2px dashed #cbd5e1;border-radius:8px;display:flex;flex-direction:column;align-items:center;justify-content:center;color:#64748b;">
    <div style="font-size:13px;font-weight:700;">${escapeHtml(c.providerLabel || 'Embedded media')}</div>
    ${c.caption ? `<div style="font-size:11px;margin-top:4px;">${escapeHtml(c.caption)}</div>` : ''}
  </div>`;
}

// =============================================================================
//  Style helpers
// =============================================================================

function styleAttr(s?: ElementStyle | null): string {
  if (!s) return '';
  const parts: string[] = [];
  if (s.fill && s.fill !== 'transparent') parts.push(`background:${s.fill};`);
  if (s.gradient) parts.push(`background:${gradientCss(s.gradient as any)};`);
  if (s.opacity !== undefined) parts.push(`opacity:${s.opacity};`);
  if (s.stroke) parts.push(`border:${s.strokeWidth ?? 1}px solid ${s.stroke};`);
  if (s.borderRadius !== undefined) parts.push(`border-radius:${s.borderRadius}px;`);
  if (s.shadow) parts.push(`box-shadow:${s.shadow};`);
  if (s.paddingTop !== undefined) parts.push(`padding-top:${s.paddingTop}px;`);
  if (s.paddingRight !== undefined) parts.push(`padding-right:${s.paddingRight}px;`);
  if (s.paddingBottom !== undefined) parts.push(`padding-bottom:${s.paddingBottom}px;`);
  if (s.paddingLeft !== undefined) parts.push(`padding-left:${s.paddingLeft}px;`);
  return parts.join('');
}

// Style props that should apply to the inner text element (not the outer box).
function textStyleAttr(s?: ElementStyle | null): string {
  if (!s) return '';
  const parts: string[] = [];
  if (s.fontFamily) parts.push(`font-family:${s.fontFamily.replace(/"/g, "'")};`);
  if (s.fontSize !== undefined) parts.push(`font-size:${s.fontSize}px;`);
  if (s.fontWeight !== undefined) parts.push(`font-weight:${s.fontWeight};`);
  if (s.fontStyle) parts.push(`font-style:${s.fontStyle};`);
  if (s.textDecoration) parts.push(`text-decoration:${s.textDecoration};`);
  if (s.textTransform) parts.push(`text-transform:${s.textTransform};`);
  if (s.color) parts.push(`color:${s.color};`);
  if (s.lineHeight !== undefined) parts.push(`line-height:${s.lineHeight};`);
  if (s.letterSpacing !== undefined) parts.push(`letter-spacing:${s.letterSpacing}px;`);
  if (s.textAlign) parts.push(`text-align:${s.textAlign};`);
  if (s.textShadow) parts.push(`text-shadow:${s.textShadow};`);
  return parts.join('');
}

function escapeHtml(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function escapeAttr(s: any): string {
  return escapeHtml(s).replace(/'/g, '&#39;');
}
