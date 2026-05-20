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

import type { SlideElementDTO, ElementStyle, SlideBackground, SlideThemeTokens } from '../slides/element-types';
import type { RenderDeckInput, RenderSlideInput } from './render-types';
import { getPlannedTextFit } from './render-planner';

export const SLIDE_VIEWPORT_WIDTH  = 1280;
export const SLIDE_VIEWPORT_HEIGHT = 720;
export const SLIDE_PAGE_WIDTH_IN   = 13.333;
export const SLIDE_PAGE_HEIGHT_IN  = 7.5;

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
  <style>
    @page { size: ${SLIDE_PAGE_WIDTH_IN}in ${SLIDE_PAGE_HEIGHT_IN}in; margin: 0; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    html, body { width: ${SLIDE_VIEWPORT_WIDTH}px; background: #f8fafc; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #111827; }
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
    .el-list { list-style: none; padding: 0; margin: 0; }
    .el-list li { display: flex; gap: 8px; margin-bottom: 4px; line-height: 1.55; }
    .el-list .marker { flex: 0 0 auto; margin-top: 8px; color: #16a34a; }
    .el-list .marker-dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; }
    .el-numbered { counter-reset: li; }
    .el-numbered li { counter-increment: li; }
    .el-numbered .marker::before { content: counter(li) "."; font-weight: 600; color: #16a34a; }
    .metric .v { font-weight: 900; line-height: 1; white-space: nowrap; }
    .metric .l { font-size: 12px; color: #6b7280; margin-top: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
    .metric .d { font-size: 11px; color: #6b7280; }
    .kpi-card { display: flex; flex-direction: column; justify-content: center; padding: 14px 16px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .quote-mark { font-size: 40px; line-height: 1; color: #16a34a; opacity: 0.4; margin-bottom: 6px; flex: 0 0 auto; }
    .testimonial { padding: 18px; border-radius: 10px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .testimonial-author { font-size: 13px; font-weight: 700; margin-top: 12px; color: #111827; }
    .testimonial-role  { font-size: 11px; color: #6b7280; }
    table { border-collapse: collapse; width: 100%; height: 100%; font-size: 12px; }
    table th, table td { padding: 6px 10px; border: 1px solid #e2e8f0; }
    table th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
    .pricing-tier { padding: 14px; border-radius: 10px; border: 1px solid #e2e8f0; background: #fff; display: flex; flex-direction: column; gap: 6px; }
    .pricing-tier.highlight { border-color: #16a34a; box-shadow: 0 4px 12px rgba(22,163,74,0.12); }
    .pricing-tier .name { font-size: 14px; font-weight: 700; color: #111827; }
    .pricing-tier .price { font-size: 26px; font-weight: 800; color: #16a34a; }
    .pricing-tier ul { list-style: disc inside; margin-top: 8px; padding: 0; font-size: 11px; color: #475569; }
    .feature-grid { display: grid; gap: 10px; width: 100%; height: 100%; }
    .feature-card { padding: 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .feature-card .t { font-weight: 700; font-size: 12px; color: #111827; }
    .feature-card .d { font-size: 11px; color: #6b7280; margin-top: 4px; }
    .timeline { display: flex; gap: 16px; width: 100%; height: 100%; align-items: stretch; }
    .timeline-item { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .timeline-item .d { font-size: 11px; color: #16a34a; font-weight: 700; }
    .timeline-item .t { font-size: 13px; font-weight: 700; color: #111827; }
    .timeline-item .x { font-size: 11px; color: #6b7280; }
    .swot { display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 8px; width: 100%; height: 100%; }
    .swot-cell { padding: 10px; border-radius: 8px; }
    .swot-cell .h { font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .swot-cell.s { background: #f0fdf4; color: #14532d; }
    .swot-cell.w { background: #fef2f2; color: #7f1d1d; }
    .swot-cell.o { background: #eff6ff; color: #1e3a8a; }
    .swot-cell.t { background: #fefce8; color: #713f12; }
    .swot-cell ul { list-style: disc; padding-left: 14px; font-size: 11px; }
    .comparison { width: 100%; height: 100%; font-size: 11px; }
    .process { display: flex; gap: 12px; width: 100%; height: 100%; align-items: stretch; }
    .process-step { flex: 1; padding: 10px; border-radius: 8px; background: #f8fafc; border: 1px solid #e2e8f0; }
    .process-step .n { font-size: 22px; font-weight: 800; color: #16a34a; }
    .process-step .t { font-size: 12px; font-weight: 700; color: #111827; margin-top: 4px; }
    .process-step .d { font-size: 11px; color: #6b7280; margin-top: 2px; }
    .img-wrap { width: 100%; height: 100%; overflow: hidden; }
    .img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }
    .icon-wrap { display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; }
    .icon-wrap svg { width: 60%; height: 60%; }
    .footer-text { font-size: 10px; color: #94a3b8; }
    .page-num { display: flex; align-items: center; justify-content: flex-end; font-size: 10px; color: #94a3b8; }
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

function renderSlidePage(slide: RenderSlideInput): string {
  const bg = renderBackground(slide.background, slide.themeTokens);
  const els = (slide.elements || [])
    .filter((e) => e.visible !== false)
    .sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0))
    .map((e) => renderElement(e, slide.index + 1, slide.total))
    .join('');
  return `<section class="slide-page" data-index="${slide.index}" style="${bg}">${els}</section>`;
}

function renderBackground(bg?: SlideBackground | null, theme?: SlideThemeTokens | null): string {
  // Theme background acts as a fallback if no explicit slide background.
  if (bg) {
    if (bg.type === 'solid' && bg.color) return `background:${bg.color};`;
    if (bg.type === 'gradient' && bg.gradient) return `background:${gradientCss(bg.gradient as any)};`;
    if (bg.type === 'image' && bg.image?.src) {
      return `background:url('${escapeAttr(bg.image.src)}') center/${bg.image.fit || 'cover'} no-repeat;`;
    }
  }
  if (theme?.background) return `background:${theme.background};`;
  return 'background:#ffffff;';
}

function gradientCss(g: any): string {
  if (!g?.stops || g.stops.length === 0) return '#ffffff';
  const stops = g.stops.map((s: any) => `${s.color} ${Math.round((s.offset || 0) * 100)}%`).join(', ');
  if (g.kind === 'radial') return `radial-gradient(circle, ${stops})`;
  return `linear-gradient(${g.angle ?? 180}deg, ${stops})`;
}

// =============================================================================
//  Per-element renderers
// =============================================================================

function renderElement(el: SlideElementDTO, pageNumber: number, total: number): string {
  const left   = `${el.x.toFixed(4)}%`;
  const top    = `${el.y.toFixed(4)}%`;
  const width  = `${el.width.toFixed(4)}%`;
  const height = `${el.height.toFixed(4)}%`;
  const transform = el.rotation ? `transform:rotate(${el.rotation}deg);` : '';

  const inner = renderElementInner(el, pageNumber, total);
  const style = `left:${left};top:${top};width:${width};height:${height};${transform}${styleAttr(el.style)}`;
  return `<div class="el el-${el.type}" data-id="${el.id}" data-type="${el.type}" style="${style}">${inner}</div>`;
}

function renderElementInner(el: SlideElementDTO, pageNumber: number, total: number): string {
  switch (el.type) {
    case 'heading':       return renderText(el, { defaultSize: 32, defaultWeight: 700 });
    case 'subheading':    return renderText(el, { defaultSize: 18, defaultWeight: 500 });
    case 'paragraph':     return renderText(el, { defaultSize: 14, defaultWeight: 400 });
    case 'caption':       return renderText(el, { defaultSize: 11, defaultWeight: 400 });
    case 'label':         return renderText(el, { defaultSize: 11, defaultWeight: 600 });
    case 'cta':           return renderCta(el);
    case 'quote':         return renderQuote(el);
    case 'testimonial':   return renderTestimonial(el);
    case 'bulletList':    return renderBulletList(el);
    case 'numberedList':  return renderNumberedList(el);
    case 'metric':        return renderMetric(el);
    case 'kpi':           return renderKpi(el);
    case 'chart':         return renderChart(el);
    case 'table':         return renderTable(el);
    case 'image':         return renderImage(el);
    case 'logo':          return renderLogo(el);
    case 'icon':          return renderIconPlaceholder(el);
    case 'shape':         return renderShape(el);
    case 'line':          return renderLine(el);
    case 'divider':       return renderDivider(el);
    case 'footer':        return renderFooter(el);
    case 'pageNumber':    return renderPageNumber(el, pageNumber, total);
    case 'pricingCard':   return renderPricingCard(el);
    case 'featureGrid':   return renderFeatureGrid(el);
    case 'timeline':      return renderTimeline(el);
    case 'roadmap':       return renderRoadmap(el);
    case 'teamCard':      return renderTeamCard(el);
    case 'swot':          return renderSwot(el);
    case 'comparison':    return renderComparison(el);
    case 'processSteps':  return renderProcessSteps(el);
    case 'videoPlaceholder':         return renderVideoPlaceholder(el);
    case 'embeddedMediaPlaceholder': return renderEmbedPlaceholder(el);
    default:              return renderText(el, { defaultSize: 14, defaultWeight: 400 });
  }
}

function renderText(el: SlideElementDTO, opts: { defaultSize: number; defaultWeight?: number }): string {
  const c = (el.content as any) || {};
  const html: string | undefined = c.html;
  const text: string = c.text || '';
  const fit = getPlannedTextFit(el) || getPlannedTextFit({ ...el, style: { ...(el.style || {}), fontSize: opts.defaultSize, fontWeight: opts.defaultWeight } } as SlideElementDTO);
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
  const bg = variant === 'primary' ? '#16a34a' : variant === 'outline' ? 'transparent' : '#f3f4f6';
  const color = variant === 'primary' ? '#fff' : '#111827';
  const border = variant === 'outline' ? '2px solid #16a34a' : 'none';
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
  const items: any[] = ((el.content as any)?.items || []);
  const li = items.map((it) => {
    const body = it.html && it.html.trim() ? it.html : escapeHtml(it.text || '');
    return `<li><span class="marker marker-dot"></span><span>${body}</span></li>`;
  }).join('');
  return `<ul class="el-list" style="width:100%;height:100%;font-size:14px;color:#1f2937;${textStyleAttr(el.style)}">${li || '<li style="color:#9ca3af;">(empty list)</li>'}</ul>`;
}

function renderNumberedList(el: SlideElementDTO): string {
  const items: any[] = ((el.content as any)?.items || []);
  const li = items.map((it) => {
    const body = it.html && it.html.trim() ? it.html : escapeHtml(it.text || '');
    return `<li><span class="marker"></span><span>${body}</span></li>`;
  }).join('');
  return `<ol class="el-list el-numbered" style="width:100%;height:100%;font-size:14px;color:#1f2937;${textStyleAttr(el.style)}">${li || '<li style="color:#9ca3af;">(empty list)</li>'}</ol>`;
}

function renderMetric(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const fit = getPlannedTextFit(el, 'metric');
  return `<div class="metric" style="width:100%;height:100%;display:flex;flex-direction:column;justify-content:center;${textStyleAttr(el.style)}">
    <div class="v fit-text" style="font-size:${fit?.fontSize || 36}px;line-height:${fit?.lineHeight || 1};-webkit-line-clamp:1;color:${(el.style as any)?.color || '#16a34a'};">${escapeHtml(c.value || '—')}${c.unit ? `<span style="font-size:0.5em;color:#6b7280;margin-left:4px;">${escapeHtml(c.unit)}</span>` : ''}</div>
    <div class="l">${escapeHtml(c.label || '')}</div>
    ${c.delta ? `<div class="d" style="color:${c.deltaDirection === 'up' ? '#16a34a' : c.deltaDirection === 'down' ? '#dc2626' : '#6b7280'};">${escapeHtml(c.delta)}</div>` : ''}
  </div>`;
}

function renderKpi(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const fit = getPlannedTextFit(el, 'metric');
  return `<div class="kpi-card" style="width:100%;height:100%;${textStyleAttr(el.style)}">
    <div class="fit-text" style="font-size:${fit?.fontSize || 28}px;font-weight:${fit?.fontWeight || 800};line-height:${fit?.lineHeight || 1};-webkit-line-clamp:1;color:#16a34a;">${escapeHtml(c.value || '—')}</div>
    <div style="font-size:12px;font-weight:600;color:#111827;margin-top:4px;">${escapeHtml(c.label || '')}</div>
    ${c.sublabel ? `<div style="font-size:11px;color:#6b7280;">${escapeHtml(c.sublabel)}</div>` : ''}
  </div>`;
}

function renderChart(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const kind = c.type || 'bar';
  const categories: string[] = c.categories || [];
  const series: any[] = c.series || [];
  // Compact inline SVG — matches the canvas renderer's basic shape geometry.
  const svg = renderChartSvg(kind, categories, series, c.title);
  return `<div style="width:100%;height:100%;display:flex;flex-direction:column;${textStyleAttr(el.style)}">
    ${c.title ? `<div style="font-size:13px;font-weight:700;color:#111827;margin-bottom:6px;">${escapeHtml(c.title)}</div>` : ''}
    <div style="flex:1;min-height:0;">${svg}</div>
  </div>`;
}

function renderChartSvg(kind: string, categories: string[], series: any[], _title?: string): string {
  const W = 100, H = 100;
  const max = Math.max(1, ...series.flatMap((s) => (s.values || []).map(Number).filter((n: number) => Number.isFinite(n))));
  const palette = ['#16a34a', '#0ea5e9', '#a855f7', '#f59e0b', '#ef4444'];

  if (kind === 'pie' || kind === 'donut') {
    const values: number[] = (series[0]?.values || []).map(Number);
    const total = values.reduce((a, b) => a + b, 0) || 1;
    let a0 = -Math.PI / 2;
    const cx = 50, cy = 50, r = 42, ri = kind === 'donut' ? 22 : 0;
    const arcs = values.map((v, i) => {
      const a1 = a0 + (v / total) * Math.PI * 2;
      const large = a1 - a0 > Math.PI ? 1 : 0;
      const x0 = cx + Math.cos(a0) * r, y0 = cy + Math.sin(a0) * r;
      const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r;
      const xi0 = cx + Math.cos(a0) * ri, yi0 = cy + Math.sin(a0) * ri;
      const xi1 = cx + Math.cos(a1) * ri, yi1 = cy + Math.sin(a1) * ri;
      const d = ri > 0
        ? `M ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} L ${xi1} ${yi1} A ${ri} ${ri} 0 ${large} 0 ${xi0} ${yi0} Z`
        : `M ${cx} ${cy} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`;
      a0 = a1;
      return `<path d="${d}" fill="${palette[i % palette.length]}" />`;
    }).join('');
    return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:100%;">${arcs}</svg>`;
  }

  // bar / line / area / kpi / comparison — bar fallback
  const n = categories.length || (series[0]?.values || []).length;
  const sCount = series.length || 1;
  const groupW = (W - 8) / Math.max(1, n);
  const barW = (groupW - 2) / sCount;
  let body = '';
  series.forEach((s, si) => {
    (s.values || []).forEach((v: number, i: number) => {
      const h = (Math.max(0, Number(v)) / max) * (H - 14);
      const x = 4 + i * groupW + si * barW + 1;
      const y = H - 6 - h;
      if (kind === 'bar') {
        body += `<rect x="${x}" y="${y}" width="${Math.max(0.5, barW - 0.5)}" height="${h}" fill="${s.color || palette[si % palette.length]}" />`;
      }
    });
  });

  if (kind === 'line' || kind === 'area') {
    series.forEach((s, si) => {
      const vals: number[] = s.values || [];
      const pts = vals.map((v, i) => {
        const x = 4 + i * groupW + groupW / 2;
        const y = H - 6 - (Math.max(0, Number(v)) / max) * (H - 14);
        return `${x.toFixed(2)},${y.toFixed(2)}`;
      });
      const color = s.color || palette[si % palette.length];
      if (kind === 'area' && pts.length > 1) {
        const first = pts[0].split(',')[0];
        const last  = pts[pts.length - 1].split(',')[0];
        body += `<polygon points="${pts.join(' ')} ${last},${H - 6} ${first},${H - 6}" fill="${color}" fill-opacity="0.18" />`;
      }
      body += `<polyline points="${pts.join(' ')}" fill="none" stroke="${color}" stroke-width="1.5" />`;
    });
  }

  body += `<line x1="4" y1="${H - 6}" x2="${W - 4}" y2="${H - 6}" stroke="#cbd5e1" stroke-width="0.5" />`;
  return `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" style="width:100%;height:100%;">${body}</svg>`;
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
    return `<div style="width:100%;height:100%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:12px;">No image</div>`;
  }
  const filters = c.filters || {};
  const filterStr = [
    filters.blur ? `blur(${filters.blur}px)` : '',
    filters.brightness !== undefined ? `brightness(${filters.brightness})` : '',
    filters.saturate !== undefined ? `saturate(${filters.saturate})` : '',
    filters.grayscale ? `grayscale(${filters.grayscale})` : '',
  ].filter(Boolean).join(' ');
  const fit = c.fit || 'cover';
  const focal = `object-position:${(c.focalX ?? 0.5) * 100}% ${(c.focalY ?? 0.5) * 100}%`;
  const radius = c.borderRadius ? `border-radius:${c.borderRadius}px;` : '';
  return `<div class="img-wrap" style="${radius}">
    <img src="${escapeAttr(c.src)}" alt="${escapeAttr(c.alt || '')}" style="object-fit:${fit};${focal};${filterStr ? `filter:${filterStr};` : ''}" />
  </div>`;
}

function renderLogo(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  if (c.src) {
    return `<div class="img-wrap"><img src="${escapeAttr(c.src)}" alt="${escapeAttr(c.name || 'Logo')}" style="object-fit:contain;" /></div>`;
  }
  return `<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;font-size:16px;font-weight:800;color:#111827;border:1px dashed #cbd5e1;border-radius:8px;">${escapeHtml(c.name || 'Logo')}</div>`;
}

function renderIconPlaceholder(el: SlideElementDTO): string {
  // Server can't render lucide icons (they're React components). Use a circle
  // tag placeholder + name. The canvas-renders-best path is PPTX where shapes
  // are first-class; for HTML-based exports the placeholder is acceptable.
  const c = (el.content as any) || {};
  const color = c.color || '#16a34a';
  return `<div class="icon-wrap" style="color:${color};">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${c.strokeWidth || 2}"><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="2" fill="currentColor" /></svg>
    ${c.name ? `<span style="position:absolute;bottom:2px;left:0;right:0;text-align:center;font-size:9px;color:#94a3b8;">${escapeHtml(c.name)}</span>` : ''}
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
  const tiers: any[] = ((el.content as any)?.tiers || []);
  return `<div style="display:flex;gap:10px;width:100%;height:100%;">${tiers.map((t) => `
    <div class="pricing-tier ${t.highlight ? 'highlight' : ''}" style="flex:1;">
      <div class="name">${escapeHtml(t.name || '')}</div>
      <div class="price">${escapeHtml(t.price || '')}${t.period ? `<span style="font-size:12px;font-weight:500;color:#6b7280;">/${escapeHtml(t.period)}</span>` : ''}</div>
      <ul>${(t.features || []).map((f: string) => `<li>${escapeHtml(f)}</li>`).join('')}</ul>
    </div>
  `).join('')}</div>`;
}

function renderFeatureGrid(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const items: any[] = c.items || [];
  const cols = c.columns || 3;
  return `<div class="feature-grid" style="grid-template-columns:repeat(${cols},1fr);">${items.map((it) => `
    <div class="feature-card">
      <div class="t">${escapeHtml(it.title || '')}</div>
      ${it.description ? `<div class="d">${escapeHtml(it.description)}</div>` : ''}
    </div>
  `).join('')}</div>`;
}

function renderTimeline(el: SlideElementDTO): string {
  const items: any[] = ((el.content as any)?.items || []);
  return `<div class="timeline">${items.map((it) => `
    <div class="timeline-item">
      ${it.date ? `<div class="d">${escapeHtml(it.date)}</div>` : ''}
      <div class="t">${escapeHtml(it.title || '')}</div>
      ${it.description ? `<div class="x">${escapeHtml(it.description)}</div>` : ''}
    </div>`).join('')}</div>`;
}

function renderRoadmap(el: SlideElementDTO): string {
  const phases: any[] = ((el.content as any)?.phases || []);
  return `<div style="display:flex;gap:12px;width:100%;height:100%;">${phases.map((p) => `
    <div class="timeline-item" style="flex:1;">
      ${p.period ? `<div class="d">${escapeHtml(p.period)}</div>` : ''}
      <div class="t">${escapeHtml(p.phase || '')}</div>
      <ul style="font-size:11px;color:#6b7280;list-style:disc inside;margin-top:4px;">${(p.bullets || []).map((b: string) => `<li>${escapeHtml(b)}</li>`).join('')}</ul>
    </div>`).join('')}</div>`;
}

function renderTeamCard(el: SlideElementDTO): string {
  const members: any[] = ((el.content as any)?.members || []);
  return `<div style="display:flex;gap:12px;width:100%;height:100%;flex-wrap:wrap;">${members.map((m) => `
    <div style="flex:1 1 calc(33% - 12px);min-width:140px;padding:10px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;display:flex;flex-direction:column;align-items:center;gap:6px;">
      ${m.photoUrl ? `<img src="${escapeAttr(m.photoUrl)}" alt="${escapeAttr(m.name)}" style="width:48px;height:48px;border-radius:50%;object-fit:cover;" />` : `<div style="width:48px;height:48px;border-radius:50%;background:#e2e8f0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-weight:700;">${escapeHtml((m.name || '?').slice(0,1))}</div>`}
      <div style="font-size:12px;font-weight:700;color:#111827;">${escapeHtml(m.name || '')}</div>
      ${m.role ? `<div style="font-size:11px;color:#16a34a;">${escapeHtml(m.role)}</div>` : ''}
    </div>`).join('')}</div>`;
}

function renderSwot(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const cell = (h: string, cls: string, items: string[]) => `<div class="swot-cell ${cls}"><div class="h">${h}</div><ul>${(items || []).map((i) => `<li>${escapeHtml(i)}</li>`).join('')}</ul></div>`;
  return `<div class="swot">${cell('Strengths','s',c.strengths)}${cell('Weaknesses','w',c.weaknesses)}${cell('Opportunities','o',c.opportunities)}${cell('Threats','t',c.threats)}</div>`;
}

function renderComparison(el: SlideElementDTO): string {
  const c = (el.content as any) || {};
  const cols: string[] = c.columns || [];
  const rows: any[]    = c.rows || [];
  return `<table class="comparison">
    <thead><tr><th></th>${cols.map((col, i) => `<th${c.highlightColumn === i ? ' style="background:#dcfce7;color:#14532d;"' : ''}>${escapeHtml(col)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((r) => `<tr><td style="font-weight:600;">${escapeHtml(r.feature || '')}</td>${(r.values || []).map((v: string, i: number) => `<td${c.highlightColumn === i ? ' style="background:#f0fdf4;"' : ''}>${escapeHtml(v)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>`;
}

function renderProcessSteps(el: SlideElementDTO): string {
  const steps: any[] = ((el.content as any)?.steps || []);
  return `<div class="process">${steps.map((s, i) => `
    <div class="process-step">
      <div class="n">${i + 1}</div>
      <div class="t">${escapeHtml(s.title || '')}</div>
      ${s.description ? `<div class="d">${escapeHtml(s.description)}</div>` : ''}
    </div>`).join('')}</div>`;
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
  if (s.paddingTop !== undefined)    parts.push(`padding-top:${s.paddingTop}px;`);
  if (s.paddingRight !== undefined)  parts.push(`padding-right:${s.paddingRight}px;`);
  if (s.paddingBottom !== undefined) parts.push(`padding-bottom:${s.paddingBottom}px;`);
  if (s.paddingLeft !== undefined)   parts.push(`padding-left:${s.paddingLeft}px;`);
  return parts.join('');
}

// Style props that should apply to the inner text element (not the outer box).
function textStyleAttr(s?: ElementStyle | null): string {
  if (!s) return '';
  const parts: string[] = [];
  if (s.fontFamily)              parts.push(`font-family:${s.fontFamily};`);
  if (s.fontSize !== undefined)  parts.push(`font-size:${s.fontSize}px;`);
  if (s.fontWeight !== undefined)parts.push(`font-weight:${s.fontWeight};`);
  if (s.fontStyle)               parts.push(`font-style:${s.fontStyle};`);
  if (s.textDecoration)          parts.push(`text-decoration:${s.textDecoration};`);
  if (s.textTransform)           parts.push(`text-transform:${s.textTransform};`);
  if (s.color)                   parts.push(`color:${s.color};`);
  if (s.lineHeight !== undefined) parts.push(`line-height:${s.lineHeight};`);
  if (s.letterSpacing !== undefined) parts.push(`letter-spacing:${s.letterSpacing}px;`);
  if (s.textAlign)               parts.push(`text-align:${s.textAlign};`);
  if (s.textShadow)              parts.push(`text-shadow:${s.textShadow};`);
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
