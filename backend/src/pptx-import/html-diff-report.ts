import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService, PptxImportResult, ImportedSlide } from './pptx-import.service';
import { roundTrip, RoundTripDiff } from './round-trip';
import { diffDecks, DeckDiff } from './visual-fidelity';
import { CertificationResult, certifyDeck } from './compatibility-certification';

// =============================================================================
//  Phase 38.5H — Round-trip HTML diff report.
//
//  Produces a single self-contained HTML file per fixture that:
//    - Renders certification scores (import / export / round-trip / visual)
//    - Lists per-slide structural deltas (text frame count, chart drift…)
//    - Shows side-by-side mock renders of the source vs round-tripped deck
//      (using a deterministic SVG approximation — full pixel comparison
//      requires LibreOffice; we mark the mode in the report header).
//
//  No build tools / no framework — just a string template. The output file
//  is browser-openable and zero-dependency, useful for issue triage + PR
//  reviews without spinning up the frontend.
// =============================================================================

export interface DiffReportInput {
  /** Path to the source PPTX. */
  fixturePath: string;
  /** Original parsed result. */
  before:      PptxImportResult;
  /** Parsed result of the exported-then-re-imported deck. */
  after:       PptxImportResult;
  /** Structural diff between before/after. */
  diff:        RoundTripDiff;
  /** Optional pixel-diff result if VisualFidelityEngine has been run. */
  visual?:     DeckDiff;
  /** Optional certification snapshot to embed at the top. */
  certification?: CertificationResult;
}

export async function buildRoundTripReport(svc: PptxImportService, fixturePath: string, outputHtml: string): Promise<DiffReportInput> {
  const buffer = fs.readFileSync(fixturePath);
  const before  = svc.parseBuffer(buffer);
  const rt      = await roundTrip(svc, buffer);
  // Re-parse the exported buffer so we have a comparable "after".
  // The round-trip helper already does this internally but doesn't expose it;
  // we redo it here so the HTML can render both sides.
  const after  = svc.parseBuffer(await roundtripExport(svc, buffer));
  let visual: DeckDiff | undefined;
  try { visual = await diffDecks(before, after); } catch { /* internal-mode failed */ }
  let certification: CertificationResult | undefined;
  try { certification = await certifyDeck(svc, buffer); } catch { /* */ }

  const input: DiffReportInput = { fixturePath, before, after, diff: rt.diff, visual, certification };
  const html = renderHtml(input);
  fs.mkdirSync(path.dirname(outputHtml), { recursive: true });
  fs.writeFileSync(outputHtml, html);
  return input;
}

