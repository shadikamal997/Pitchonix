/**
 * Phase Ω.PRODUCT.3 — Editor Experience audit (objective, code-derived).
 *
 * Statically inventories each editor's capability implementation (undo/redo,
 * autosave, keyboard shortcuts, drag&drop, copy/paste, inline editing) from real
 * source, cross-references existing automated tests, and pulls the real per-route
 * asset baselines. It reports what IS implemented and tested — and explicitly
 * marks the parts that require LIVE interaction (history integrity under real
 * ops, crash/offline recovery, click counts, runtime perf) or HUMAN judgement
 * (the ≥8.5 experience score) as not-statically-verifiable. Nothing fabricated.
 *
 * Run: npm run audit:editors
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const OUT = ROOT;
const w = (f, t) => fs.writeFileSync(path.join(OUT, f), t);
const at = new Date().toISOString();

const EDITORS = [
  { key: 'Presentation', dirs: ['frontend/features/slide-editor', 'frontend/app/projects'], route: '/projects/[id]/edit/[slideId]' },
  { key: 'PDF Studio', dirs: ['frontend/features/pdf-studio', 'frontend/app/pdf-studio'], route: '/pdf-studio/editor/[id]' },
  { key: 'Excel Studio', dirs: ['frontend/features/excel-studio', 'frontend/app/excel-studio'], route: '/excel-studio/editor/[id]' },
  { key: 'Career Docs', dirs: ['frontend/features/career', 'frontend/app/career'], route: '/career/builder/[id]' },
  { key: 'Convert', dirs: ['frontend/app/convert'], route: '/convert' },
  { key: 'Brand Kits', dirs: ['frontend/features/brand-kits'], route: '/brand-kits' },
];
const CAPS = {
  undoRedo: /\b(undo|redo)\b|useHistory|HistoryStack|commandStack/i,
  autosave: /autosave|auto-save|useAutoSave|debounce[\s\S]{0,40}save|save[\s\S]{0,24}debounce/i,
  shortcuts: /metaKey|ctrlKey|onKeyDown|useHotkey|addEventListener\(['"]keydown/i,
  dragDrop: /onDragStart|onDrop\b|draggable|DndContext|useSortable|useDraggable|react-dnd|onDragEnd/i,
  // copy/paste in these editors is keyboard-driven (⌘C/⌘V + in-memory clipboard),
  // not always the onPaste/clipboard API — catch both, and the meta/ctrl+key form.
  copyPaste: /clipboardRef|navigator\.clipboard|clipboardData|onPaste|onCopy|handlePaste|handleCopy|writeText|readText|execCommand\(['"]copy|(?:metaKey|ctrlKey|\bmeta\b|\bctrl\b)[\s\S]{0,70}['"][cvx]['"]|['"][cvx]['"][\s\S]{0,30}(?:metaKey|ctrlKey)/i,
  inlineEdit: /contentEditable|RichTextEditor|onBlur[\s\S]{0,40}(save|commit|update)/i,
};

function walk(dir, out = []) {
  let es; try { es = fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true }); } catch { return out; }
  for (const e of es) {
    if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) walk(rel, out);
    else if (/\.(tsx?|jsx?)$/.test(e.name)) out.push(rel);
  }
  return out;
}

function scan() {
  return EDITORS.map((ed) => {
    const files = ed.dirs.flatMap((d) => walk(d));
    const caps = {};
    for (const [cap, re] of Object.entries(CAPS)) {
      const hits = [];
      for (const f of files) { try { if (re.test(fs.readFileSync(path.join(ROOT, f), 'utf8'))) hits.push(f); } catch { /* */ } }
      caps[cap] = { present: hits.length > 0, files: hits.length, evidence: hits.slice(0, 3) };
    }
    return { key: ed.key, route: ed.route, fileCount: files.length, caps };
  });
}

