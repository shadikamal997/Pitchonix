/**
 * Phase Ω.8 — Security & Tenant Isolation Forensics
 *
 * Zero-trust security certification. Proves isolation holds via real API calls.
 * Every test either:
 *   PASS — unauthorized request was correctly rejected (4xx)
 *   FAIL — unauthorized request succeeded (data leak or write accepted)
 *
 * Failure criteria: ANY unauthorized access succeeds → FAIL
 */

import * as fs from 'fs';
import * as path from 'path';

const BASE = 'http://localhost:4000/api';
const REPORT_PATH = path.join(__dirname, '../../OMEGA_SECURITY_FORENSICS.md');

interface TestResult {
  id: string;
  description: string;
  category: string;
  status: 'PASS' | 'FAIL' | 'ERROR';
  expected: string;
  actual: string;
  httpStatus?: number;
  critical: boolean;
}

const results: TestResult[] = [];

async function apiPost(url: string, body: any, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method: 'POST', headers, body: JSON.stringify(body) });
  let bodyData: any;
  try { bodyData = await res.json(); } catch { bodyData = null; }
  return { status: res.status, body: bodyData };
}

async function apiGet(url: string, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method: 'GET', headers });
  let bodyData: any;
  try { bodyData = await res.json(); } catch { bodyData = null; }
  return { status: res.status, body: bodyData };
}

async function apiPatch(url: string, body: any, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method: 'PATCH', headers, body: JSON.stringify(body) });
  let bodyData: any;
  try { bodyData = await res.json(); } catch { bodyData = null; }
  return { status: res.status, body: bodyData };
}

