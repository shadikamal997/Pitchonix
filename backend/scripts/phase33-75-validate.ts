/**
 * Phase 33.75 — Chart export parity validation
 *
 * Builds an in-memory deck containing one slide per ChartKind (21 total) and
 * runs every export path:
 *
 *   - PPTX  via exportDeckToPptx
 *   - PDF   via exportDeckToPdf
 *   - PNGs  via exportDeckToPngs
 *   - JPEGs via exportDeckToJpegs
 *
 * For each format the script asserts:
 *   - file/buffer is non-empty
 *   - PPTX:  every slide XML contains a `<p:pic>` (the embedded chart image)
 *            AND does NOT contain the "Chart render failed" placeholder string
 *   - PNG/JPEG: exactly 21 frames, each > 1KB
 *   - PDF:   buffer > 4KB
 *
 * Run:  pnpm ts-node scripts/phase33-75-validate.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { SlideElementDTO } from '../src/slides/element-types';
import type { RenderDeckInput, RenderSlideInput } from '../src/slide-export/render-types';
import { exportDeckToPptx } from '../src/slide-export/element-pptx-exporter';
import { exportDeckToPdf, exportDeckToPngs, exportDeckToJpegs } from '../src/slide-export/element-image-exporter';
import type { ChartKind } from '../src/generation/export/chart-types';

const CHART_KINDS: ChartKind[] = [
  'bar', 'line', 'area', 'pie', 'donut',
  'kpi', 'comparison',
  'stackedBar', 'funnel', 'scatter',
  'waterfall', 'radar', 'heatmap',
  'bubble', 'gauge', 'treemap',
  'dualAxis', 'stackedArea',
  'percentStackedBar', 'percentStackedArea',
  'matrix2x2',
];

// =============================================================================
//  Build a representative ChartContent for each kind. Data is the same shape
//  every chart type accepts (categories + series[]); the SVG builder picks
//  the bits it needs per kind, so a single template covers everything.
// =============================================================================
function buildChartContent(kind: ChartKind) {
  const categories = ['Q1', 'Q2', 'Q3', 'Q4'];
  const series = [
    { name: 'Revenue',  values: [12, 19, 23, 31], color: '#16a34a' },
    { name: 'Expenses', values: [10, 14, 16, 22], color: '#0ea5e9' },
  ];

  // A handful of kinds want a slightly different shape.
  if (kind === 'scatter' || kind === 'bubble') {
    // (x, y) (and bubble: x, y, r) packed pairwise into values[].
    return {
      type: kind,
      title: `${kind} sample`,
      categories: [],
      series: [{
        name: 'Points',
        values: kind === 'bubble'
          ? [1, 2, 8,  3, 5, 16,  5, 7, 24,  7, 3, 12,  9, 8, 32]
          : [1, 2,  3, 5,  5, 7,  7, 3,  9, 8],
        color: '#7c3aed',
      }],
    };
  }
  if (kind === 'gauge') {
    return {
      type: kind,
      title: 'Gauge sample',
      categories: [],
      series: [{ name: 'Score', values: [72], color: '#16a34a' }],
    };
  }
  if (kind === 'matrix2x2') {
    return {
      type: kind,
      title: 'Positioning',
      categories: ['Low cost', 'High cost'],
      series: [{ name: 'Items', values: [1, 4, 7, 9], color: '#16a34a' }],
    };
  }
  if (kind === 'funnel' || kind === 'waterfall' || kind === 'pie' || kind === 'donut' || kind === 'kpi' || kind === 'treemap') {
    return {
      type: kind,
      title: `${kind} sample`,
      categories,
      series: [{ name: 'Value', values: [40, 28, 18, 11], color: '#16a34a' }],
    };
  }

  return {
    type: kind,
    title: `${kind} sample`,
    categories,
    series,
    legend: { visible: true, position: 'bottom' as const },
    showValues: true,
  };
}

function buildSlide(kind: ChartKind, index: number, total: number): RenderSlideInput {
  const chartEl: SlideElementDTO = {
    id:        `chart-${kind}`,
    slideId:   `slide-${index}`,
    type:      'chart',
    name:      `Chart: ${kind}`,
    order:     0,
    x: 5, y: 12, width: 90, height: 76,
    rotation:  0,
    zIndex:    1,
    locked:    false,
    visible:   true,
    content:   buildChartContent(kind) as any,
    data:      null,
    style:     null,
    animations: null,
    accessibility: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const titleEl: SlideElementDTO = {
    id: `title-${kind}`, slideId: `slide-${index}`, type: 'heading',
    name: 'Title', order: 0,
    x: 5, y: 3, width: 90, height: 8, rotation: 0, zIndex: 0,
    locked: false, visible: true,
    content: { text: `${index + 1}. ${kind}` } as any,
    data: null, style: null, animations: null, accessibility: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  return {
    index,
    total,
    title: `${kind}`,
    background: { type: 'solid', color: '#ffffff' } as any,
    themeTokens: null,
    elements: [titleEl, chartEl],
  };
}

function buildDeck(): RenderDeckInput {
  return {
    title: 'Phase 33.75 chart parity matrix',
    slides: CHART_KINDS.map((k, i) => buildSlide(k, i, CHART_KINDS.length)),
  };
}

// =============================================================================
//  PPTX inspection — extracts ppt/slides/*.xml and checks each slide for
//  (a) presence of <p:pic> (an image was embedded), (b) absence of the
//  failure placeholder string ("Chart render failed").
// =============================================================================
function inspectPptx(pptxPath: string): Array<{ slide: number; hasImage: boolean; hasFailure: boolean }> {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-inspect-'));
  try {
    execSync(`unzip -q "${pptxPath}" -d "${tmp}"`);
    const slidesDir = path.join(tmp, 'ppt', 'slides');
    const files = fs.readdirSync(slidesDir)
      .filter((f) => /^slide\d+\.xml$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
    return files.map((f, i) => {
      const xml = fs.readFileSync(path.join(slidesDir, f), 'utf8');
      return {
        slide:      i + 1,
        hasImage:   /<p:pic\b/.test(xml),
        hasFailure: /Chart render failed/.test(xml),
      };
    });
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

// =============================================================================
//  Main
// =============================================================================
async function main() {
  const deck = buildDeck();
  const outDir = path.join(__dirname, '..', 'exports', 'phase33-75');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Phase 33.75 — chart parity test (${CHART_KINDS.length} chart types)\n`);

  // PPTX
  console.log('· building PPTX …');
  const pptxBuf = await exportDeckToPptx(deck);
  const pptxPath = path.join(outDir, 'matrix.pptx');
  fs.writeFileSync(pptxPath, pptxBuf);
  const pptxReport = inspectPptx(pptxPath);

  // PDF
  console.log('· building PDF …');
  const pdfBuf = await exportDeckToPdf(deck);
  const pdfPath = path.join(outDir, 'matrix.pdf');
  fs.writeFileSync(pdfPath, pdfBuf);

  // PNG
  console.log('· building PNGs …');
  const pngs = await exportDeckToPngs(deck);
  pngs.forEach((b, i) => fs.writeFileSync(path.join(outDir, `${String(i + 1).padStart(2, '0')}-${CHART_KINDS[i]}.png`), b));

  // JPEG
  console.log('· building JPEGs …');
  const jpegs = await exportDeckToJpegs(deck);
  jpegs.forEach((b, i) => fs.writeFileSync(path.join(outDir, `${String(i + 1).padStart(2, '0')}-${CHART_KINDS[i]}.jpg`), b));

  // Matrix
  const rows = CHART_KINDS.map((kind, i) => {
    const pptx = pptxReport[i];
    return {
      kind,
      pptx_ok: !!pptx && pptx.hasImage && !pptx.hasFailure,
      png_ok:  Buffer.isBuffer(pngs[i])  && pngs[i].length  > 1024,
      jpeg_ok: Buffer.isBuffer(jpegs[i]) && jpegs[i].length > 1024,
    };
  });

  const totalsPass = {
    pptx: rows.filter((r) => r.pptx_ok).length,
    png:  rows.filter((r) => r.png_ok).length,
    jpeg: rows.filter((r) => r.jpeg_ok).length,
    pdf:  pdfBuf.length > 4096 ? 1 : 0,
  };

  console.log('\nChart parity matrix:');
  console.log('───────────────────────────────────────────────────────');
  console.log('  #  kind                      PPTX  PNG  JPEG');
  console.log('───────────────────────────────────────────────────────');
  rows.forEach((r, i) => {
    const cell = (ok: boolean) => ok ? ' ✓ ' : ' ✗ ';
    console.log(`  ${String(i + 1).padStart(2)}  ${r.kind.padEnd(24)}  ${cell(r.pptx_ok)}  ${cell(r.png_ok)}  ${cell(r.jpeg_ok)}`);
  });
  console.log('───────────────────────────────────────────────────────');
  console.log(`  PPTX: ${totalsPass.pptx}/${CHART_KINDS.length}`);
  console.log(`  PNG:  ${totalsPass.png}/${CHART_KINDS.length}`);
  console.log(`  JPEG: ${totalsPass.jpeg}/${CHART_KINDS.length}`);
  console.log(`  PDF:  ${totalsPass.pdf}/1   (${pdfBuf.length} bytes, ${CHART_KINDS.length} pages)`);
  console.log(`  files: ${outDir}`);

  const allPass =
    totalsPass.pptx === CHART_KINDS.length &&
    totalsPass.png  === CHART_KINDS.length &&
    totalsPass.jpeg === CHART_KINDS.length &&
    totalsPass.pdf  === 1;

  if (!allPass) {
    console.error('\n❌ Phase 33.75 parity NOT achieved');
    process.exit(1);
  }
  console.log('\n✅ Phase 33.75 parity achieved: 21/21 across PPTX + PDF + PNG + JPEG');
}

main().catch((err) => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
