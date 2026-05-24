import { PNG } from 'pngjs';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pixelmatch: (a: Buffer | Uint8Array, b: Buffer | Uint8Array, out: Buffer | Uint8Array, w: number, h: number, opts?: any) => number = require('pixelmatch');
import * as fs from 'fs';
import * as path from 'path';
import type { PptxImportResult, ImportedSlide } from './pptx-import.service';

// =============================================================================
//  Phase 38.2F — VisualFidelityEngine.
//
//  Compares two slide decks at the pixel level. Two operating modes:
//
//    1. Internal diff (always available): render each slide of the reference
//       deck and the comparison deck to a PNG via our own SVG-based renderer
//       and run pixelmatch. Useful for catching layout regressions inside
//       Pitchonix itself.
//
//    2. PowerPoint comparison (adapter mode): if a `referenceRenderer`
//       callback is provided — e.g. one that shells out to
//       `soffice --headless --convert-to png` — we use its PNGs as the
//       reference. Without an adapter we report `mode: 'internal'` and
//       label the result as approximate.
//
//  The engine returns per-slide metrics plus a deck-wide aggregate so the
//  validation pipeline + visual-diff dashboard can both consume it.
// =============================================================================

export interface SlideDiff {
  index:        number;
  width:        number;
  height:       number;
  diffPixels:   number;
  totalPixels:  number;
  ratio:        number;          // diffPixels / totalPixels
  /** Categorised drift (rough heuristics). */
  driftBreakdown: {
    position: number;            // % of diff attributable to position
    color:    number;
    font:     number;
    layout:   number;
  };
}

export interface DeckDiff {
  mode:           'internal' | 'reference';
  width:          number;
  height:         number;
  averageRatio:   number;
  worstRatio:     number;
  slideDiffs:     SlideDiff[];
  /** 0..1, 1 = visually identical (within tolerance). */
  fidelityScore:  number;
}

export type SlideRenderer = (slide: ImportedSlide, idx: number) => Buffer | Promise<Buffer>;

export interface VisualFidelityOptions {
  /** Render size (PNG) per slide. Defaults to 960×540 (16:9). */
  width?:  number;
  height?: number;
  /** pixelmatch threshold (0..1, lower = stricter). */
  threshold?: number;
  /** Optional external renderer (PowerPoint via LibreOffice CLI etc). */
  referenceRenderer?: SlideRenderer;
  /** Write diff PNGs to disk for inspection. */
  outputDir?: string;
}

export async function diffDecks(
  a: PptxImportResult,
  b: PptxImportResult,
  opts: VisualFidelityOptions = {},
): Promise<DeckDiff> {
  const width  = opts.width  ?? 960;
  const height = opts.height ?? 540;
  const thr    = opts.threshold ?? 0.1;
  const renderer = opts.referenceRenderer || defaultRenderer;
  const mode: DeckDiff['mode'] = opts.referenceRenderer ? 'reference' : 'internal';

  const n = Math.min(a.slides.length, b.slides.length);
  const slideDiffs: SlideDiff[] = [];

  for (let i = 0; i < n; i++) {
    const [bufA, bufB] = await Promise.all([
      Promise.resolve(renderer(a.slides[i], i)),
      Promise.resolve(renderer(b.slides[i], i)),
    ]);
    const imgA = PNG.sync.read(bufA);
    const imgB = PNG.sync.read(bufB);

    const W = Math.min(imgA.width,  imgB.width,  width);
    const H = Math.min(imgA.height, imgB.height, height);
    const out = new PNG({ width: W, height: H });

    const diffPixels = pixelmatch(
      croppedRGBA(imgA, W, H),
      croppedRGBA(imgB, W, H),
      out.data,
      W, H,
      { threshold: thr, alpha: 0.1 },
    );

    if (opts.outputDir) {
      try {
        if (!fs.existsSync(opts.outputDir)) fs.mkdirSync(opts.outputDir, { recursive: true });
        fs.writeFileSync(path.join(opts.outputDir, `diff-${i + 1}.png`), PNG.sync.write(out));
      } catch { /* ignore */ }
    }

    const total = W * H;
    slideDiffs.push({
      index: i, width: W, height: H,
      diffPixels, totalPixels: total,
      ratio: total > 0 ? diffPixels / total : 0,
      driftBreakdown: classifyDrift(a.slides[i], b.slides[i]),
    });
  }

  const ratios = slideDiffs.map((s) => s.ratio);
  const averageRatio = ratios.length ? ratios.reduce((p, c) => p + c, 0) / ratios.length : 0;
  const worstRatio   = ratios.length ? Math.max(...ratios) : 0;
  // Convert ratio → fidelity (ratio 0 → 1.0, ratio 0.5 → 0.5, capped).
  const fidelityScore = Math.max(0, Math.min(1, 1 - averageRatio * 2));

  return {
    mode, width, height,
    averageRatio: Number(averageRatio.toFixed(4)),
    worstRatio:   Number(worstRatio.toFixed(4)),
    slideDiffs,
    fidelityScore: Number(fidelityScore.toFixed(3)),
  };
}

