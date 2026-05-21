/**
 * Phase 33.5 — Backend SVG Chart Builder
 *
 * Pure-TS implementation of the same chart math used by the frontend
 * `ChartRenderer`. Returns an SVG string for any ChartContent, which the
 * `ChartRenderingService` then converts to PNG via `sharp` for embedding in
 * PPTX / PDF / PNG / JPEG exports.
 *
 * Single source of truth for chart appearance — when this file's output
 * matches the frontend SVG renderer's output, editor and export are pixel-
 * equivalent.
 *
 * No React. No DOM. No browser globals. Safe to call from a NestJS service.
 */

// Pull the types straight from the canonical frontend definition so the
// builder stays in sync with the slide-element schema. The backend copy of
// this file uses its own local types file.
import type {
  ChartContent, ChartSeries, ChartInsight,
} from '@/types/slide-element';

// =============================================================================
//  Theme — duplicated from frontend/charts/chart-theme.ts but kept small &
//  framework-free. When a familyId is supplied, the palette is the same as
//  the frontend's getChartTheme output (verified by smoke).
// =============================================================================

const LEGACY_PALETTE = [
  '#16a34a', '#0ea5e9', '#7c3aed', '#f59e0b',
  '#ef4444', '#0891b2', '#db2777', '#525252',
];

interface ChartTheme {
  palette:    string[];
  accent:     string;
  text:       string;
  muted:      string;
  grid:       string;
  positive:   string;
  negative:   string;
  fontFamily?:string;
}

const DEFAULT_THEME: ChartTheme = {
  palette: LEGACY_PALETTE,
  accent:  '#16a34a',
  text:    '#111827',
  muted:   '#6b7280',
  grid:    '#e5e7eb',
  positive:'#16a34a',
  negative:'#ef4444',
};

// Family → accent colour map (mirrors the frontend's card-variants.ts).
// Charts in unknown families fall back to the legacy palette.
const FAMILY_ACCENT: Record<string, string> = {
  'crimson-dark':         '#ef4444',
  'light-blue-business':  '#2563eb',
  'editorial-report':     '#0f172a',
  'investor-minimal':     '#3b82f6',
  'corporate-monochrome': '#475569',
  'luxury-dark':          '#d4af37',
  'soft-geometric-blue':  '#60a5fa',
  'startup-gradient':     '#a855f7',
};
const FAMILY_DARK_BG = new Set(['crimson-dark', 'luxury-dark', 'editorial-report']);

function themeFor(familyId?: string | null): ChartTheme {
  if (!familyId || !FAMILY_ACCENT[familyId]) return DEFAULT_THEME;
  const accent = FAMILY_ACCENT[familyId];
  const isDark = FAMILY_DARK_BG.has(familyId);
  // Lead with the family accent, then dedupe + extend from the legacy palette.
  const palette = [accent, ...LEGACY_PALETTE.filter((c) => c.toLowerCase() !== accent.toLowerCase())].slice(0, 8);
  return {
    palette,
    accent,
    text:     isDark ? '#f9fafb' : '#111827',
    muted:    isDark ? '#cbd5e1' : '#6b7280',
    grid:     isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    positive: '#16a34a',
    negative: '#ef4444',
  };
}

const colorFor = (s: ChartSeries, i: number, theme: ChartTheme): string =>
  s.color || theme.palette[i % theme.palette.length];

// =============================================================================
//  Geometry constants — match frontend (W=600, H=360, PAD=14)
// =============================================================================

const W   = 600;
const H   = 360;
const PAD = 14;

interface Box { x: number; y: number; w: number; h: number; }

function innerBox(content: ChartContent): Box {
  const TITLE_H  = content.title ? 22 : 0;
  const LEGEND_H = content.legend?.visible === false ? 0 : 22;
  return {
    x: PAD,
    y: PAD + TITLE_H,
    w: W - PAD * 2,
    h: H - PAD * 2 - TITLE_H - LEGEND_H,
  };
}

// =============================================================================
//  XML-safe escape (keeps things simple — no entities in chart text by default)
// =============================================================================

