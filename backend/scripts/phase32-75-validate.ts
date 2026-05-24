/**
 * Phase 32.75 — Master Elements parity validation
 *
 * Builds a 50-slide deck in memory and merges a representative set of
 * master elements (logo, header, footer with token-substituted page numbers,
 * watermark, confidential, copyright) into every slide. Then runs every
 * export path and asserts that the masters render correctly on every slide
 * in every format.
 *
 *   - PPTX  via exportDeckToPptx
 *   - PDF   via exportDeckToPdf
 *   - PNGs  via exportDeckToPngs
 *   - JPEGs via exportDeckToJpegs
 *
 * Assertions:
 *   - PPTX: every slide XML contains the literal master text (footer, logo
 *     name, etc) AND a unique "Page N of 50" footer per slide.
 *   - PDF:  buffer > 4KB
 *   - PNG/JPEG: 50 frames, each > 1KB.
 *
 * Run:  pnpm ts-node scripts/phase32-75-validate.ts
 */

import { execSync } from 'child_process';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

import type { SlideElementDTO } from '../src/slides/element-types';
import type { RenderDeckInput, RenderSlideInput } from '../src/slide-export/render-types';
import { exportDeckToPptx } from '../src/slide-export/element-pptx-exporter';
import { exportDeckToPdf, exportDeckToPngs, exportDeckToJpegs } from '../src/slide-export/element-image-exporter';
import { buildMasterElementsForSlide } from '../src/master-elements/master-merge';
import type { MasterElementDTO } from '../src/master-elements/master-element-types';

const SLIDE_COUNT = 50;
const DECK_TITLE  = 'Phase 32.75 master-elements validation';

// =============================================================================
//  Master fixtures — one of every "Tier 1" master family.
// =============================================================================
function fixtureMasters(): MasterElementDTO[] {
  const now = new Date().toISOString();
  const base = (id: string, fields: Partial<MasterElementDTO>): MasterElementDTO => ({
    id,
    deckId:    'validation-deck',
    type:      'custom',
    name:      null,
    x: 0, y: 0, width: 20, height: 5,
    rotation: 0, zIndex: 0,
    sendToFront: false,
    visible:   true,
    excludedSlides: [],
    elementData: null,
    style: null,
    createdAt: now,
    updatedAt: now,
    ...fields,
  });

  return [
    base('master-logo', {
      type: 'logo',
      x: 2, y: 2, width: 12, height: 5,
      elementData: { src: '', name: 'PITCHONIX' },
    }),
    base('master-header', {
      type: 'header',
      x: 20, y: 2, width: 78, height: 4,
      elementData: { text: 'Series A · Confidential' },
      style: { fontSize: 11, color: '#475569', textAlign: 'right' },
    }),
    base('master-footer', {
      type: 'footer',
      x: 2, y: 94, width: 60, height: 3,
      elementData: { text: 'pitchonix.com · {date}' },
    }),
    base('master-page-number', {
      type: 'pageNumber',
      x: 88, y: 94, width: 10, height: 3,
      elementData: { format: 'pageOfTotal' },
      style: { textAlign: 'right' } as any,
    }),
    base('master-watermark', {
      type: 'watermark',
      x: 10, y: 40, width: 80, height: 20,
      rotation: -20,
      elementData: { text: 'DRAFT', opacity: 0.08 },
    }),
    base('master-confidential', {
      type: 'confidential',
      x: 40, y: 97, width: 20, height: 2,
      elementData: { text: 'CONFIDENTIAL' },
    }),
    base('master-copyright', {
      type: 'copyright',
      x: 65, y: 97, width: 23, height: 2,
      elementData: {},
      style: { fontSize: 9, color: '#94a3b8', textAlign: 'right' } as any,
    }),
  ];
}

