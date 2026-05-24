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

// Phase 36.1J — optional comments appendix appended to the PDF.
export interface PdfAppendixComment {
  slideIndex: number;  // 1-based for display
  slideTitle: string;
  author:     string;
  createdAt:  string;  // ISO
  body:       string;
  resolved:   boolean;
  status?:    string;  // "Open" | "Resolved" | "Assigned to X" — already formatted
}

export interface PdfExportOptions {
  appendix?: { comments: PdfAppendixComment[] };
}

export async function exportDeckToPdf(deck: RenderDeckInput, opts: PdfExportOptions = {}): Promise<Buffer> {
  const pngs = await exportDeckToPngs(deck);
  return composePdfFromPngs(pngs, opts.appendix?.comments);
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

async function composePdfFromPngs(
  pngs: Buffer[],
  appendix?: PdfAppendixComment[],
): Promise<Buffer> {
  const canvas = createCanvas(SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT, 'pdf');
  const ctx = canvas.getContext('2d');

  for (let i = 0; i < pngs.length; i++) {
    if (i > 0) ctx.addPage(SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT);
    const image = await loadImage(pngs[i]);
    ctx.drawImage(image, 0, 0, SLIDE_VIEWPORT_WIDTH, SLIDE_VIEWPORT_HEIGHT);
  }

  // Phase 36.1J — comments appendix.
  if (appendix && appendix.length > 0) {
    drawAppendixPages(ctx, appendix);
  }

  return canvas.toBuffer('application/pdf');
}

/**
 * Phase 36.1J — render a comments appendix onto additional PDF pages.
 *
 * Layout: each entry occupies a "card" with the slide reference at top,
 * author + timestamp on the second line, then the comment body (word-wrapped).
 * Pages auto-flow when the cursor crosses MARGIN_BOTTOM.
 */
function drawAppendixPages(ctx: any, comments: PdfAppendixComment[]) {
  const W = SLIDE_VIEWPORT_WIDTH;
  const H = SLIDE_VIEWPORT_HEIGHT;
  const MARGIN_X = 64;
  const MARGIN_TOP = 60;
  const MARGIN_BOTTOM = H - 60;
  const LINE = 18;
  let y = 0;

  const newPage = (firstPage: boolean) => {
    ctx.addPage(W, H);
    y = MARGIN_TOP;
    // Title bar
    ctx.fillStyle = '#0f172a';
    ctx.font = 'bold 22px sans-serif';
    ctx.fillText('Comments appendix', MARGIN_X, y);
    y += 14;
    ctx.fillStyle = '#94a3b8';
    ctx.font = '11px sans-serif';
    ctx.fillText(`${comments.length} thread${comments.length === 1 ? '' : 's'}`, MARGIN_X, y);
    y += 28;
  };

  newPage(true);

  for (const c of comments) {
    // Card height estimate — start a new page if it won't fit cleanly.
    const wrapped = wrapText(ctx, c.body, W - MARGIN_X * 2, 13);
    const cardHeight = LINE * 2 + wrapped.length * (LINE - 2) + 16;
    if (y + cardHeight > MARGIN_BOTTOM) newPage(false);

    // Slide reference + status pill
    ctx.font = 'bold 13px sans-serif';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`Slide ${c.slideIndex}  ·  ${truncate(c.slideTitle, 60)}`, MARGIN_X, y);
    if (c.status) {
      ctx.font = 'bold 10px sans-serif';
      ctx.fillStyle = c.resolved ? '#16a34a' : '#d97706';
      ctx.fillText(c.status.toUpperCase(), W - MARGIN_X - measure(ctx, c.status, '10px sans-serif'), y);
    }
    y += LINE;

    // Author + time
    ctx.font = '11px sans-serif';
    ctx.fillStyle = '#475569';
    ctx.fillText(`${c.author}  ·  ${new Date(c.createdAt).toLocaleString()}`, MARGIN_X, y);
    y += LINE;

    // Body
    ctx.font = '12px sans-serif';
    ctx.fillStyle = '#1e293b';
    for (const line of wrapped) {
      if (y > MARGIN_BOTTOM) newPage(false);
      ctx.fillText(line, MARGIN_X, y);
      y += LINE - 2;
    }

    // Divider
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(MARGIN_X, y + 6, W - MARGIN_X * 2, 1);
    y += 20;
  }
}

function wrapText(ctx: any, text: string, maxWidth: number, fontSize: number): string[] {
  ctx.font = `${fontSize}px sans-serif`;
  const words = (text || '').split(/\s+/);
  const out: string[] = [];
  let line = '';
  for (const w of words) {
    const test = line ? line + ' ' + w : w;
    if (ctx.measureText(test).width > maxWidth && line) {
      out.push(line);
      line = w;
    } else {
      line = test;
    }
  }
  if (line) out.push(line);
  return out.length > 0 ? out : [''];
}

function measure(ctx: any, text: string, font: string): number {
  const prev = ctx.font;
  ctx.font = font;
  const w = ctx.measureText(text).width;
  ctx.font = prev;
  return w;
}

function truncate(s: string, n: number): string {
  if (!s) return '';
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
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