function esc(s: any): string {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function truncate(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}

// =============================================================================
//  Public entry point
// =============================================================================

export function buildChartSvg(content: ChartContent, opts?: { width?: number; height?: number }): string {
  const theme = themeFor(content.familyId);
  const width  = opts?.width  ?? W;
  const height = opts?.height ?? H;
  const inner  = innerBox(content);

  // Per-type body
  let body = '';
  switch (content.type) {
    case 'bar':         body = drawBar(content, theme, inner, false); break;
    case 'comparison':  body = drawBar(content, theme, inner, false); break;
    case 'stackedBar':  body = drawBar(content, theme, inner, true);  break;
    case 'line':        body = drawLineOrArea(content, theme, inner, 'line'); break;
    case 'area':        body = drawLineOrArea(content, theme, inner, 'area'); break;
    case 'pie':         body = drawPie(content, theme, inner, 'pie');   break;
    case 'donut':       body = drawPie(content, theme, inner, 'donut'); break;
    case 'kpi':         body = drawKpi(content, theme, inner); break;
    case 'funnel':      body = drawFunnel(content, theme, inner); break;
    case 'scatter':     body = drawScatter(content, theme, inner); break;
    case 'waterfall':   body = drawWaterfall(content, theme, inner); break;
    case 'radar':       body = drawRadar(content, theme, inner); break;
    case 'heatmap':     body = drawHeatmap(content, theme, inner); break;
    // Phase 33.5 additions
    case 'bubble':      body = drawBubble(content, theme, inner); break;
    case 'gauge':       body = drawGauge(content, theme, inner); break;
    case 'treemap':     body = drawTreemap(content, theme, inner); break;
    case 'stackedArea': body = drawLineOrArea(content, theme, inner, 'area', true); break;
    case 'percentStackedBar':  body = drawBar(content, theme, inner, true,  /*normalize*/ true); break;
    case 'percentStackedArea': body = drawLineOrArea(content, theme, inner, 'area', true, /*normalize*/ true); break;
    case 'dualAxis':    body = drawDualAxis(content, theme, inner); break;
    case 'matrix2x2':   body = drawMatrix2x2(content, theme, inner); break;
    default:            body = drawBar(content, theme, inner, false);
  }

  const title  = content.title ? `<text x="${PAD}" y="${PAD + 14}" font-size="14" font-weight="700" fill="${theme.text}">${esc(content.title)}</text>` : '';
  const growth = drawGrowthBadge(content.insight, theme);
  const legend = content.legend?.visible === false ? '' : drawLegend(content, theme);
  const fontFamily = theme.fontFamily || 'Inter, system-ui, -apple-system, sans-serif';

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${width}" height="${height}" font-family="${esc(fontFamily)}">
  <rect x="0" y="0" width="${W}" height="${H}" fill="transparent" />
  ${title}
  ${growth}
  ${body}
  ${legend}
</svg>`;
}

// =============================================================================
//  Legend + growth badge
// =============================================================================

function drawLegend(content: ChartContent, theme: ChartTheme): string {
  const series = content.series;
  if (series.length === 0) return '';
  const y = H - 22 + 6;
  const itemWidth = Math.min(140, W / series.length);
  let out = `<g transform="translate(${(W - itemWidth * series.length) / 2} ${y})">`;
  series.forEach((s, i) => {
    const tx = i * itemWidth;
    out += `<g transform="translate(${tx} 0)">`;
    out += `<rect x="4" y="4" width="10" height="10" rx="2" fill="${colorFor(s, i, theme)}" />`;
    out += `<text x="18" y="13" font-size="11" fill="${theme.muted}">${esc(truncate(s.name, 18))}</text>`;
    out += `</g>`;
  });
  out += `</g>`;
  return out;
}

function drawGrowthBadge(insight: ChartInsight | undefined, theme: ChartTheme): string {
  if (!insight?.growth) return '';
  const tone = insight.growth.tone === 'negative' ? theme.negative
             : insight.growth.tone === 'neutral'  ? theme.muted
             : theme.positive;
  const label = insight.growth.label;
  const w = Math.max(60, label.length * 7);
  const x = W - PAD - w;
  const y = PAD - 2;
  return `<g transform="translate(${x} ${y})">
    <rect x="0" y="0" rx="4" ry="4" width="${w}" height="18" fill="${tone}" opacity="0.12" />
    <text x="${w / 2}" y="12" font-size="11" font-weight="700" text-anchor="middle" fill="${tone}">${esc(label)}</text>
  </g>`;
}

// =============================================================================
//  Y-grid helper
// =============================================================================

function yGrid(b: Box, max: number, theme: ChartTheme, fmt?: (n: number) => string): string {
  const lines = 4;
  let out = '';
  for (let i = 0; i <= lines; i++) {
    const yy = b.y + (b.h * i) / lines;
    const dash = i === lines ? '' : ' stroke-dasharray="2 2"';
    out += `<line x1="${b.x}" y1="${yy}" x2="${b.x + b.w}" y2="${yy}" stroke="${theme.grid}" stroke-width="1"${dash} />`;
    const label = fmt ? fmt(max * (1 - i / lines)) : String(Math.round(max * (1 - i / lines)));
    out += `<text x="${b.x - 4}" y="${yy + 3}" font-size="9" text-anchor="end" fill="${theme.muted}">${esc(label)}</text>`;
  }
  return out;
}

function axisTitles(content: ChartContent, theme: ChartTheme, b: Box): string {
  let out = '';
  if (content.axes?.x) {
    out += `<text x="${b.x + b.w / 2}" y="${b.y + b.h + 30}" font-size="10" font-weight="600" text-anchor="middle" fill="${theme.muted}">${esc(content.axes.x)}</text>`;
  }
  if (content.axes?.y) {
    const cx = b.x - 28; const cy = b.y + b.h / 2;
    out += `<text x="${cx}" y="${cy}" font-size="10" font-weight="600" text-anchor="middle" fill="${theme.muted}" transform="rotate(-90 ${cx} ${cy})">${esc(content.axes.y)}</text>`;
  }
  return out;
}

// =============================================================================
//  Bar (grouped + stacked + 100% stacked)
// =============================================================================

function drawBar(content: ChartContent, theme: ChartTheme, b: Box, stacked: boolean, normalize: boolean = false): string {
  const cats = content.categories;
  const series = content.series;
  if (cats.length === 0 || series.length === 0) return emptyMessage(b, theme);
  const fmt = (n: number) => formatTickValue(n, content);
  const bestWorst = computeBestWorst(series, content.insight);

  // Compute max
  let max: number;
  if (stacked && normalize) {
    max = 1; // 100%
  } else if (stacked) {
    max = Math.max(1, ...cats.map((_, ci) => series.reduce((s, ser) => s + Math.max(0, Number(ser.values?.[ci] ?? 0)), 0)));
  } else {
    max = Math.max(1, ...series.flatMap((s) => s.values || []));
  }

  const groupW = b.w / cats.length;
  const barW = stacked ? groupW * 0.6 : Math.max(2, (groupW * 0.7) / series.length);

  let out = '';
  if (content.showGrid !== false) {
    out += yGrid(b, max, theme, normalize ? (n) => `${Math.round(n * 100)}%` : fmt);
  }

  cats.forEach((cat, ci) => {
    if (stacked) {
      // Normalize per-category if 100% stacked
      const colTotal = series.reduce((s, ser) => s + Math.max(0, Number(ser.values?.[ci] ?? 0)), 0) || 1;
      let runningY = b.y + b.h;
      series.forEach((s, si) => {
        const raw = Number(s.values?.[ci] ?? 0);
        const v = normalize ? (raw / colTotal) : raw;
        const bh = (Math.max(0, v) / max) * b.h;
        runningY -= bh;
        const isBest  = bestWorst.best  && bestWorst.best.ci === ci  && bestWorst.best.si  === si;
        const isWorst = bestWorst.worst && bestWorst.worst.ci === ci && bestWorst.worst.si === si;
        const stroke  = isBest ? ` stroke="${theme.text}" stroke-width="2"` : '';
        const opacity = isWorst ? ' opacity="0.55"' : '';
        out += `<rect x="${b.x + ci * groupW + (groupW - barW) / 2}" y="${runningY}" width="${barW}" height="${bh}" fill="${colorFor(s, si, theme)}"${stroke}${opacity} />`;
      });
    } else {
      const baseX = b.x + ci * groupW + (groupW - barW * series.length) / 2;
      series.forEach((s, si) => {
        const v = Number(s.values?.[ci] ?? 0);
        const bh = (Math.max(0, v) / max) * b.h;
        const isBest  = bestWorst.best  && bestWorst.best.ci === ci  && bestWorst.best.si  === si;
        const isWorst = bestWorst.worst && bestWorst.worst.ci === ci && bestWorst.worst.si === si;
        const stroke  = isBest ? ` stroke="${theme.text}" stroke-width="2"` : '';
        const opacity = isWorst ? ' opacity="0.55"' : '';
        out += `<rect x="${baseX + si * barW}" y="${b.y + b.h - bh}" width="${barW * 0.92}" height="${bh}" rx="2" fill="${colorFor(s, si, theme)}"${stroke}${opacity} />`;
        if (content.showValues) {
          out += `<text x="${baseX + si * barW + barW * 0.46}" y="${b.y + b.h - bh - 4}" font-size="9" text-anchor="middle" fill="${theme.muted}">${esc(formatValue(v, content))}</text>`;
        }
      });
    }
    out += `<text x="${b.x + ci * groupW + groupW / 2}" y="${b.y + b.h + 14}" font-size="10" text-anchor="middle" fill="${theme.muted}">${esc(truncate(cat, 14))}</text>`;
  });

  out += axisTitles(content, theme, b);
  return out;
}

// =============================================================================
//  Line / Area (and stacked area / 100% stacked area)
// =============================================================================

function drawLineOrArea(
  content: ChartContent, theme: ChartTheme, b: Box,
  kind: 'line' | 'area', stacked: boolean = false, normalize: boolean = false,
): string {
  const cats = content.categories;
  const series = content.series;
  if (cats.length === 0 || series.length === 0) return emptyMessage(b, theme);
  const bestWorst = computeBestWorst(series, content.insight);

  // Pre-compute per-point sums when stacked
  const colTotals = stacked
    ? cats.map((_, ci) => series.reduce((s, ser) => s + Math.max(0, Number(ser.values?.[ci] ?? 0)), 0))
    : null;
  let max: number;
  if (stacked && normalize) max = 1;
  else if (stacked)         max = Math.max(1, ...(colTotals as number[]));
  else                       max = Math.max(1, ...series.flatMap((s) => s.values || []));

  const step = cats.length > 1 ? b.w / (cats.length - 1) : b.w;
  const xAt = (i: number) => b.x + (cats.length > 1 ? i * step : b.w / 2);
  const yAt = (v: number) => b.y + b.h - (Math.max(0, v) / max) * b.h;

  let out = '';
  if (content.showGrid !== false) {
    out += yGrid(b, max, theme, normalize ? (n) => `${Math.round(n * 100)}%` : (n) => formatTickValue(n, content));
  }

  // For stacked we need to draw bottom-up so earlier series sit at the bottom.
  const running = new Array(cats.length).fill(0);
  series.forEach((s, si) => {
    const col = colorFor(s, si, theme);
    const valuesForPlot = (s.values || []).map((raw, ci) => {
      const v = Number(raw) || 0;
      if (stacked) {
        const fraction = normalize ? (colTotals![ci] > 0 ? v / colTotals![ci] : 0) : v;
        running[ci] += fraction;
        return running[ci];
      }
      return v;
    });
    const ptsArr = valuesForPlot.map((v, i) => `${xAt(i)},${yAt(v)}`);
    const pts = ptsArr.join(' ');
    if (kind === 'area' || stacked) {
      let basePts: string;
      if (stacked) {
        // Use the previous series' running sum as the baseline (running[ci] − valuesForPlot[ci]).
        const baselinePts = valuesForPlot.map((v, i) => {
          // Reconstruct the baseline (the prior running sum)
          const cur = v;
          const baseline = cur - (stacked ? (Number((s.values || [])[i]) || 0) / (normalize ? (colTotals![i] || 1) : 1) : 0);
          return `${xAt(i)},${yAt(Math.max(0, baseline))}`;
        });
        basePts = baselinePts.reverse().join(' ');
      } else {
        basePts = `${xAt(valuesForPlot.length - 1)},${b.y + b.h} ${xAt(0)},${b.y + b.h}`;
      }
      const opacity = stacked ? 0.55 : 0.18;
      out += `<polygon points="${pts} ${basePts}" fill="${col}" opacity="${opacity}" />`;
      out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" />`;
    } else {
      out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" />`;
      (s.values || []).forEach((v, i) => {
        const isBest  = bestWorst.best  && bestWorst.best.ci === i  && bestWorst.best.si  === si;
        const isWorst = bestWorst.worst && bestWorst.worst.ci === i && bestWorst.worst.si === si;
        const stroke  = isBest ? ` stroke="${theme.text}" stroke-width="2"` : '';
        const opacity = isWorst ? ' opacity="0.55"' : '';
        out += `<circle cx="${xAt(i)}" cy="${yAt(Number(v) || 0)}" r="${isBest || isWorst ? 5 : 3}" fill="${col}"${stroke}${opacity} />`;
        if (content.showValues) {
          out += `<text x="${xAt(i)}" y="${yAt(Number(v) || 0) - 6}" font-size="9" text-anchor="middle" fill="${theme.muted}">${esc(formatValue(Number(v) || 0, content))}</text>`;
        }
      });
    }
  });

  cats.forEach((cat, i) => {
    out += `<text x="${xAt(i)}" y="${b.y + b.h + 14}" font-size="10" text-anchor="middle" fill="${theme.muted}">${esc(truncate(cat, 14))}</text>`;
  });
  out += axisTitles(content, theme, b);
  return out;
}

