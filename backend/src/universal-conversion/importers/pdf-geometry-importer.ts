import {
  UniversalDocument, DocumentNode, emptyDocument, newPage,
} from '../document-model';
import { extractPageImages } from './pdf-image-extractor';
import { detectTables as detectTablesV2, DetectedBlock } from './pdf-table-detector';

// =============================================================================
//  Phase 41.1A–D — Geometry-aware PDF importer.
//
//  Uses pdfjs-dist's text-items + page operator list to recover:
//
//    - Text positions  → cluster into lines (Y) and columns (X)
//    - Multi-column    → detect 1/2/3-column layouts via X-coordinate clusters
//    - Tables          → detect grid patterns from aligned X coordinates
//                        across consecutive rows
//    - Headers/Footers → first/last band of text below/above content region
//    - Images          → OPS.paintImageXObject operator → extract bitmap
//
//  Returns the same `UniversalDocument` shape the existing PDF importer
//  produces, but with proper `table` / `image` / multi-column ordering.
//
//  Fallback: if pdfjs-dist can't parse the buffer (corrupt / encrypted),
//  the caller may catch and route to the original `pdf-parse`-based
//  importer for plain-text recovery.
// =============================================================================

interface TextItem {
  str: string;
  x: number;       // left edge in PDF user units
  y: number;       // bottom edge (PDF coords have y up)
  width: number;
  height: number;
  fontSize: number;
}

export async function importPdfGeometry(buffer: Buffer): Promise<UniversalDocument> {
  // Dynamic import to bridge ESM → CJS (pdfjs-dist 4.x is ESM-only).
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs') as any;

  const doc = emptyDocument('pdf');
  const data = new Uint8Array(buffer);
  const loadingTask = pdfjs.getDocument({ data, disableWorker: true, isEvalSupported: false });
  const pdf = await loadingTask.promise;

  // Document metadata.
  try {
    const meta = await pdf.getMetadata();
    if (meta?.info?.Title) doc.metadata.title = String(meta.info.Title);
    if (meta?.info?.Author) doc.metadata.author = String(meta.info.Author);
  } catch { /* */ }

  const numPages: number = pdf.numPages;
  for (let pageIdx = 1; pageIdx <= numPages; pageIdx++) {
    const pdfPage = await pdf.getPage(pageIdx);
    const viewport = pdfPage.getViewport({ scale: 1 });
    const pageH = viewport.height;
    const pageW = viewport.width;

    // 1) Extract text items with geometry.
    const content = await pdfPage.getTextContent();
    const items: TextItem[] = (content.items || [])
      .filter((it: any) => typeof it.str === 'string' && it.str.length > 0)
      .map((it: any) => {
        const tx = it.transform || [1, 0, 0, 1, 0, 0];
        // transform = [a, b, c, d, e, f]; (e, f) is position; d is font scale
        const x = tx[4];
        const y = tx[5];
        const fontSize = Math.abs(tx[3]) || 10;
        return { str: it.str, x, y, width: it.width || 0, height: it.height || fontSize, fontSize };
      });

    const page = newPage();

    // 2) Detect & strip header/footer bands (top 5% / bottom 5% of page).
    const HEADER_BAND = pageH * 0.94;   // (PDF y goes up; this is high y)
    const FOOTER_BAND = pageH * 0.06;
    const header = items.filter((it) => it.y >= HEADER_BAND);
    const footer = items.filter((it) => it.y <= FOOTER_BAND);
    const body   = items.filter((it) => it.y < HEADER_BAND && it.y > FOOTER_BAND);

    if (pageIdx === 1 && header.length > 0) {
      const headerText = header.sort((a, b) => a.x - b.x).map((i) => i.str).join(' ').trim();
      if (headerText) doc.metadata.description = headerText.slice(0, 200);
    }

    // 3) Cluster body items into lines (group by Y within fontHeight tolerance).
    const lines = clusterIntoLines(body);

    // 4) Multi-column detection — look at X coordinates of line starts.
    const columnCount = detectColumnCount(lines, pageW);

    // 5) Re-order lines for reading: within each column, top-down (since PDF y
    //    is up, that means highest y first).
    const ordered = orderForReading(lines, columnCount, pageW);

    // 6) Group consecutive aligned-X lines into tables.
    // Phase 41.2B — advanced table detector (merged cells, borderless, nested).
    const blocks: DetectedBlock[] = detectTablesV2(ordered as any);

    // 7) Emit DocumentNodes.
    let firstLine = true;
    for (const block of blocks) {
      if (block.kind === 'table') {
        page.nodes.push({
          type:  'table',
          rows:  block.rows.map((r) => r.map((c) => ({
            text:    c.text,
            colspan: c.colspan,
            bold:    c.bold,
          }))),
          headerRow: block.headerRow,
        });
        firstLine = false;
      } else {
        const text = block.text;
        if (firstLine && looksLikeHeading(text, block.fontSize)) {
          if (!page.title) page.title = text.slice(0, 120);
          page.nodes.push({ type: 'heading', level: 1, text });
        } else if (looksLikeHeading(text, block.fontSize)) {
          page.nodes.push({ type: 'heading', level: 2, text });
        } else if (text.startsWith('• ') || text.startsWith('- ')) {
          page.nodes.push({ type: 'list', ordered: false, items: [text.replace(/^[•\-]\s*/, '')] });
        } else {
          page.nodes.push({ type: 'paragraph', text });
        }
        firstLine = false;
      }
    }

    // 8) Phase 41.2A — extract image bitmaps via pdfjs object cache + sharp.
    //    Falls back to placeholder nodes when extraction fails (rare PDF
    //    colour spaces, JBIG2-compressed images, etc.).
    try {
      const images = await extractPageImages(pdfPage, pdfjs);
      if (images.length > 0) {
        for (const img of images) {
          page.nodes.push({
            type:  'image',
            src:   img.url,
            alt:   `Page ${pageIdx} image ${img.index + 1} (${img.width}×${img.height})`,
          });
        }
      } else {
        // Count operators so the import report knows what was lost.
        const ops = await pdfPage.getOperatorList();
        const imageCount = countImageOps(ops, pdfjs);
        for (let i = 0; i < imageCount; i++) {
          page.nodes.push({ type: 'image', src: '', alt: `[Embedded image ${i + 1} on page ${pageIdx} — not extractable]` });
        }
      }
    } catch {
      const ops = await pdfPage.getOperatorList();
      const imageCount = countImageOps(ops, pdfjs);
      for (let i = 0; i < imageCount; i++) {
        page.nodes.push({ type: 'image', src: '', alt: `[Embedded image ${i + 1} on page ${pageIdx}]` });
      }
    }

    // 9) Footer → page notes (so we don't lose page numbers / disclaimers).
    if (footer.length > 0) {
      const fText = footer.sort((a, b) => a.x - b.x).map((i) => i.str).join(' ').trim();
      if (fText) page.notes = fText;
    }

    doc.pages.push(page);
    pdfPage.cleanup?.();
  }
  await pdf.destroy?.();
  return doc;
}