async function roundtripExport(svc: PptxImportService, buffer: Buffer): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { exportDeckToPptx } = require('../slide-export/element-pptx-exporter');
  const parsed = svc.parseBuffer(buffer);
  const renderInput = {
    title: parsed.title,
    slides: parsed.slides.map((s: ImportedSlide, idx: number) => ({
      index: idx,
      total: parsed.slides.length,
      title: s.title,
      background: null,
      themeTokens: null,
      elements: s.elements.map((el, j) => ({
        id: `imp-${idx}-${j}`,
        slideId: `imp-${idx}`,
        type:   el.type as any,
        order:  el.order,
        x: el.x, y: el.y, width: el.width, height: el.height,
        rotation: 0, zIndex: 0, locked: false, visible: true,
        content: el.content,
        style:   el.style ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      speakerNotes: s.speakerNotes ?? null,
      transition: null,
    })),
  };
  return await exportDeckToPptx(renderInput);
}

// =============================================================================
//  HTML renderer
// =============================================================================

function renderHtml(input: DiffReportInput): string {
  const { fixturePath, before, after, diff, visual, certification } = input;
  const title = `Round-trip diff — ${path.basename(fixturePath)}`;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${esc(title)}</title>
<style>
  body { font: 13px/1.4 -apple-system, BlinkMacSystemFont, sans-serif; color: #1F2937; padding: 24px; max-width: 1200px; margin: 0 auto; }
  h1 { margin: 0 0 4px; font-size: 18px; }
  h2 { margin: 24px 0 8px; font-size: 14px; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px; }
  .meta { color: #64748B; font-size: 11px; margin-bottom: 16px; }
  .scores { display: grid; grid-template-columns: repeat(4, 1fr); gap: 8px; margin-bottom: 16px; }
  .score { padding: 10px; border-radius: 6px; background: #F8FAFC; border: 1px solid #E2E8F0; }
  .score .v { font-size: 22px; font-weight: 700; }
  .score .l { font-size: 10px; color: #64748B; text-transform: uppercase; letter-spacing: 0.04em; }
  .band-platinum { background: #EFF6FF; color: #1D4ED8; }
  .band-gold     { background: #FEF9C3; color: #A16207; }
  .band-silver   { background: #F1F5F9; color: #475569; }
  .band-bronze   { background: #FFEDD5; color: #9A3412; }
  .band-basic    { background: #FFF1F2; color: #BE123C; }
  .delta { font-family: ui-monospace, SF Mono, monospace; font-size: 11px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { padding: 6px 8px; border-bottom: 1px solid #F1F5F9; text-align: left; }
  th { background: #F8FAFC; font-weight: 600; font-size: 10px; text-transform: uppercase; letter-spacing: 0.04em; color: #475569; }
  .pair { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
  .slide-mock { border: 1px solid #E2E8F0; border-radius: 4px; background: white; }
  .slide-mock .title { font-size: 10px; color: #64748B; padding: 4px 6px; border-bottom: 1px solid #E2E8F0; }
  .ok    { color: #16A34A; }
  .warn  { color: #F59E0B; }
  .fail  { color: #DC2626; }
  .badge { display: inline-block; padding: 2px 6px; font-size: 10px; font-weight: 700; border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
</style>
</head>
<body>
  <h1>${esc(title)}</h1>
  <div class="meta">
    Fixture: ${esc(fixturePath)} · Slides: ${before.slides.length} → ${after.slides.length}
    ${visual ? ` · Visual mode: <code>${visual.mode}</code>` : ' · Visual mode: none'}
  </div>

  ${certification ? `
    <div class="scores">
      ${scoreBlock('Import',     certification.scores.import)}
      ${scoreBlock('Export',     certification.scores.export)}
      ${scoreBlock('Round-trip', certification.scores.roundTrip)}
      ${scoreBlock('Visual',     certification.scores.visual)}
    </div>
    <div>
      <span class="badge band-${certification.band}">${certification.band.toUpperCase()} · ${certification.overall}/100</span>
    </div>
  ` : ''}

  <h2>Structural diff</h2>
  <table>
    <tr><th>Metric</th><th>Before</th><th>After</th><th>Δ</th></tr>
    ${diffRow('Slides',       before.slides.length,             after.slides.length,             diff.slideCountDelta)}
    ${diffRow('Text frames',  before.report.textFrames,         after.report.textFrames,         diff.textFrameDelta)}
    ${diffRow('Charts',       before.report.charts,             after.report.charts,             diff.chartDelta)}
    ${diffRow('Tables',       before.report.tables,             after.report.tables,             diff.tableDelta)}
    ${diffRow('Images',       before.report.images,             after.report.images,             diff.imageDelta)}
    ${diffRow('Speaker notes',before.report.notes,              after.report.notes,              diff.noteDelta)}
    ${diffRow('Mean drift',   '—',                              '—',                              diff.meanPositionDrift.toFixed(3))}
  </table>

  <h2>Per-slide preview</h2>
  ${before.slides.slice(0, 12).map((slide, i) => `
    <div class="pair">
      <div class="slide-mock">
        <div class="title">Before #${i + 1} · ${esc(slide.title || '')}</div>
        ${slideSvg(slide)}
      </div>
      <div class="slide-mock">
        <div class="title">After #${i + 1} · ${esc(after.slides[i]?.title || '')}</div>
        ${after.slides[i] ? slideSvg(after.slides[i]) : '<svg viewBox="0 0 100 56" />'}
      </div>
    </div>
  `).join('')}
  ${before.slides.length > 12 ? `<p class="meta">(showing first 12 of ${before.slides.length} slides)</p>` : ''}

  <h2>Import warnings</h2>
  ${before.report.warnings.length === 0
    ? '<p class="ok">No warnings.</p>'
    : `<ul>${before.report.warnings.map((w) => `<li>${esc(w)}</li>`).join('')}</ul>`}
</body>
</html>`;
}

function scoreBlock(label: string, value: number): string {
  const cls = value >= 85 ? 'ok' : value >= 65 ? 'warn' : 'fail';
  return `<div class="score"><div class="v ${cls}">${value}</div><div class="l">${label}</div></div>`;
}

function diffRow(label: string, before: any, after: any, delta: any): string {
  const cls = (Number(delta) === 0) ? 'ok' : (Number(delta) > 5 ? 'fail' : 'warn');
  return `<tr><td>${esc(label)}</td><td>${before}</td><td>${after}</td><td class="delta ${cls}">${delta}</td></tr>`;
}

function slideSvg(slide: ImportedSlide): string {
  return `<svg viewBox="0 0 100 56.25" width="100%" height="auto" style="background:#FAFAFA">
    ${slide.elements.map((el) => {
      const fill = el.type === 'heading'   ? '#1F2937'
                 : el.type === 'paragraph' ? '#94A3B8'
                 : el.type === 'image'     ? '#0EA5E9'
                 : el.type === 'chart'     ? '#EA580C'
                 : el.type === 'table'     ? '#16A34A'
                 : el.type === 'smartArt'  ? '#A855F7'
                 : el.type === 'oleObject' ? '#FBBF24'
                 :                            '#CBD5E1';
      return `<rect x="${el.x}" y="${el.y * 0.5625}" width="${el.width}" height="${el.height * 0.5625}" fill="${fill}" opacity="0.8" />`;
    }).join('')}
  </svg>`;
}

function esc(s: string): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
