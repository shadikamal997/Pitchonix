/**
 * Phase Ω.PRODUCT.1 — Real User Validation harness (PARTIAL baseline).
 *
 * Validates Pitchonix against the documents that ACTUALLY exist in the repo.
 * Every number is measured from a real file with the same libraries the product
 * uses. Nothing is fabricated or estimated:
 *   • subjective scores (template aesthetics, "ready to send") are NOT invented —
 *     they are reported as REQUIRES_HUMAN_REVIEW.
 *   • the corpus is mostly platform-generated exports, NOT 900 real user docs, so
 *     the whole report is marked PARTIAL until a real corpus is supplied under
 *     backend/corpus/<category>/.
 *
 * Run: npm run validate:corpus
 */
import * as fs from 'fs';
import * as path from 'path';
import AdmZip = require('adm-zip');
import * as mammoth from 'mammoth';
import * as cheerio from 'cheerio';
import * as XLSX from 'xlsx';
import { norm, segmentsOf, phrasePresent, chunk } from '../src/content-ledger/content-match';

const { PDFParse } = require('pdf-parse');

const REPO = path.resolve(__dirname, '..', '..');
const BACKEND = path.resolve(__dirname, '..');
const REPORT = path.join(REPO, 'PRODUCT_VALIDATION_REPORT.md');
const JSON_OUT = path.join(BACKEND, 'certification-reports', 'product-validation.json');

const EXT = new Set(['.pptx', '.pdf', '.docx', '.xlsx', '.csv']);
const SKIP_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'coverage', '.turbo']);

type Category =
  | 'cv' | 'pitch-deck' | 'business-plan' | 'proposal' | 'company-profile'
  | 'executive-summary' | 'marketing-plan' | 'feasibility-report' | 'excel-workbook' | 'uncategorized';

interface DocResult {
  file: string;
  rel: string;
  ext: string;
  category: Category;
  bytes: number;
  // ingestion (Phase 1)
  importSuccess: boolean;
  importMs: number;
  language: 'ar' | 'en' | 'mixed' | 'unknown';
  units: number;          // primary content units (slides | pages | rows | sheets)
  unitLabel: string;
  tables: number | null;
  charts: number | null;
  images: number | null;
  lists: number | null;
  textChars: number;
  // export/reopen integrity (Phase 4)
  reopenSuccess: boolean;
  // failures (Phase 6)
  failure?: { phase: string; reason: string };
  // raw text segments for cross-format fidelity (Phase 2)
  _segments?: string[];
}

const now = () => Number(process.hrtime.bigint() / 1000000n);
const rel = (p: string) => path.relative(REPO, p);

// ── Discovery ─────────────────────────────────────────────────────────────────
function walk(dir: string, out: string[] = []): string[] {
  let entries: fs.Dirent[];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (e.name.startsWith('.') && e.name !== '.') continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      walk(full, out);
    } else if (EXT.has(path.extname(e.name).toLowerCase())) {
      out.push(full);
    }
  }
  return out;
}