// -----------------------------------------------------------------------------
//  Default renderer — simple SVG → PNG approximation good enough to detect
//  position / size regressions. NOT a substitute for a real PPTX renderer.
//  Replace with `opts.referenceRenderer` for true PowerPoint comparison.
// -----------------------------------------------------------------------------

function defaultRenderer(slide: ImportedSlide): Buffer {
  // Render every element as a coloured rectangle in a PNG at fixed resolution.
  const W = 960, H = 540;
  const png = new PNG({ width: W, height: H });
  // Background = white.
  for (let i = 0; i < png.data.length; i += 4) {
    png.data[i] = 255; png.data[i + 1] = 255; png.data[i + 2] = 255; png.data[i + 3] = 255;
  }
  for (const el of slide.elements) {
    const x = Math.floor((el.x / 100) * W);
    const y = Math.floor((el.y / 100) * H);
    const w = Math.max(1, Math.floor((el.width  / 100) * W));
    const h = Math.max(1, Math.floor((el.height / 100) * H));
    const color = colorFor(el.type);
    for (let py = y; py < Math.min(H, y + h); py++) {
      for (let px = x; px < Math.min(W, x + w); px++) {
        const i = (py * W + px) << 2;
        png.data[i]     = color.r;
        png.data[i + 1] = color.g;
        png.data[i + 2] = color.b;
        png.data[i + 3] = 255;
      }
    }
  }
  return PNG.sync.write(png);
}

function colorFor(type: string): { r: number; g: number; b: number } {
  switch (type) {
    case 'heading':   return { r: 31,  g: 41,  b: 55  };
    case 'paragraph': return { r: 100, g: 116, b: 139 };
    case 'image':     return { r: 14,  g: 165, b: 233 };
    case 'chart':     return { r: 234, g: 88,  b: 12  };
    case 'table':     return { r: 22,  g: 163, b: 74  };
    case 'smartArt':  return { r: 168, g: 85,  b: 247 };
    case 'oleObject': return { r: 251, g: 191, b: 36  };
    case 'shape':     return { r: 203, g: 213, b: 225 };
    default:          return { r: 209, g: 213, b: 219 };
  }
}

// -----------------------------------------------------------------------------
//  Drift classifier — categorises why a diff exists.
// -----------------------------------------------------------------------------

function classifyDrift(a: ImportedSlide | undefined, b: ImportedSlide | undefined): SlideDiff['driftBreakdown'] {
  if (!a || !b) return { position: 0, color: 0, font: 0, layout: 100 };
  const n = Math.min(a.elements.length, b.elements.length);
  if (n === 0) return { position: 0, color: 0, font: 0, layout: 100 };
  let posDelta = 0, layoutDelta = 0;
  for (let i = 0; i < n; i++) {
    const ea = a.elements[i]; const eb = b.elements[i];
    posDelta += Math.abs(ea.x - eb.x) + Math.abs(ea.y - eb.y);
    layoutDelta += Math.abs(ea.width - eb.width) + Math.abs(ea.height - eb.height);
  }
  const total = posDelta + layoutDelta + 1;
  return {
    position: Math.round((posDelta / total) * 100),
    color:    0,                                              // not yet tracked
    font:     0,                                              // not yet tracked
    layout:   Math.round((layoutDelta / total) * 100),
  };
}

function croppedRGBA(img: PNG, W: number, H: number): Buffer {
  if (img.width === W && img.height === H) return Buffer.from(img.data);
  const out = Buffer.alloc(W * H * 4);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const srcI = (y * img.width + x) << 2;
      const dstI = (y * W + x) << 2;
      out[dstI]     = img.data[srcI];
      out[dstI + 1] = img.data[srcI + 1];
      out[dstI + 2] = img.data[srcI + 2];
      out[dstI + 3] = img.data[srcI + 3];
    }
  }
  return out;
}
