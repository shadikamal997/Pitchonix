import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as crypto from 'crypto';
import { spawn } from 'child_process';
import { exportDeckToPptx } from '../slide-export/element-pptx-exporter';
import type { PptxImportResult, ImportedSlide } from './pptx-import.service';
import type { SlideRenderer } from './visual-fidelity';

// =============================================================================
//  Phase 38.3A + 38.3I — LibreOffice headless render adapter.
//
//  When `LIBREOFFICE_BIN` (or `soffice` on $PATH) is available, this module
//  drives LibreOffice headless to convert a .pptx → PNGs, one per slide. We
//  then expose a SlideRenderer compatible with the VisualFidelityEngine so
//  comparisons can be PowerPoint-render vs Pitchonix-render rather than
//  Pitchonix-render vs Pitchonix-render.
//
//  Flow:
//    1. Take an ImportedDeck → rebuild a .pptx via exportDeckToPptx (our
//       OOXML output, with animations + transitions). This is the buffer
//       we hand to LibreOffice.
//    2. Write the buffer to a temp dir.
//    3. soffice --headless --convert-to pdf <file> outputs a multi-page PDF.
//    4. pdftoppm (Poppler) renders each page to PNG at the configured DPI.
//       If pdftoppm isn't on PATH, we fall back to soffice --convert-to png
//       which only produces the first slide — better than nothing.
//    5. Return a SlideRenderer that maps slide index → buffer.
//
//  All shell calls are gated behind `isAvailable()` so the validation script
//  + the runtime gracefully skip when neither binary exists.
// =============================================================================

const SOFFICE_BIN  = process.env.LIBREOFFICE_BIN || 'soffice';
const PDFTOPPM_BIN = process.env.PDFTOPPM_BIN    || 'pdftoppm';

export async function isLibreOfficeAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(SOFFICE_BIN, ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit',  (code) => resolve(code === 0));
  });
}

export async function isPdftoppmAvailable(): Promise<boolean> {
  return new Promise((resolve) => {
    const child = spawn(PDFTOPPM_BIN, ['-v'], { stdio: 'ignore' });
    child.on('error', () => resolve(false));
    child.on('exit',  () => resolve(true));   // pdftoppm exits with 0 or 1; either means present
  });
}

/**
 * Build a renderer that converts a deck to PPTX, hands it to LibreOffice,
 * and yields one PNG per slide. Throws if LibreOffice isn't available.
 */
export async function buildReferenceRenderer(deck: PptxImportResult): Promise<SlideRenderer> {
  if (!(await isLibreOfficeAvailable())) {
    throw new Error('LibreOffice (soffice) is not on PATH and LIBREOFFICE_BIN is not set');
  }
  // Render this deck once to PPTX, then convert.
  const renderInput = importedToRenderDeck(deck);
  const buffer = await exportDeckToPptx(renderInput as any);
  const dir    = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-fidelity-'));
  const file   = path.join(dir, `deck-${crypto.randomUUID()}.pptx`);
  fs.writeFileSync(file, buffer);

  // Convert to PDF.
  await runShell(SOFFICE_BIN, ['--headless', '--convert-to', 'pdf', '--outdir', dir, file]);
  const pdf = file.replace(/\.pptx$/, '.pdf');
  if (!fs.existsSync(pdf)) throw new Error('LibreOffice did not produce a PDF');

  // Split PDF → PNGs.
  const prefix = path.join(dir, 'page');
  if (await isPdftoppmAvailable()) {
    await runShell(PDFTOPPM_BIN, ['-png', '-r', '120', pdf, prefix]);
  } else {
    // Fallback: soffice can convert PDF → PNG single-page; rebound to first slide only.
    await runShell(SOFFICE_BIN, ['--headless', '--convert-to', 'png', '--outdir', dir, pdf]);
  }

  // Discover output PNGs.
  const pngs = fs.readdirSync(dir)
    .filter((n) => n.toLowerCase().endsWith('.png'))
    .sort();
  if (pngs.length === 0) throw new Error('No PNG output from LibreOffice/pdftoppm');

  // Return a renderer that returns the i-th PNG (or the last if i out of range).
  return ((_slide: ImportedSlide, idx: number): Buffer => {
    const p = path.join(dir, pngs[Math.min(idx, pngs.length - 1)]);
    return fs.readFileSync(p);
  }) as SlideRenderer;
}

function runShell(bin: string, args: string[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(bin, args, { stdio: 'ignore' });
    child.on('error', reject);
    child.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`${bin} exited ${code}`)));
  });
}

// =============================================================================
//  Adapter shape — keep in sync with round-trip.ts (we duplicate to avoid a
//  circular import; the shape is small enough that drift is not a concern).
// =============================================================================

function importedToRenderDeck(parsed: PptxImportResult): any {
  return {
    title: parsed.title,
    slides: parsed.slides.map((s, idx) => ({
      index: idx,
      total: parsed.slides.length,
      title: s.title,
      background: null,
      themeTokens: null,
      elements: s.elements.map((el, j) => ({
        id:       `imp-${idx}-${j}`,
        slideId:  `imp-${idx}`,
        type:     el.type,
        order:    el.order,
        x: el.x, y: el.y, width: el.width, height: el.height,
        rotation: 0, zIndex: 0,
        locked: false, visible: true,
        content: el.content ?? null,
        style:   el.style ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      speakerNotes: s.speakerNotes ?? null,
      transition: null,
    })),
  };
}