// =============================================================================
//  Pie / Donut
// =============================================================================

function drawPie(content: ChartContent, theme: ChartTheme, b: Box, kind: 'pie' | 'donut'): string {
  const cats = content.categories;
  const values = (content.series[0]?.values || []).map((v) => Number(v) || 0);
  if (cats.length === 0 || values.length === 0) return emptyMessage(b, theme);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const r  = Math.min(b.w, b.h) / 2 - 4;

  let start = 0;
  let out = '';
  values.forEach((v, i) => {
    const sweep = (v / total) * Math.PI * 2;
    const end = start + sweep;
    const x1 = cx + r * Math.cos(start - Math.PI / 2);
    const y1 = cy + r * Math.sin(start - Math.PI / 2);
    const x2 = cx + r * Math.cos(end   - Math.PI / 2);
    const y2 = cy + r * Math.sin(end   - Math.PI / 2);
    const largeArc = sweep > Math.PI ? 1 : 0;
    const color = theme.palette[i % theme.palette.length];
    out += `<path d="M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${color}" stroke="#ffffff" stroke-width="1.5" />`;
    start = end;
  });
  if (kind === 'donut') {
    out += `<circle cx="${cx}" cy="${cy}" r="${r * 0.55}" fill="#ffffff" />`;
    out += `<text x="${cx}" y="${cy - 4}" font-size="11" font-weight="700" text-anchor="middle" fill="${theme.text}">${esc(formatValue(total, content))}</text>`;
    out += `<text x="${cx}" y="${cy + 10}" font-size="9" text-anchor="middle" fill="${theme.muted}">total</text>`;
  }
  return out;
}

