/**
 * Phase Ω.PRODUCT.2 — Template Quality Audit (objective, code-derived).
 *
 * Reads every template registry and computes ONLY facts that can be measured
 * from the definitions — WCAG text/background contrast (readability), design
 * fingerprints (clone detection), font/colour sprawl (design-system coherence).
 *
 * It does NOT invent aesthetic 1–10 scores or human ratings: those phases are
 * emitted as REQUIRES_HUMAN_REVIEW with a structured intake. No content-fidelity,
 * ledger, or release-certification code is touched.
 *
 * Run: npm run audit:templates
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = path.join(ROOT, 'certification-reports');
fs.mkdirSync(OUT, { recursive: true });
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const w = (file, text) => fs.writeFileSync(path.join(ROOT, file), text);

// ── colour helpers (WCAG) ─────────────────────────────────────────────────────
function toRgb(hex) {
  if (!hex) return null;
  let h = hex.replace('#', '').trim();
  if (h.length === 8) h = h.slice(2); // ARGB → RGB (Excel)
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  if (h.length !== 6 || /[^0-9a-fA-F]/.test(h)) return null;
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}
function luminance(hex) {
  const rgb = toRgb(hex);
  if (!rgb) return null;
  const [r, g, b] = rgb.map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
function contrast(a, b) {
  const L1 = luminance(a), L2 = luminance(b);
  if (L1 == null || L2 == null) return null;
  const hi = Math.max(L1, L2), lo = Math.min(L1, L2);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}
const quant = (hex) => { const rgb = toRgb(hex); return rgb ? rgb.map((c) => Math.round(c / 24)).join('-') : 'na'; };
const fontName = (f) => String(f || '').replace(/["']/g, '').split(',')[0].trim();

// ── parsers (one record shape across families) ────────────────────────────────
// { family, id, name, category, fontHeading, fontBody, textHex, bgHex, accentHex, layoutSig, paletteRef? }
function parsePresentation() {
  const src = read('frontend/features/slide-editor/templates/registry.ts');
  const blocks = src.split(/export const TPL_/).slice(1);
  return blocks.map((b) => {
    const g = (re) => (b.match(re) || [])[1];
    return {
      family: 'Presentation',
      id: g(/id:\s*['"`]([^'"`]+)/), name: g(/name:\s*['"`]([^'"`]+)/), category: g(/category:\s*['"`]([^'"`]+)/),
      // fonts are single-quoted strings that may contain inner double quotes
      // (e.g. '"Playfair Display", Georgia, serif') — capture the whole literal.
      fontHeading: fontName(g(/fontHeading:\s*'([^']+)'/)), fontBody: fontName(g(/fontBody:\s*'([^']+)'/)),
      textHex: g(/\btext:\s*['"`](#[0-9a-fA-F]{3,8})/), bgHex: g(/background:\s*['"`](#[0-9a-fA-F]{3,8})/), accentHex: g(/\baccent:\s*['"`](#[0-9a-fA-F]{3,8})/),
      layoutSig: g(/category:\s*['"`]([^'"`]+)/) || '',
    };
  }).filter((t) => t.id);
}
function parsePdfStandard() {
  const src = read('frontend/features/pdf-studio/templates/registry/templateRegistry.ts');
  const start = src.indexOf('TEMPLATE_REGISTRY');
  const body = src.slice(start);
  const out = [];
  const re = /\{\s*id:\s*['"`]([^'"`]+)['"`][\s\S]*?colors:\s*\{([^}]*)\}[\s\S]*?headerStyle:\s*['"`]([^'"`]+)['"`][\s\S]*?spacing:\s*['"`]([^'"`]+)['"`]/g;
  let m;
  while ((m = re.exec(body))) {
    const colors = Object.fromEntries([...m[2].matchAll(/(\w+):\s*['"`](#[0-9a-fA-F]{3,8})/g)].map((c) => [c[1], c[2]]));
    const nameMatch = body.slice(m.index, m.index + 400).match(/name:\s*['"`]([^'"`]+)/);
    const catMatch = body.slice(m.index, m.index + 400).match(/category:\s*['"`]([^'"`]+)/);
    out.push({
      family: 'PDF Standard', id: m[1], name: nameMatch?.[1] || m[1], category: catMatch?.[1] || '',
      fontHeading: '(engine default)', fontBody: '(engine default)',
      textHex: colors.text, bgHex: colors.bg, accentHex: colors.accent,
      layoutSig: `${catMatch?.[1] || ''}/${m[3]}/${m[4]}`,
    });
  }
  return out;
}
function parsePdfPro() {
  const src = read('backend/src/pdf-studio/pro-templates/registry/pro-template.registry.ts');
  // palettes: name → {paper, ink, accent, display, body}
  const palettes = {};
  const palBlock = src.slice(src.indexOf('const palettes'), src.indexOf('PRO_TEMPLATE_REGISTRY'));
  // NB: no trailing `)` anchor — palette calls have a trailing comma after the last arg.
  const palRe = /(\w+):\s*tokens\(\s*\{([\s\S]*?)\},\s*['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`]/g;
  let pm;
  while ((pm = palRe.exec(palBlock))) {
    const c = Object.fromEntries([...pm[2].matchAll(/(\w+):\s*['"`](#[0-9a-fA-F]{3,8})/g)].map((x) => [x[1], x[2]]));
    palettes[pm[1]] = { paper: c.paper, ink: c.ink, accent: c.accent, display: fontName(pm[3]), body: fontName(pm[4]) };
  }
  const out = [];
  const tre = /template\(\s*['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`],\s*['"`]([^'"`]+)['"`],[\s\S]*?palettes\.(\w+)/g;
  let m;
  while ((m = tre.exec(src))) {
    const p = palettes[m[5]] || {};
    out.push({
      family: 'PDF Pro', id: m[1], name: m[2], category: m[3], variant: m[4],
      fontHeading: p.display, fontBody: p.body, textHex: p.ink, bgHex: p.paper, accentHex: p.accent,
      layoutSig: m[3], paletteRef: m[5],
    });
  }
  return out;
}
function parseCv() {
  const src = read('backend/src/career/cv-templates.ts');
  const start = src.indexOf('CV_TEMPLATE_LIBRARY');
  const body = src.slice(start);
  const out = [];
  const re = /T\(\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*['"`]([^'"`]+)['"`]\s*,\s*\{([\s\S]*?)\n\s*\}\)/g;
  let m;
  while ((m = re.exec(body))) {
    const blk = m[4];
    const g = (re2) => (blk.match(re2) || [])[1];
    out.push({
      family: 'CV', id: `${m[2]}`.toLowerCase().replace(/\s+/g, '-'), name: m[2], category: m[3], doctype: m[1],
      fontHeading: fontName(g(/heading:\s*['"`]([^'"`]+)/)), fontBody: fontName(g(/body:\s*['"`]([^'"`]+)/)),
      accentHex: g(/accent:\s*['"`](#[0-9a-fA-F]{3,8})/), textHex: '#111111', bgHex: '#FFFFFF',
      layoutSig: `${m[3]}/${g(/headerStyle:\s*['"`]([^'"`]+)/) || ''}/${g(/columns:\s*(\d)/) || ''}col/${g(/density:\s*['"`]([^'"`]+)/) || ''}/${g(/style:\s*['"`]([^'"`]+)/) || ''}`,
      atsSafe: /atsSafe:\s*true/.test(blk), photoShape: g(/photoShape:\s*['"`]([^'"`]+)/) || 'none',
    });
  }
  return out;
}
function parseExcel() {
  const src = read('backend/src/excel-studio/excel-studio.service.ts');
  const palStart = src.indexOf('TEMPLATE_PALETTE');
  const palBody = src.slice(palStart, src.indexOf('];', palStart) > -1 ? src.indexOf('};', palStart) : palStart + 4000);
  const out = [];
  const re = /['"`]([a-z-]+)['"`]:\s*\{\s*header:\s*['"`]([0-9A-Fa-f]{6,8})['"`],\s*accent:\s*['"`]([0-9A-Fa-f]{6,8})['"`],\s*text:\s*['"`]([0-9A-Fa-f]{6,8})['"`],\s*light:\s*['"`]([0-9A-Fa-f]{6,8})['"`]/g;
  let m;
  while ((m = re.exec(palBody))) {
    out.push({
      family: 'Excel', id: m[1], name: m[1], category: '(excel)',
      fontHeading: '(engine default)', fontBody: '(engine default)',
      headerHex: '#' + m[2], accentHex: '#' + m[3], textHex: '#' + m[4], bgHex: '#' + m[5],
      layoutSig: 'excel',
    });
  }
  return out;
}

// ── analysis ──────────────────────────────────────────────────────────────────
function enrich(t) {
  // CV: contrast measured accent-on-paper (body is dark-on-white by construction).
  const cText = t.family === 'CV' ? t.accentHex : t.family === 'Excel' ? t.textHex : t.textHex;
  const cBg = t.family === 'CV' ? t.bgHex : t.family === 'Excel' ? t.headerHex : t.bgHex;
  const ratio = contrast(cText, cBg);
  return {
    ...t,
    contrastPair: t.family === 'CV' ? 'accent/paper' : t.family === 'Excel' ? 'text/header' : 'text/bg',
    contrast: ratio,
    contrastAA: ratio != null ? ratio >= 4.5 : null,       // normal text
    contrastAALarge: ratio != null ? ratio >= 3 : null,    // large text / UI
    fingerprint: [quant(cBg), quant(cText), quant(t.accentHex), t.fontHeading || '', t.fontBody || '', t.layoutSig || ''].join('|'),
  };
}
function cloneClusters(list) {
  const byFp = new Map();
  for (const t of list) (byFp.get(t.fingerprint) || byFp.set(t.fingerprint, []).get(t.fingerprint)).push(t);
  return [...byFp.values()].filter((g) => g.length > 1);
}
const pct = (n, d) => (d > 0 ? Math.round((n / d) * 1000) / 10 : 0);

// ── build ─────────────────────────────────────────────────────────────────────
const generatedAt = new Date().toISOString();
const families = {
  Presentation: parsePresentation().map(enrich),
  CV: parseCv().map(enrich),
  'PDF Standard': parsePdfStandard().map(enrich),
  'PDF Pro': parsePdfPro().map(enrich),
  Excel: parseExcel().map(enrich),
};
const all = Object.values(families).flat();

const PARTIAL = '> **STATUS: PARTIAL — objective metrics only.** Phase Ω.PRODUCT.2. Every number here is computed from real template definitions in the codebase. **Subjective quality (1–10 aesthetics, investor/recruiter readiness) and human review are NOT scored here** — fabricating them would be dishonest; they are emitted as `REQUIRES_HUMAN_REVIEW` with an intake at `certification-reports/template-human-review-intake.md`. No content-fidelity, ledger, or release-certification code was modified.';

function inventoryReport() {
  const L = ['# Template Audit Report', '', PARTIAL, '', `**Generated:** ${generatedAt}`, ''];
  for (const [fam, list] of Object.entries(families)) {
    const aa = list.filter((t) => t.contrastAA).length;
    L.push(`## ${fam} — ${list.length} templates`, '');
    L.push(`Text/background contrast meeting WCAG AA (≥4.5:1): **${aa}/${list.length} (${pct(aa, list.length)}%)** · measured pair: \`${list[0]?.contrastPair}\``, '');
    L.push('| Template | Category | Heading font | Body font | Accent | Contrast | AA | Layout signature | Weaknesses |');
    L.push('|---|---|---|---|---|---:|:--:|---|---|');
    for (const t of list) {
      const weak = [];
      if (t.contrast != null && !t.contrastAA) weak.push('low-contrast');
      if (t.fontHeading && t.fontHeading === t.fontBody) weak.push('single-font');
      L.push(`| ${t.name} | ${t.category} | ${t.fontHeading || '—'} | ${t.fontBody || '—'} | \`${t.accentHex || '—'}\` | ${t.contrast ?? '—'} | ${t.contrastAA == null ? '—' : t.contrastAA ? '✅' : '❌'} | ${t.layoutSig} | ${weak.join(', ') || '—'} |`);
    }
    L.push('');
  }
  return L.join('\n');
}

function similarityReport() {
  const L = ['# Template Similarity Report', '', PARTIAL, '', `**Generated:** ${generatedAt}`, ''];
  L.push('A **design fingerprint** = quantized {background, text, accent colours} + {heading, body fonts} + layout signature. Templates sharing a fingerprint are visually near-identical (potential renamed clones).', '');
  let totalClones = 0;
  for (const [fam, list] of Object.entries(families)) {
    const clusters = cloneClusters(list);
    totalClones += clusters.reduce((s, c) => s + c.length, 0);
    L.push(`## ${fam}`, '');
    if (!clusters.length) { L.push('✅ No exact-fingerprint clones — every template is visually distinct.', ''); }
    else {
      L.push(`⚠️ ${clusters.length} clone cluster(s) — these share an identical visual fingerprint:`, '');
      for (const c of clusters) L.push(`- **${c.map((t) => t.name).join(' ≈ ')}** — fingerprint \`${c[0].fingerprint}\``);
      L.push('');
    }
    // palette reuse (PDF Pro / Excel share named palettes)
    if (fam === 'PDF Pro') {
      const byPal = new Map();
      for (const t of list) (byPal.get(t.paletteRef) || byPal.set(t.paletteRef, []).get(t.paletteRef)).push(t.name);
      const reused = [...byPal.entries()].filter(([, v]) => v.length > 1);
      if (reused.length) { L.push('Palette reuse (same colour system, different page archetypes):', ''); for (const [p, v] of reused) L.push(`- \`${p}\` → ${v.join(', ')}`); L.push(''); }
    }
  }
  L.push('## Verdict', '', totalClones === 0
    ? '✅ **No visually identical template families** by colour+font+layout fingerprint. (Whitespace/composition distinctiveness still needs human review.)'
    : `⚠️ ${totalClones} template(s) fall into clone clusters and need visual differentiation.`, '');
  return L.join('\n');
}

function designSystemReport() {
  const L = ['# Design System Audit', '', PARTIAL, '', `**Generated:** ${generatedAt}`, ''];
  const fonts = new Set(), accents = new Set();
  for (const t of all) { if (t.fontHeading && !t.fontHeading.startsWith('(')) fonts.add(t.fontHeading); if (t.fontBody && !t.fontBody.startsWith('(')) fonts.add(t.fontBody); if (t.accentHex) accents.add(t.accentHex.toUpperCase()); }
  const aa = all.filter((t) => t.contrastAA).length;
  const withContrast = all.filter((t) => t.contrast != null).length;
  L.push('## Cross-template consistency (objective)', '');
  L.push(`- Templates audited: **${all.length}** across ${Object.keys(families).length} families`);
  L.push(`- Distinct heading/body fonts in use: **${fonts.size}**`);
  L.push(`- Distinct accent colours: **${accents.size}**`);
  L.push(`- WCAG AA text contrast pass rate: **${pct(aa, withContrast)}%** (${aa}/${withContrast} with measurable text/bg pairs)`, '');
  L.push('### Font inventory', '', [...fonts].sort().map((f) => `- ${f}`).join('\n') || '_n/a_', '');
  L.push('> Design-consistency target ≥9/10 is a **human-review** judgement on whether the visual language is coherent yet distinct. Objective signals above feed it but do not replace it (`REQUIRES_HUMAN_REVIEW`).', '');
  return L.join('\n');
}

function scorecard(fam, title, extraNote = '') {
  const list = families[fam];
  const aa = list.filter((t) => t.contrastAA).length, wc = list.filter((t) => t.contrast != null).length;
  const fonts = new Set(); list.forEach((t) => { if (t.fontHeading && !t.fontHeading.startsWith('(')) fonts.add(t.fontHeading); if (t.fontBody && !t.fontBody.startsWith('(')) fonts.add(t.fontBody); });
  const cats = new Set(list.map((t) => t.category));
  const clones = cloneClusters(list);
  const L = [`# ${title}`, '', PARTIAL, '', `**Generated:** ${generatedAt}`, ''];
  L.push('## Objective signals (measured)', '');
  L.push(`- Templates: **${list.length}** · categories: **${cats.size}** · distinct fonts: **${fonts.size}**`);
  L.push(`- Readability — WCAG AA contrast (${list[0]?.contrastPair}): **${pct(aa, wc)}%** pass`);
  L.push(`- Visual distinctiveness — clone clusters: **${clones.length}** ${clones.length ? '⚠️' : '✅'}`);
  if (extraNote) L.push(`- ${extraNote}`);
  L.push('');
  L.push('## Aesthetic & readiness scores (1–10)', '');
  L.push('`REQUIRES_HUMAN_REVIEW` — hierarchy, spacing, balance, professionalism and investor/recruiter/client readiness cannot be honestly derived from registry data. Reviewers score via `certification-reports/template-human-review-intake.md`; scores are not invented here.', '');
  return L.join('\n');
}

function stressReport() {
  return ['# Template Stress Test Report', '', PARTIAL, '', `**Generated:** ${generatedAt}`, '',
    '## Scope (honest)', '',
    'True overflow/clipping/collapse verification requires **rendering** each template with edge-case content (very long/short text, large tables/charts). That needs the live render pipeline (Puppeteer), not static registry parsing.', '',
    '- Presentations: a real renderer audit already exists — `frontend/scripts/audit-presentation-templates.mjs` (launches the editor, screenshots each template, flags overflow/clipping/render errors). Run it against the live app to populate this section with real results.',
    '- PDF / CV / Excel: no static-parse overflow signal is available; a render-based stress harness over the edge-case content matrix is the follow-up.',
    '- Code-level overflow handling exists in `backend/src/pdf-studio/services/pagination-intelligence.service.ts` and the presentation overflow materializer — those are unit-tested separately, not visually verified here.', '',
    '> **Not run as part of this static audit. REQUIRES render harness.** Marked open so it is not mistaken for a pass.', ''].join('\n');
}

function humanIntake() {
  return `# Template Human Review Intake — Ω.PRODUCT.2 Phases 3–6 & 9

> The ONLY source of aesthetic / readiness scores. The audit harness does not invent these.
> One row per reviewed template render. Empty until a human completes it.

## Per-template scores (1–10)

| Template | Family | Hierarchy | Spacing | Balance | Readability | Professionalism | Reviewer | Date |
|---|---|---|---|---|---|---|---|---|
| | | | | | | | | |

## Readiness (Yes / Minor fixes / Major fixes / No)

| Template | Family | Looks professional | Send to investor? | Send to client? | Submit to employer? | Notes |
|---|---|---|---|---|---|---|
| | | | | | | |
`;
}

function certification() {
  const L = ['# Template Certification V1', '', PARTIAL, '', `**Generated:** ${generatedAt}`, ''];
  L.push('## Inventory', '');
  L.push('| Family | Templates | AA contrast pass | Clone clusters |');
  L.push('|---|---:|---:|---:|');
  for (const [fam, list] of Object.entries(families)) {
    const aa = list.filter((t) => t.contrastAA).length, wc = list.filter((t) => t.contrast != null).length;
    L.push(`| ${fam} | ${list.length} | ${pct(aa, wc)}% | ${cloneClusters(list).length} |`);
  }
  L.push('', '## Success criteria — measured vs target', '');
  L.push('| Criterion | Target | Status |');
  L.push('|---|---|---|');
  const totalClones = all.length ? Object.values(families).reduce((s, l) => s + cloneClusters(l).reduce((a, c) => a + c.length, 0), 0) : 0;
  L.push('| Presentation templates ≥8.5/10 | aesthetic | ⚠️ REQUIRES_HUMAN_REVIEW |');
  L.push('| PDF templates ≥8.5/10 | aesthetic | ⚠️ REQUIRES_HUMAN_REVIEW |');
  L.push('| CV templates ≥8.5/10 | aesthetic | ⚠️ REQUIRES_HUMAN_REVIEW |');
  L.push('| Excel templates ≥8.5/10 | aesthetic | ⚠️ REQUIRES_HUMAN_REVIEW |');
  L.push('| Design consistency ≥9/10 | coherence | ⚠️ REQUIRES_HUMAN_REVIEW (objective signals in DESIGN_SYSTEM_AUDIT.md) |');
  L.push('| Human review ≥8.5/10 | human | ⚠️ REQUIRES_HUMAN_REVIEW (intake provided) |');
  L.push(`| No visually identical template families | objective | ${totalClones === 0 ? '✅ PASS (0 fingerprint clones)' : '❌ ' + totalClones + ' clones'} |`);
  L.push('| No overflow / clipping failures | render | ⚠️ NOT RUN — requires render harness |');
  L.push('', '## Verdict', '', 'Objective gates (inventory, readability contrast, clone-distinctiveness) are computed and reported. **Aesthetic, design-consistency and human-review gates remain open by design** — they require human reviewers and a render-based stress harness. This certification does NOT claim the ≥8.5/10 targets are met; it provides the measurable foundation and the intake to complete them honestly.', '');
  return L.join('\n');
}

// ── emit ──────────────────────────────────────────────────────────────────────
w('TEMPLATE_AUDIT_REPORT.md', inventoryReport());
w('TEMPLATE_SIMILARITY_REPORT.md', similarityReport());
w('DESIGN_SYSTEM_AUDIT.md', designSystemReport());
w('PRESENTATION_TEMPLATE_SCORECARD.md', scorecard('Presentation', 'Presentation Template Scorecard'));
w('PDF_TEMPLATE_SCORECARD.md', scorecard('PDF Standard', 'PDF Template Scorecard', `PDF Pro: ${families['PDF Pro'].length} templates, ${cloneClusters(families['PDF Pro']).length} clone cluster(s)`));
w('CV_TEMPLATE_SCORECARD.md', scorecard('CV', 'CV Template Scorecard', `ATS-safe templates: ${families.CV.filter((t) => t.atsSafe).length}/${families.CV.length}. NOTE: the contrast figure is the **accent colour on white paper** (used for headings/dividers); CV body text is dark-on-white by construction and is not the measured pair. A sub-AA accent flags decorative low-contrast, not unreadable body copy.`));
w('EXCEL_TEMPLATE_SCORECARD.md', scorecard('Excel', 'Excel Template Scorecard'));
w('TEMPLATE_STRESS_TEST_REPORT.md', stressReport());
w(path.join('certification-reports', 'template-human-review-intake.md'), humanIntake());
w('TEMPLATE_HUMAN_REVIEW.md', humanIntake());
w('TEMPLATE_CERTIFICATION_V1.md', certification());

const summary = { generatedAt, partial: true, families: Object.fromEntries(Object.entries(families).map(([f, l]) => [f, { count: l.length, aaPass: l.filter((t) => t.contrastAA).length, clones: cloneClusters(l).reduce((a, c) => a + c.length, 0) }])) };
fs.writeFileSync(path.join(OUT, 'template-quality-audit.json'), JSON.stringify({ ...summary, templates: all }, null, 2));

const totalClones = Object.values(families).reduce((s, l) => s + cloneClusters(l).reduce((a, c) => a + c.length, 0), 0);
console.log('Template audit (objective, PARTIAL):');
for (const [f, l] of Object.entries(families)) console.log(`  ${f}: ${l.length} templates · AA ${pct(l.filter((t) => t.contrastAA).length, l.filter((t) => t.contrast != null).length)}% · ${cloneClusters(l).length} clone cluster(s)`);
console.log(`  total fingerprint clones: ${totalClones}`);
console.log('  aesthetic/human scores: REQUIRES_HUMAN_REVIEW (not fabricated)');
