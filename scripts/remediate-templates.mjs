/**
 * Phase Ω.PRODUCT.2A — WCAG-AA colour remediation (deterministic, hue-preserving).
 * Darkens sub-AA accents/headers to ≥4.5:1 within each template's own block only,
 * updating the token AND the same colour in that block's customCss (hex + rgb tint).
 * Touches ONLY template colour tokens. Writes a JSON of every change for the reports.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const rgb = (h) => { h = h.replace('#', ''); if (h.length === 8) h = h.slice(2); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16)); };
const hex2 = ([r, g, b]) => '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, c)).toString(16).padStart(2, '0').toUpperCase()).join('');
const lum = (h) => { const [r, g, b] = rgb(h).map((c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const con = (a, b) => { const L = [lum(a), lum(b)]; const hi = Math.max(...L), lo = Math.min(...L); return Math.round((hi + 0.05) / (lo + 0.05) * 100) / 100; };
const scale = ([r, g, b], k) => [Math.round(r * k), Math.round(g * k), Math.round(b * k)];

function darkenToAA(hex, against = '#FFFFFF', target = 4.5) {
  const base = rgb(hex);
  let lo = 0, hi = 1;
  for (let i = 0; i < 40; i++) { const k = (lo + hi) / 2; if (con(hex2(scale(base, k)), against) >= target) lo = k; else hi = k; }
  return hex2(scale(base, lo));
}

const changes = [];

// ── CV: per-block accent repair ───────────────────────────────────────────────
function remediateCv() {
  const file = path.join(ROOT, 'backend/src/career/cv-templates.ts');
  let src = fs.readFileSync(file, 'utf8');
  const re = /T\(\s*'(?:cv|resume|cover|portfolio)'\s*,\s*'([^']+)'[\s\S]*?\n  \}\),/g;
  const blocks = [];
  let m;
  while ((m = re.exec(src))) blocks.push({ name: m[1], start: m.index, end: m.index + m[0].length, text: m[0] });
  // rebuild with replacements (process right-to-left to keep indices valid)
  for (const b of blocks.reverse()) {
    const am = b.text.match(/accent:\s*'(#[0-9a-fA-F]{6})'/);
    if (!am) continue;
    const old = am[1].toUpperCase();
    if (con(old, '#FFFFFF') >= 4.5) continue;
    const neu = darkenToAA(old);
    const [or, og, ob] = rgb(old), [nr, ng, nb] = rgb(neu);
    let t = b.text;
    t = t.replace(new RegExp(old.slice(1), 'gi'), neu.slice(1));       // all hex forms in this block
    t = t.replace(new RegExp(`\\b${or},\\s*${og},\\s*${ob}\\b`, 'g'), `${nr},${ng},${nb}`); // rgb() tints
    src = src.slice(0, b.start) + t + src.slice(b.end);
    changes.push({ family: 'CV', template: b.name, role: 'accent', from: old, to: neu, before: con(old, '#FFFFFF'), after: con(neu, '#FFFFFF'), pair: 'accent/paper' });
  }
  fs.writeFileSync(file, src);
}

// ── Excel: per-palette header repair (white text on header) ───────────────────
function remediateExcel() {
  const file = path.join(ROOT, 'backend/src/excel-studio/excel-studio.service.ts');
  let src = fs.readFileSync(file, 'utf8');
  const palStart = src.indexOf('TEMPLATE_PALETTE');
  const palEnd = src.indexOf('};', palStart) + 2;
  let pal = src.slice(palStart, palEnd);
  const re = /'([a-z-]+)':\s*\{\s*header:\s*'([0-9A-Fa-f]{8})',\s*accent:\s*'([0-9A-Fa-f]{8})',\s*text:\s*'([0-9A-Fa-f]{8})',\s*light:\s*'([0-9A-Fa-f]{8})'/g;
  let m;
  const edits = [];
  while ((m = re.exec(pal))) {
    const [whole, id, header, accent, text, light] = m;
    const headerHex = '#' + header.slice(2), textHex = '#' + text.slice(2);
    if (con(textHex, headerHex) >= 4.5) continue;
    const neuHeader = darkenToAA(headerHex, textHex);
    const neuArgb = 'FF' + neuHeader.slice(1);
    edits.push({ id, oldArgb: header, neuArgb, before: con(textHex, headerHex), after: con(textHex, neuHeader), neuHeader });
  }
  for (const e of edits) {
    pal = pal.replace(`header: '${e.oldArgb}'`, `header: '${e.neuArgb}'`);
    changes.push({ family: 'Excel', template: e.id, role: 'header', from: '#' + e.oldArgb.slice(2), to: e.neuHeader, before: e.before, after: e.after, pair: 'text/header' });
  }
  src = src.slice(0, palStart) + pal + src.slice(palEnd);
  fs.writeFileSync(file, src);
}

remediateCv();
remediateExcel();
fs.mkdirSync(path.join(ROOT, 'certification-reports'), { recursive: true });
fs.writeFileSync(path.join(ROOT, 'certification-reports/aa-remediation.json'), JSON.stringify({ generatedAt: new Date().toISOString(), changes }, null, 2));
console.log(`AA remediation: ${changes.length} colour(s) darkened to ≥4.5:1`);
for (const c of changes) console.log(`  ${c.family} · ${c.template} · ${c.from} → ${c.to}  (${c.before} → ${c.after})`);
