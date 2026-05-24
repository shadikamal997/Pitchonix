/**
 * Phase 41.1 — Universal Conversion Fidelity Pass validation.
 *
 *   41.1A — Geometry-aware PDF parser (pdfjs-dist)
 *   41.1B — Table reconstruction
 *   41.1C — Image extraction (count via PDF operators)
 *   41.1D — Multi-column detection
 *   41.1E — Cross-format chart renderer (SVG)
 *   41.1F — Chart data preservation through UDM
 *   41.1G — DOCX chart embedding (PNG via sharp)
 *   41.1H — HTML chart embedding (inline SVG)
 *   41.1I — ConvertedFile model + lineage service
 *   41.1J — Chain endpoint
 *   41.1K — Restore endpoint
 *   41.1L — Quality score 2.0 (text/layout/image/chart/table sub-scores)
 *   41.1M — Cross-format conversion live tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { UniversalConversionService } from '../src/universal-conversion/universal-conversion.service';
import { renderChartSvg, renderChartPng } from '../src/universal-conversion/exporters/chart-renderer';

const BE       = path.join(__dirname, '..');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

let fail = 0;
let total = 0;
function check(label: string, ok: boolean): void {
  total++;
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 41.1 — Universal Conversion Fidelity Pass\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('41.1A-D — Geometry PDF importer');
  check('pdf-geometry-importer.ts exists', existsBE('src/universal-conversion/importers/pdf-geometry-importer.ts'));
  const pg = readBE('src/universal-conversion/importers/pdf-geometry-importer.ts');
  check('uses pdfjs-dist legacy build',                    /pdfjs-dist\/legacy\/build\/pdf\.mjs/.test(pg));
  check('clusters items into lines',                       /clusterIntoLines/.test(pg));
  check('detects multi-column layouts',                    /detectColumnCount/.test(pg));
  check('detects tables via consistent cell gaps',         /detectTables/.test(pg) && /consistentCellGaps/.test(pg));
  check('counts embedded images via OPS.paintImageXObject',/paintImageXObject/.test(pg));
  check('strips header + footer bands',                    /HEADER_BAND/.test(pg) && /FOOTER_BAND/.test(pg));
  check('service routes pdf through geometry then falls back',
    /importPdfGeometry/.test(readBE('src/universal-conversion/universal-conversion.service.ts')));

  console.log('\n41.1E-H — Chart rendering');
  check('chart-renderer.ts exists', existsBE('src/universal-conversion/exporters/chart-renderer.ts'));
  const cr = readBE('src/universal-conversion/exporters/chart-renderer.ts');
  check('renderChartSvg + renderChartPng exported',  /export function renderChartSvg/.test(cr) && /export async function renderChartPng/.test(cr));
  check('uses svg-chart-builder',                    /from\s+['"]..\/..\/generation\/export\/svg-chart-builder['"]/.test(cr));
  const hx = readBE('src/universal-conversion/exporters/html-exporter.ts');
  check('html exporter embeds inline SVG charts',    /renderChartSvg/.test(hx) && /<figure class="chart"/.test(hx));
  const mx = readBE('src/universal-conversion/exporters/markdown-exporter.ts');
  check('markdown exporter embeds SVG charts',       /renderChartSvg/.test(mx));
  const dx = readBE('src/universal-conversion/exporters/docx-exporter.ts');
  check('docx exporter pre-renders chart PNGs',      /renderChartPng/.test(dx) && /chartPng/.test(dx) && /new ImageRun/.test(dx));

  console.log('\n41.1I-K — Lineage + ConvertedFile');
  const schema = readBE('prisma/schema.prisma');
  check('ConvertedFile model in schema',  /model ConvertedFile/.test(schema));
  check('parent self-relation set up',    /ConvertedFileLineage/.test(schema));
  check('qualityReport stored as Json',   /qualityReport\s+Json/.test(schema));
  check('lineage service exists', existsBE('src/universal-conversion/conversion-lineage.service.ts'));
  const ls = readBE('src/universal-conversion/conversion-lineage.service.ts');
  check('record + chain + restore + list + remove exposed',
    /record\(/.test(ls) && /chain\(/.test(ls) && /restore\(/.test(ls) && /list\(/.test(ls) && /remove\(/.test(ls));
  const ctl = readBE('src/universal-conversion/universal-conversion.controller.ts');
  check('controller exposes history / lineage/:id / restore/:id',
    /'history'/.test(ctl) && /lineage\/:id/.test(ctl) && /restore\/:id/.test(ctl));
  const mod = readBE('src/universal-conversion/universal-conversion.module.ts');
  check('lineage service registered in module', /ConversionLineageService/.test(mod));

  console.log('\n41.1L — Quality score 2.0');
  const svcSrc = readBE('src/universal-conversion/universal-conversion.service.ts');
  check('fidelity sub-scores in report shape',
    /fidelity\?: \{[\s\S]+?layout:[\s\S]+?image:[\s\S]+?chart:[\s\S]+?table:/.test(svcSrc));
  check('sumCells helper for table fidelity',  /function sumCells/.test(svcSrc));

  // ===========================================================================
  //  Live: chart renderer (SVG + PNG)
  // ===========================================================================
  console.log('\n41.1E — Live chart render');
  const sample = {
    type: 'bar',
    title: 'Quarterly revenue',
    categories: ['Q1', 'Q2', 'Q3', 'Q4'],
    series: [{ name: 'Rev', values: [120, 145, 168, 192] }],
    legend: { visible: true, position: 'bottom' },
  };
  const svg = renderChartSvg(sample);
  check(`chart SVG produced (${svg ? svg.length : 0} chars + contains <svg>)`, !!svg && svg.includes('<svg'));
  const png = await renderChartPng(sample);
  check(`chart PNG produced (${png ? png.length : 0}B + starts with 89 50 4E 47)`,
    !!png && png[0] === 0x89 && png[1] === 0x50 && png[2] === 0x4E && png[3] === 0x47);

  // ===========================================================================
  //  Live: DOCX with chart node → ensure ImageRun is embedded
  // ===========================================================================
  console.log('\n41.1G — DOCX chart embedding');
  const conv = new UniversalConversionService(new (PptxImportService as any)(null), null as any);
  // Build a MD source with no chart, then inject a chart node via the
  // pipeline by going through PPTX (which carries chart data).
  // Simpler: synthesise a UDM and call exportDocx directly.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { exportDocx } = require('../src/universal-conversion/exporters/docx-exporter');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { emptyDocument, heading, paragraph } = require('../src/universal-conversion/document-model');
  const udm = emptyDocument('docx', 'Chart smoke');
  udm.pages.push({
    title: 'Cover',
    nodes: [
      heading(1, 'Quarterly Review'),
      paragraph('Below: a chart.'),
      { type: 'chart', chart: sample },
    ],
  });
  const docxBuf: Buffer = await exportDocx(udm);
  check(`DOCX with chart non-empty (${docxBuf.length}B)`, docxBuf.length > 5000);

  // ===========================================================================
  //  Live: cross-format roundtrip exercises quality 2.0
  // ===========================================================================
  console.log('\n41.1L + 41.1M — Live conversion + fidelity sub-scores');
  // Markdown with table + multiple sections → PPTX, then preview the report.
  const md = `# Strategy

## Vision
A line of body text.

## KPIs

| Metric | Value |
| --- | --- |
| Revenue | $120k |
| Customers | 250 |

---

## Roadmap

- Quarter 1
- Quarter 2
- Quarter 3
`;
  const r = await conv.convert({
    buffer: Buffer.from(md, 'utf8'), filename: 'strategy.md', targetFormat: 'pptx',
  });
  check(`MD → PPTX produced (${r.buffer.length}B)`, r.format === 'pptx' && r.buffer.length > 5000);
  check(`report.fidelity exists`,                 !!r.report.fidelity);
  if (r.report.fidelity) {
    console.log(`    text=${r.report.fidelity.text}  layout=${r.report.fidelity.layout}  image=${r.report.fidelity.image}  chart=${r.report.fidelity.chart}  table=${r.report.fidelity.table}  overall=${r.report.fidelity.overall}`);
    check(`fidelity overall in 0..100`, r.report.fidelity.overall >= 0 && r.report.fidelity.overall <= 100);
    check(`table sub-score reflects single table preserved`, r.report.fidelity.table >= 80);
    check(`text sub-score ≥ 80`, r.report.fidelity.text >= 80);
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 41.1 — all ${total} checks passed` : `✗ Phase 41.1 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