// =============================================================================
//  KPI cards
// =============================================================================

function drawKpi(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats   = content.categories;
  const values = (content.series[0]?.values || []).slice(0, 4);
  if (values.length === 0) return emptyMessage(b, theme);
  const cellW = b.w / values.length;
  let out = '';
  values.forEach((raw, i) => {
    const v = Number(raw) || 0;
    const col = theme.palette[i % theme.palette.length];
    const tx = b.x + i * cellW;
    out += `<g transform="translate(${tx} ${b.y})">
      <rect x="4" y="4" width="${cellW - 8}" height="${b.h - 8}" rx="10" fill="${col}" opacity="0.08" />
      <text x="${cellW / 2}" y="${b.h / 2 - 2}" font-size="${Math.min(36, cellW / 3)}" font-weight="800" text-anchor="middle" fill="${col}">${esc(formatValue(v, content))}</text>
      <text x="${cellW / 2}" y="${b.h / 2 + 22}" font-size="11" text-anchor="middle" fill="${theme.muted}" style="text-transform:uppercase;letter-spacing:0.5px">${esc(truncate(cats[i] || '', 18))}</text>
    </g>`;
  });
  return out;
}

// =============================================================================
//  Funnel
// =============================================================================

function drawFunnel(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats = content.categories;
  const values = (content.series[0]?.values || []).map((v) => Number(v) || 0);
  if (cats.length === 0 || values.length === 0) return emptyMessage(b, theme);
  const max = Math.max(1, ...values);
  const slotH = b.h / cats.length;
  let out = '';
  cats.forEach((cat, i) => {
    const v = values[i] ?? 0;
    const widthFrac = Math.max(0.08, v / max);
    const topFrac   = i === 0 ? 1 : Math.max(0.08, (values[i - 1] ?? v) / max);
    const cy0 = b.y + i * slotH;
    const cy1 = b.y + (i + 1) * slotH;
    const cxC = b.x + b.w / 2;
    const topW = b.w * topFrac;
    const botW = b.w * widthFrac;
    const pts = [
      `${cxC - topW / 2},${cy0 + 2}`,
      `${cxC + topW / 2},${cy0 + 2}`,
      `${cxC + botW / 2},${cy1 - 2}`,
      `${cxC - botW / 2},${cy1 - 2}`,
    ].join(' ');
    const col = theme.palette[i % theme.palette.length];
    const labelInside = botW > 90;
    const labelColor = labelInside ? '#ffffff' : theme.text;
    out += `<polygon points="${pts}" fill="${col}" opacity="0.85" />`;
    out += `<text x="${cxC}" y="${cy0 + slotH / 2 + 4}" font-size="12" font-weight="700" text-anchor="middle" fill="${labelColor}">${esc(truncate(cat, 18))}</text>`;
    out += `<text x="${b.x + b.w + 4}" y="${cy0 + slotH / 2 + 4}" font-size="11" text-anchor="start" fill="${theme.muted}">${esc(formatValue(v, content))}</text>`;
  });
  return out;
}

// =============================================================================
//  Scatter
// =============================================================================

function drawScatter(content: ChartContent, theme: ChartTheme, b: Box): string {
  const series = content.series;
  if (series.length === 0) return emptyMessage(b, theme);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const s of series) {
    for (let i = 0; i < (s.values?.length ?? 0) - 1; i += 2) {
      const xv = Number(s.values[i]);
      const yv = Number(s.values[i + 1]);
      if (Number.isFinite(xv)) { if (xv < minX) minX = xv; if (xv > maxX) maxX = xv; }
      if (Number.isFinite(yv)) { if (yv < minY) minY = yv; if (yv > maxY) maxY = yv; }
    }
  }
  if (minX === Infinity) return emptyMessage(b, theme);
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const xScale = (v: number) => b.x + ((v - minX) / (maxX - minX)) * b.w;
  const yScale = (v: number) => b.y + b.h - ((v - minY) / (maxY - minY)) * b.h;
  let out = '';
  if (content.showGrid !== false) out += yGrid(b, maxY, theme);
  series.forEach((s, si) => {
    const col = colorFor(s, si, theme);
    for (let i = 0; i < (s.values?.length ?? 0) - 1; i += 2) {
      const xv = Number(s.values[i]); const yv = Number(s.values[i + 1]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      out += `<circle cx="${xScale(xv)}" cy="${yScale(yv)}" r="4" fill="${col}" opacity="0.8" />`;
    }
  });
  out += axisTitles(content, theme, b);
  out += `<text x="${b.x}" y="${b.y + b.h + 14}" font-size="10" fill="${theme.muted}">${esc(formatValue(minX, content))}</text>`;
  out += `<text x="${b.x + b.w}" y="${b.y + b.h + 14}" font-size="10" text-anchor="end" fill="${theme.muted}">${esc(formatValue(maxX, content))}</text>`;
  return out;
}