function perfBaselines() {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'certification-reports', 'performance-baseline.json'), 'utf8'));
    const rows = j.routes || j.results || (Array.isArray(j) ? j : []);
    const map = {};
    for (const r of rows) map[r.route] = r;
    return map;
  } catch { return {}; }
}

const editors = scan();
const perf = perfBaselines();
const CAP_LABEL = { undoRedo: 'Undo/Redo', autosave: 'Autosave', shortcuts: 'Shortcuts', dragDrop: 'Drag&Drop', copyPaste: 'Copy/Paste', inlineEdit: 'Inline edit' };
const tick = (b) => (b ? '✅' : '—');
const HEAD = (title) => `# ${title}\n\n> Phase Ω.PRODUCT.3 — code-derived editor audit. Capability presence/absence is read from real source; existing automated tests are cited where they exist. Items needing LIVE interaction or HUMAN judgement are marked, not fabricated.\n>\n> **Reading the matrix:** ✅ = a matching implementation pattern was found. A blank/❌ means *no matching named pattern was found* — it usually indicates a real gap, but can also mean a different mechanism (e.g. Excel Studio persists **per-operation** immediately rather than via debounced autosave; Convert and Brand Kits are not full document editors). Verify a flagged gap before treating it as definitive.\n\n**Generated:** ${at}\n`;