async function apiDelete(url: string, token?: string): Promise<{ status: number; body: any }> {
  const headers: Record<string, string> = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${url}`, { method: 'DELETE', headers });
  let bodyData: any;
  try { bodyData = await res.json(); } catch { bodyData = null; }
  return { status: res.status, body: bodyData };
}

function record(result: TestResult) {
  results.push(result);
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⚠️';
  console.log(`  ${icon} [${result.id}] ${result.description} — HTTP ${result.httpStatus ?? '?'} (${result.status})`);
}

async function registerUser(email: string, password: string): Promise<string | null> {
  const res = await apiPost('/auth/register', { email, password, name: email.split('@')[0] });
  if (res.status === 201 || res.status === 200) return res.body?.token ?? res.body?.accessToken ?? null;
  // Try login if already exists
  const loginRes = await apiPost('/auth/login', { email, password });
  return loginRes.body?.token ?? loginRes.body?.accessToken ?? null;
}

async function main() {
  console.log('Phase Ω.8 — Security & Tenant Isolation Forensics');
  console.log(`Backend: ${BASE}`);
  console.log('');

  const ts = Date.now();
  const emailA = `sec-user-a-${ts}@example.com`;
  const emailB = `sec-user-b-${ts}@example.com`;
  const pw = 'TestPass123!';

  // ── Setup: register two isolated users ──────────────────────────────────────
  console.log('[setup] Registering test users...');
  const tokenA = await registerUser(emailA, pw);
  const tokenB = await registerUser(emailB, pw);
  if (!tokenA || !tokenB) {
    console.error('✗ Could not register test users — aborting');
    process.exit(1);
  }
  console.log('✓ User A and User B registered');

  // ── User A: create a workspace first (so project auto-links to it) ─────────
  console.log('[setup] User A creating workspace...');
  const wsRes = await apiPost('/workspaces', { name: 'WS A', slug: `ws-a-${ts}` }, tokenA);
  const workspaceId = wsRes.body?.id;
  console.log(`✓ User A owns workspace ${workspaceId ?? '(none)'}`);

  // ── User A: create a project and deck ───────────────────────────────────────
  console.log('[setup] User A creating project + deck...');
  const projRes = await apiPost('/projects', { name: 'SecurityTest Project A', documentType: 'pitch_deck' }, tokenA);
  const projectId = projRes.body?.id;
  if (!projectId) { console.error('✗ Failed to create project for User A'); process.exit(1); }

  const deckRes = await apiPost(`/decks/project/${projectId}`, { title: 'Deck A' }, tokenA);
  const deckId = deckRes.body?.id;
  if (!deckId) { console.error('✗ Failed to create deck for User A'); process.exit(1); }
  console.log(`✓ User A owns project ${projectId}, deck ${deckId}`);

  // ── User B: create their own project ─────────────────────────────────────────
  const projBRes = await apiPost('/projects', { name: 'SecurityTest Project B', documentType: 'pitch_deck' }, tokenB);
  const projectBId = projBRes.body?.id;

  console.log('');
  console.log('─── CATEGORY 1: Cross-Tenant Document Reads ───────────────────────');

  // T1.1 — User B tries to GET User A's deck
  {
    const r = await apiGet(`/decks/${deckId}`, tokenB);
    const blocked = r.status === 403 || r.status === 404 || r.status === 401;
    record({
      id: 'T1.1', category: 'cross-tenant-read', critical: true,
      description: `User B reads User A's deck (GET /decks/${deckId})`,
      expected: '403 or 404', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T1.2 — User B tries to GET User A's project
  {
    const r = await apiGet(`/projects/${projectId}`, tokenB);
    const blocked = r.status === 403 || r.status === 404 || r.status === 401;
    record({
      id: 'T1.2', category: 'cross-tenant-read', critical: true,
      description: `User B reads User A's project (GET /projects/${projectId})`,
      expected: '403 or 404', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T1.3 — No token tries to read deck
  {
    const r = await apiGet(`/decks/${deckId}`);
    const blocked = r.status === 401 || r.status === 403;
    record({
      id: 'T1.3', category: 'cross-tenant-read', critical: true,
      description: 'Unauthenticated request to GET deck',
      expected: '401', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T1.4 — No token tries to read project
  {
    const r = await apiGet(`/projects/${projectId}`);
    const blocked = r.status === 401 || r.status === 403;
    record({
      id: 'T1.4', category: 'cross-tenant-read', critical: true,
      description: 'Unauthenticated request to GET project',
      expected: '401', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  console.log('');
  console.log('─── CATEGORY 2: Cross-Tenant Writes ───────────────────────────────');

  // T2.1 — User B tries to PATCH User A's deck
  {
    const r = await apiPatch(`/decks/${deckId}`, { title: 'Hacked by B' }, tokenB);
    const blocked = r.status === 403 || r.status === 404 || r.status === 401;
    record({
      id: 'T2.1', category: 'cross-tenant-write', critical: true,
      description: `User B modifies User A's deck title`,
      expected: '403 or 404', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T2.2 — User B tries to DELETE User A's deck
  {
    const r = await apiDelete(`/decks/${deckId}`, tokenB);
    const blocked = r.status === 403 || r.status === 404 || r.status === 401;
    record({
      id: 'T2.2', category: 'cross-tenant-write', critical: true,
      description: `User B deletes User A's deck`,
      expected: '403 or 404', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T2.3 — User B tries to PATCH User A's project
  {
    const r = await apiPatch(`/projects/${projectId}`, { title: 'Hacked' }, tokenB);
    const blocked = r.status === 403 || r.status === 404 || r.status === 401;
    record({
      id: 'T2.3', category: 'cross-tenant-write', critical: true,
      description: `User B modifies User A's project`,
      expected: '403 or 404', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T2.4 — User B creates deck inside User A's project
  {
    const r = await apiPost(`/decks/project/${projectId}`, { title: 'Injected' }, tokenB);
    const blocked = r.status === 403 || r.status === 404 || r.status === 401;
    record({
      id: 'T2.4', category: 'cross-tenant-write', critical: true,
      description: `User B creates deck inside User A's project`,
      expected: '403 or 404', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  console.log('');
  console.log('─── CATEGORY 3: Privilege Escalation (Admin Bypass) ────────────────');

  // T3.1 — User B (non-admin) tries GET /admin/stats
  {
    const r = await apiGet('/admin/stats', tokenB);
    const blocked = r.status === 403 || r.status === 401;
    record({
      id: 'T3.1', category: 'privilege-escalation', critical: true,
      description: 'Non-admin user calls GET /admin/stats',
      expected: '403', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T3.2 — User B tries GET /admin/users
  {
    const r = await apiGet('/admin/users', tokenB);
    const blocked = r.status === 403 || r.status === 401;
    record({
      id: 'T3.2', category: 'privilege-escalation', critical: true,
      description: 'Non-admin user calls GET /admin/users (user enumeration)',
      expected: '403', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T3.3 — Unauthenticated calls admin stats
  {
    const r = await apiGet('/admin/stats');
    const blocked = r.status === 403 || r.status === 401;
    record({
      id: 'T3.3', category: 'privilege-escalation', critical: true,
      description: 'Unauthenticated request calls GET /admin/stats',
      expected: '401 or 403', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T3.4 — User B tries admin GDPR export for User A
  {
    // We use tokenA's ID — but we don't know it directly from here.
    // The test still works: user B (non-admin) accessing any /admin/users/:id/export-data
    // should be blocked purely by the admin guard.
    const r = await apiGet('/admin/users/nonexistent-id/export-data', tokenB);
    const blocked = r.status === 403 || r.status === 401;
    record({
      id: 'T3.4', category: 'privilege-escalation', critical: true,
      description: 'Non-admin user calls GDPR export endpoint',
      expected: '403', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  console.log('');
  console.log('─── CATEGORY 4: Workspace Isolation ────────────────────────────────');

  if (workspaceId) {
    // T4.1 — User B reads User A's workspace
    {
      const r = await apiGet(`/workspaces/${workspaceId}`, tokenB);
      const blocked = r.status === 403 || r.status === 404 || r.status === 401;
      record({
        id: 'T4.1', category: 'workspace-isolation', critical: true,
        description: `User B reads User A's workspace`,
        expected: '403 or 404', actual: `${r.status}`,
        httpStatus: r.status,
        status: blocked ? 'PASS' : 'FAIL',
      });
    }

    // T4.2 — User B tries to modify User A's workspace
    {
      const r = await apiPatch(`/workspaces/${workspaceId}`, { name: 'Hacked WS' }, tokenB);
      const blocked = r.status === 403 || r.status === 404 || r.status === 401;
      record({
        id: 'T4.2', category: 'workspace-isolation', critical: true,
        description: `User B modifies User A's workspace`,
        expected: '403 or 404', actual: `${r.status}`,
        httpStatus: r.status,
        status: blocked ? 'PASS' : 'FAIL',
      });
    }

    // T4.3 — User B reads workspace members of User A's workspace
    {
      const r = await apiGet(`/workspaces/${workspaceId}/members`, tokenB);
      const blocked = r.status === 403 || r.status === 404 || r.status === 401;
      record({
        id: 'T4.3', category: 'workspace-isolation', critical: true,
        description: `User B reads member list of User A's workspace`,
        expected: '403 or 404', actual: `${r.status}`,
        httpStatus: r.status,
        status: blocked ? 'PASS' : 'FAIL',
      });
    }

    // T4.4 — Unauthenticated reads workspace
    {
      const r = await apiGet(`/workspaces/${workspaceId}`);
      const blocked = r.status === 401 || r.status === 403;
      record({
        id: 'T4.4', category: 'workspace-isolation', critical: true,
        description: 'Unauthenticated request reads workspace',
        expected: '401', actual: `${r.status}`,
        httpStatus: r.status,
        status: blocked ? 'PASS' : 'FAIL',
      });
    }
  } else {
    record({
      id: 'T4.1', category: 'workspace-isolation', critical: false,
      description: 'Workspace isolation (workspace creation not available — skipped)',
      expected: 'N/A', actual: 'SKIPPED', status: 'ERROR',
    });
  }

  console.log('');
  console.log('─── CATEGORY 5: Token Integrity ─────────────────────────────────────');

  // T5.1 — Forged/invalid JWT
  {
    const r = await apiGet(`/decks/${deckId}`, 'forged.jwt.token');
    const blocked = r.status === 401 || r.status === 403;
    record({
      id: 'T5.1', category: 'token-integrity', critical: true,
      description: 'Forged JWT token rejected',
      expected: '401', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // T5.2 — Empty bearer token
  {
    const r = await apiGet(`/projects/${projectId}`, '');
    const blocked = r.status === 401 || r.status === 403;
    record({
      id: 'T5.2', category: 'token-integrity', critical: true,
      description: 'Empty bearer token rejected',
      expected: '401', actual: `${r.status}`,
      httpStatus: r.status,
      status: blocked ? 'PASS' : 'FAIL',
    });
  }

  // ── Compute verdict ──────────────────────────────────────────────────────────
  console.log('');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const errors = results.filter(r => r.status === 'ERROR').length;
  const criticalFails = results.filter(r => r.status === 'FAIL' && r.critical).length;
  const certified = criticalFails === 0;

  console.log('════════════════════════════════════════════════════════════════');
  if (certified) {
    console.log('  Ω.8 SECURITY & TENANT ISOLATION — CERTIFIED');
  } else {
    console.log('  Ω.8 SECURITY & TENANT ISOLATION — FAILS CERTIFICATION');
    console.log(`  ${criticalFails} critical security violation(s)`);
  }
  console.log('════════════════════════════════════════════════════════════════');

  // ── Generate report ──────────────────────────────────────────────────────────
  const now = new Date().toISOString();
  const rows = results.map(r =>
    `| ${r.id} | ${r.description} | ${r.expected} | ${r.actual} | ${r.status === 'PASS' ? '✅ PASS' : r.status === 'FAIL' ? '❌ FAIL' : '⚠️ ERROR'} |`,
  ).join('\n');

  const failDetails = results
    .filter(r => r.status === 'FAIL')
    .map(r => `### ❌ ${r.id} — ${r.description}\n- Expected: ${r.expected}\n- Actual: HTTP ${r.httpStatus}\n- Category: ${r.category}\n- **CRITICAL SECURITY VIOLATION**`)
    .join('\n\n');

  const md = `# OMEGA_SECURITY_FORENSICS

## Phase Ω.8 — Security & Tenant Isolation Forensics

**Generated:** ${now}
**Method:** Real API calls with two isolated test accounts. No mocking.
**Backend:** ${BASE}

---

## Certification Verdict

${certified
    ? '```\n╔══════════════════════════════════════════════════════════╗\n║  Ω.8 SECURITY & TENANT ISOLATION — CERTIFIED             ║\n╚══════════════════════════════════════════════════════════╝\n```'
    : '```\n╔══════════════════════════════════════════════════════════╗\n║  Ω.8 SECURITY & TENANT ISOLATION — FAILS CERTIFICATION   ║\n╚══════════════════════════════════════════════════════════╝\n```'}

| Metric | Value |
|--------|------:|
| Tests run | ${results.length} |
| PASS | ${passed} |
| FAIL | ${failed} |
| ERROR/SKIP | ${errors} |
| Critical failures | ${criticalFails} |

---

## Test Results

| ID | Description | Expected | Actual | Result |
|----|-------------|----------|--------|--------|
${rows}

---

## Failure Criteria Check

| Criterion | Threshold | Observed | Verdict |
|-----------|-----------|----------|:-------:|
| Unauthorized access blocked | 100% | ${criticalFails === 0 ? '100%' : `FAILED (${criticalFails} violations)`} | ${criticalFails === 0 ? '✅ PASS' : '❌ FAIL'} |
| Cross-tenant reads blocked | 0 leaks | ${results.filter(r => r.category === 'cross-tenant-read' && r.status === 'FAIL').length === 0 ? '0 leaks' : `${results.filter(r => r.category === 'cross-tenant-read' && r.status === 'FAIL').length} leaks`} | ${results.filter(r => r.category === 'cross-tenant-read' && r.status === 'FAIL').length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Cross-tenant writes blocked | 0 writes | ${results.filter(r => r.category === 'cross-tenant-write' && r.status === 'FAIL').length === 0 ? '0 writes' : `${results.filter(r => r.category === 'cross-tenant-write' && r.status === 'FAIL').length} writes`} | ${results.filter(r => r.category === 'cross-tenant-write' && r.status === 'FAIL').length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Admin endpoints protected | 100% | ${results.filter(r => r.category === 'privilege-escalation' && r.status === 'FAIL').length === 0 ? '100%' : 'FAILED'} | ${results.filter(r => r.category === 'privilege-escalation' && r.status === 'FAIL').length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Workspace isolation enforced | 100% | ${results.filter(r => r.category === 'workspace-isolation' && r.status === 'FAIL').length === 0 ? '100%' : 'FAILED'} | ${results.filter(r => r.category === 'workspace-isolation' && r.status === 'FAIL').length === 0 ? '✅ PASS' : '❌ FAIL'} |
| Token forgery rejected | 100% | ${results.filter(r => r.category === 'token-integrity' && r.status === 'FAIL').length === 0 ? '100%' : 'FAILED'} | ${results.filter(r => r.category === 'token-integrity' && r.status === 'FAIL').length === 0 ? '✅ PASS' : '❌ FAIL'} |

${failDetails ? `---\n\n## Critical Security Violations\n\n${failDetails}` : ''}

---

_Generated by omega-security-forensics.ts. All tests use real API calls against live backend._
`;

  fs.writeFileSync(REPORT_PATH, md, 'utf8');
  console.log(`✓ Report: ${REPORT_PATH}`);
  process.exit(certified ? 0 : 1);
}

main().catch(e => { console.error(e); process.exit(1); });