// =============================================================================
//  Waterfall
// =============================================================================

function drawWaterfall(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats = content.categories;
  const deltas = (content.series[0]?.values || []).map((v) => Number(v) || 0);
  if (cats.length === 0 || deltas.length === 0) return emptyMessage(b, theme);
  const totals = [0];
  for (const d of deltas) totals.push(totals[totals.length - 1] + d);
  const finalTotal = totals[totals.length - 1];
  const allLabels = [...cats, 'Total'];
  const all = [...totals, finalTotal];
  const maxAbs = Math.max(1, ...all.map(Math.abs), Math.abs(finalTotal));
  const yZero = b.y + b.h / 2;
  const groupW = b.w / allLabels.length;
  const barW = groupW * 0.6;
  const scale = (b.h / 2) / maxAbs;
  let out = `<line x1="${b.x}" y1="${yZero}" x2="${b.x + b.w}" y2="${yZero}" stroke="${theme.grid}" stroke-width="1" />`;
  deltas.forEach((d, i) => {
    const positive = d >= 0;
    const top = positive ? yZero - totals[i + 1] * scale : yZero - totals[i] * scale;
    const bot = positive ? yZero - totals[i] * scale     : yZero - totals[i + 1] * scale;
    const col = positive ? theme.positive : theme.negative;
    out += `<rect x="${b.x + i * groupW + (groupW - barW) / 2}" y="${top}" width="${barW}" height="${Math.abs(bot - top)}" fill="${col}" opacity="0.85" />`;
    out += `<text x="${b.x + i * groupW + groupW / 2}" y="${bot + 12}" font-size="10" text-anchor="middle" fill="${theme.muted}">${(positive ? '+' : '') + formatValue(d, content)}</text>`;
    out += `<text x="${b.x + i * groupW + groupW / 2}" y="${b.y + b.h + 14}" font-size="10" text-anchor="middle" fill="${theme.muted}">${esc(truncate(cats[i] || '', 12))}</text>`;
  });
  const totalY = Math.min(yZero, yZero - finalTotal * scale);
  out += `<rect x="${b.x + deltas.length * groupW + (groupW - barW) / 2}" y="${totalY}" width="${barW}" height="${Math.abs(finalTotal * scale)}" fill="${theme.accent}" />`;
  out += `<text x="${b.x + deltas.length * groupW + groupW / 2}" y="${b.y + b.h + 14}" font-size="10" font-weight="700" text-anchor="middle" fill="${theme.text}">Total</text>`;
  out += `<text x="${b.x + deltas.length * groupW + groupW / 2}" y="${totalY - 4}" font-size="11" font-weight="700" text-anchor="middle" fill="${theme.accent}">${esc(formatValue(finalTotal, content))}</text>`;
  out += axisTitles(content, theme, b);
  return out;
}

// =============================================================================
//  Radar
// =============================================================================

function drawRadar(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats = content.categories;
  const series = content.series;
  if (cats.length < 3 || series.length === 0) return emptyMessage(b, theme);
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const r  = Math.min(b.w, b.h) / 2 - 20;
  const max = Math.max(1, ...series.flatMap((s) => s.values || []));
  const angle = (i: number) => -Math.PI / 2 + (i / cats.length) * Math.PI * 2;
  const point = (i: number, v: number) => {
    const rr = (v / max) * r;
    return { x: cx + rr * Math.cos(angle(i)), y: cy + rr * Math.sin(angle(i)) };
  };
  let out = '';
  [0.25, 0.5, 0.75, 1].forEach((frac) => {
    const pts = cats.map((_, i) => { const p = point(i, frac * max); return `${p.x},${p.y}`; }).join(' ');
    out += `<polygon points="${pts}" fill="none" stroke="${theme.grid}" stroke-width="1" />`;
  });
  cats.forEach((_, i) => {
    const p = point(i, max);
    out += `<line x1="${cx}" y1="${cy}" x2="${p.x}" y2="${p.y}" stroke="${theme.grid}" stroke-width="1" />`;
  });
  series.forEach((s, si) => {
    const col = colorFor(s, si, theme);
    const pts = (s.values || []).slice(0, cats.length).map((v, i) => {
      const p = point(i, Number(v) || 0);
      return `${p.x},${p.y}`;
    }).join(' ');
    out += `<polygon points="${pts}" fill="${col}" opacity="0.18" />`;
    out += `<polygon points="${pts}" fill="none" stroke="${col}" stroke-width="2" />`;
  });
  cats.forEach((cat, i) => {
    const p = point(i, max * 1.12);
    out += `<text x="${p.x}" y="${p.y + 4}" font-size="10" text-anchor="middle" fill="${theme.muted}">${esc(truncate(cat, 12))}</text>`;
  });
  return out;
}

// =============================================================================
//  Heatmap
// =============================================================================

