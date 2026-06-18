/**
 * Pitchonix k6 Load Test Suite
 * ============================================================
 * Usage:
 *   k6 run --vus 100  --duration 60s k6-pitchonix.js   # 100-user test
 *   k6 run --vus 1000 --duration 60s k6-pitchonix.js   # 1k-user test
 *   k6 run --vus 5000 --duration 30s k6-pitchonix.js   # 5k-user spike
 *
 * Environment variables (set via -e or .env file):
 *   BASE_URL          — e.g. https://api.staging.pitchonix.com  (required)
 *   TEST_USER_EMAIL   — seeded test user email (required)
 *   TEST_USER_PASS    — seeded test user password (required)
 *
 * Pass criteria (evaluated by thresholds below):
 *   http_req_failed   < 1%
 *   http_req_duration p(95) < 2000ms (core APIs)
 *   http_req_duration p(99) < 5000ms
 *
 * IMPORTANT: This script must be run against a dedicated staging environment,
 *   NOT production. All deck/project IDs created are cleaned up at the end of
 *   each VU iteration.
 *
 * Status: BLOCKED BY ENVIRONMENT — requires a deployed staging app, k6 binary
 *   (https://k6.io/docs/get-started/installation/), and seeded test users.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate, Trend } from 'k6/metrics';

// Read the seed PNG once in init context (k6 v2 requires open() for binary files)
const SEED_PNG = open('./seed.png', 'b');

// ── Custom metrics ────────────────────────────────────────────────────────────
const loginErrors    = new Counter('login_errors');
const exportErrors   = new Counter('export_errors');
const projectErrors  = new Counter('project_errors');
const exportLatency  = new Trend('export_latency_ms', true);
const dashboardLatency = new Trend('dashboard_latency_ms', true);

// ── Options / thresholds ──────────────────────────────────────────────────────
export const options = {
  thresholds: {
    http_req_failed:   ['rate<0.01'],          // < 1% error rate
    http_req_duration: ['p(95)<2000', 'p(99)<5000'],
    export_latency_ms: ['p(95)<10000'],        // export jobs < 10 s p95
    dashboard_latency_ms: ['p(95)<2000'],      // dashboard < 2 s p95 (local dev; staging target is 1 s)
  },
  scenarios: {
    load_100: {
      executor: 'constant-vus',
      vus: 100,
      duration: '60s',
      tags: { scenario: 'load_100' },
    },
  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────
// BASE_URL should NOT include a trailing path prefix — the /api prefix is
// appended below so staging URLs (https://api.staging.pitchonix.com) work unchanged.
const _BASE = (__ENV.BASE_URL || 'http://localhost:4000').replace(/\/$/, '');
const BASE_URL = _BASE.endsWith('/api') ? _BASE : `${_BASE}/api`;
const TEST_EMAIL = __ENV.TEST_USER_EMAIL || 'loadtest@pitchonix.local';
const TEST_PASS  = __ENV.TEST_USER_PASS  || 'LoadTest$ecure1!';

function post(url, body, headers = {}) {
  return http.post(`${BASE_URL}${url}`, JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function get(url, headers = {}) {
  return http.get(`${BASE_URL}${url}`, { headers });
}

function authHeader(token) {
  return { Authorization: `Bearer ${token}` };
}

// ── Per-VU token cache ────────────────────────────────────────────────────────
// Each VU has its own copy of this variable (k6 VU isolation). Login once per
// VU lifetime to avoid hammering the auth endpoint on every iteration and
// triggering per-IP rate limits.
let _vuToken = null;

function ensureToken() {
  if (_vuToken) return _vuToken;
  const loginRes = post('/auth/login', { email: TEST_EMAIL, password: TEST_PASS });
  const loginOk = check(loginRes, {
    'login 2xx': (r) => r.status >= 200 && r.status < 300,
    'login returns token': (r) => !!(JSON.parse(r.body)?.token || JSON.parse(r.body)?.access_token),
  });
  if (!loginOk) { loginErrors.add(1); return null; }
  _vuToken = JSON.parse(loginRes.body).token || JSON.parse(loginRes.body).access_token;
  return _vuToken;
}

// ── VU lifecycle ──────────────────────────────────────────────────────────────

export default function () {
  // ── 1. Login (cached per VU) ──────────────────────────────────────────────
  const token = ensureToken();
  if (!token) return;
  const auth = authHeader(token);

  // ── 2. Dashboard load ─────────────────────────────────────────────────────
  const t0 = Date.now();
  const dashRes = get('/projects?limit=20', auth);
  dashboardLatency.add(Date.now() - t0);

  check(dashRes, {
    'dashboard 200': (r) => r.status === 200,
  });

  // ── 3. Create project ─────────────────────────────────────────────────────
  const createRes = post(
    '/projects',
    {
      name: `Load Test Project ${Date.now()}`,
      documentType: 'pitch_deck',
      industry: 'Technology',
    },
    auth,
  );

  const createOk = check(createRes, {
    'create project 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  if (!createOk) {
    projectErrors.add(1);
    return;
  }

  const projectId = JSON.parse(createRes.body)?.id;
  if (!projectId) { projectErrors.add(1); return; }

  // ── 4. Save project (update) ──────────────────────────────────────────────
  const updateRes = http.patch(
    `${BASE_URL}/projects/${projectId}`,
    JSON.stringify({ description: 'Updated by load test' }),
    { headers: { 'Content-Type': 'application/json', ...auth } },
  );

  check(updateRes, {
    'update project 200': (r) => r.status === 200,
  });

  // ── 5. Upload the seed PNG (read via open() in init context) ────────────────
  const uploadRes = http.post(
    `${BASE_URL}/upload/image`,
    { file: http.file(SEED_PNG, 'test.png', 'image/png') },
    { headers: auth },
  );

  const uploadBody = JSON.parse(uploadRes.body ?? '{}');
  const uploadFilename = uploadBody?.filename ?? uploadBody?.url ?? null;

  check(uploadRes, {
    'upload 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // ── 6. Billing usage check ────────────────────────────────────────────────
  const usageRes = get('/billing/usage', auth);
  check(usageRes, {
    'billing usage 2xx': (r) => r.status >= 200 && r.status < 300,
  });

  // ── 7. Cleanup — delete upload and project ────────────────────────────────
  if (uploadFilename) {
    // uploadFilename may be a UUID filename or a full /uploads/<uuid> path
    const fname = uploadFilename.split('/').pop();
    http.del(`${BASE_URL}/upload/${fname}`, null, { headers: auth });
  }
  http.del(`${BASE_URL}/projects/${projectId}`, null, { headers: auth });

  sleep(1);
}

// ── Thresholds for 1k / 5k variants (run separately) ─────────────────────────
export const options1k = {
  thresholds: options.thresholds,
  scenarios: {
    load_1000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 1000 },
        { duration: '60s', target: 1000 },
        { duration: '30s', target: 0 },
      ],
      tags: { scenario: 'load_1000' },
    },
  },
};

export const options5k = {
  thresholds: {
    http_req_failed:   ['rate<0.05'],          // 5% allowed at spike
    http_req_duration: ['p(95)<5000', 'p(99)<10000'],
  },
  scenarios: {
    spike_5000: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '15s', target: 5000 },
        { duration: '30s', target: 5000 },
        { duration: '15s', target: 0 },
      ],
      tags: { scenario: 'spike_5000' },
    },
  },
};