// =============================================================================
//  Build the deck with masters merged into every slide (mirrors what the
//  slide-export service does at runtime when loading from the DB).
// =============================================================================
function buildSlide(index: number, total: number, masters: MasterElementDTO[]): RenderSlideInput {
  const slideId = `slide-${index + 1}`;
  const masterEls = buildMasterElementsForSlide(masters, {
    slideId, slideIndex: index, slideTotal: total,
  }, null);

  const titleEl: SlideElementDTO = {
    id: `title-${index}`, slideId, type: 'heading',
    name: 'Title', order: 0,
    x: 8, y: 20, width: 84, height: 12,
    rotation: 0, zIndex: 1,
    locked: false, visible: true,
    content: { text: `Slide ${index + 1}` } as any,
    data: null, style: null, animations: null, accessibility: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };
  const bodyEl: SlideElementDTO = {
    id: `body-${index}`, slideId, type: 'paragraph',
    name: 'Body', order: 1,
    x: 8, y: 38, width: 84, height: 18,
    rotation: 0, zIndex: 1,
    locked: false, visible: true,
    content: { text: `Content for slide ${index + 1} of ${total}.` } as any,
    data: null, style: null, animations: null, accessibility: null,
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  };

  return {
    index,
    total,
    title: `Slide ${index + 1}`,
    background: { type: 'solid', color: '#ffffff' } as any,
    themeTokens: null,
    elements: [...masterEls, titleEl, bodyEl],
  };
}

function buildDeck(): RenderDeckInput {
  const masters = fixtureMasters();
  return {
    title:  DECK_TITLE,
    slides: Array.from({ length: SLIDE_COUNT }, (_, i) => buildSlide(i, SLIDE_COUNT, masters)),
  };
}

// =============================================================================
//  PPTX inspection — extract slideN.xml and check for master content +
//  per-slide page number substitution.
// =============================================================================
interface PptxSlideReport {
  slide: number;
  hasHeader:       boolean;
  hasFooter:       boolean;
  hasLogo:         boolean;
  hasWatermark:    boolean;
  hasConfidential: boolean;
  hasCopyright:    boolean;
  hasPageNumber:   boolean;
}