function drawHeatmap(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats = content.categories;
  const series = content.series;
  if (cats.length === 0 || series.length === 0) return emptyMessage(b, theme);
  const LABEL_W = 90;
  const grid = { x: b.x + LABEL_W, y: b.y, w: b.w - LABEL_W, h: b.h };
  const cellW = grid.w / cats.length;
  const cellH = grid.h / series.length;
  const all = series.flatMap((s) => s.values || []);
  const max = Math.max(1, ...all);
  const base = theme.accent;
  let out = '';
  cats.forEach((cat, ci) => {
    out += `<text x="${grid.x + ci * cellW + cellW / 2}" y="${b.y + 10}" font-size="9" text-anchor="middle" fill="${theme.muted}">${esc(truncate(cat, 8))}</text>`;
  });
  series.forEach((s, si) => {
    out += `<text x="${grid.x - 8}" y="${grid.y + si * cellH + cellH / 2 + 4}" font-size="10" text-anchor="end" fill="${theme.muted}">${esc(truncate(s.name, 12))}</text>`;
    cats.forEach((_, ci) => {
      const v = Number(s.values?.[ci] ?? 0);
      const frac = Math.max(0, Math.min(1, v / max));
      const opacity = (0.1 + frac * 0.85).toFixed(2);
      out += `<rect x="${grid.x + ci * cellW + 1}" y="${grid.y + si * cellH + 1}" width="${cellW - 2}" height="${cellH - 2}" fill="${base}" opacity="${opacity}" />`;
      if (cellW > 38 && cellH > 18) {
        const textColor = frac > 0.55 ? '#ffffff' : theme.text;
        out += `<text x="${grid.x + ci * cellW + cellW / 2}" y="${grid.y + si * cellH + cellH / 2 + 4}" font-size="10" text-anchor="middle" fill="${textColor}">${esc(formatValue(v, content))}</text>`;
      }
    });
  });
  return out;
}

// =============================================================================
//  Phase 33.5 — Bubble  (scatter with size)
//  Series.values = [x0, y0, r0, x1, y1, r1, …]
// =============================================================================

function drawBubble(content: ChartContent, theme: ChartTheme, b: Box): string {
  const series = content.series;
  if (series.length === 0) return emptyMessage(b, theme);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, maxR = 1;
  for (const s of series) {
    for (let i = 0; i < (s.values?.length ?? 0) - 2; i += 3) {
      const xv = Number(s.values[i]);
      const yv = Number(s.values[i + 1]);
      const rv = Number(s.values[i + 2]);
      if (Number.isFinite(xv)) { if (xv < minX) minX = xv; if (xv > maxX) maxX = xv; }
      if (Number.isFinite(yv)) { if (yv < minY) minY = yv; if (yv > maxY) maxY = yv; }
      if (Number.isFinite(rv) && rv > maxR) maxR = rv;
    }
  }
  if (minX === Infinity) return emptyMessage(b, theme);
  if (minX === maxX) { minX -= 1; maxX += 1; }
  if (minY === maxY) { minY -= 1; maxY += 1; }
  const xScale = (v: number) => b.x + ((v - minX) / (maxX - minX)) * b.w;
  const yScale = (v: number) => b.y + b.h - ((v - minY) / (maxY - minY)) * b.h;
  const rScale = (v: number) => 4 + (Math.max(0, v) / maxR) * 28;
  let out = '';
  if (content.showGrid !== false) out += yGrid(b, maxY, theme);
  series.forEach((s, si) => {
    const col = colorFor(s, si, theme);
    for (let i = 0; i < (s.values?.length ?? 0) - 2; i += 3) {
      const xv = Number(s.values[i]); const yv = Number(s.values[i + 1]); const rv = Number(s.values[i + 2]);
      if (!Number.isFinite(xv) || !Number.isFinite(yv)) continue;
      out += `<circle cx="${xScale(xv)}" cy="${yScale(yv)}" r="${rScale(rv)}" fill="${col}" opacity="0.55" stroke="${col}" stroke-width="1.5" />`;
    }
  });
  out += axisTitles(content, theme, b);
  return out;
}

// =============================================================================
//  Phase 33.5 — Gauge (semicircle, single value vs max)
//  series[0].values[0] = value, series[0].values[1] = max (optional, defaults 100)
// =============================================================================

function drawGauge(content: ChartContent, theme: ChartTheme, b: Box): string {
  const v   = Number(content.series[0]?.values?.[0] ?? 0);
  const max = Number(content.series[0]?.values?.[1] ?? 100) || 100;
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h * 0.7;
  const r  = Math.min(b.w / 2 - 10, b.h * 0.6);
  const frac = Math.max(0, Math.min(1, v / max));
  const startAngle = Math.PI;
  const endAngle   = Math.PI + frac * Math.PI;
  const arcPath = (a1: number, a2: number) => {
    const x1 = cx + r * Math.cos(a1);
    const y1 = cy + r * Math.sin(a1);
    const x2 = cx + r * Math.cos(a2);
    const y2 = cy + r * Math.sin(a2);
    const largeArc = (a2 - a1) > Math.PI ? 1 : 0;
    return `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`;
  };
  const trackPath = arcPath(startAngle, Math.PI * 2);
  const valuePath = arcPath(startAngle, endAngle);
  const accent = frac >= 0.66 ? theme.positive : frac >= 0.33 ? theme.accent : theme.negative;
  let out = '';
  out += `<path d="${trackPath}" stroke="${theme.grid}" stroke-width="18" fill="none" stroke-linecap="round" />`;
  out += `<path d="${valuePath}" stroke="${accent}" stroke-width="18" fill="none" stroke-linecap="round" />`;
  out += `<text x="${cx}" y="${cy - 4}" font-size="32" font-weight="800" text-anchor="middle" fill="${theme.text}">${esc(formatValue(v, content))}</text>`;
  out += `<text x="${cx}" y="${cy + 18}" font-size="11" text-anchor="middle" fill="${theme.muted}">of ${esc(formatValue(max, content))}</text>`;
  return out;
}

// =============================================================================
//  Phase 33.5 — Treemap (squarified-ish; single-series proportional rects)
// =============================================================================

