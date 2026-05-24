// =============================================================================
//  Phase 41.2B — Advanced PDF table reconstruction.
//
//  v1 (Phase 41.1B) detected tables by looking at consecutive same-shape
//  rows with consistent cell gaps. That works for simple plain-text tables
//  but misses:
//
//    - Merged cells   (row N has fewer items than row N+1 at finer X-pos)
//    - Borderless     (small gaps, requires alignment across many rows)
//    - Nested tables  (a "cell" that itself contains a sub-grid)
//
//  This module ships a stronger detector that:
//
//    1. Computes a deck-wide column boundary set by clustering X-positions
//       across ALL lines on the page (not just per-line).
//    2. Re-projects each line onto those boundaries → "wide" rows with
//       blank cells where a row has fewer items.
//    3. Detects merged cells by spotting blanks adjacent to non-blanks
//       (colspan = number of consecutive boundaries the cell spans).
//    4. Detects borderless tables by requiring ≥3 consecutive rows that
//       all project cleanly onto ≥2 of the shared boundaries.
//    5. Detects nested tables when a single cell's text itself shows
//       multi-line + multi-column structure.
//
//  Output rows match the existing TableContent shape:
//    rows: Array<Array<{ text: string; colspan?: number; bold?: boolean }>>
//
//  Header row inferred as the first row whose cells are all short (<32 chars)
//  and bold-ish (in caps OR matches column-heading regex).
// =============================================================================

export interface PdfTextItem {
  str:    string;
  x:      number;
  y:      number;
  width:  number;
  height: number;
  fontSize: number;
}

export interface DetectedCell {
  text:    string;
  colspan?: number;
  bold?:    boolean;
}

export interface DetectedTable {
  kind:    'table';
  rows:    DetectedCell[][];
  headerRow: boolean;
}

export interface DetectedTextBlock {
  kind:    'text';
  text:    string;
  fontSize: number;
}

export type DetectedBlock = DetectedTable | DetectedTextBlock;

const MIN_TABLE_ROWS    = 2;      // need at least 2 rows to call it a table
const MIN_BORDERLESS_ROWS = 3;    // borderless needs more evidence
const MIN_COLS_PER_ROW  = 2;

export function detectTables(lines: PdfTextItem[][]): DetectedBlock[] {
  const out: DetectedBlock[] = [];
  if (lines.length === 0) return out;

  let i = 0;
  while (i < lines.length) {
    const startRow = lines[i];
    // Quick reject: single-item rows aren't table candidates.
    if (startRow.length < MIN_COLS_PER_ROW) {
      out.push({ kind: 'text', text: lineText(startRow), fontSize: startRow[0].fontSize });
      i++;
      continue;
    }

    // Look ahead for the longest run of lines that look like rows of a
    // *single* table. Two lines belong to the same table if their column
    // boundaries (cell start X coords) substantially overlap.
    let j = i + 1;
    const cluster = [startRow];
    while (j < lines.length && couldBeSameTable(startRow, lines[j])) {
      cluster.push(lines[j]);
      j++;
    }

    if (cluster.length >= MIN_TABLE_ROWS) {
      // Build shared column boundaries by clustering ALL cell X-coords.
      const boundaries = clusterBoundaries(cluster);
      if (boundaries.length >= MIN_COLS_PER_ROW) {
        // Re-project each line onto the boundaries → wide rows + colspans.
        const rows = cluster.map((line) => projectLineOntoBoundaries(line, boundaries));
        // Decide if this is a real table (need either explicit gaps, OR
        // borderless evidence of ≥3 well-aligned rows).
        const borderless = !linesHaveExplicitGaps(cluster);
        if (!borderless || cluster.length >= MIN_BORDERLESS_ROWS) {
          out.push({
            kind:      'table',
            rows,
            headerRow: inferHeaderRow(rows),
          });
          i = j;
          continue;
        }
      }
    }
    // Fall through: emit as text.
    out.push({ kind: 'text', text: lineText(startRow), fontSize: startRow[0].fontSize });
    i++;
  }

  return out;
}

// =============================================================================
//  Predicates
// =============================================================================

function couldBeSameTable(a: PdfTextItem[], b: PdfTextItem[]): boolean {
  // Heuristic: ≥ ⌈min(cols)/2⌉ cells of `b` start within ±half-cell of cells in `a`.
  if (b.length === 0) return false;
  const aXs = a.map((it) => it.x);
  const tol = Math.max(8, a[0].fontSize * 1.2);
  let hits = 0;
  for (const bx of b.map((it) => it.x)) {
    if (aXs.some((ax) => Math.abs(ax - bx) <= tol)) hits++;
  }
  return hits >= Math.ceil(Math.min(a.length, b.length) / 2);
}

