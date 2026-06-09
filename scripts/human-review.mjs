/**
 * Phase Ω.PRODUCT.2E — Human Review instrument + aggregator.
 *
 * This script does NOT and CANNOT produce ratings — those must come from real
 * human reviewers (founders, investors, recruiters, designers, consultants, ops).
 * It (a) scaffolds the review packet (template lists, rubric, links to the REAL
 * rendered screenshots from 2C/2D) and (b) aggregates submitted real reviews
 * from certification-reports/human-review/reviews.csv into HUMAN_REVIEW_RESULTS.md
 * with reviewer count, average, median, comments, common issues and the pass/fail
 * gates. With no real reviews it emits the honest AWAITING state. Nothing is
 * simulated, synthesised, or estimated.
 *
 * Usage: node scripts/human-review.mjs init       # scaffold packet
 *        node scripts/human-review.mjs             # aggregate real reviews → results
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const HR = path.join(ROOT, 'certification-reports', 'human-review');
fs.mkdirSync(HR, { recursive: true });
const CSV = path.join(HR, 'reviews.csv');
const audit = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification-reports', 'template-quality-audit.json'), 'utf8'));

const REVIEW_SETS = ['Presentation', 'CV', 'PDF Pro', 'Excel'];
const CATEGORIES = ['visualQuality', 'readability', 'professionalism', 'hierarchy', 'trustworthiness', 'distinctiveness', 'usability', 'exportQuality'];
const RENDER_DIR = { Presentation: 'render/contact-sheets/ (per-template) + render/screenshots/<id>/', CV: 'render/cv/contact-sheets/cv-all.png + render/cv/screenshots/', 'PDF Pro': 'render/pdf/contact-sheets/pdf-pro-all.png + render/pdf/screenshots/', Excel: 'render/excel/contact-sheets/excel-all.png + render/excel/screenshots/' };
const MIN_REVIEWERS = 5, REQ_AVG = 8.5, REQ_MEDIAN = 8.5, FLOOR = 7;
const ISSUE_KEYS = ['readability', 'hierarchy', 'contrast', 'clutter', 'cluttered', 'crowded', 'overflow', 'spacing', 'font', 'alignment', 'small text', 'illegible'];

function templatesByFamily() {
  const out = {};
  for (const f of REVIEW_SETS) out[f] = audit.templates.filter((t) => t.family === f).map((t) => t.name);
  return out;
}
const median = (xs) => { if (!xs.length) return 0; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const round1 = (n) => Math.round(n * 10) / 10;

// ── init: scaffold the packet ─────────────────────────────────────────────────
function init() {
  const byFam = templatesByFamily();
  fs.writeFileSync(path.join(HR, 'templates.json'), JSON.stringify(byFam, null, 2));
  if (!fs.existsSync(CSV)) {
    const header = ['family', 'template', 'reviewerId', 'reviewerRole', ...CATEGORIES, 'comments'].join(',');
    fs.writeFileSync(CSV, header + '\n# One row per (reviewer × template). Scores 1-10. reviewerRole one of: founder|investor|recruiter|designer|consultant|operations\n# Example: Presentation,Crimson Dark Business,rev01,investor,9,9,9,8,9,8,9,9,"Strong exec presence; slightly tight footer"\n');
  }
  const totals = Object.fromEntries(REVIEW_SETS.map((f) => [f, byFam[f].length]));
  const readme = [
    '# Human Review Packet — Ω.PRODUCT.2E', '',
    'Real reviewers only. Score each template **1–10** on all eight categories. Minimum **5 reviewers per family**, drawn from: startup founders, investors, recruiters, designers, consultants, operations professionals.', '',
    '## What to review', 'Look at the ACTUAL rendered output produced by the render certification (2C/2D), not the template metadata:', '',
    ...REVIEW_SETS.map((f) => `- **${f}** (${totals[f]} templates) → \`certification-reports/${RENDER_DIR[f]}\``), '',
    '## Scoring categories (1–10)', '', ...CATEGORIES.map((c, i) => `${i + 1}. ${c.replace(/([A-Z])/g, ' $1').replace(/^./, (m) => m.toUpperCase())}`), '',
    '## How to submit', `Add one row per (reviewer × template) to \`certification-reports/human-review/reviews.csv\`, then run \`node scripts/human-review.mjs\` to regenerate \`HUMAN_REVIEW_RESULTS.md\`.`, '',
    '## Passing gates', `- Family average ≥ ${REQ_AVG}`, `- Family median ≥ ${REQ_MEDIAN}`, `- No template average < ${FLOOR}`, `- ≥ ${MIN_REVIEWERS} reviewers per family`, '- No recurring critical readability/hierarchy complaints', '',
    '## Template checklists', '', ...REVIEW_SETS.flatMap((f) => [`### ${f}`, '', ...byFam[f].map((n) => `- [ ] ${n}`), '']),
  ].join('\n');
  fs.writeFileSync(path.join(HR, 'README.md'), readme);
  console.log(`Scaffolded review packet in ${path.relative(ROOT, HR)}/ (templates.json, reviews.csv, README.md).`);
  console.log(`Review sets: ${REVIEW_SETS.map((f) => `${f} ${totals[f]}`).join(' · ')} = ${Object.values(totals).reduce((a, b) => a + b, 0)} templates.`);
}

// ── parse real reviews ────────────────────────────────────────────────────────
function parseCsv() {
  if (!fs.existsSync(CSV)) return [];
  const lines = fs.readFileSync(CSV, 'utf8').split(/\r?\n/);
  const rows = [];
  let header = null;
  for (const line of lines) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    // simple CSV with optional quoted last field (comments)
    const cells = []; let cur = '', q = false;
    for (const ch of line) { if (ch === '"') q = !q; else if (ch === ',' && !q) { cells.push(cur); cur = ''; } else cur += ch; }
    cells.push(cur);
    if (!header) { header = cells.map((c) => c.trim()); continue; }
    const rec = {}; header.forEach((h, i) => (rec[h] = (cells[i] ?? '').trim()));
    if (!rec.family || !rec.template || !rec.reviewerId) continue;
    const scores = CATEGORIES.map((c) => Number(rec[c])).filter((n) => Number.isFinite(n) && n >= 1 && n <= 10);
    if (scores.length !== CATEGORIES.length) continue; // require all 8 valid scores
    rec._overall = scores.reduce((a, b) => a + b, 0) / scores.length;
    rec._scores = Object.fromEntries(CATEGORIES.map((c) => [c, Number(rec[c])]));
    rows.push(rec);
  }
  return rows;
}

// ── aggregate → results + gates ───────────────────────────────────────────────
function aggregate() {
  const byFam = templatesByFamily();
  const reviews = parseCsv();
  const L = ['# Human Review Results — Ω.PRODUCT.2E', '', `**Generated:** ${new Date().toISOString()}`, ''];

  if (!reviews.length) {
    L.push('> ## ⚠️ STATUS: AWAITING HUMAN REVIEW — 0 real reviews recorded.', '',
      'This phase **cannot be completed without real human reviewers** and ratings must not be simulated, synthesised, or estimated. No scores exist yet, so every gate is **UNVERIFIED**.', '',
      '**To complete:** reviewers (≥5 per family, from founders/investors/recruiters/designers/consultants/operations) score the rendered output and add rows to `certification-reports/human-review/reviews.csv` (scaffold via `node scripts/human-review.mjs init`). Re-run this script to populate results.', '',
      '## Gate status (UNVERIFIED — no data)', '', '| Gate | Target | Status |', '|---|---|---|',
      `| Family average | ≥ ${REQ_AVG} | ⚠️ no reviews |`, `| Family median | ≥ ${REQ_MEDIAN} | ⚠️ no reviews |`,
      `| No template average < ${FLOOR} | true | ⚠️ no reviews |`, `| Reviewers per family | ≥ ${MIN_REVIEWERS} | ⚠️ 0 |`,
      '| No recurring critical complaints | true | ⚠️ no reviews |', '',
      '## Templates awaiting review', '', '| Family | Templates | Reviews so far |', '|---|---:|---:|',
      ...REVIEW_SETS.map((f) => `| ${f} | ${byFam[f].length} | 0 |`), '',
      '_Render-verified output for these templates exists (Ω.PRODUCT.2C/2D); human aesthetic/usability scoring is the remaining, irreducibly-human step._', '');
    fs.writeFileSync(path.join(ROOT, 'HUMAN_REVIEW_RESULTS.md'), L.join('\n') + '\n');
    console.log('HUMAN_REVIEW_RESULTS.md written — AWAITING HUMAN REVIEW (0 real reviews; nothing fabricated).');
    return;
  }

  // group reviews
  const key = (r) => `${r.family}||${r.template}`;
  const groups = new Map();
  for (const r of reviews) { (groups.get(key(r)) || groups.set(key(r), []).get(key(r))).push(r); }
  const perTemplate = [];
  for (const [k, rs] of groups) {
    const [family, template] = k.split('||');
    const overalls = rs.map((r) => r._overall);
    const reviewers = new Set(rs.map((r) => r.reviewerId)).size;
    const issues = {};
    for (const r of rs) { const c = (r.comments || '').toLowerCase(); for (const kw of ISSUE_KEYS) if (c.includes(kw)) issues[kw] = (issues[kw] || 0) + 1; }
    perTemplate.push({ family, template, reviewers, avg: round1(overalls.reduce((a, b) => a + b, 0) / overalls.length), median: round1(median(overalls)), comments: rs.map((r) => r.comments).filter(Boolean), issues, count: rs.length });
  }

  L.push('## Per-template results', '', '| Family | Template | Reviewers | Avg | Median | Common issues | Verdict |', '|---|---|---:|---:|---:|---|:--:|');
  for (const t of perTemplate.sort((a, b) => a.family.localeCompare(b.family) || a.template.localeCompare(b.template))) {
    const iss = Object.entries(t.issues).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k}×${n}`).join(', ') || '—';
    L.push(`| ${t.family} | ${t.template} | ${t.reviewers} | ${t.avg} | ${t.median} | ${iss} | ${t.avg >= FLOOR ? '✅' : '❌ <7'} |`);
  }

  L.push('', '## Family rollup & gates', '', '| Family | Templates reviewed | Reviewers | Avg | Median | Avg≥8.5 | Median≥8.5 | All≥7 | ≥5 reviewers |', '|---|---:|---:|---:|---:|:--:|:--:|:--:|:--:|');
  let allPass = true;
  for (const f of REVIEW_SETS) {
    const ts = perTemplate.filter((t) => t.family === f);
    const famReviews = reviews.filter((r) => r.family === f);
    const reviewers = new Set(famReviews.map((r) => r.reviewerId)).size;
    if (!ts.length) { L.push(`| ${f} | 0 | 0 | — | — | ⚠️ | ⚠️ | ⚠️ | ⚠️ |`); allPass = false; continue; }
    const favg = round1(ts.reduce((a, t) => a + t.avg, 0) / ts.length);
    const fmed = round1(median(famReviews.map((r) => r._overall)));
    const allFloor = ts.every((t) => t.avg >= FLOOR);
    const enough = reviewers >= MIN_REVIEWERS;
    const pass = favg >= REQ_AVG && fmed >= REQ_MEDIAN && allFloor && enough;
    if (!pass) allPass = false;
    L.push(`| ${f} | ${ts.length}/${byFam[f].length} | ${reviewers} | ${favg} | ${fmed} | ${favg >= REQ_AVG ? '✅' : '❌'} | ${fmed >= REQ_MEDIAN ? '✅' : '❌'} | ${allFloor ? '✅' : '❌'} | ${enough ? '✅' : '❌'} |`);
  }
  L.push('', `## Verdict: ${allPass ? '✅ PASS — all families meet the human-review gates' : '❌ NOT PASSED — see family gates above'}`, '');
  fs.writeFileSync(path.join(ROOT, 'HUMAN_REVIEW_RESULTS.md'), L.join('\n') + '\n');
  console.log(`HUMAN_REVIEW_RESULTS.md written from ${reviews.length} real review row(s) across ${groups.size} template(s). Verdict: ${allPass ? 'PASS' : 'NOT PASSED'}`);
}

const mode = process.argv[2];
if (mode === 'init') init();
else { if (!fs.existsSync(CSV)) init(); aggregate(); }