function drawTreemap(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats = content.categories;
  const values = (content.series[0]?.values || []).map((v) => Math.max(0, Number(v) || 0));
  if (cats.length === 0 || values.length === 0) return emptyMessage(b, theme);
  const total = values.reduce((a, b) => a + b, 0) || 1;
  // Greedy row-based squarification — group rectangles into rows; switch rows
  // when the next item would make the current row's aspect ratio worse.
  type Rect = { x: number; y: number; w: number; h: number; idx: number };
  const out: string[] = [];
  let remaining = values.map((v, i) => ({ v, i }));
  let curBox = { x: b.x, y: b.y, w: b.w, h: b.h };
  while (remaining.length > 0) {
    const horizontal = curBox.w >= curBox.h;
    const rowMax = horizontal ? curBox.h : curBox.w;
    // Grow the row greedily
    let row: typeof remaining = [];
    let prevWorst = Infinity;
    while (remaining.length > 0) {
      const candidate = [...row, remaining[0]];
      const rowTotal = candidate.reduce((a, x) => a + x.v, 0);
      const rowLen = (rowTotal / total) * curBox.w * curBox.h / rowMax;
      const worst = candidate.reduce((wmax, x) => {
        const area = (x.v / total) * curBox.w * curBox.h;
        const w = rowMax;
        const h = area / rowMax;
        return Math.max(wmax, Math.max(w / h, h / w));
      }, 0);
      if (worst > prevWorst && row.length > 0) break;
      row = candidate;
      prevWorst = worst;
      remaining = remaining.slice(1);
      if (row.length >= 4) break; // cap row length
    }
    // Lay out the row
    const rowTotal = row.reduce((a, x) => a + x.v, 0);
    const rowSide = (rowTotal / total) * curBox.w * curBox.h / rowMax;
    let offset = 0;
    for (const item of row) {
      const area = (item.v / total) * curBox.w * curBox.h;
      const along = area / rowSide;
      let rect: Rect;
      if (horizontal) {
        rect = { x: curBox.x, y: curBox.y + offset, w: rowSide, h: along, idx: item.i };
        offset += along;
      } else {
        rect = { x: curBox.x + offset, y: curBox.y, w: along, h: rowSide, idx: item.i };
        offset += along;
      }
      const col = theme.palette[item.i % theme.palette.length];
      out.push(`<rect x="${rect.x}" y="${rect.y}" width="${rect.w}" height="${rect.h}" fill="${col}" opacity="0.85" stroke="#ffffff" stroke-width="2" />`);
      if (rect.w > 40 && rect.h > 24) {
        out.push(`<text x="${rect.x + 8}" y="${rect.y + 16}" font-size="11" font-weight="700" fill="#ffffff">${esc(truncate(cats[item.i] || '', 16))}</text>`);
        out.push(`<text x="${rect.x + 8}" y="${rect.y + 30}" font-size="10" fill="#ffffff" opacity="0.85">${esc(formatValue(item.v, content))}</text>`);
      }
    }
    // Shrink curBox by the row we just laid out
    if (horizontal) curBox = { x: curBox.x + rowSide, y: curBox.y, w: Math.max(0, curBox.w - rowSide), h: curBox.h };
    else            curBox = { x: curBox.x, y: curBox.y + rowSide, w: curBox.w, h: Math.max(0, curBox.h - rowSide) };
    if (curBox.w < 1 || curBox.h < 1) break;
  }
  return out.join('');
}

// =============================================================================
//  Phase 33.5 — Dual axis (line on top of bars)
//  series[0] = bar (left axis), series[1] = line (right axis)
// =============================================================================

function drawDualAxis(content: ChartContent, theme: ChartTheme, b: Box): string {
  const cats = content.categories;
  const series = content.series;
  if (cats.length === 0 || series.length === 0) return emptyMessage(b, theme);
  const barSeries  = series[0];
  const lineSeries = series[1];
  const maxBar  = Math.max(1, ...(barSeries.values  || []));
  const maxLine = Math.max(1, ...((lineSeries?.values) || [1]));
  const groupW = b.w / cats.length;
  const barW = groupW * 0.6;
  let out = '';
  if (content.showGrid !== false) out += yGrid(b, maxBar, theme, (n) => formatValue(n, content));
  cats.forEach((cat, ci) => {
    const v = Number(barSeries.values?.[ci] ?? 0);
    const bh = (Math.max(0, v) / maxBar) * b.h;
    out += `<rect x="${b.x + ci * groupW + (groupW - barW) / 2}" y="${b.y + b.h - bh}" width="${barW}" height="${bh}" rx="2" fill="${colorFor(barSeries, 0, theme)}" />`;
    out += `<text x="${b.x + ci * groupW + groupW / 2}" y="${b.y + b.h + 14}" font-size="10" text-anchor="middle" fill="${theme.muted}">${esc(truncate(cat, 14))}</text>`;
  });
  if (lineSeries) {
    const step = cats.length > 1 ? b.w / (cats.length - 1) : b.w;
    const xAt = (i: number) => b.x + i * step;
    const yAt = (v: number) => b.y + b.h - (Math.max(0, v) / maxLine) * b.h;
    const pts = (lineSeries.values || []).map((v, i) => `${xAt(i)},${yAt(Number(v) || 0)}`).join(' ');
    const col = colorFor(lineSeries, 1, theme);
    out += `<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="2" />`;
    (lineSeries.values || []).forEach((v, i) => {
      out += `<circle cx="${xAt(i)}" cy="${yAt(Number(v) || 0)}" r="3" fill="${col}" />`;
    });
    // Right axis ticks
    for (let i = 0; i <= 4; i++) {
      const yy = b.y + (b.h * i) / 4;
      out += `<text x="${b.x + b.w + 4}" y="${yy + 3}" font-size="9" fill="${col}">${esc(formatValue(maxLine * (1 - i / 4), content))}</text>`;
    }
  }
  out += axisTitles(content, theme, b);
  return out;
}

// =============================================================================
//  Phase 33.5 — 2×2 matrix (risk / impact-vs-effort / positioning)
//  Each series.values is [x, y, … (label index)] — single (x, y) per item.
// =============================================================================