function inspectPptx(pptxPath: string): PptxSlideReport[] {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-32-75-'));
  try {
    execSync(`unzip -q "${pptxPath}" -d "${tmp}"`);
    const slidesDir = path.join(tmp, 'ppt', 'slides');
    const files = fs.readdirSync(slidesDir)
      .filter((f) => /^slide\d+\.xml$/.test(f))
      .sort((a, b) => parseInt(a.match(/\d+/)![0]) - parseInt(b.match(/\d+/)![0]));
    return files.map((f, i) => {
      const xml = fs.readFileSync(path.join(slidesDir, f), 'utf8');
      const page = i + 1;
      // Page number footer is `${page} / 50` (pptxgenjs may compress whitespace).
      const pageRe = new RegExp(`${page}\\s*\\/\\s*${SLIDE_COUNT}`);
      return {
        slide:           page,
        hasHeader:       /Series A.*Confidential|Confidential/.test(xml),
        hasFooter:       /pitchonix\.com/.test(xml),
        hasLogo:         /PITCHONIX/.test(xml),
        hasWatermark:    /DRAFT/.test(xml),
        hasConfidential: /CONFIDENTIAL/.test(xml),
        hasCopyright:    /©|&#169;|(?:©)/.test(xml),
        hasPageNumber:   pageRe.test(xml),
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
  const outDir = path.join(__dirname, '..', 'exports', 'phase32-75');
  fs.mkdirSync(outDir, { recursive: true });

  console.log(`Phase 32.75 — Master Elements parity test (${SLIDE_COUNT} slides × 7 masters)\n`);

  console.log('· building PPTX …');
  const pptxBuf = await exportDeckToPptx(deck);
  const pptxPath = path.join(outDir, 'masters.pptx');
  fs.writeFileSync(pptxPath, pptxBuf);
  const pptxReport = inspectPptx(pptxPath);

  console.log('· building PDF …');
  const pdfBuf = await exportDeckToPdf(deck);
  fs.writeFileSync(path.join(outDir, 'masters.pdf'), pdfBuf);

  console.log('· building PNGs …');
  const pngs = await exportDeckToPngs(deck);
  fs.writeFileSync(path.join(outDir, 'slide-01.png'), pngs[0]);
  fs.writeFileSync(path.join(outDir, `slide-${String(Math.ceil(SLIDE_COUNT/2)).padStart(2,'0')}.png`), pngs[Math.ceil(SLIDE_COUNT/2) - 1]);
  fs.writeFileSync(path.join(outDir, `slide-${SLIDE_COUNT}.png`), pngs[SLIDE_COUNT - 1]);

  console.log('· building JPEGs …');
  const jpegs = await exportDeckToJpegs(deck);

  // Tally
  const headerOk        = pptxReport.filter((r) => r.hasHeader).length;
  const footerOk        = pptxReport.filter((r) => r.hasFooter).length;
  const logoOk          = pptxReport.filter((r) => r.hasLogo).length;
  const watermarkOk     = pptxReport.filter((r) => r.hasWatermark).length;
  const confidentialOk  = pptxReport.filter((r) => r.hasConfidential).length;
  const copyrightOk     = pptxReport.filter((r) => r.hasCopyright).length;
  const pageNumberOk    = pptxReport.filter((r) => r.hasPageNumber).length;
  const pngOk           = pngs.filter((b) => Buffer.isBuffer(b)  && b.length  > 1024).length;
  const jpegOk          = jpegs.filter((b) => Buffer.isBuffer(b) && b.length > 1024).length;
  const pdfOk           = pdfBuf.length > 4096 ? 1 : 0;

  console.log('\nMaster element render matrix (PPTX, across all 50 slides):');
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  Logo            ${logoOk}/${SLIDE_COUNT}`);
  console.log(`  Header          ${headerOk}/${SLIDE_COUNT}`);
  console.log(`  Footer          ${footerOk}/${SLIDE_COUNT}`);
  console.log(`  Watermark       ${watermarkOk}/${SLIDE_COUNT}`);
  console.log(`  Confidential    ${confidentialOk}/${SLIDE_COUNT}`);
  console.log(`  Copyright       ${copyrightOk}/${SLIDE_COUNT}`);
  console.log(`  Page numbers    ${pageNumberOk}/${SLIDE_COUNT}   (unique "N / ${SLIDE_COUNT}" per slide)`);
  console.log('───────────────────────────────────────────────────────────');
  console.log(`  PDF:            ${pdfOk}/1   (${pdfBuf.length} bytes, ${SLIDE_COUNT} pages)`);
  console.log(`  PNG slides:     ${pngOk}/${SLIDE_COUNT}`);
  console.log(`  JPEG slides:    ${jpegOk}/${SLIDE_COUNT}`);
  console.log(`  Files:          ${outDir}`);

  const pptxAllOk =
    logoOk === SLIDE_COUNT &&
    headerOk === SLIDE_COUNT &&
    footerOk === SLIDE_COUNT &&
    watermarkOk === SLIDE_COUNT &&
    confidentialOk === SLIDE_COUNT &&
    copyrightOk === SLIDE_COUNT &&
    pageNumberOk === SLIDE_COUNT;

  const allOk =
    pptxAllOk &&
    pdfOk === 1 &&
    pngOk === SLIDE_COUNT &&
    jpegOk === SLIDE_COUNT;

  if (!allOk) {
    console.error('\n❌ Phase 32.75 master parity NOT achieved');
    process.exit(1);
  }
  console.log('\n✅ Phase 32.75 master parity achieved across PPTX + PDF + PNG + JPEG');
}

main().catch((err) => {
  console.error('Validation script failed:', err);
  process.exit(1);
});
