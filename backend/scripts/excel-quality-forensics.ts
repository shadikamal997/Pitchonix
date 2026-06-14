/**
 * EXCEL_QUALITY_FORENSICS — Phase Ω.EXCEL.QUALITY.1
 *
 * Excel Studio Workbook Layout & Export Forensics
 *
 * Measures workbook quality from real exported XLSX files via the API.
 * Uses SheetJS to parse binary workbook structure and AdmZip to inspect
 * XML internals (freeze panes, charts, print configuration).
 *
 * Measures:
 *   - sheet density (non-blank cells / used range cells, per sheet)
 *   - used range efficiency
 *   - row height distribution
 *   - column width distribution
 *   - print/export layout quality
 *   - frozen panes quality
 *   - table readability (header row presence, col width adequacy)
 *   - chart presence and structure
 *   - formula visibility (formula count, error formulas)
 *   - workbook navigation quality (sheet names, count)
 *
 * Detects:
 *   - excessive blank rows (>20% of used rows are empty)
 *   - excessive blank columns (>30% of used cols are empty)
 *   - clipped columns (col width < 5 wch with data content)
 *   - formula errors (#REF!, #DIV/0!, #N/A, #VALUE!, #NAME?, #NULL!, #NUM!)
 *   - auto-sizing failures (col width = 0 with content > 8 chars)
 *   - sparse worksheets (density < 20%)
 *   - broken print layouts (no pageSetup on content sheets)
 *   - chart overlap (multiple charts, check for anchors)
 *   - table readability issues (no header, very narrow cols)
 *
 * Certification criteria (all must pass):
 *   - weighted avg sheet density ≥ 60%
 *   - clipped columns = 0
 *   - formula errors = 0
 *   - auto-sizing failures = 0
 *   - blank-row-heavy sheets = 0 (no sheet where >20% of used rows are blank)
 *
 * Source of truth: actual XLSX buffer exported from Excel Studio API
 *
 * Run:
 *   cd backend && npx ts-node -r tsconfig-paths/register scripts/excel-quality-forensics.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import AdmZip = require('adm-zip');

const BASE_URL  = process.env.API_URL || 'http://localhost:4000/api';
const TS        = Date.now();
const EMAIL     = `excel-forensics-${TS}@example.com`;
const PASSWORD  = 'Test1234!@#';
const REPO      = path.resolve(__dirname, '..', '..');
const OUT_DIR   = path.join(REPO, 'certification-reports');
const XLSX_DIR  = path.join(OUT_DIR, 'excel-forensics-exports');
fs.mkdirSync(OUT_DIR,  { recursive: true });
fs.mkdirSync(XLSX_DIR, { recursive: true });

// ── Certification thresholds ──────────────────────────────────────────────────
const CERT_MIN_AVG_DENSITY     = 60;  // weighted avg density across all sheets ≥ 60%
const CERT_MAX_CLIPPED_COLS    = 0;   // no columns with width < threshold that have content
const CERT_MAX_ERROR_FORMULAS  = 0;   // no formula error cells
const CERT_MAX_AUTOSIZE_FAIL   = 0;   // no cols with 0 width and content > 8 chars
const CERT_MAX_BLANK_ROW_SHEET = 0;   // no sheet where >BLANK_ROW_PCT% of rows are blank

// ── Detection thresholds ─────────────────────────────────────────────────────
const SPARSE_DENSITY_THRESHOLD = 20;  // sheet density < 20% = sparse
const CLIPPED_WIDTH_WCH        = 5;   // col width < 5 wch = clipped
const BLANK_ROW_PCT_MAX        = 20;  // >20% blank rows = excessive
const BLANK_COL_PCT_MAX        = 30;  // >30% blank cols = excessive
const AUTOSIZE_CONTENT_MIN     = 8;   // content > 8 chars in 0-width col = failure

// ── Formula error set ─────────────────────────────────────────────────────────
const FORMULA_ERRORS = new Set(['#DIV/0!', '#REF!', '#N/A', '#VALUE!', '#NAME?', '#NULL!', '#NUM!']);

// ── Types ─────────────────────────────────────────────────────────────────────

interface ColAnalysis {
  index: number;   // 0-based within used range
  absIndex: number; // absolute col index in sheet
  wch: number;     // char width (0 if not set)
  hasContent: boolean;
  maxContentLen: number;
  isClipped: boolean;
  isAutoSizeFailure: boolean;
}

interface RowAnalysis {
  index: number;
  hpt: number;     // height in points (0 if default)
  isBlank: boolean;
}

interface FreezePaneInfo {
  hasFreezePane: boolean;
  row: number;
  col: number;
}

interface SheetMetrics {
  name: string;
  usedRange: string;
  rows: number;
  cols: number;
  totalCells: number;
  nonBlankCells: number;
  density: number;         // 0–100 %
  blankRowCount: number;
  blankRowPct: number;
  blankColCount: number;
  blankColPct: number;
  formulaCount: number;
  errorFormulaCount: number;
  errorCells: string[];    // cell addresses with formula errors
  columns: ColAnalysis[];
  rows_: RowAnalysis[];
  clippedColCount: number;
  autoSizeFailureCount: number;
  hasPrintSetup: boolean;
  freeze: FreezePaneInfo;
  hasHeader: boolean;      // row 1 has ≥2 content cells
  isSparse: boolean;       // density < SPARSE_DENSITY_THRESHOLD
  isBlankRowHeavy: boolean; // blankRowPct > BLANK_ROW_PCT_MAX (for non-trivial sheets)
  isBlankColHeavy: boolean;
  chartCount: number;
}

interface ZipMetrics {
  totalCharts: number;
  hasChartOverlap: boolean;
  sheetFreezes: Record<number, FreezePaneInfo>;
  sheetCharts: Record<number, number>;
  sheetsWithPrintSetup: string[];
}

interface WorkbookMetrics {
  scenarioName: string;
  exportFormat: string;
  fileSizeBytes: number;
  sheetCount: number;
  sheetNames: string[];
  genericSheetNameCount: number;  // Sheet1, Sheet2, etc.
  totalNonBlankCells: number;
  totalCells: number;
  avgDensity: number;             // weighted average
  sparseSheetCount: number;
  blankRowHeavySheetCount: number;
  totalFormulas: number;
  totalErrorFormulas: number;
  totalClippedCols: number;
  totalAutoSizeFailures: number;
  totalCharts: number;
  hasChartOverlap: boolean;
  sheetsWithFreezePane: number;
  sheetsWithPrintSetup: number;
  sheets: SheetMetrics[];
}

interface CertCheck {
  name: string;
  passed: boolean;
  measured: string;
  threshold: string;
}

interface ScenarioResult {
  scenarioName: string;
  exportFormat: string;
  actions: string[];
  templateId: string;
  projectId: string;
  exportPath: string;
  metrics: WorkbookMetrics;
  checks: CertCheck[];
  certPassed: boolean;
  certFailures: string[];
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms));
}

async function apiPost(endpoint: string, body: any, token?: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(Math.min(30000, 2000 * 2 ** attempt));
      continue;
    }
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }
  }
  throw new Error('Max retries exceeded');
}

async function apiGet(endpoint: string, token: string, retries = 3): Promise<any> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(Math.min(30000, 2000 * 2 ** attempt));
      continue;
    }
    const text = await res.text();
    try { return JSON.parse(text); }
    catch { throw new Error(`Non-JSON (${res.status}): ${text.slice(0, 300)}`); }
  }
  throw new Error('Max retries exceeded');
}

async function apiGetBinary(endpoint: string, token: string, retries = 3): Promise<Buffer> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${BASE_URL}${endpoint}`, {
      method: 'GET',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.status === 429 && attempt < retries) {
      await sleep(Math.min(30000, 2000 * 2 ** attempt));
      continue;
    }
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Export failed (${res.status}): ${text.slice(0, 300)}`);
    }
    const ab = await res.arrayBuffer();
    return Buffer.from(ab);
  }
  throw new Error('Max retries exceeded');
}

// ── Auth ─────────────────────────────────────────────────────────────────────

async function login(): Promise<string> {
  const reg = await apiPost('/auth/register', {
    email: EMAIL, password: PASSWORD, name: 'Excel Quality Forensics',
  });
  let token = reg?.token || reg?.access_token;
  if (!token) {
    const lg = await apiPost('/auth/login', { email: EMAIL, password: PASSWORD });
    token = lg?.token || lg?.access_token;
  }
  if (!token) throw new Error(`Auth failed: ${JSON.stringify(reg).slice(0, 200)}`);
  const ws = await apiPost('/workspaces', { name: 'Excel Forensics WS' }, token);
  if (!ws?.id) throw new Error(`Workspace creation failed: ${JSON.stringify(ws).slice(0, 200)}`);
  return token;
}

// ── ZIP / XML analysis ────────────────────────────────────────────────────────

function analyzeZip(buffer: Buffer): ZipMetrics {
  const result: ZipMetrics = {
    totalCharts: 0,
    hasChartOverlap: false,
    sheetFreezes: {},
    sheetCharts: {},
    sheetsWithPrintSetup: [],
  };
  try {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Count chart XML files
    const chartEntries = entries.filter(e => /^xl\/charts\/chart\d+\.xml$/i.test(e.entryName));
    result.totalCharts = chartEntries.length;

    // Check for chart overlap: multiple charts at same anchor position
    const chartPositions: string[] = [];
    for (const entry of chartEntries) {
      const xml = entry.getData().toString('utf8');
      // Extract anchor position from twoCellAnchor or absoluteAnchor
      const fromMatch = xml.match(/<xdr:from>\s*<xdr:col>(\d+)<\/xdr:col>\s*<xdr:row>(\d+)<\/xdr:row>/);
      if (fromMatch) {
        const pos = `${fromMatch[1]},${fromMatch[2]}`;
        if (chartPositions.includes(pos)) result.hasChartOverlap = true;
        chartPositions.push(pos);
      }
    }

    // Analyze each sheet XML
    const sheetEntries = entries
      .filter(e => /^xl\/worksheets\/sheet\d+\.xml$/i.test(e.entryName))
      .sort((a, b) => {
        const ai = parseInt(a.entryName.match(/sheet(\d+)\.xml/i)?.[1] || '0');
        const bi = parseInt(b.entryName.match(/sheet(\d+)\.xml/i)?.[1] || '0');
        return ai - bi;
      });

    for (const entry of sheetEntries) {
      const match = entry.entryName.match(/sheet(\d+)\.xml/i);
      if (!match) continue;
      const sheetIdx = parseInt(match[1]) - 1;
      const xml = entry.getData().toString('utf8');

      // Freeze pane detection
      const paneMatch = xml.match(/<pane\b([^>]*state="frozen"[^>]*|[^>]*)[^>]*>/);
      if (paneMatch && paneMatch[0].includes('state="frozen"')) {
        const rowM = paneMatch[0].match(/ySplit="(\d+)"/);
        const colM = paneMatch[0].match(/xSplit="(\d+)"/);
        result.sheetFreezes[sheetIdx] = {
          hasFreezePane: true,
          row: rowM ? parseInt(rowM[1]) : 0,
          col: colM ? parseInt(colM[1]) : 0,
        };
      } else {
        result.sheetFreezes[sheetIdx] = { hasFreezePane: false, row: 0, col: 0 };
      }

      // Print setup detection
      if (xml.includes('<pageSetup') || xml.includes('<printOptions')) {
        result.sheetsWithPrintSetup.push(`sheet${sheetIdx + 1}`);
      }
    }

    // Chart-to-sheet mapping via drawing relationships
    const drawingRels = entries.filter(e =>
      /^xl\/drawings\/_rels\/drawing\d+\.xml\.rels$/i.test(e.entryName),
    );
    for (const rel of drawingRels) {
      const xml = rel.getData().toString('utf8');
      const refs = (xml.match(/Target="\.\.\/charts\/chart\d+\.xml"/g) || []).length;
      // Match drawing index to sheet via workbook.xml.rels (simplified: assume drawing1→sheet1)
      const idxMatch = rel.entryName.match(/drawing(\d+)\.xml\.rels/i);
      if (idxMatch) {
        const sheetIdx = parseInt(idxMatch[1]) - 1;
        result.sheetCharts[sheetIdx] = refs;
      }
    }
  } catch {
    // ZIP parsing failed — return empty metrics (handled in report)
  }
  return result;
}

// ── XLSX analysis ─────────────────────────────────────────────────────────────

function analyzeXlsx(buffer: Buffer, scenarioName: string, exportFormat: string): WorkbookMetrics {
  const wb = XLSX.read(buffer, {
    type: 'buffer', cellFormula: true, cellDates: true, cellStyles: true, raw: false,
  });
  const zip = analyzeZip(buffer);

  const sheetMetrics: SheetMetrics[] = wb.SheetNames.map((name, sheetIdx) => {
    const ws = wb.Sheets[name];
    if (!ws) {
      return emptySheetMetrics(name, sheetIdx, zip);
    }
    const ref = ws['!ref'] || 'A1:A1';
    const range = XLSX.utils.decode_range(ref);
    const rows = range.e.r - range.s.r + 1;
    const cols = range.e.c - range.s.c + 1;
    const totalCells = rows * cols;

    // ── Cell scan ────────────────────────────────────────────────────────────
    let nonBlankCells = 0;
    let formulaCount = 0;
    let errorFormulaCount = 0;
    const errorCells: string[] = [];

    // Per-row blank tracking
    const rowHasContent = new Array(rows).fill(false);
    // Per-col content info
    const colHasContent   = new Array(cols).fill(false);
    const colMaxLen       = new Array(cols).fill(0);

    for (let r = range.s.r; r <= range.e.r; r++) {
      for (let c = range.s.c; c <= range.e.c; c++) {
        const addr = XLSX.utils.encode_cell({ r, c });
        const cell = ws[addr];
        const ri = r - range.s.r;
        const ci = c - range.s.c;

        if (cell) {
          const val = cell.v;
          const isNonBlank = val !== undefined && val !== null && val !== '';
          if (isNonBlank) {
            nonBlankCells++;
            rowHasContent[ri] = true;
            colHasContent[ci] = true;
            const displayStr = String(cell.w || val || '');
            if (displayStr.length > colMaxLen[ci]) colMaxLen[ci] = displayStr.length;
          }
          if (cell.f) {
            formulaCount++;
            // SheetJS marks error cells with type 'e'; also check display value
            const isError = cell.t === 'e' ||
              (typeof cell.w === 'string' && FORMULA_ERRORS.has(cell.w)) ||
              (typeof cell.v === 'string' && FORMULA_ERRORS.has(cell.v));
            if (isError) {
              errorFormulaCount++;
              errorCells.push(addr);
            }
          }
        }
      }
    }

    const blankRowCount = rowHasContent.filter(v => !v).length;
    const blankColCount = colHasContent.filter(v => !v).length;
    const blankRowPct   = rows > 0 ? Math.round((blankRowCount / rows) * 100) : 0;
    const blankColPct   = cols > 0 ? Math.round((blankColCount / cols) * 100) : 0;
    const density       = totalCells > 0 ? Math.round((nonBlankCells / totalCells) * 100) : 0;

    // ── Column analysis ──────────────────────────────────────────────────────
    const colDefs = ws['!cols'] || [];
    const columns: ColAnalysis[] = Array.from({ length: cols }, (_, ci) => {
      const absC = range.s.c + ci;
      const def = colDefs[absC];
      const wch = def ? (def.wch || def.wpx || 0) : 0;
      const hasContent = colHasContent[ci];
      const maxLen = colMaxLen[ci];
      const isClipped = hasContent && wch > 0 && wch < CLIPPED_WIDTH_WCH;
      const isAutoSizeFailure = hasContent && wch === 0 && maxLen > AUTOSIZE_CONTENT_MIN;
      return { index: ci, absIndex: absC, wch, hasContent, maxContentLen: maxLen, isClipped, isAutoSizeFailure };
    });

    // ── Row analysis ─────────────────────────────────────────────────────────
    const rowDefs = ws['!rows'] || [];
    const rows_: RowAnalysis[] = Array.from({ length: rows }, (_, ri) => {
      const absR = range.s.r + ri;
      const def = rowDefs[absR];
      const hpt = def ? (def.hpt || def.hpx || 0) : 0;
      return { index: ri, hpt, isBlank: !rowHasContent[ri] };
    });

    // ── Header check ─────────────────────────────────────────────────────────
    let headerCells = 0;
    for (let ci = 0; ci < cols; ci++) {
      const cell = ws[XLSX.utils.encode_cell({ r: range.s.r, c: range.s.c + ci })];
      if (cell && cell.v !== undefined && cell.v !== '') headerCells++;
    }
    const hasHeader = headerCells >= Math.min(2, cols);

    // ── Print setup ──────────────────────────────────────────────────────────
    const hasPrintSetup = Boolean(ws['!pageSetup']) || zip.sheetsWithPrintSetup.includes(`sheet${sheetIdx + 1}`);

    // ── Freeze pane ──────────────────────────────────────────────────────────
    const freeze = zip.sheetFreezes[sheetIdx] || { hasFreezePane: false, row: 0, col: 0 };

    const clippedColCount = columns.filter(c => c.isClipped).length;
    const autoSizeFailureCount = columns.filter(c => c.isAutoSizeFailure).length;
    const isSparse = density < SPARSE_DENSITY_THRESHOLD;
    const isBlankRowHeavy = rows > 3 && blankRowPct > BLANK_ROW_PCT_MAX;
    const isBlankColHeavy = cols > 3 && blankColPct > BLANK_COL_PCT_MAX;

    return {
      name,
      usedRange: ref,
      rows,
      cols,
      totalCells,
      nonBlankCells,
      density,
      blankRowCount,
      blankRowPct,
      blankColCount,
      blankColPct,
      formulaCount,
      errorFormulaCount,
      errorCells,
      columns,
      rows_,
      clippedColCount,
      autoSizeFailureCount,
      hasPrintSetup,
      freeze,
      hasHeader,
      isSparse,
      isBlankRowHeavy,
      isBlankColHeavy,
      chartCount: zip.sheetCharts[sheetIdx] || 0,
    };
  });

  const totalCells      = sheetMetrics.reduce((s, m) => s + m.totalCells, 0);
  const totalNonBlank   = sheetMetrics.reduce((s, m) => s + m.nonBlankCells, 0);
  const avgDensity      = totalCells > 0 ? Math.round((totalNonBlank / totalCells) * 100) : 0;
  const genericNames    = wb.SheetNames.filter(n => /^Sheet\d+$/i.test(n));

  return {
    scenarioName,
    exportFormat,
    fileSizeBytes: buffer.length,
    sheetCount: wb.SheetNames.length,
    sheetNames: wb.SheetNames,
    genericSheetNameCount: genericNames.length,
    totalNonBlankCells: totalNonBlank,
    totalCells,
    avgDensity,
    sparseSheetCount:        sheetMetrics.filter(s => s.isSparse).length,
    blankRowHeavySheetCount: sheetMetrics.filter(s => s.isBlankRowHeavy).length,
    totalFormulas:           sheetMetrics.reduce((s, m) => s + m.formulaCount, 0),
    totalErrorFormulas:      sheetMetrics.reduce((s, m) => s + m.errorFormulaCount, 0),
    totalClippedCols:        sheetMetrics.reduce((s, m) => s + m.clippedColCount, 0),
    totalAutoSizeFailures:   sheetMetrics.reduce((s, m) => s + m.autoSizeFailureCount, 0),
    totalCharts:             zip.totalCharts,
    hasChartOverlap:         zip.hasChartOverlap,
    sheetsWithFreezePane:    sheetMetrics.filter(s => s.freeze.hasFreezePane).length,
    sheetsWithPrintSetup:    zip.sheetsWithPrintSetup.length,
    sheets: sheetMetrics,
  };
}

function emptySheetMetrics(name: string, sheetIdx: number, zip: ZipMetrics): SheetMetrics {
  return {
    name, usedRange: 'A1:A1', rows: 1, cols: 1, totalCells: 1, nonBlankCells: 0, density: 0,
    blankRowCount: 1, blankRowPct: 100, blankColCount: 1, blankColPct: 100,
    formulaCount: 0, errorFormulaCount: 0, errorCells: [],
    columns: [], rows_: [], clippedColCount: 0, autoSizeFailureCount: 0,
    hasPrintSetup: false, freeze: { hasFreezePane: false, row: 0, col: 0 },
    hasHeader: false, isSparse: true, isBlankRowHeavy: true, isBlankColHeavy: true,
    chartCount: 0,
  };
}

// ── Certification ─────────────────────────────────────────────────────────────

function certify(m: WorkbookMetrics): { checks: CertCheck[]; passed: boolean; failures: string[] } {
  const checks: CertCheck[] = [
    {
      name: 'sheet-density',
      passed: m.avgDensity >= CERT_MIN_AVG_DENSITY,
      measured: `${m.avgDensity}%`,
      threshold: `≥${CERT_MIN_AVG_DENSITY}%`,
    },
    {
      name: 'no-clipped-cols',
      passed: m.totalClippedCols <= CERT_MAX_CLIPPED_COLS,
      measured: `${m.totalClippedCols} clipped col(s)`,
      threshold: `=${CERT_MAX_CLIPPED_COLS}`,
    },
    {
      name: 'no-formula-errors',
      passed: m.totalErrorFormulas <= CERT_MAX_ERROR_FORMULAS,
      measured: `${m.totalErrorFormulas} error formula(s)`,
      threshold: `=${CERT_MAX_ERROR_FORMULAS}`,
    },
    {
      name: 'no-autosize-failures',
      passed: m.totalAutoSizeFailures <= CERT_MAX_AUTOSIZE_FAIL,
      measured: `${m.totalAutoSizeFailures} autosize failure(s)`,
      threshold: `=${CERT_MAX_AUTOSIZE_FAIL}`,
    },
    {
      name: 'no-blank-row-heavy-sheets',
      passed: m.blankRowHeavySheetCount <= CERT_MAX_BLANK_ROW_SHEET,
      measured: `${m.blankRowHeavySheetCount} sheet(s) with >${BLANK_ROW_PCT_MAX}% blank rows`,
      threshold: `=${CERT_MAX_BLANK_ROW_SHEET}`,
    },
    {
      name: 'no-chart-overlap',
      passed: !m.hasChartOverlap,
      measured: m.hasChartOverlap ? 'chart overlap detected' : 'no overlap',
      threshold: 'no overlap',
    },
  ];

  const failures = checks.filter(c => !c.passed).map(c =>
    `${c.name}: ${c.measured} (threshold ${c.threshold})`,
  );
  return { checks, passed: failures.length === 0, failures };
}

// ── Scenarios ─────────────────────────────────────────────────────────────────

interface Scenario {
  label: string;
  script: string;
  title: string;
  templateId: string;
  actions: string[];
  exportFormat: string;
}

const SCENARIOS: Scenario[] = [
  {
    label: 'S1: Financial Forecast',
    title: 'Annual Financial Forecast 2025',
    templateId: 'financial-forecasting',
    exportFormat: 'enhanced-xlsx',
    actions: [],
    script: `Workbook: Annual Financial Forecast 2025
sheets: Revenue Forecast, Cost Model, Cash Flow, Assumptions

Revenue:
Monthly Revenue: 450000
Q1 Revenue: 1250000
Q2 Revenue: 1480000
Annual Revenue Target: 6000000
Growth Rate: 32%
New Logos: 28
Expansion ARR: 740000

Costs:
Personnel Cost: 2100000
Infrastructure: 380000
Marketing Budget: 620000
R&D Investment: 440000
Total OpEx: 3100000
Gross Margin: 72%

Cash Flow:
Opening Balance: 1200000
Operating Cash Flow: 2900000
Ending Balance: 4100000
Burn Rate: 180000
Runway: 22 months
`,
  },
  {
    label: 'S2: Sales Dashboard (modernize)',
    title: 'Q4 Sales Performance Dashboard',
    templateId: 'sales-sage',
    exportFormat: 'board-package-xlsx',
    actions: ['modernizeWorkbook'],
    script: `Workbook: Q4 Sales Performance Dashboard
sheets: Pipeline Overview, Quota vs Actual, Revenue by Rep, Opportunity Log

Metrics:
Total Pipeline Value: 8400000
Quota Achievement: 94%
Win Rate: 28%
Average Deal Size: 72000
Active Opportunities: 116
Deals Closed Won: 47
Revenue Attainment: 5640000
ARR Added: 2280000
Sales Cycle Days: 38
Average Contract Value: 48000
Churn Protected: 320000
Net New ARR: 1960000
`,
  },
  {
    label: 'S3: SaaS Metrics (freeze+headers)',
    title: 'SaaS Growth Metrics Tracker',
    templateId: 'startup-metrics',
    exportFormat: 'enhanced-xlsx',
    actions: ['freezeHeaderRow', 'standardizeHeaders'],
    script: `Workbook: SaaS Growth Metrics Tracker
sheets: MRR Dashboard, Customer Cohorts, Unit Economics, Churn Analysis

Metrics:
Monthly Recurring Revenue: 340000
Annual Recurring Revenue: 4080000
MRR Growth Rate: 8.4%
Customer Count: 1840
Churn Rate: 1.2%
Net Revenue Retention: 118%
Customer Acquisition Cost: 1840
Lifetime Value: 28000
LTV to CAC Ratio: 15.2
Payback Period: 14 months
Monthly Active Users: 12400
Activation Rate: 68%
`,
  },
  {
    label: 'S4: Marketing Analytics',
    title: 'Digital Marketing Analytics Report',
    templateId: 'marketing-analytics',
    exportFormat: 'comparison-xlsx',
    actions: [],
    script: `Workbook: Digital Marketing Analytics Report
sheets: Channel Performance, Campaign Results, Lead Attribution, Budget vs Actual

Metrics:
Total Marketing Spend: 280000
Total Leads Generated: 4200
Cost per Lead: 66
Marketing Qualified Leads: 1260
MQL to SQL Rate: 30%
Pipeline Influenced: 3400000
Paid Search ROAS: 4.2
Email Open Rate: 31%
Website Conversion Rate: 3.8%
LinkedIn Impressions: 840000
Organic Traffic: 62000
Brand Awareness Lift: 12%
`,
  },
];

// ── Report generator ──────────────────────────────────────────────────────────

function sheetRow(s: SheetMetrics): string {
  const density = `${s.density}%`;
  const blank   = `rows ${s.blankRowPct}% / cols ${s.blankColPct}%`;
  const formulas = s.formulaCount > 0
    ? `${s.formulaCount} (${s.errorFormulaCount} err)`
    : '0';
  const freeze  = s.freeze.hasFreezePane ? `R${s.freeze.row}C${s.freeze.col}` : '—';
  const flags: string[] = [];
  if (s.isSparse)          flags.push('sparse');
  if (s.isBlankRowHeavy)   flags.push('blank-row-heavy');
  if (s.isBlankColHeavy)   flags.push('blank-col-heavy');
  if (s.clippedColCount)   flags.push(`${s.clippedColCount} clipped`);
  if (s.autoSizeFailureCount) flags.push(`${s.autoSizeFailureCount} autosize-fail`);
  if (s.errorCells.length) flags.push(`errors: ${s.errorCells.slice(0, 3).join(' ')}`);
  return `| ${s.name.slice(0, 28)} | ${s.usedRange} | ${density} | ${blank} | ${formulas} | ${freeze} | ${flags.join(', ') || '—'} |`;
}

function generateReport(results: ScenarioResult[]): string {
  const overallPass = results.every(r => r.certPassed);
  const now = new Date().toISOString().replace('T', ' ').slice(0, 19) + ' UTC';

  let md = `# Ω.EXCEL.QUALITY.1 — Excel Studio Workbook Layout & Export Forensics\n\n`;
  md += `**Generated:** ${now}  \n`;
  md += `**Branch:** chore/product-certifications  \n`;
  md += `**Overall:** ${overallPass ? '✅ PASSES CERTIFICATION' : '❌ FAILS CERTIFICATION'}\n\n`;

  md += `## Certification Thresholds\n\n`;
  md += `| Metric | Threshold |\n|---|---|\n`;
  md += `| Weighted avg sheet density | ≥ ${CERT_MIN_AVG_DENSITY}% |\n`;
  md += `| Clipped columns (wch < ${CLIPPED_WIDTH_WCH} with content) | = 0 |\n`;
  md += `| Formula error cells (#REF!, #DIV/0!, etc.) | = 0 |\n`;
  md += `| Auto-sizing failures (0-width col, content >${AUTOSIZE_CONTENT_MIN} chars) | = 0 |\n`;
  md += `| Sheets with >${BLANK_ROW_PCT_MAX}% blank rows | = 0 |\n`;
  md += `| Chart overlap | none |\n\n`;

  md += `## Scenario Summary\n\n`;
  md += `| # | Scenario | Template | Export | Sheets | Avg Density | Formulas | Err | Clipped | Freeze | Cert |\n`;
  md += `|---|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of results) {
    const m = r.metrics;
    const cert = r.certPassed ? '✅' : `❌ ${r.certFailures.length}x`;
    md += `| ${r.scenarioName.slice(0,2)} | ${r.scenarioName.slice(4)} | ${r.templateId} | ${r.exportFormat} `;
    md += `| ${m.sheetCount} | ${m.avgDensity}% | ${m.totalFormulas} | ${m.totalErrorFormulas} `;
    md += `| ${m.totalClippedCols} | ${m.sheetsWithFreezePane} sheet(s) | ${cert} |\n`;
  }
  md += `\n`;

  for (const r of results) {
    const m = r.metrics;
    md += `---\n\n## ${r.scenarioName}\n\n`;
    md += `**Template:** \`${r.templateId}\`  \n`;
    md += `**Export format:** \`${r.exportFormat}\`  \n`;
    md += `**Actions applied:** ${r.actions.length ? r.actions.join(', ') : 'none'}  \n`;
    md += `**File size:** ${(m.fileSizeBytes / 1024).toFixed(1)} KB  \n`;
    md += `**Cert:** ${r.certPassed ? '✅ PASS' : '❌ FAIL — ' + r.certFailures.join('; ')}  \n\n`;

    md += `### Workbook-level Metrics\n\n`;
    md += `| Metric | Value |\n|---|---|\n`;
    md += `| Sheets | ${m.sheetCount} |\n`;
    md += `| Sheet names | ${m.sheetNames.join(', ')} |\n`;
    md += `| Generic names (Sheet1…) | ${m.genericSheetNameCount} |\n`;
    md += `| Total cells (used range) | ${m.totalCells.toLocaleString()} |\n`;
    md += `| Non-blank cells | ${m.totalNonBlankCells.toLocaleString()} |\n`;
    md += `| Avg density (weighted) | **${m.avgDensity}%** |\n`;
    md += `| Sparse sheets (density <${SPARSE_DENSITY_THRESHOLD}%) | ${m.sparseSheetCount} |\n`;
    md += `| Blank-row-heavy sheets (>${BLANK_ROW_PCT_MAX}%) | ${m.blankRowHeavySheetCount} |\n`;
    md += `| Total formulas | ${m.totalFormulas} |\n`;
    md += `| Formula errors | ${m.totalErrorFormulas} |\n`;
    md += `| Clipped columns | ${m.totalClippedCols} |\n`;
    md += `| Auto-size failures | ${m.totalAutoSizeFailures} |\n`;
    md += `| Charts | ${m.totalCharts} |\n`;
    md += `| Chart overlap | ${m.hasChartOverlap ? '⚠️ YES' : 'No'} |\n`;
    md += `| Sheets with freeze pane | ${m.sheetsWithFreezePane} |\n`;
    md += `| Sheets with print setup | ${m.sheetsWithPrintSetup} |\n\n`;

    md += `### Per-Sheet Breakdown\n\n`;
    md += `| Sheet | Used Range | Density | Blank % | Formulas | Freeze | Flags |\n`;
    md += `|---|---|---|---|---|---|---|\n`;
    for (const s of m.sheets) md += sheetRow(s) + '\n';
    md += `\n`;

    md += `### Certification Checks\n\n`;
    md += `| Check | Result | Measured | Threshold |\n|---|---|---|---|\n`;
    for (const c of r.checks) {
      md += `| ${c.name} | ${c.passed ? '✅' : '❌'} | ${c.measured} | ${c.threshold} |\n`;
    }
    md += `\n`;

    // Column width detail (first 2 sheets)
    const dataSheets = m.sheets.filter(s => s.columns.some(c => c.hasContent)).slice(0, 2);
    for (const s of dataSheets) {
      const contentCols = s.columns.filter(c => c.hasContent);
      if (!contentCols.length) continue;
      md += `#### Column Widths: ${s.name}\n\n`;
      md += `| Col | wch | Max content len | Clipped | Autosize fail |\n|---|---|---|---|---|\n`;
      for (const c of contentCols.slice(0, 10)) {
        const colLetter = XLSX.utils.encode_col(c.absIndex);
        md += `| ${colLetter} | ${c.wch || '(default)'} | ${c.maxContentLen} | ${c.isClipped ? '⚠️' : '—'} | ${c.isAutoSizeFailure ? '⚠️' : '—'} |\n`;
      }
      if (contentCols.length > 10) md += `| *(${contentCols.length - 10} more cols)* | | | | |\n`;
      md += `\n`;
    }

    if (r.actions.length > 0) {
      md += `### Applied Actions\n\n`;
      for (const a of r.actions) md += `- \`${a}\`\n`;
      md += `\n`;
    }
  }

  md += `---\n\n## Defect Inventory\n\n`;
  const allDefects: string[] = [];
  for (const r of results) {
    for (const s of r.metrics.sheets) {
      if (s.isSparse)
        allDefects.push(`[${r.scenarioName.slice(0,2)}] Sheet "${s.name}": sparse (density ${s.density}%)`);
      if (s.isBlankRowHeavy)
        allDefects.push(`[${r.scenarioName.slice(0,2)}] Sheet "${s.name}": blank-row-heavy (${s.blankRowPct}% blank rows)`);
      if (s.clippedColCount)
        allDefects.push(`[${r.scenarioName.slice(0,2)}] Sheet "${s.name}": ${s.clippedColCount} clipped col(s)`);
      if (s.errorFormulaCount)
        allDefects.push(`[${r.scenarioName.slice(0,2)}] Sheet "${s.name}": ${s.errorFormulaCount} formula error(s) — ${s.errorCells.join(', ')}`);
      if (s.autoSizeFailureCount)
        allDefects.push(`[${r.scenarioName.slice(0,2)}] Sheet "${s.name}": ${s.autoSizeFailureCount} auto-size failure(s)`);
    }
    if (r.metrics.hasChartOverlap)
      allDefects.push(`[${r.scenarioName.slice(0,2)}] Chart overlap detected`);
  }

  if (allDefects.length === 0) {
    md += `No defects detected across ${results.length} scenarios.\n\n`;
  } else {
    for (const d of allDefects) md += `- ${d}\n`;
    md += `\n`;
  }

  md += `## Methodology\n\n`;
  md += `Source of truth: actual \`.xlsx\` buffers exported from \`GET /api/excel-studio/projects/:id/export?format=...\`.\n\n`;
  md += `- **Sheet density**: non-blank cells ÷ total cells in used range (\`!ref\`)\n`;
  md += `- **Blank row %**: rows where every cell in used range is empty ÷ total rows\n`;
  md += `- **Clipped column**: column with \`wch < ${CLIPPED_WIDTH_WCH}\` that contains data content\n`;
  md += `- **Auto-size failure**: column with \`wch = 0\` where max content string > ${AUTOSIZE_CONTENT_MIN} chars\n`;
  md += `- **Formula errors**: cells where \`cell.t === "e"\` or display value ∈ \\{#REF!, #DIV/0!, …\\}\n`;
  md += `- **Freeze pane**: detected from \`<pane state="frozen">\` in \`xl/worksheets/sheetN.xml\` ZIP entry\n`;
  md += `- **Charts**: detected from \`xl/charts/chartN.xml\` entries; overlap via anchor position comparison\n`;
  md += `- **Print setup**: detected from \`<pageSetup\` or \`<printOptions\` in sheet XML\n`;

  return md;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Phase Ω.EXCEL.QUALITY.1 — Excel Studio Workbook Layout & Export Forensics');
  console.log(`Backend: ${BASE_URL}`);
  console.log(`Scenarios: ${SCENARIOS.length}`);
  console.log('');

  console.log('Authenticating...');
  const token = await login();
  console.log('✓ Authenticated\n');

  const results: ScenarioResult[] = [];

  for (let si = 0; si < SCENARIOS.length; si++) {
    const sc = SCENARIOS[si];
    console.log(`[${si + 1}/${SCENARIOS.length}] ${sc.label}...`);

    let projectId = '';
    let exportPath = '';

    try {
      // 1. Generate workbook from script
      console.log(`   Generating workbook (template: ${sc.templateId})...`);
      const project = await apiPost('/excel-studio/smart-builder/generate', {
        script: sc.script,
        title: sc.title,
        templateId: sc.templateId,
      }, token);
      projectId = project?.id;
      if (!projectId) throw new Error(`Generate failed: ${JSON.stringify(project).slice(0, 300)}`);
      console.log(`   ✓ Project created: ${projectId}`);

      await sleep(500);

      // 2. Apply actions
      for (const action of sc.actions) {
        console.log(`   Applying action: ${action}...`);
        const res = await apiPost(`/excel-studio/projects/${projectId}/actions`, { action }, token);
        if (!res?.id && !res?.appliedActions) {
          console.log(`   ⚠ Action ${action} returned unexpected: ${JSON.stringify(res).slice(0, 100)}`);
        } else {
          console.log(`   ✓ Action ${action} applied`);
        }
        await sleep(500);
      }

      // 3. Export XLSX
      console.log(`   Exporting as ${sc.exportFormat}...`);
      const xlsxBuffer = await apiGetBinary(
        `/excel-studio/projects/${projectId}/export?format=${sc.exportFormat}`, token,
      );
      if (!xlsxBuffer || xlsxBuffer.length < 1000) {
        throw new Error(`Export buffer too small: ${xlsxBuffer?.length ?? 0} bytes`);
      }

      // Save locally for inspection
      const slug = sc.label.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      exportPath = path.join(XLSX_DIR, `${slug}-${sc.exportFormat}.xlsx`);
      fs.writeFileSync(exportPath, xlsxBuffer);
      console.log(`   ✓ Exported: ${xlsxBuffer.length.toLocaleString()} bytes → ${path.basename(exportPath)}`);

      // 4. Analyze
      const metrics = analyzeXlsx(xlsxBuffer, sc.label, sc.exportFormat);
      const { checks, passed, failures } = certify(metrics);

      const certLabel = passed ? '✅' : `❌ ${failures.length}x`;
      console.log(
        `   ${certLabel} | density ${metrics.avgDensity}% | sheets ${metrics.sheetCount}` +
        ` | formulas ${metrics.totalFormulas} (${metrics.totalErrorFormulas} err)` +
        ` | clipped ${metrics.totalClippedCols} | freeze ${metrics.sheetsWithFreezePane}`,
      );
      if (!passed) {
        for (const f of failures) console.log(`      ✗ ${f}`);
      }

      results.push({
        scenarioName: sc.label,
        exportFormat: sc.exportFormat,
        actions: sc.actions,
        templateId: sc.templateId,
        projectId,
        exportPath,
        metrics,
        checks,
        certPassed: passed,
        certFailures: failures,
      });
    } catch (err) {
      const msg = (err as Error).message || String(err);
      console.error(`   ✗ ERROR: ${msg}`);
      // Stub result
      const emptyMetrics: WorkbookMetrics = {
        scenarioName: sc.label, exportFormat: sc.exportFormat, fileSizeBytes: 0,
        sheetCount: 0, sheetNames: [], genericSheetNameCount: 0,
        totalNonBlankCells: 0, totalCells: 0, avgDensity: 0,
        sparseSheetCount: 0, blankRowHeavySheetCount: 0,
        totalFormulas: 0, totalErrorFormulas: 0, totalClippedCols: 0,
        totalAutoSizeFailures: 0, totalCharts: 0, hasChartOverlap: false,
        sheetsWithFreezePane: 0, sheetsWithPrintSetup: 0, sheets: [],
      };
      const failCheck: CertCheck[] = [
        { name: 'scenario-error', passed: false, measured: msg.slice(0, 80), threshold: 'no error' },
      ];
      results.push({
        scenarioName: sc.label, exportFormat: sc.exportFormat,
        actions: sc.actions, templateId: sc.templateId,
        projectId, exportPath: '', metrics: emptyMetrics,
        checks: failCheck, certPassed: false, certFailures: [`SCENARIO ERROR: ${msg}`],
      });
    }

    if (si < SCENARIOS.length - 1) await sleep(1500);
  }

  console.log('');
  const overallPass = results.every(r => r.certPassed);

  // Write report
  const reportMd = generateReport(results);
  const reportPath = path.join(REPO, 'EXCEL_QUALITY_FORENSICS.md');
  fs.writeFileSync(reportPath, reportMd, 'utf8');

  // Write JSON
  const jsonPath = path.join(OUT_DIR, 'excel-quality-forensics.json');
  fs.writeFileSync(jsonPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    certPassed: overallPass,
    scenarioCount: results.length,
    scenarios: results.map(r => ({
      name: r.scenarioName, certPassed: r.certPassed, certFailures: r.certFailures,
      avgDensity: r.metrics.avgDensity, sheetCount: r.metrics.sheetCount,
      totalErrorFormulas: r.metrics.totalErrorFormulas, totalClippedCols: r.metrics.totalClippedCols,
    })),
  }, null, 2), 'utf8');

  console.log('════════════════════════════════════════════════════════════');
  if (overallPass) {
    console.log('  Ω.EXCEL.QUALITY.1 — PASSES CERTIFICATION');
    console.log('  All criteria met across all scenarios');
  } else {
    const failCount = results.filter(r => !r.certPassed).length;
    console.log(`  Ω.EXCEL.QUALITY.1 — FAILS CERTIFICATION`);
    console.log(`  ${failCount} scenario(s) with failures:`);
    for (const r of results.filter(r => !r.certPassed)) {
      for (const f of r.certFailures) {
        console.log(`    ❌ [${r.scenarioName}] ${f}`);
      }
    }
  }
  console.log('════════════════════════════════════════════════════════════');
  console.log('');
  console.log(`✓ Report: ${reportPath}`);
  console.log(`✓ Data:   ${jsonPath}`);
  console.log(`✓ XLSX exports: ${XLSX_DIR}`);
}

main().catch(err => {
  console.error('Fatal:', err);
  process.exit(1);
});
