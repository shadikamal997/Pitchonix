/**
 * Pitchonix k6 Export Stress Test
 * ============================================================
 * Tests export workloads: PDF, PPTX, and batch export jobs.
 *
 * Usage:
 *   k6 run --vus 20 --duration 120s k6-export-stress.js
 *
 * Environment:
 *   BASE_URL        — staging API base URL
 *   TEST_DECK_ID    — ID of a pre-seeded, export-ready deck
 *   TEST_USER_TOKEN — JWT for the deck owner
 *
 * Status: BLOCKED BY ENVIRONMENT — requires running staging app.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const exportLatencyPptx = new Trend('export_latency_pptx_ms', true);
const exportLatencyPdf  = new Trend('export_latency_pdf_ms', true);
const batchJobLatency   = new Trend('batch_job_latency_ms', true);
const exportErrors      = new Counter('export_errors');

export const options = {
  thresholds: {
    http_req_failed:       ['rate<0.01'],
    export_latency_pptx_ms: ['p(95)<15000'],
    export_latency_pdf_ms:  ['p(95)<20000'],
    batch_job_latency_ms:   ['p(95)<60000'],
  },
  scenarios: {
    export_stress: {
      executor: 'constant-vus',
      vus: 20,
      duration: '120s',
    },
  },
};

const _EBASE = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const BASE_URL = _EBASE.endsWith('/api') ? _EBASE : `${_EBASE}/api`;
const DECK_ID   = __ENV.TEST_DECK_ID   || '';
const TOKEN     = __ENV.TEST_USER_TOKEN || '';

const auth = { Authorization: `Bearer ${TOKEN}` };

function post(url, body) {
  return http.post(`${BASE_URL}${url}`, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...auth },
    timeout: '120s',
  });
}

export default function () {
  // ── PPTX export ─────────────────────────────────────────────────────────
  const t0 = Date.now();
  const pptxRes = post('/export/pptx', { deckId: DECK_ID, format: 'pptx' });
  exportLatencyPptx.add(Date.now() - t0);

  if (!check(pptxRes, { 'pptx 2xx': (r) => r.status >= 200 && r.status < 300 })) {
    exportErrors.add(1);
  }

  sleep(2);

  // ── PDF export ───────────────────────────────────────────────────────────
  const t1 = Date.now();
  const pdfRes = post('/export/pdf', { deckId: DECK_ID, format: 'pdf' });
  exportLatencyPdf.add(Date.now() - t1);

  if (!check(pdfRes, { 'pdf 2xx': (r) => r.status >= 200 && r.status < 300 })) {
    exportErrors.add(1);
  }

  sleep(2);

  // ── Batch export (2 decks) ───────────────────────────────────────────────
  const t2 = Date.now();
  const batchRes = post('/export/batch', {
    deckIds: [DECK_ID],
    format: 'pptx',
    options: { merge: false },
  });
  batchJobLatency.add(Date.now() - t2);

  check(batchRes, {
    'batch create 201': (r) => r.status === 201 || r.status === 200,
    'batch has jobId':  (r) => !!JSON.parse(r.body ?? '{}')?.id,
  });

  sleep(5);
}
