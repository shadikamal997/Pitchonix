// =============================================================================
//  Element → PDF / PNG / JPEG exporter (Puppeteer-based)
//
//  Uses the same HTML emitted by renderDeckHtml so PDF and screenshots are
//  pixel-identical to one another (and structurally identical to the canvas).
//
//  - PDF:  exact PNG slide frames composed into one 16:9 PDF page per slide
//  - PNG:  page.screenshot() of each .slide-page in turn → array of Buffers
//  - JPEG: PNG path then Sharp re-encode to JPEG @ q=92
// =============================================================================

// CJS interop: sharp/archiver export `module.exports = fn`, which fails under
// our tsconfig (no esModuleInterop). Resolve via require() so both ts-node and
// nest build pick up the function object correctly.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const sharp: any = require('sharp');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { createCanvas, loadImage }: any = require('canvas');
import * as fs from 'fs';
import * as path from 'path';
import type { RenderDeckInput } from './render-types';
import { renderDeckHtml, SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT } from './element-html-renderer';

export async function exportDeckToPdf(deck: RenderDeckInput): Promise<Buffer> {
  const pngs = await exportDeckToPngs(deck);
  return composePdfFromPngs(pngs);
}

export async function exportDeckToPngs(deck: RenderDeckInput): Promise<Buffer[]> {
  const html = renderDeckHtml(deck);
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    // Tall viewport so the full stacked HTML is "above the fold" and clips
    // hit the right page each iteration. Puppeteer screenshot `clip` uses
    // page coordinates, so a single tall viewport gives us deterministic
    // captures without scrolling.
    const totalH = SLIDE_VIEWPORT_HEIGHT * Math.max(1, deck.slides.length);
    await page.setViewport({ width: SLIDE_VIEWPORT_WIDTH, height: totalH });
    await page.setContent(html, { waitUntil: 'load' });
    const pages: Buffer[] = [];
    for (let i = 0; i < deck.slides.length; i++) {
      const buf = await page.screenshot({
        type: 'png',
        clip: {
          x: 0,
          y: i * SLIDE_VIEWPORT_HEIGHT,
          width:  SLIDE_VIEWPORT_WIDTH,
          height: SLIDE_VIEWPORT_HEIGHT,
        },
      });
      pages.push(Buffer.from(buf));
    }
    return pages;
  } finally {
    await browser.close();
  }
}

export async function exportDeckToJpegs(deck: RenderDeckInput, quality = 92): Promise<Buffer[]> {
  const pngs = await exportDeckToPngs(deck);
  return Promise.all(pngs.map((p) => sharp(p).jpeg({ quality, mozjpeg: true }).toBuffer()));
}

async function composePdfFromPngs(pngs: Buffer[]): Promise<Buffer> {
  const canvas = createCanvas(SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT, 'pdf');
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < pngs.length; i++) {
    if (i > 0) ctx.addPage(SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT);
    const image = await loadImage(pngs[i]);
    ctx.drawImage(image, 0, 0, SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT);
  }

  return canvas.toBuffer('application/pdf');
}

// =============================================================================
//  Image bundle (zip) helpers
// =============================================================================

// archiver v8 is ESM-only with a class-based API (no callable form).
// Load via dynamic import so it works under both CJS (ts-node, nest build)
// and any future ESM bundler.
async function loadArchiverZip(): Promise<any> {
  const mod: any = await import('archiver');
  return new mod.ZipArchive({ zlib: { level: 9 } });
}

export async function buildImageZip(files: { name: string; buffer: Buffer }[]): Promise<Buffer> {
  const archive = await loadArchiverZip();
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    archive.on('data', (chunk: Buffer) => chunks.push(chunk));
    archive.on('end', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    for (const f of files) archive.append(f.buffer, { name: f.name });
    archive.finalize();
  });
}

// =============================================================================
//  Cross-platform Puppeteer launcher
// =============================================================================

async function launchBrowser() {
  const puppeteer = await import('puppeteer');
  return puppeteer.default.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
  });
}

// =============================================================================
//  Disk helper — write a buffer into the standard exports/ directory and
//  return the public URL.
// =============================================================================

export function writeExportFile(buffer: Buffer, fileName: string): string {
  const dir = path.join(process.cwd(), 'exports');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), buffer);
  return `/exports/${fileName}`;
}
