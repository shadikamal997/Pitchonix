import * as sharp from 'sharp';
import { buildChartSvg } from '../../generation/export/svg-chart-builder';

// =============================================================================
//  Phase 41.1E — Cross-format chart renderer.
//
//  Wraps the existing svg-chart-builder so every exporter can render the
//  same chart data identically:
//
//    - HTML / MD   → inline SVG
//    - DOCX / PDF  → PNG via sharp (DOCX has no portable SVG support)
//    - PPTX        → already handled by the PPTX exporter's pre-render path
//
//  Input shape is the chart content from UniversalDocument.DocumentNode.chart
//  which mirrors Pitchonix's chart element. The renderer normalises it,
//  produces an SVG, and optionally rasterises.
//
//  Returns null for unrecognised / empty chart payloads so callers can
//  fall back to placeholder text without throwing.
// =============================================================================

export interface ChartPayload {
  type?:        string;
  title?:       string;
  categories?:  string[];
  series?:      Array<{ name?: string; data?: number[]; values?: number[]; color?: string }>;
  data?:        Array<{ name?: string; labels?: string[]; values?: number[] }>;
  axes?:        any;
  legend?:      any;
  familyId?:    string;
}

const KNOWN_KINDS = new Set([
  'bar', 'line', 'area', 'pie', 'donut', 'doughnut',
  'scatter', 'bubble', 'radar', 'funnel', 'waterfall',
  'stackedBar', 'percentStackedBar', 'stackedArea', 'percentStackedArea',
  'dualAxis', 'matrix2x2', 'kpi', 'comparison', 'gauge', 'treemap', 'heatmap',
]);

export function renderChartSvg(payload: ChartPayload | null | undefined, width = 720, height = 400): string | null {
  if (!payload) return null;
  const content = normalise(payload);
  if (!content) return null;
  try {
    return buildChartSvg(content as any, { width, height });
  } catch {
    return null;
  }
}

export async function renderChartPng(payload: ChartPayload | null | undefined, width = 960, height = 540): Promise<Buffer | null> {
  const svg = renderChartSvg(payload, width, height);
  if (!svg) return null;
  try {
    return await (sharp as any)(Buffer.from(svg, 'utf8')).png().toBuffer();
  } catch {
    return null;
  }
}

// -----------------------------------------------------------------------------

function normalise(p: ChartPayload): ChartPayload | null {
  // Accept multiple input shapes (pptxgenjs vs Pitchonix vs Chart.js-style).
  const type = (p.type || 'bar').toLowerCase();
  if (!KNOWN_KINDS.has(type)) return null;

  let series = p.series || [];
  let categories = p.categories || [];

  // pptxgenjs-style: data[{ name, labels, values }] → series + categories
  if ((!series.length) && Array.isArray(p.data) && p.data.length > 0) {
    series = p.data.map((d: any) => ({
      name:  d.name || '',
      values: d.values || [],
      color: d.color,
    }));
    categories = p.data[0]?.labels || [];
  }

  // Map alt key names: .data → .values per series.
  series = series.map((s: any) => ({
    name:  s.name || '',
    values: s.values || s.data || [],
    color: s.color,
  }));

  if (series.length === 0 || categories.length === 0) return null;

  return {
    type,
    title:      p.title,
    categories: categories.map(String),
    series,
    axes:       p.axes,
    legend:     p.legend ?? { visible: true, position: 'bottom' },
    familyId:   p.familyId,
  };
}
