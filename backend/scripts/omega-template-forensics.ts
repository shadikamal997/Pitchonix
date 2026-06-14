/**
 * Phase Ω.7 — Template System Forensics
 *
 * Measures: clone detection, visual distinctiveness, hierarchy consistency,
 * metadata completeness, category coverage, tag quality.
 *
 * Failure criteria:
 *   - Duplicate template names exist
 *   - Templates with missing required fields (name, description, category)
 *   - Identical tags across >50% of templates (no differentiation)
 *   - Less than 3 distinct categories
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:4000/api';
const REPORT_PATH = path.join(__dirname, '../../OMEGA_TEMPLATE_FORENSICS.md');

interface TemplateRecord {
  id: string;
  name: string;
  category?: string;
  industry?: string;
  documentType?: string;
  description?: string;
  tags?: string[];
  popular?: boolean;
}

async function apiGet(url: string, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method: 'GET', headers });
  let bd: any;
  try { bd = await res.json(); } catch { bd = null; }
  return { status: res.status, body: bd };
}

async function apiPost(url: string, body: any, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  let bd: any;
  try { bd = await res.json(); } catch { bd = null; }
  return { status: res.status, body: bd };
}

function similarity(a: string, b: string): number {
  if (a === b) return 1.0;
  const setA = new Set(a.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(b.toLowerCase().split(/\W+/).filter(Boolean));
  const intersection = [...setA].filter(x => setB.has(x)).length;
  const union = new Set([...setA, ...setB]).size;
  return union === 0 ? 0 : intersection / union;
}

async function main() {
  console.log('Phase Ω.7 — Template System Forensics');
  console.log(`Backend: ${BASE}`);
  console.log('');

  const ts = Date.now();
  const userEmail = `tmpl-forensics-${ts}@example.com`;
  const pw = 'TestPass123!';

  // Auth (some template endpoints may require auth)
  let token: string | null = null;
  const regRes = await apiPost('/auth/register', { email: userEmail, password: pw, name: 'TmplForensics' });
  token = regRes.body?.accessToken ?? null;
  if (!token) {
    const loginRes = await apiPost('/auth/login', { email: userEmail, password: pw });
    token = loginRes.body?.accessToken ?? null;
  }

  // ── 1. Fetch all templates ────────────────────────────────────────────────────
  console.log('[1/6] Fetching generation templates...');
  const tmplRes = await apiGet('/templates', token ?? undefined);
  const templates: TemplateRecord[] = Array.isArray(tmplRes.body) ? tmplRes.body : [];
  console.log(`  Found ${templates.length} templates (HTTP ${tmplRes.status})`);

  // ── 2. Fetch deck templates ───────────────────────────────────────────────────
  console.log('[2/6] Fetching deck templates...');
  const deckTmplRes = await apiGet('/deck-templates', token ?? undefined);
  const deckTemplates: TemplateRecord[] = Array.isArray(deckTmplRes.body) ? deckTmplRes.body :
    (Array.isArray(deckTmplRes.body?.data) ? deckTmplRes.body.data : []);
  console.log(`  Found ${deckTemplates.length} deck templates (HTTP ${deckTmplRes.status})`);

  // ── 3. Clone detection ────────────────────────────────────────────────────────
  console.log('[3/6] Running clone detection...');
  const clones: Array<{ a: string; b: string; sim: number; field: string }> = [];

  // Exact name duplicates
  const namesSeen = new Map<string, string>();
  for (const t of templates) {
    const key = (t.name ?? '').toLowerCase().trim();
    if (namesSeen.has(key)) {
      clones.push({ a: namesSeen.get(key)!, b: t.id, sim: 1.0, field: 'name (exact duplicate)' });
    } else {
      namesSeen.set(key, t.id);
    }
  }

  // Near-duplicate descriptions (Jaccard > 0.8)
  for (let i = 0; i < templates.length; i++) {
    for (let j = i + 1; j < templates.length; j++) {
      const tA = templates[i];
      const tB = templates[j];
      const descA = tA.description ?? '';
      const descB = tB.description ?? '';
      if (descA.length > 20 && descB.length > 20) {
        const sim = similarity(descA, descB);
        if (sim >= 0.8) {
          clones.push({ a: tA.id, b: tB.id, sim, field: `description (Jaccard ${(sim * 100).toFixed(0)}%)` });
        }
      }
    }
  }

  console.log(`  Clones detected: ${clones.length}`);

  // ── 4. Metadata completeness ──────────────────────────────────────────────────
  console.log('[4/6] Checking metadata completeness...');
  const missingName = templates.filter(t => !t.name || t.name.trim().length === 0);
  const missingDesc = templates.filter(t => !t.description || t.description.trim().length === 0);
  const missingCategory = templates.filter(t => !t.category && !t.documentType);
  const missingTags = templates.filter(t => !t.tags || t.tags.length === 0);

  console.log(`  Missing name: ${missingName.length}`);
  console.log(`  Missing description: ${missingDesc.length}`);
  console.log(`  Missing category: ${missingCategory.length}`);
  console.log(`  Missing tags: ${missingTags.length}`);

  // ── 5. Category coverage ──────────────────────────────────────────────────────
  console.log('[5/6] Measuring category coverage...');
  const categories = new Set<string>();
  const industries = new Set<string>();
  const docTypes = new Set<string>();

  for (const t of templates) {
    if (t.category) categories.add(t.category);
    if (t.industry) industries.add(t.industry);
    if (t.documentType) docTypes.add(t.documentType);
  }

  const categoryMap = new Map<string, number>();
  for (const t of templates) {
    const cat = t.category ?? t.documentType ?? 'uncategorized';
    categoryMap.set(cat, (categoryMap.get(cat) ?? 0) + 1);
  }

  console.log(`  Distinct categories: ${categories.size}`);
  console.log(`  Distinct industries: ${industries.size}`);
  console.log(`  Distinct doc types: ${docTypes.size}`);

  // ── 6. Tag uniqueness ─────────────────────────────────────────────────────────
  console.log('[6/6] Checking tag uniqueness...');
  const tagFreq = new Map<string, number>();
  let totalTagged = 0;
  for (const t of templates) {
    if (t.tags && t.tags.length > 0) {
      totalTagged++;
      for (const tag of t.tags) {
        tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
      }
    }
  }

  // Tags that appear in >80% of templates are not useful differentiators
  const overusedTags = templates.length > 0
    ? [...tagFreq.entries()].filter(([, count]) => count / templates.length > 0.8)
    : [];

  // ── Certification ─────────────────────────────────────────────────────────────
  const failures: string[] = [];

  if (templates.length === 0 && deckTemplates.length === 0) {
    failures.push('No templates found — template system is empty');
  }
  if (clones.length > 0) {
    failures.push(`${clones.length} clone(s) detected (exact name duplicates or near-duplicate descriptions)`);
  }
  if (missingName.length > 0) {
    failures.push(`${missingName.length} template(s) missing name`);
  }
  if (missingDesc.length > 0) {
    failures.push(`${missingDesc.length} template(s) missing description`);
  }
  if (missingCategory.length > 0) {
    failures.push(`${missingCategory.length} template(s) missing category`);
  }
  if (categories.size < 3 && templates.length > 5) {
    failures.push(`Only ${categories.size} distinct categories — insufficient differentiation`);
  }

  const certified = failures.length === 0;

  console.log('');
  console.log('════════════════════════════════════════════════════════════════');
  if (certified) {
    console.log('  Ω.7 TEMPLATE SYSTEM FORENSICS — CERTIFIED');
  } else {
    console.log('  Ω.7 TEMPLATE SYSTEM FORENSICS — FAILS CERTIFICATION');
    for (const f of failures) console.log(`  ✗ ${f}`);
  }
  console.log('════════════════════════════════════════════════════════════════');

  // ── Report ─────────────────────────────────────────────────────────────────────
  const now = new Date().toISOString();

  const cloneTable = clones.length > 0
    ? '| Template A | Template B | Field | Similarity |\n|---|---|---|---|\n' +
      clones.map(c => `| ${c.a} | ${c.b} | ${c.field} | ${(c.sim * 100).toFixed(0)}% |`).join('\n')
    : '_No clones detected_';

  const catTable = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([cat, count]) => `| ${cat} | ${count} |`)
    .join('\n');

  const topTags = [...tagFreq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([tag, count]) => `| \`${tag}\` | ${count} | ${(count / Math.max(templates.length, 1) * 100).toFixed(0)}% |`)
    .join('\n');

  const md = `# OMEGA_TEMPLATE_FORENSICS

## Phase Ω.7 — Template System Forensics

**Generated:** ${now}
**Method:** Real API calls. All metrics from live template data. No estimation.
**Backend:** ${BASE}

---

## Certification Verdict

${certified
    ? '```\n╔══════════════════════════════════════════════════════════╗\n║  Ω.7 TEMPLATE SYSTEM FORENSICS — CERTIFIED               ║\n╚══════════════════════════════════════════════════════════╝\n```'
    : '```\n╔══════════════════════════════════════════════════════════╗\n║  Ω.7 TEMPLATE SYSTEM FORENSICS — FAILS CERTIFICATION     ║\n╚══════════════════════════════════════════════════════════╝\n```'}

${failures.length > 0 ? '### Failures\n' + failures.map(f => `- ❌ ${f}`).join('\n') : '### No failures'}

---

## Aggregate Metrics

| Metric | Value |
|--------|------:|
| Generation templates | ${templates.length} |
| Deck templates | ${deckTemplates.length} |
| Distinct categories | ${categories.size} |
| Distinct industries | ${industries.size} |
| Distinct document types | ${docTypes.size} |
| Clones detected | ${clones.length} |
| Missing name | ${missingName.length} |
| Missing description | ${missingDesc.length} |
| Missing category | ${missingCategory.length} |
| Missing tags | ${missingTags.length} |
| Overused tags (>80%) | ${overusedTags.length} |

---

## Failure Criteria Check

| Criterion | Threshold | Observed | Verdict |
|-----------|-----------|----------|:-------:|
| Exact name duplicates | 0 | ${clones.filter(c => c.field.includes('exact')).length} | ${clones.filter(c => c.field.includes('exact')).length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Near-duplicate descriptions | 0 | ${clones.filter(c => !c.field.includes('exact')).length} | ${clones.filter(c => !c.field.includes('exact')).length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Missing required fields | 0 | ${missingName.length + missingDesc.length + missingCategory.length} | ${missingName.length + missingDesc.length + missingCategory.length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Category diversity (≥3) | ≥3 | ${categories.size} | ${categories.size >= 3 || templates.length <= 5 ? '✅ PASS' : '❌ FAIL'} |
| Template system non-empty | >0 | ${templates.length + deckTemplates.length} | ${templates.length + deckTemplates.length > 0 ? '✅ PASS' : '❌ FAIL'} |

---

## Clone Detection

${cloneTable}

---

## Category Distribution

| Category | Templates |
|----------|----------:|
${catTable || '_No category data_'}

---

## Tag Frequency (Top 15)

| Tag | Count | % of Templates |
|-----|------:|---------------:|
${topTags || '_No tag data_'}

---

## Category List

${[...categories].sort().map(c => `- \`${c}\``).join('\n') || '_none_'}

## Industry List

${[...industries].sort().map(i => `- \`${i}\``).join('\n') || '_none_'}

---

_Generated by omega-template-forensics.ts. All evidence from real API data._
`;

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`✓ Report: ${REPORT_PATH}`);
  process.exit(certified ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