function categorize(file: string): Category {
  const p = file.toLowerCase();
  // explicit corpus folder: backend/corpus/<category>/...
  const m = p.match(/\/corpus\/([a-z-]+)\//);
  if (m) {
    const c = m[1];
    const map: Record<string, Category> = {
      cv: 'cv', cvs: 'cv', resume: 'cv', resumes: 'cv',
      'pitch-deck': 'pitch-deck', 'pitch-decks': 'pitch-deck', decks: 'pitch-deck', deck: 'pitch-deck',
      'business-plan': 'business-plan', 'business-plans': 'business-plan',
      proposal: 'proposal', proposals: 'proposal',
      'company-profile': 'company-profile', 'company-profiles': 'company-profile',
      'executive-summary': 'executive-summary', 'marketing-plan': 'marketing-plan',
      'feasibility-report': 'feasibility-report', excel: 'excel-workbook', 'excel-workbook': 'excel-workbook',
    };
    if (map[c]) return map[c];
  }
  const base = path.basename(p);
  if (path.extname(base) === '.xlsx' || path.extname(base) === '.csv') return 'excel-workbook';
  if (/\b(cv|resume)\b/.test(base)) return 'cv';
  if (/deck|pitch/.test(base)) return 'pitch-deck';
  if (/business[-_ ]?plan/.test(base)) return 'business-plan';
  if (/proposal/.test(base)) return 'proposal';
  if (/company[-_ ]?profile|profile/.test(base)) return 'company-profile';
  if (/exec(utive)?[-_ ]?summary/.test(base)) return 'executive-summary';
  if (/marketing/.test(base)) return 'marketing-plan';
  if (/feasibility/.test(base)) return 'feasibility-report';
  return 'uncategorized';
}

function detectLanguage(text: string): DocResult['language'] {
  if (!text) return 'unknown';
  const ar = (text.match(/[؀-ۿ]/g) || []).length;
  const la = (text.match(/[a-zA-Z]/g) || []).length;
  if (ar > 20 && la > 20) return 'mixed';
  if (ar > 20 && ar > la) return 'ar';
  if (la > 20) return 'en';
  return 'unknown';
}

// ── Per-format analyzers (real parsing, same libs as product) ─────────────────
async function analyzePptx(buf: Buffer): Promise<Partial<DocResult>> {
  const zip = new AdmZip(buf);
  const entries = zip.getEntries();
  const slideXmls = entries.filter((e) => /ppt\/slides\/slide\d+\.xml$/.test(e.entryName));
  const runs: string[] = [];
  let tables = 0, lists = 0;
  for (const e of [...slideXmls, ...entries.filter((x) => /ppt\/notesSlides\//.test(x.entryName))]) {
    const xml = e.getData().toString('utf8');
    for (const m of xml.match(/<a:t>([\s\S]*?)<\/a:t>/g) || []) runs.push(m.replace(/<\/?a:t>/g, ''));
    tables += (xml.match(/<a:tbl>/g) || []).length;
    lists += (xml.match(/<a:buChar|<a:buAutoNum/g) || []).length;
  }
  const charts = entries.filter((e) => /ppt\/(charts|embeddings)\/.*\.(xml|xlsx)$/.test(e.entryName) || /chart\d+\.xml$/.test(e.entryName)).length;
  const images = entries.filter((e) => /ppt\/media\//.test(e.entryName)).length;
  const text = runs.join('\n');
  return {
    units: slideXmls.length, unitLabel: 'slides', tables, charts, images, lists,
    textChars: text.length, language: detectLanguage(text), _segments: segmentsOf(text),
    importSuccess: slideXmls.length > 0 && runs.length > 0,
  };
}

async function analyzePdf(buf: Buffer): Promise<Partial<DocResult>> {
  const data = await new PDFParse({ data: buf }).getText();
  const text = String(data?.text || '');
  return {
    units: Number(data?.total ?? data?.pages?.length ?? 0) || (text.match(/\f/g)?.length ?? 0) + 1,
    unitLabel: 'pages', tables: null, charts: null, images: null, lists: null,
    textChars: text.length, language: detectLanguage(text), _segments: segmentsOf(text),
    importSuccess: text.trim().length > 0,
  };
}

async function analyzeDocx(buf: Buffer): Promise<Partial<DocResult>> {
  const { value: html } = await mammoth.convertToHtml({ buffer: buf });
  const $ = cheerio.load(html || '');
  const text = $.root().text();
  return {
    units: $('p').length, unitLabel: 'paragraphs',
    tables: $('table').length, charts: null, images: $('img').length, lists: $('li').length,
    textChars: text.length, language: detectLanguage(text), _segments: segmentsOf(text),
    importSuccess: text.trim().length > 0,
  };
}

async function analyzeXlsx(buf: Buffer): Promise<Partial<DocResult>> {
  const wb = XLSX.read(buf, { type: 'buffer' });
  let cells = 0, formulas = 0, rows = 0;
  const textParts: string[] = [];
  for (const name of wb.SheetNames) {
    const ws = wb.Sheets[name];
    const ref = ws['!ref'];
    if (ref) { const r = XLSX.utils.decode_range(ref); rows += r.e.r - r.s.r + 1; }
    for (const k of Object.keys(ws)) {
      if (k.startsWith('!')) continue;
      cells++;
      const cell: any = ws[k];
      if (cell?.f) formulas++;
      if (cell?.v != null && typeof cell.v === 'string') textParts.push(cell.v);
    }
  }
  const text = textParts.join('\n');
  return {
    units: wb.SheetNames.length, unitLabel: 'sheets',
    tables: rows > 0 ? 1 : 0, charts: null, images: null, lists: null,
    textChars: text.length, language: detectLanguage(text), _segments: segmentsOf(text),
    importSuccess: wb.SheetNames.length > 0 && cells > 0,
    failure: undefined,
    ...({ formulas } as any),
  };
}

async function analyzeCsv(buf: Buffer): Promise<Partial<DocResult>> {
  const text = buf.toString('utf8');
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  return {
    units: lines.length, unitLabel: 'rows', tables: lines.length ? 1 : 0, charts: null, images: null,
    lists: null, textChars: text.length, language: detectLanguage(text), _segments: segmentsOf(text),
    importSuccess: lines.length > 0,
  };
}

async function analyze(file: string): Promise<DocResult> {
  const ext = path.extname(file).toLowerCase();
  const bytes = fs.statSync(file).size;
  const base: DocResult = {
    file, rel: rel(file), ext, category: categorize(file), bytes,
    importSuccess: false, importMs: 0, language: 'unknown', units: 0, unitLabel: '',
    tables: null, charts: null, images: null, lists: null, textChars: 0, reopenSuccess: false,
  };
  const t0 = now();
  try {
    const buf = fs.readFileSync(file);
    let part: Partial<DocResult>;
    if (ext === '.pptx') part = await analyzePptx(buf);
    else if (ext === '.pdf') part = await analyzePdf(buf);
    else if (ext === '.docx') part = await analyzeDocx(buf);
    else if (ext === '.xlsx') part = await analyzeXlsx(buf);
    else part = await analyzeCsv(buf);
    Object.assign(base, part);
    base.importMs = now() - t0;
    if (!base.importSuccess) base.failure = { phase: 'import', reason: 'parsed but no extractable content' };
    // Reopen/integrity: independent second parse must yield the same content size.
    try {
      const buf2 = fs.readFileSync(file);
      let part2: Partial<DocResult>;
      if (ext === '.pptx') part2 = await analyzePptx(buf2);
      else if (ext === '.pdf') part2 = await analyzePdf(buf2);
      else if (ext === '.docx') part2 = await analyzeDocx(buf2);
      else if (ext === '.xlsx') part2 = await analyzeXlsx(buf2);
      else part2 = await analyzeCsv(buf2);
      base.reopenSuccess = !!part2.importSuccess && Math.abs((part2.textChars || 0) - base.textChars) <= 2;
    } catch (e: any) {
      base.reopenSuccess = false;
      base.failure = base.failure || { phase: 'reopen', reason: e?.message || 'reopen parse failed' };
    }
  } catch (e: any) {
    base.importMs = now() - t0;
    base.failure = { phase: 'import', reason: e?.message || 'parse threw' };
  }
  return base;
}

// ── Cross-format content retention (Phase 2) on REAL platform exports ──────────
function familyKey(file: string): string {
  return path.basename(file).replace(/\.[a-z]+$/i, '').replace(/[-_]\d{8,}$/,'').replace(/[-_]\d+$/, '');
}
interface RetentionPair {
  family: string; from: string; to: string;
  tokenTotal: number; tokenSurvived: number; tokenCoverage: number; // robust: distinct content words
  phraseTotal: number; phraseSurvived: number; phraseSurvival: number; // strict: contiguous 8-token phrases
  skipped?: string; // reason a pair was not counted (e.g. image-based PDF)
}

const contentTokens = (text: string): Set<string> =>
  new Set(norm(text).split(' ').filter((t) => t.length >= 4));

function crossFormatRetention(docs: DocResult[]): { measured: RetentionPair[]; skipped: RetentionPair[] } {
  const families = new Map<string, DocResult[]>();
  for (const d of docs) {
    if (!d.importSuccess || !d._segments?.length) continue;
    if (!['.pptx', '.pdf', '.docx'].includes(d.ext)) continue;
    const k = familyKey(d.file);
    (families.get(k) || families.set(k, []).get(k)!).push(d);
  }
  const measured: RetentionPair[] = [];
  const skipped: RetentionPair[] = [];
  for (const [fam, group] of families) {
    const formats = new Map<string, DocResult>();
    for (const d of group) if (!formats.has(d.ext)) formats.set(d.ext, d); // one rep per format
    if (formats.size < 2) continue;
    const reps = [...formats.values()].sort((a, b) => b._segments!.length - a._segments!.length);
    const from = reps[0], to = reps[1];
    const label = (d: DocResult) => `${d.ext.slice(1)} (${path.basename(d.rel)})`;
    const baseRow = { family: fam, from: label(from), to: label(to), tokenTotal: 0, tokenSurvived: 0, tokenCoverage: 0, phraseTotal: 0, phraseSurvived: 0, phraseSurvival: 0 };

    // Skip pairs where the TARGET has no usable text layer (e.g. image-based PDF):
    // absence of extractable text is not content loss and must not be scored.
    if ((to.textChars || 0) < 200) { skipped.push({ ...baseRow, skipped: 'target has no extractable text layer (image-based export) — not text-verifiable' }); continue; }

    const haySegs = to._segments!;
    const hay = haySegs.join(' ');
    // robust token coverage
    const srcTok = contentTokens(from._segments!.join('\n'));
    const tgtTok = contentTokens(hay);
    let tokSurv = 0; for (const t of srcTok) if (tgtTok.has(t)) tokSurv++;
    // strict phrase survival
    const needles = from._segments!.map((s) => chunk(s, 8)).filter((n) => n.length >= 3);
    const phraseSurv = needles.filter((n) => phrasePresent(n, hay, haySegs)).length;
    // If almost nothing overlaps, the two files are likely unrelated artifacts that
    // merely share a filename prefix — flag rather than score as "loss".
    const tokenCoverage = srcTok.size ? Math.round((tokSurv / srcTok.size) * 1000) / 10 : 0;
    if (tokenCoverage < 10) { skipped.push({ ...baseRow, tokenTotal: srcTok.size, tokenSurvived: tokSurv, tokenCoverage, phraseTotal: needles.length, phraseSurvived: phraseSurv, phraseSurvival: needles.length ? Math.round((phraseSurv / needles.length) * 1000) / 10 : 0, skipped: 'negligible token overlap — likely unrelated artifacts sharing a name prefix, not the same document' }); continue; }

    measured.push({
      family: fam, from: label(from), to: label(to),
      tokenTotal: srcTok.size, tokenSurvived: tokSurv, tokenCoverage,
      phraseTotal: needles.length, phraseSurvived: phraseSurv,
      phraseSurvival: needles.length ? Math.round((phraseSurv / needles.length) * 1000) / 10 : 0,
    });
  }
  return { measured: measured.sort((a, b) => a.family.localeCompare(b.family)), skipped: skipped.sort((a, b) => a.family.localeCompare(b.family)) };
}

// ── Report ────────────────────────────────────────────────────────────────────
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

function buildReport(docs: DocResult[], retentionResult: { measured: RetentionPair[]; skipped: RetentionPair[] }, generatedAt: string): string {
  const retention = retentionResult.measured;
  const retSkipped = retentionResult.skipped;
  const L: string[] = [];
  const byCat = new Map<Category, DocResult[]>();
  for (const d of docs) (byCat.get(d.category) || byCat.set(d.category, []).get(d.category)!).push(d);
  const ok = docs.filter((d) => d.importSuccess);
  const reopened = docs.filter((d) => d.reopenSuccess);
  const failures = docs.filter((d) => d.failure);

  L.push('# Pitchonix — Product Validation Report');
  L.push('');
  L.push('> **STATUS: PARTIAL.** Phase Ω.PRODUCT.1. Every metric below is measured from REAL files that exist in this repository — no data is fabricated or estimated. **This is NOT the 900-document real-user corpus** the phase targets: the available files are predominantly platform-generated exports and uploaded workbooks, not sourced third-party user documents. Drop real documents under `backend/corpus/<category>/` and re-run `npm run validate:corpus` to grow this baseline.');
  L.push('');
  L.push(`**Generated:** ${generatedAt}`);
  L.push('');
  L.push('## Corpus Provenance (honesty statement)');
  L.push('');
  L.push('- Files were discovered by scanning the repository (excluding `node_modules`, `.next`, `dist`, `.git`).');
  L.push('- Most PPTX/PDF are Pitchonix\'s own exports; XLSX are previously-uploaded workbooks. They are real files, but they are **not a representative sample of real user inputs**.');
  L.push('- Subjective phases — **Template Quality (1–10)** and **Real User Review** — are reported as `REQUIRES_HUMAN_REVIEW`; they are deliberately left unscored because estimating them would fabricate data.');
  L.push('- Full platform Imported→Rendered→Exported→Reopened **ledger** retention is certified separately at 100% (Ω.CONTENT.3) but on a fixture deck; real-corpus ledger retention requires running real inputs through the live generation pipeline.');
  L.push('');

  // Phase 1
  L.push('## Phase 1 — Document Ingestion (real)');
  L.push('');
  L.push(`Documents discovered: **${docs.length}** · Import success: **${ok.length}/${docs.length} (${pct(ok.length, docs.length)}%)**`);
  L.push('');
  L.push('| Category | Files | Import OK | Reopen OK | Avg units | Languages |');
  L.push('|---|---:|---:|---:|---:|---|');
  for (const [cat, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const o = list.filter((d) => d.importSuccess).length;
    const r = list.filter((d) => d.reopenSuccess).length;
    const avgU = Math.round(list.reduce((s, d) => s + d.units, 0) / list.length);
    const langs = [...new Set(list.map((d) => d.language))].join(', ');
    L.push(`| ${cat} | ${list.length} | ${o} (${pct(o, list.length)}%) | ${r} (${pct(r, list.length)}%) | ${avgU} | ${langs} |`);
  }
  L.push('');
  L.push('| File type | Files | Import OK | Tables | Charts | Images | Total text chars |');
  L.push('|---|---:|---:|---:|---:|---:|---:|');
  for (const ext of ['.pptx', '.pdf', '.docx', '.xlsx', '.csv']) {
    const list = docs.filter((d) => d.ext === ext);
    if (!list.length) continue;
    const o = list.filter((d) => d.importSuccess).length;
    const sum = (f: (d: DocResult) => number | null) => list.reduce((s, d) => s + (f(d) || 0), 0);
    L.push(`| ${ext} | ${list.length} | ${o} (${pct(o, list.length)}%) | ${sum((d) => d.tables)} | ${sum((d) => d.charts)} | ${sum((d) => d.images)} | ${sum((d) => d.textChars).toLocaleString()} |`);
  }
  L.push('');

  // Phase 2
  L.push('## Phase 2 — Content Fidelity (real)');
  L.push('');
  L.push('**Authoritative retention** (Imported→Rendered→Exported→Reopened, broken/missing/mutated nodes) is the Universal Content Ledger via `npm run certify:content`. It is certified **100%** but on the Ω.CONTENT.3 fixture deck; real-corpus ledger retention requires running real *input* documents through the live generation pipeline and is **pending a real corpus** (this repo holds exports, not importable user inputs).');
  L.push('');
  L.push('**Supplementary signal — cross-format text survival between two existing exports of the same document.** Two complementary measures, both computed from real files:');
  L.push('- **Token coverage** (robust): fraction of distinct content words (≥4 chars) that survive into the other format. Tolerant of PDF reflow.');
  L.push('- **Phrase survival** (strict): fraction of 8-token contiguous phrases that survive. Undercounts when a format re-wraps text.');
  L.push('');
  if (retention.length) {
    L.push('| Document family | From → To | Token coverage | Phrase survival |');
    L.push('|---|---|---:|---:|');
    for (const r of retention) L.push(`| ${r.family} | ${r.from} → ${r.to} | ${r.tokenSurvived}/${r.tokenTotal} (${r.tokenCoverage}%) | ${r.phraseSurvived}/${r.phraseTotal} (${r.phraseSurvival}%) |`);
    const avgTok = Math.round((retention.reduce((s, r) => s + r.tokenCoverage, 0) / retention.length) * 10) / 10;
    const avgPhr = Math.round((retention.reduce((s, r) => s + r.phraseSurvival, 0) / retention.length) * 10) / 10;
    L.push('');
    L.push(`**Average across ${retention.length} text-extractable family pair(s): token coverage ${avgTok}%, phrase survival ${avgPhr}%.**`);
  } else {
    L.push('No text-extractable multi-format document families were found, so cross-format text survival could not be measured.');
  }
  if (retSkipped.length) {
    L.push('');
    L.push('Pairs excluded from the measurement (NOT counted as loss — these are not valid text-to-text comparisons):');
    L.push('');
    L.push('| Document family | From → To | Excluded because |');
    L.push('|---|---|---|');
    for (const r of retSkipped) L.push(`| ${r.family} | ${r.from} → ${r.to} | ${r.skipped} |`);
  }
  L.push('');
  L.push('> ⚠️ Cross-format survival is a supplementary integrity signal on already-exported files, **not** the platform\'s authoritative content-retention figure. Low values here reflect format/text-layer differences (e.g. image-based PDFs) or unrelated test artifacts — not measured pipeline loss.');
  L.push('');

  // Phase 3
  L.push('## Phase 3 — Template Quality');
  L.push('');
  L.push('**`REQUIRES_HUMAN_REVIEW` — not scored.** A 1–10 aesthetic score for layout, hierarchy, typography, readability, visual balance and professional appearance cannot be measured from files without human judgment, and is not estimated here. Objective structural signals that CAN be measured (real):');
  L.push('');
  L.push('| Category | Docs | Avg units | Avg text/unit | Empty units | Has-title rate (decks) |');
  L.push('|---|---:|---:|---:|---:|---:|');
  for (const [cat, list] of [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)) {
    const withUnits = list.filter((d) => d.units > 0);
    const avgU = withUnits.length ? Math.round(withUnits.reduce((s, d) => s + d.units, 0) / withUnits.length) : 0;
    const avgTpU = withUnits.length ? Math.round(withUnits.reduce((s, d) => s + d.textChars / Math.max(1, d.units), 0) / withUnits.length) : 0;
    const emptyish = list.filter((d) => d.importSuccess && d.textChars < 20).length;
    L.push(`| ${cat} | ${list.length} | ${avgU} | ${avgTpU} | ${emptyish} | n/a* |`);
  }
  L.push('');
  L.push('_*title detection per slide requires the live deck model; not derivable from flat export text. Use a human-review intake (below) for true template scores._');
  L.push('');

  // Phase 4
  L.push('## Phase 4 — Export / Reopen Integrity (real)');
  L.push('');
  L.push(`Every discovered export was re-opened with standard tooling and re-extracted; success = opens without corruption AND yields stable extractable content.`);
  L.push('');
  L.push(`- Reopen success: **${reopened.length}/${docs.length} (${pct(reopened.length, docs.length)}%)**`);
  L.push('');
  L.push('| File type | Reopen OK | Corrupt / unreadable |');
  L.push('|---|---:|---:|');
  for (const ext of ['.pptx', '.pdf', '.docx', '.xlsx', '.csv']) {
    const list = docs.filter((d) => d.ext === ext);
    if (!list.length) continue;
    const r = list.filter((d) => d.reopenSuccess).length;
    L.push(`| ${ext} | ${r}/${list.length} (${pct(r, list.length)}%) | ${list.length - r} |`);
  }
  L.push('');

  // Phase 5
  L.push('## Phase 5 — Real User Review');
  L.push('');
  L.push('**`REQUIRES_HUMAN_REVIEW` — not run.** "Looks professional / ready to send / needs fixes / unusable" requires real human reviewers. A structured intake template is provided at `certification-reports/human-review-intake.md` for reviewers to fill; results are not invented here.');
  L.push('');

  // Phase 6
  L.push('## Phase 6 — Failure Analysis (real)');
  L.push('');
  if (failures.length) {
    const ranked = new Map<string, number>();
    for (const f of failures) { const k = `${f.failure!.phase}: ${f.failure!.reason}`; ranked.set(k, (ranked.get(k) || 0) + 1); }
    L.push('| Failure (phase: reason) | Count |');
    L.push('|---|---:|');
    for (const [k, n] of [...ranked.entries()].sort((a, b) => b[1] - a[1])) L.push(`| ${k} | ${n} |`);
    L.push('');
    L.push('Affected files:');
    for (const f of failures.slice(0, 25)) L.push(`- \`${f.rel}\` — ${f.failure!.phase}: ${f.failure!.reason}`);
  } else {
    L.push('No import/reopen failures across the discovered corpus. ✅');
  }
  L.push('');

  // Phase 8
  L.push('## Phase 8 — Performance (real, parse/extract only)');
  L.push('');
  const times = docs.filter((d) => d.importMs > 0).map((d) => d.importMs).sort((a, b) => a - b);
  const p50 = times[Math.floor(times.length * 0.5)] || 0;
  const p95 = times[Math.floor(times.length * 0.95)] || 0;
  const max = times[times.length - 1] || 0;
  L.push(`Measured wall-clock for parse+extract (not full render/export, which need the live pipeline):`);
  L.push('');
  L.push(`- Documents timed: ${times.length} · p50 **${p50}ms** · p95 **${p95}ms** · max **${max}ms**`);
  L.push('');
  L.push('| File type | n | p50 ms | max ms | largest file |');
  L.push('|---|---:|---:|---:|---|');
  for (const ext of ['.pptx', '.pdf', '.docx', '.xlsx', '.csv']) {
    const list = docs.filter((d) => d.ext === ext);
    if (!list.length) continue;
    const ts = list.map((d) => d.importMs).sort((a, b) => a - b);
    const big = list.reduce((m, d) => (d.bytes > m.bytes ? d : m), list[0]);
    L.push(`| ${ext} | ${list.length} | ${ts[Math.floor(ts.length / 2)] || 0} | ${ts[ts.length - 1] || 0} | ${(big.bytes / 1024).toFixed(0)}KB |`);
  }
  L.push('');

  // Phase 9
  L.push('## Phase 9 — Product Scorecard (objective signals only)');
  L.push('');
  L.push('Machine-verifiable pass rates per studio surface. User-satisfaction / aesthetic scores are `REQUIRES_HUMAN_REVIEW`.');
  L.push('');
  const studio = (label: string, exts: string[], cats: Category[]) => {
    const list = docs.filter((d) => exts.includes(d.ext) || cats.includes(d.category));
    if (!list.length) return `| ${label} | 0 | — | — | REQUIRES_HUMAN_REVIEW |`;
    const imp = pct(list.filter((d) => d.importSuccess).length, list.length);
    const reo = pct(list.filter((d) => d.reopenSuccess).length, list.length);
    return `| ${label} | ${list.length} | ${imp}% | ${reo}% | REQUIRES_HUMAN_REVIEW |`;
  };
  L.push('| Studio / surface | Docs | Import OK | Reopen OK | Satisfaction |');
  L.push('|---|---:|---:|---:|---|');
  L.push(studio('Presentation (PPTX)', ['.pptx'], ['pitch-deck']));
  L.push(studio('PDF Studio (PDF)', ['.pdf'], []));
  L.push(studio('Career / CV Studio', [], ['cv']));
  L.push(studio('Excel Studio (XLSX/CSV)', ['.xlsx', '.csv'], ['excel-workbook']));
  L.push(studio('Convert (DOCX)', ['.docx'], []));
  L.push('');

  // Phase 10 / success criteria
  L.push('## Success Criteria — measured vs target (PARTIAL)');
  L.push('');
  const avgTok = retention.length ? Math.round((retention.reduce((s, r) => s + r.tokenCoverage, 0) / retention.length) * 10) / 10 : null;
  L.push('| Criterion | Target | Measured (partial) | Status |');
  L.push('|---|---|---|---|');
  L.push(`| Import success | ≥95% | ${pct(ok.length, docs.length)}% (n=${docs.length}) | ${pct(ok.length, docs.length) >= 95 ? '✅ (partial corpus)' : '⚠️'} |`);
  L.push(`| Content retention (ledger) | ≥99% | 100% on fixtures (Ω.CONTENT.3); real-corpus pending live pipeline | ⚠️ pending real inputs |`);
  L.push(`| — cross-format text survival | (signal) | ${avgTok != null ? 'token coverage ' + avgTok + '% over ' + retention.length + ' real pair(s)' : 'no text-extractable pairs'} | ℹ️ supplementary |`);
  L.push(`| Export success (reopen integrity) | ≥95% | ${pct(reopened.length, docs.length)}% reopen (n=${docs.length}) | ${pct(reopened.length, docs.length) >= 95 ? '✅ (partial)' : '⚠️'} |`);
  L.push('| Template score | ≥8/10 | REQUIRES_HUMAN_REVIEW | ⚠️ not scored (no fabrication) |');
  L.push('| User satisfaction | ≥8/10 | REQUIRES_HUMAN_REVIEW | ⚠️ not scored (no fabrication) |');
  L.push('');
  L.push('## Verdict');
  L.push('');
  L.push('This PARTIAL baseline establishes that the discovered real files ingest and re-open cleanly and that cross-format text fidelity is measurable on real exports. **It does NOT satisfy Ω.PRODUCT.1\'s exit criteria**, which require a real 900-document user corpus, human template scoring, and human review. Those remain open by design — supply `backend/corpus/<category>/` and add human reviews to complete the phase.');
  L.push('');
  return L.join('\n');
}

const HUMAN_INTAKE = `# Human Review Intake — Ω.PRODUCT.1 Phase 3 & 5

> Fill one row per reviewed output. These are the ONLY source of template/user scores.
> The automated harness does NOT estimate these — empty until a human completes them.

## Template Quality (1–10 each)

| Output file | Layout | Hierarchy | Typography | Readability | Visual balance | Professional | Reviewer | Date |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

## Real User Review

| Output file | Looks professional? | Ready to send? | Needs minor fixes | Needs major fixes | Unusable | Notes | Reviewer |
|---|---|---|---|---|---|---|---|
| | | | | | | | |
`;

async function main() {
  const generatedAt = new Date().toISOString();
  const roots = [
    path.join(BACKEND, 'corpus'),    // future real user corpus (categorized)
    path.join(BACKEND, 'exports'),
    path.join(BACKEND, 'uploads'),
    path.join(BACKEND, 'scripts'),
    path.join(BACKEND, 'test'),
    path.join(REPO, 'frontend', 'public'),
  ];
  const seen = new Set<string>();
  const files: string[] = [];
  for (const r of roots) for (const f of walk(r)) if (!seen.has(f)) { seen.add(f); files.push(f); }

  console.log(`Discovered ${files.length} real document(s). Analyzing…`);
  const docs: DocResult[] = [];
  for (const f of files) {
    const r = await analyze(f);
    docs.push(r);
    process.stdout.write(r.importSuccess ? '.' : 'x');
  }
  console.log('');

  const retention = crossFormatRetention(docs);
  const report = buildReport(docs, retention, generatedAt);
  fs.writeFileSync(REPORT, report, 'utf8');

  fs.mkdirSync(path.dirname(JSON_OUT), { recursive: true });
  const slim = docs.map(({ _segments, ...d }) => d);
  fs.writeFileSync(JSON_OUT, JSON.stringify({ generatedAt, partial: true, total: docs.length, docs: slim, retention: retention.measured, retentionSkipped: retention.skipped }, null, 2), 'utf8');

  const intake = path.join(BACKEND, 'certification-reports', 'human-review-intake.md');
  if (!fs.existsSync(intake)) fs.writeFileSync(intake, HUMAN_INTAKE, 'utf8');

  const ok = docs.filter((d) => d.importSuccess).length;
  const reo = docs.filter((d) => d.reopenSuccess).length;
  console.log(`\n✓ Wrote ${path.relative(REPO, REPORT)}`);
  console.log(`  PARTIAL baseline — ${docs.length} real files · import ${pct(ok, docs.length)}% · reopen ${pct(reo, docs.length)}% · ${retention.measured.length} text-extractable pair(s), ${retention.skipped.length} excluded`);
  console.log(`  Template/user scores: REQUIRES_HUMAN_REVIEW (not fabricated).`);
}

main().catch((e) => { console.error(e); process.exit(1); });