// ── Phase 1 — inventory + capability matrix ──────────────────────────────────
function auditReport() {
  const L = [HEAD('Editor Audit Report'), '## Capability matrix (implemented in source)', '', '| Editor | Files | ' + Object.values(CAP_LABEL).join(' | ') + ' |', '|---' + '|---:'.repeat(1) + '|:--:'.repeat(6) + '|'];
  for (const e of editors) L.push(`| ${e.key} | ${e.fileCount} | ` + Object.keys(CAP_LABEL).map((c) => tick(e.caps[c].present)).join(' | ') + ' |');
  L.push('', '## Per-editor detail', '');
  for (const e of editors) {
    L.push(`### ${e.key}  \`${e.route}\``, '');
    for (const [c, label] of Object.entries(CAP_LABEL)) {
      const cap = e.caps[c];
      L.push(`- **${label}:** ${cap.present ? `implemented (${cap.files} file(s)) — e.g. \`${cap.evidence[0]}\`` : '⚠️ no source signal found'}`);
    }
    L.push('');
  }
  L.push('## Workflow friction / loading & editing times', '', '⚠️ **Requires live instrumentation.** Loading/editing times and friction are measured by driving the running editors, not by static scan. Asset-size proxies are in EDITOR_PERFORMANCE_REPORT.md; full timing + friction is the live follow-up.', '',
    '_Builds on the prior manual editor audit (memory: Editor Comprehensive Audit, 2026-05-17) — refresh against current code before acting on specific UI claims._', '');
  w('EDITOR_AUDIT_REPORT.md', L.join('\n'));
}

function capReport(cap, file, title, ops, liveNote, tests) {
  const L = [HEAD(title), `## ${CAP_LABEL[cap]} — implemented in ${editors.filter((e) => e.caps[cap].present).length}/${editors.length} editors`, '',
    '| Editor | Implemented | Source files | Evidence |', '|---|:--:|---:|---|'];
  for (const e of editors) { const c = e.caps[cap]; L.push(`| ${e.key} | ${c.present ? '✅' : '❌'} | ${c.files} | ${c.evidence.map((x) => `\`${path.basename(x)}\``).join(', ') || '—'} |`); }
  if (ops) { L.push('', '## Required operations', '', ...ops.map((o) => `- ${o}`)); }
  if (tests) L.push('', '## Automated test evidence', '', tests);
  L.push('', '## Live verification required', '', liveNote, '');
  w(file, L.join('\n'));
}

// ── perf ──────────────────────────────────────────────────────────────────────
function perfReport() {
  const L = [HEAD('Editor Performance Report'), '## Asset baselines (real, from release certification)', '', '| Editor | Route | JS/CSS KB | Budget KB | Status |', '|---|---|---:|---:|:--:|'];
  for (const e of editors) {
    const p = perf[e.route];
    if (p) L.push(`| ${e.key} | ${e.route} | ${p.measuredKb ?? '—'} | ${p.budgetKb ?? '—'} | ${p.status || '—'} |`);
    else L.push(`| ${e.key} | ${e.route} | — | — | not in baseline |`);
  }
  L.push('', '## Runtime metrics (load / first-interaction / save / render / memory)', '',
    '⚠️ **Requires live instrumentation.** Editor load time, first-interaction time, save time, render time, large-document handling and memory are runtime measurements that need the running editors driven headlessly with performance tracing. Static asset size (above) is a real but partial proxy. The release pipeline already gates asset budgets; runtime profiling is the outstanding work.', '');
  w('EDITOR_PERFORMANCE_REPORT.md', L.join('\n'));
}

// ── certification rollup ─────────────────────────────────────────────────────
function certification() {
  const have = (c) => editors.filter((e) => e.caps[c].present).length;
  const L = [HEAD('Editor Experience Certification'), '## Capability coverage (source-verified)', '', '| Capability | Editors implementing | Coverage |', '|---|---|---:|'];
  for (const [c, label] of Object.entries(CAP_LABEL)) L.push(`| ${label} | ${editors.filter((e) => e.caps[c].present).map((e) => e.key).join(', ') || 'none'} | ${have(c)}/${editors.length} |`);
  L.push('', '## Success criteria', '', '| Criterion | Basis | Status |', '|---|---|---|');
  L.push(`| Undo/Redo reliable | source in ${have('undoRedo')}/6 + Excel backend op test passes | ⚠️ implemented; live reliability across all op types UNVERIFIED |`);
  L.push(`| Autosave reliable | source in ${have('autosave')}/6 | ⚠️ implemented; crash/offline/refresh recovery needs LIVE test |`);
  L.push('| No data loss | — | ⚠️ requires LIVE fault-injection (refresh/crash/network) |');
  L.push('| Editor performance acceptable | asset budgets pass (release cert) | ⚠️ asset-only; runtime profiling outstanding |');
  L.push(`| Copy/Paste certified | source in ${have('copyPaste')}/6 | ⚠️ implemented where present; formatting fidelity needs LIVE test |`);
  L.push(`| Drag & Drop certified | source in ${have('dragDrop')}/6 | ⚠️ implemented where present; behaviour/data-loss needs LIVE test |`);
  L.push('| Workflow friction low | — | ⚠️ requires LIVE click/time journey measurement |');
  L.push('| Editor Experience Score ≥8.5/10 | — | ⚠️ REQUIRES_HUMAN_REVIEW — not estimated |');
  L.push('', '## Verdict', '',
    'Source-level audit confirms which editor capabilities are **implemented** and which automated tests cover them. It does **NOT** certify live reliability, no-data-loss under faults, runtime performance, workflow friction, or the ≥8.5 human experience score — those require a live editor-driving harness and real reviewers, and are left explicitly open rather than fabricated.', '',
    '**This phase does not fully pass on static analysis alone.** The capability matrix pinpoints concrete gaps (editors lacking undo/redo, autosave, shortcuts, copy/paste) to close, then a live interaction harness + human review complete certification.', '');
  w('EDITOR_EXPERIENCE_CERTIFICATION.md', L.join('\n'));
}

auditReport();
capReport('undoRedo', 'UNDO_REDO_CERTIFICATION.md', 'Undo / Redo Certification',
  ['Create', 'Edit', 'Delete', 'Move', 'Duplicate', 'Import', 'Template Change'],
  '⚠️ History integrity, lost/broken history and state corruption must be checked by driving each editor through real Create/Edit/Delete/Move/Duplicate/Import/Template-change operations and asserting undo→redo round-trips. Static scan only proves the mechanism EXISTS.',
  'Excel Studio backend operation replay (undo/redo/snapshots/diff) is covered by `backend/src/excel-studio/excel-studio.service.spec.ts` and passes. Other editors have no equivalent automated undo/redo test — a live harness is the gap.');
capReport('autosave', 'AUTOSAVE_CERTIFICATION.md', 'Autosave Certification', null,
  '⚠️ Autosave TIMING, offline recovery, tab-refresh, browser-crash and network-interruption recovery are runtime fault-injection scenarios. They need a live harness (kill/refresh/throttle while editing) — not statically verifiable.');
capReport('shortcuts', 'KEYBOARD_SHORTCUT_AUDIT.md', 'Keyboard Shortcut Audit', ['Copy', 'Paste', 'Undo', 'Redo', 'Save', 'Delete', 'Duplicate', 'Navigation'],
  '⚠️ Cross-editor shortcut CONSISTENCY (same keys → same action everywhere) needs the actual key-binding maps compared. Editors with no shortcut signal likely lack keyboard support entirely — a real gap to close.');
capReport('inlineEdit', 'INLINE_EDITING_REPORT.md', 'Inline Editing Report', ['Text', 'Table', 'Cell', 'Slide', 'Image', 'Formula'],
  '⚠️ "Fast / predictable / no accidental loss" are live-interaction properties. Static scan shows where inline editing is implemented; behaviour under real typing/blur/escape needs a live harness.');
capReport('dragDrop', 'DRAG_DROP_CERTIFICATION.md', 'Drag & Drop Certification', ['Slides', 'Sections', 'Blocks', 'Images', 'Files', 'Templates'],
  '⚠️ Smooth behaviour and no-data-loss on reorder/move are live properties — needs a live drag harness per editor.');
capReport('copyPaste', 'COPY_PASTE_CERTIFICATION.md', 'Copy / Paste Certification', ['Internal', 'Cross-document', 'Cross-editor', 'Excel', 'Table'],
  '⚠️ Formatting-preserved across internal/cross-document/cross-editor/Excel/table paste is a live clipboard test. Static scan shows where copy/paste handlers exist.');
perfReport();
w('WORKFLOW_ANALYSIS.md', [HEAD('Workflow Analysis'), '## Status: requires live journey instrumentation', '',
  'Complete journeys (Import → Edit → Template change → Export → Reopen → Continue editing) with **clicks, time and friction points** must be measured by driving the running editors. Static analysis cannot count clicks or time interactions.', '',
  '## What IS verified elsewhere (real)', '- Import → … → Reopen content fidelity: Universal Content Ledger (Ω.CONTENT.3, 100% on fixtures).', '- Export → Reopen render fidelity: render certification (Ω.PRODUCT.2C/2D, 131/131 templates).', '- Per-route asset budgets: release certification.', '',
  '## Outstanding (live)', '- Click/time counts per journey, friction-point identification, and large-document journey behaviour — a live editor-driving harness (Playwright) over each studio.', ''].join('\n'));
certification();

const cov = Object.fromEntries(Object.keys(CAP_LABEL).map((c) => [c, editors.filter((e) => e.caps[c].present).length]));
w('certification-reports/editor-audit.json', JSON.stringify({ generatedAt: at, editors, coverage: cov }, null, 2) + '\n');
console.log('Editor audit complete. Capability coverage (/6 editors):');
for (const [c, n] of Object.entries(cov)) console.log(`  ${CAP_LABEL[c]}: ${n}/6 — ${editors.filter((e) => e.caps[c].present).map((e) => e.key).join(', ')}`);
console.log('Reports: EDITOR_AUDIT, UNDO_REDO, AUTOSAVE, KEYBOARD_SHORTCUT, INLINE_EDITING, DRAG_DROP, COPY_PASTE, EDITOR_PERFORMANCE, WORKFLOW_ANALYSIS, EDITOR_EXPERIENCE_CERTIFICATION');