function drawMatrix2x2(content: ChartContent, theme: ChartTheme, b: Box): string {
  // Quadrants
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const quadColors = ['#dbeafe', '#dcfce7', '#fee2e2', '#fef3c7']; // tl, tr, br, bl
  let out = '';
  out += `<rect x="${b.x}" y="${b.y}" width="${b.w / 2}" height="${b.h / 2}" fill="${quadColors[0]}" opacity="0.6" />`;
  out += `<rect x="${cx}" y="${b.y}" width="${b.w / 2}" height="${b.h / 2}" fill="${quadColors[1]}" opacity="0.6" />`;
  out += `<rect x="${cx}" y="${cy}" width="${b.w / 2}" height="${b.h / 2}" fill="${quadColors[2]}" opacity="0.6" />`;
  out += `<rect x="${b.x}" y="${cy}" width="${b.w / 2}" height="${b.h / 2}" fill="${quadColors[3]}" opacity="0.6" />`;
  out += `<line x1="${cx}" y1="${b.y}" x2="${cx}" y2="${b.y + b.h}" stroke="${theme.grid}" stroke-width="1.5" />`;
  out += `<line x1="${b.x}" y1="${cy}" x2="${b.x + b.w}" y2="${cy}" stroke="${theme.grid}" stroke-width="1.5" />`;

  // axis labels (from content.axes)
  if (content.axes?.x) {
    out += `<text x="${b.x + b.w / 2}" y="${b.y + b.h + 18}" font-size="10" font-weight="600" text-anchor="middle" fill="${theme.muted}">${esc(content.axes.x)}</text>`;
  }
  if (content.axes?.y) {
    out += `<text x="${b.x - 24}" y="${b.y + b.h / 2}" font-size="10" font-weight="600" text-anchor="middle" fill="${theme.muted}" transform="rotate(-90 ${b.x - 24} ${b.y + b.h / 2})">${esc(content.axes.y)}</text>`;
  }
  // Points
  content.series.forEach((s, si) => {
    const col = colorFor(s, si, theme);
    const vs = s.values || [];
    // Expect alternating (x, y) pairs; categories[i] is the label
    for (let i = 0; i < vs.length - 1; i += 2) {
      const xv = Math.max(0, Math.min(1, Number(vs[i])));
      const yv = Math.max(0, Math.min(1, Number(vs[i + 1])));
      const px = b.x + xv * b.w;
      const py = b.y + (1 - yv) * b.h;
      const labelIdx = i / 2;
      const label = content.categories[labelIdx] || s.name;
      out += `<circle cx="${px}" cy="${py}" r="7" fill="${col}" opacity="0.8" stroke="${theme.text}" stroke-width="1.5" />`;
      out += `<text x="${px + 11}" y="${py + 4}" font-size="10" font-weight="600" fill="${theme.text}">${esc(truncate(label, 16))}</text>`;
    }
  });
  return out;
}

// =============================================================================
//  Insight: best/worst detection (mirrors frontend)
// =============================================================================

interface BestWorst {
  best?:  { ci: number; si: number; value: number };
  worst?: { ci: number; si: number; value: number };
}
function computeBestWorst(series: ChartSeries[], insight?: ChartInsight): BestWorst {
  const out: BestWorst = {};
  if (!insight?.highlightBest && !insight?.highlightWorst) return out;
  let bestV = -Infinity, worstV = Infinity;
  for (let si = 0; si < series.length; si++) {
    const vals = series[si].values || [];
    for (let ci = 0; ci < vals.length; ci++) {
      const v = Number(vals[ci]);
      if (!Number.isFinite(v)) continue;
      if (insight.highlightBest  && v > bestV)  { bestV  = v; out.best  = { ci, si, value: v }; }
      if (insight.highlightWorst && v < worstV) { worstV = v; out.worst = { ci, si, value: v }; }
    }
  }
  return out;
}

// =============================================================================
//  Number formatting (Phase 33.5 Priority 3)
// =============================================================================

function formatValue(v: number, content: ChartContent): string {
  return formatNumber(v, content.numberFormat);
}

function formatTickValue(v: number, content: ChartContent): string {
  // Always compact for axis ticks (saves space)
  return formatNumber(v, content.numberFormat ?? { kind: 'compact' });
}

/**
 * Pure formatter — used by both backend SVG builder and the frontend (re-exported).
 * Mirrors the spec's currency / percent / integer / decimal / compact options.
 */
export function formatNumber(
  v: number,
  fmt?: { kind?: 'currency' | 'percent' | 'integer' | 'decimal' | 'compact'; currency?: string; decimals?: number },
): string {
  if (!Number.isFinite(v)) return '';
  const decimals = fmt?.decimals ?? 1;
  switch (fmt?.kind) {
    case 'currency': {
      const sym = fmt.currency || '$';
      return `${sym}${compact(v, decimals)}`;
    }
    case 'percent':  return `${v.toFixed(decimals)}%`;
    case 'integer':  return Math.round(v).toLocaleString();
    case 'decimal':  return v.toFixed(decimals);
    case 'compact':  return compact(v, decimals);
    default:         return formatDefault(v);
  }
}

function compact(v: number, decimals: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e9) return `${(v / 1e9).toFixed(decimals)}B`;
  if (abs >= 1e6) return `${(v / 1e6).toFixed(decimals)}M`;
  if (abs >= 1e3) return `${(v / 1e3).toFixed(decimals)}K`;
  return v.toFixed(abs < 1 ? decimals : 0);
}

function formatDefault(v: number): string {
  const abs = Math.abs(v);
  if (abs >= 1e6) return compact(v, 1);
  if (abs >= 1e3) return v.toLocaleString();
  if (Number.isInteger(v)) return String(v);
  return v.toFixed(1);
}

// =============================================================================
//  Empty message
// =============================================================================

function emptyMessage(b: Box, theme: ChartTheme): string {
  return `<text x="${b.x + b.w / 2}" y="${b.y + b.h / 2}" font-size="11" text-anchor="middle" fill="${theme.muted}">No chart data</text>`;
}
