/**
 * Phase Ω.4 — Multi-user concurrency load test.
 *
 * Simulates 50 concurrent operations across uploads, exports, and ATS analyses.
 * Run with: npx ts-node scripts/concurrency-load-test.ts
 *
 * Environment variables:
 *   BASE_URL   — API base (default http://localhost:3000/api)
 *   TOKEN      — JWT for an existing user (required)
 *   DOC_ID     — existing document ID for export/ATS tests (required)
 *   CONCURRENCY — workers per scenario (default 20)
 *   SCENARIOS   — comma-separated list: ats,export,template_switch (default all)
 */

import * as https from 'https';
import * as http  from 'http';

const BASE_URL   = process.env.BASE_URL   || 'http://localhost:3000/api';
const TOKEN      = process.env.TOKEN;
const DOC_ID     = process.env.DOC_ID;
const CONCURRENCY = Number(process.env.CONCURRENCY || 20);
const SCENARIOS  = (process.env.SCENARIOS || 'ats,export_html,template_switch').split(',');

interface Result { ok: boolean; ms: number; status?: number; error?: string }

// ---------------------------------------------------------------------------
//  Minimal HTTP client (no axios dependency in scripts context)
// ---------------------------------------------------------------------------

function apiFetch(method: string, path: string, body?: any): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const url   = new URL(BASE_URL + path);
    const mod   = url.protocol === 'https:' ? https : http;
    const json  = body ? JSON.stringify(body) : undefined;
    const req   = mod.request({
      hostname: url.hostname,
      port:     url.port || (url.protocol === 'https:' ? 443 : 80),
      path:     url.pathname + url.search,
      method,
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${TOKEN}`,
        ...(json ? { 'Content-Length': Buffer.byteLength(json) } : {}),
      },
    }, (res) => {
      let raw = '';
      res.on('data', (c) => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode!, data: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode!, data: raw }); }
      });
    });
    req.on('error', reject);
    if (json) req.write(json);
    req.end();
  });
}

async function runOne(label: string, fn: () => Promise<void>): Promise<Result> {
  const t0 = Date.now();
  try {
    await fn();
    return { ok: true, ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.message || String(e) };
  }
}

// ---------------------------------------------------------------------------
//  Scenarios
// ---------------------------------------------------------------------------

async function scenarioAts(): Promise<void> {
  const r = await apiFetch('POST', '/career/ats/analyze', { documentId: DOC_ID });
  if (r.status >= 400) throw new Error(`ATS returned ${r.status}`);
}

async function scenarioExportHtml(): Promise<void> {
  const r = await apiFetch('POST', `/career/documents/${DOC_ID}/export?format=html`, {});
  if (r.status >= 400) throw new Error(`Export returned ${r.status}`);
}

async function scenarioTemplateSwitch(): Promise<void> {
  const r = await apiFetch('POST', `/career/documents/${DOC_ID}/template`, { templateId: null });
  if (r.status >= 400) throw new Error(`Template switch returned ${r.status}`);
}

const SCENARIO_FNS: Record<string, () => Promise<void>> = {
  ats:             scenarioAts,
  export_html:     scenarioExportHtml,
  template_switch: scenarioTemplateSwitch,
};

// ---------------------------------------------------------------------------
//  Runner
// ---------------------------------------------------------------------------

function stats(results: Result[]): void {
  const ok    = results.filter(r => r.ok);
  const fails = results.filter(r => !r.ok);
  const times = ok.map(r => r.ms).sort((a, b) => a - b);
  const p50   = times[Math.floor(times.length * 0.5)] ?? 0;
  const p95   = times[Math.floor(times.length * 0.95)] ?? 0;
  const p99   = times[Math.floor(times.length * 0.99)] ?? 0;
  const avg   = times.length ? Math.round(times.reduce((s, n) => s + n, 0) / times.length) : 0;
  console.log(`  ✓ ${ok.length}  ✗ ${fails.length}  avg=${avg}ms  p50=${p50}ms  p95=${p95}ms  p99=${p99}ms`);
  if (fails.length) {
    console.log(`  Errors: ${[...new Set(fails.map(r => r.error))].join(' | ')}`);
  }
}

async function runScenario(name: string, fn: () => Promise<void>): Promise<void> {
  console.log(`\n▶  ${name}  (${CONCURRENCY} concurrent)`);
  const batch: Promise<Result>[] = [];
  for (let i = 0; i < CONCURRENCY; i++) {
    batch.push(runOne(name, fn));
  }
  const results = await Promise.all(batch);
  stats(results);
}

async function main(): Promise<void> {
  if (!TOKEN) { console.error('Set TOKEN env var'); process.exit(1); }
  if (!DOC_ID) { console.error('Set DOC_ID env var'); process.exit(1); }

  console.log(`\nPitchonix Concurrency Load Test — ${new Date().toISOString()}`);
  console.log(`Base: ${BASE_URL}  Concurrency: ${CONCURRENCY}  Scenarios: ${SCENARIOS.join(', ')}\n`);

  for (const scenario of SCENARIOS) {
    const fn = SCENARIO_FNS[scenario.trim()];
    if (!fn) { console.warn(`Unknown scenario "${scenario}"`); continue; }
    await runScenario(scenario, fn);
  }

  console.log('\nLoad test complete.\n');
}

main().catch(e => { console.error(e); process.exit(1); });