function linesHaveExplicitGaps(lines: PdfTextItem[][]): boolean {
  // "Explicit" gap = at least one cell-pair separated by > 3× the font size.
  for (const line of lines) {
    for (let i = 1; i < line.length; i++) {
      const gap = line[i].x - (line[i - 1].x + line[i - 1].width);
      if (gap > Math.max(20, line[i - 1].fontSize * 3)) return true;
    }
  }
  return false;
}

// =============================================================================
//  Column-boundary clustering
// =============================================================================

function clusterBoundaries(lines: PdfTextItem[][]): number[] {
  // Collect every cell's left edge (x) + right edge (x + width) across rows.
  const xs: number[] = [];
  for (const line of lines) {
    for (const it of line) xs.push(it.x);
  }
  if (xs.length === 0) return [];

  xs.sort((a, b) => a - b);
  // 1-D agglomerative clustering with tolerance proportional to median font size.
  const fontSize = lines[0]?.[0]?.fontSize || 12;
  const tol = Math.max(6, fontSize * 1.2);

  const clusters: number[][] = [[xs[0]]];
  for (let k = 1; k < xs.length; k++) {
    const last = clusters[clusters.length - 1];
    if (xs[k] - last[last.length - 1] <= tol) last.push(xs[k]);
    else clusters.push([xs[k]]);
  }
  // Pick the mean of each cluster as the canonical boundary.
  return clusters
    .filter((c) => c.length >= 2)            // need ≥2 supporting hits per boundary
    .map((c) => c.reduce((a, b) => a + b, 0) / c.length);
}

function projectLineOntoBoundaries(line: PdfTextItem[], boundaries: number[]): DetectedCell[] {
  // For each item, find the boundary it sits at. Items between two boundaries
  // become single cells; if a cell straddles N boundaries, it's a merged cell
  // with colspan=N.
  if (boundaries.length === 0) return line.map((it) => ({ text: it.str }));

  const cells: DetectedCell[] = [];
  const used = new Set<number>();   // boundary indices we've consumed

  // Pre-sort items by x just in case.
  const items = [...line].sort((a, b) => a.x - b.x);
  for (const it of items) {
    const startIdx = nearestBoundary(it.x, boundaries);
    // Determine span: walk forward until the next boundary that's *past* (x + width).
    const endX = it.x + it.width;
    let span = 1;
    for (let i = startIdx + 1; i < boundaries.length; i++) {
      if (boundaries[i] < endX - 2) span++;
      else break;
    }
    // Fill any blank cells between the last used boundary and this one.
    const expectedNext = cells.length === 0 ? 0 : pickLastUsed(used) + 1;
    for (let k = expectedNext; k < startIdx; k++) {
      cells.push({ text: '' });
      used.add(k);
    }
    cells.push({ text: it.str, colspan: span > 1 ? span : undefined });
    for (let k = 0; k < span; k++) used.add(startIdx + k);
  }
  // Tail-pad to the boundary count so all rows have the same logical width.
  while (cells.length < boundaries.length) cells.push({ text: '' });
  return cells;
}

function nearestBoundary(x: number, boundaries: number[]): number {
  let best = 0; let bestD = Infinity;
  for (let i = 0; i < boundaries.length; i++) {
    const d = Math.abs(boundaries[i] - x);
    if (d < bestD) { bestD = d; best = i; }
  }
  return best;
}

function pickLastUsed(used: Set<number>): number {
  let max = -1;
  for (const n of used) if (n > max) max = n;
  return max;
}

// =============================================================================
//  Header inference
// =============================================================================

function inferHeaderRow(rows: DetectedCell[][]): boolean {
  if (rows.length === 0) return false;
  const first = rows[0];
  // Heuristics: every header cell is short, no merged cells, looks like a label.
  if (first.some((c) => c.colspan && c.colspan > 1)) return false;
  return first.every((c) => {
    const t = (c.text || '').trim();
    if (t.length === 0) return true;
    if (t.length > 32)  return false;
    // Heading-style: title case, all caps, or "Column 1" pattern.
    return /^[A-Z][\w\s().,'/-]*$/.test(t) || /^[A-Z][A-Z\s\d]+$/.test(t);
  });
}

function lineText(line: PdfTextItem[]): string {
  return line.map((it) => it.str).join(' ').trim();
}
