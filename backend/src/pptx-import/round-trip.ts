import { PptxImportService, PptxImportResult, ImportReport } from './pptx-import.service';
import { OoxmlPackage } from './ooxml-parser';
import { exportDeckToPptx } from '../slide-export/element-pptx-exporter';
import type { RenderDeckInput, RenderSlideInput } from '../slide-export/render-types';

// =============================================================================
//  Phase 38.1H + 38.1I — Round-trip harness + structural diff.
//
//  Pipeline (per fixture):
//
//      buffer ──parse──▶ ImportedDeck
//                              │
//                              ▼
//                       toRenderDeckInput()
//                              │
//                              ▼
//                       exportDeckToPptx() ──▶ Buffer'
//                              │
//                              ▼
//                       parseBuffer(Buffer') ──▶ ImportedDeck'
//                              │
//                              ▼
//                      diffStructural(A, A')
//
//  Visual / pixel diff would require a renderer (LibreOffice headless,
//  or a headless Chromium that paints PPTX). That is intentionally out of
//  scope for this harness; we report structural drift instead.
// =============================================================================

export interface RoundTripDiff {
  slideCountDelta:   number;          // |a.slides - b.slides|
  titleMismatches:   number;          // titles that don't match
  textFrameDelta:    number;          // |a textframes - b|
  chartDelta:        number;
  tableDelta:        number;
  imageDelta:        number;
  noteDelta:         number;
  /** Average position drift in percent points (over matched elements). */
  meanPositionDrift: number;
  /** Final 0..1 fidelity score. 1 = identical (within tolerance). */
  fidelityScore:     number;
}

export interface RoundTripResult {
  imported:   ImportReport;
  reimported: ImportReport;
  diff:       RoundTripDiff;
  passed:     boolean;
}

/** Run the parse → export → re-parse pipeline on a single buffer. */
export async function roundTrip(
  service: PptxImportService,
  buffer: Buffer,
): Promise<RoundTripResult> {
  const a: PptxImportResult = service.parseBuffer(buffer);
  const deck: RenderDeckInput = toRenderDeckInput(a);
  const exported = await exportDeckToPptx(deck);
  const b: PptxImportResult = service.parseBuffer(exported);

  const diff = diffStructural(a, b);
  return {
    imported:   a.report,
    reimported: b.report,
    diff,
    passed:     diff.fidelityScore >= 0.7,
  };
}

// -----------------------------------------------------------------------------
//  Adapter: ImportedDeck → RenderDeckInput shape the exporter expects.
// -----------------------------------------------------------------------------

function toRenderDeckInput(parsed: PptxImportResult): RenderDeckInput {
  return {
    title: parsed.title,
    slides: parsed.slides.map((s, idx): RenderSlideInput => ({
      index: idx,
      total: parsed.slides.length,
      title: s.title,
      background: null,
      themeTokens: null,
      elements: s.elements.map((el, j) => ({
        id:       `imp-${idx}-${j}`,
        slideId:  `imp-${idx}`,
        type:     el.type as any,
        name:     null,
        order:    el.order,
        x: el.x, y: el.y, width: el.width, height: el.height,
        rotation: 0, zIndex: 0,
        locked: false, visible: true,
        content: el.content ?? null,
        data:    null,
        style:   el.style ?? null,
        animations: null,
        accessibility: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      speakerNotes: s.speakerNotes ?? null,
      transition: null,
      sectionId: null,
      sectionName: null,
    })),
  };
}

// -----------------------------------------------------------------------------
//  Diff
// -----------------------------------------------------------------------------

export function diffStructural(a: PptxImportResult, b: PptxImportResult): RoundTripDiff {
  const aSlides = a.slides; const bSlides = b.slides;
  const n = Math.min(aSlides.length, bSlides.length);

  let titleMismatches = 0;
  let drift = 0; let driftN = 0;
  for (let i = 0; i < n; i++) {
    if (norm(aSlides[i].title) !== norm(bSlides[i].title)) titleMismatches++;
    const m = Math.min(aSlides[i].elements.length, bSlides[i].elements.length);
    for (let j = 0; j < m; j++) {
      const ea = aSlides[i].elements[j]; const eb = bSlides[i].elements[j];
      drift += Math.abs(ea.x - eb.x) + Math.abs(ea.y - eb.y);
      driftN += 2;
    }
  }
  const meanPositionDrift = driftN > 0 ? drift / driftN : 0;

  const ra = a.report; const rb = b.report;
  const slideCountDelta = Math.abs(ra.slidesParsed - rb.slidesParsed);
  const textFrameDelta  = Math.abs(ra.textFrames   - rb.textFrames);
  const chartDelta      = Math.abs(ra.charts       - rb.charts);
  const tableDelta      = Math.abs(ra.tables       - rb.tables);
  const imageDelta      = Math.abs(ra.images       - rb.images);
  const noteDelta       = Math.abs(ra.notes        - rb.notes);

  // Fidelity score: start at 1, subtract proportional deltas + drift penalty.
  let score = 1.0;
  const total = Math.max(1, ra.slidesParsed);
  score -= Math.min(0.3, slideCountDelta / total);
  score -= Math.min(0.2, textFrameDelta  / Math.max(1, ra.textFrames));
  score -= Math.min(0.2, chartDelta      / Math.max(1, ra.charts));
  score -= Math.min(0.1, tableDelta      / Math.max(1, ra.tables));
  score -= Math.min(0.1, imageDelta      / Math.max(1, ra.images));
  score -= Math.min(0.05, noteDelta      / Math.max(1, ra.notes));
  score -= Math.min(0.15, meanPositionDrift / 10);   // 10pp drift ≈ -0.15
  score -= Math.min(0.1, titleMismatches / Math.max(1, n));

  return {
    slideCountDelta, titleMismatches, textFrameDelta,
    chartDelta, tableDelta, imageDelta, noteDelta,
    meanPositionDrift: Number(meanPositionDrift.toFixed(3)),
    fidelityScore: Number(Math.max(0, score).toFixed(3)),
  };
}

function norm(s: string | undefined | null): string {
  return String(s ?? '').replace(/\s+/g, ' ').trim().toLowerCase();
}

// =============================================================================
//  Synthetic fixture — used by the harness when no real PPTX is supplied.
//
//  Builds a tiny deck in-memory via pptxgenjs and round-trips it through
//  parse → export → re-parse. Lets the test suite + validation script run
//  without needing binary fixtures in the repo.
// =============================================================================

export async function buildSyntheticFixture(): Promise<Buffer> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PptxGenJS = require('pptxgenjs');
  const p = new PptxGenJS();
  p.layout = 'LAYOUT_WIDE';
  p.title = 'Round-trip fixture';
  for (const [title, body] of [
    ['Investor Deck — Cover', 'Series A · 2026'],
    ['Problem', 'Customers waste 8h/week stitching slides.'],
    ['Solution', 'Pitchonix generates branded decks in minutes.'],
    ['Market', 'TAM 24B  ·  SAM 6B  ·  SOM 600M'],
    ['Closing', 'Thank you.'],
  ]) {
    const s = p.addSlide();
    s.addText(title!, { x: 0.5, y: 0.4, w: 12, h: 1.0, fontSize: 32, bold: true });
    s.addText(body!,  { x: 0.5, y: 1.8, w: 12, h: 1.0, fontSize: 18 });
    s.addNotes(`Notes for ${title}.`);
  }
  return (await p.write({ outputType: 'nodebuffer' })) as Buffer;
}