// =============================================================================
//  Helpers
// =============================================================================

function clusterIntoLines(items: TextItem[]): TextItem[][] {
  if (items.length === 0) return [];
  // Sort by y descending (top → bottom in user-facing order).
  const sorted = [...items].sort((a, b) => b.y - a.y);
  const lines: TextItem[][] = [[sorted[0]]];
  const tol = Math.max(2, sorted[0].fontSize * 0.6);
  for (let i = 1; i < sorted.length; i++) {
    const cur = sorted[i];
    const lineY = lines[lines.length - 1][0].y;
    if (Math.abs(cur.y - lineY) <= tol) lines[lines.length - 1].push(cur);
    else lines.push([cur]);
  }
  // Sort each line left → right.
  for (const line of lines) line.sort((a, b) => a.x - b.x);
  return lines;
}

function detectColumnCount(lines: TextItem[][], pageW: number): number {
  if (lines.length < 4) return 1;
  // Bucket the X coord of the leftmost item of each line into thirds.
  const buckets = [0, 0, 0];
  for (const line of lines) {
    const x = line[0].x;
    const bin = Math.min(2, Math.max(0, Math.floor((x / pageW) * 3)));
    buckets[bin]++;
  }
  const total = lines.length;
  // If two of the three buckets each carry >20%, call it 2-col.
  // If all three carry >15%, call it 3-col.
  const ratios = buckets.map((b) => b / total);
  if (ratios[0] > 0.15 && ratios[1] > 0.15 && ratios[2] > 0.15) return 3;
  if (ratios.filter((r) => r > 0.2).length >= 2) return 2;
  return 1;
}

function orderForReading(lines: TextItem[][], cols: number, pageW: number): TextItem[][] {
  if (cols === 1) return lines;
  // Bucket each line into a column based on its leftmost x.
  const colLines: TextItem[][][] = Array.from({ length: cols }, () => []);
  for (const line of lines) {
    const x = line[0].x;
    const bin = Math.min(cols - 1, Math.max(0, Math.floor((x / pageW) * cols)));
    colLines[bin].push(line);
  }
  // Concatenate column 0, then 1, then 2.
  return colLines.flat();
}

// (Phase 41.2B — detectTables + blockToTableNode helpers moved to
// pdf-table-detector.ts; this file is now strictly the page walker.)

function looksLikeHeading(text: string, fontSize: number): boolean {
  if (!text) return false;
  if (text.length > 80) return false;
  if (fontSize >= 14) return true;
  if (/^[A-Z][A-Z\s\d.,'-]+$/.test(text) && text.length > 4) return true;
  if (/^(?:\d+(?:\.\d+)*\s+)[A-Z]/.test(text)) return true;
  if (/^(?:Chapter|Section|Part)\s+\d+/i.test(text)) return true;
  return false;
}

function countImageOps(ops: any, pdfjs: any): number {
  if (!ops || !ops.fnArray) return 0;
  const fn = ops.fnArray as number[];
  const OPS = pdfjs.OPS || {};
  const target = OPS.paintImageXObject || -1;
  return fn.filter((c) => c === target).length;
}
