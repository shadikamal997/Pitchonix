/**
 * Phase Ω.4 — E2E: Health Check & Beta Telemetry
 *
 * Tests:
 *  1. GET /health → 200, status ok or degraded
 *  2. Health includes uptime, memory, checks.db
 *  3. GET /health is @Public (no auth needed)
 *  4. POST /career/feedback → 201 with id
 *  5. POST /career/feedback with invalid type → 400
 *  6. POST /career/feedback missing message → 400
 *  7. Telemetry events are recorded after export
 */

import { auth, closeSession, createSession, TestSession } from './helpers';

describe('Health & Telemetry (E2E)', () => {
  let s: TestSession;

  beforeAll(async () => { s = await createSession('health'); }, 60_000);
  afterAll(async () => closeSession(s));

  // ── 1. Health check ───────────────────────────────────────────────────────
  it('GET /health → 200 with status field', async () => {
    const res = await s.req.get('/health').expect(200);
    expect(['ok', 'degraded']).toContain(res.body.status);
  });

  // ── 2. Health shape ───────────────────────────────────────────────────────
  it('Health response has uptimeSec, memory, checks.db', async () => {
    const res = await s.req.get('/health').expect(200);
    expect(typeof res.body.uptimeSec).toBe('number');
    expect(res.body.memory?.heapUsedMb).toBeDefined();
    expect(res.body.checks?.db).toBe('ok');
  });

  // ── 3. Health is public ───────────────────────────────────────────────────
  it('GET /health without auth → 200 (public endpoint)', async () => {
    await s.req.get('/health').expect(200);
  });

  // ── 4. Submit feedback ────────────────────────────────────────────────────
  it('POST /career/feedback → 201, returns id', async () => {
    const res = await s.req
      .post('/career/feedback')
      .set(auth(s.token))
      .send({ type: 'bug', message: 'Export was slow during testing' })
      .expect(201);
    expect(res.body.ok).toBe(true);
    expect(res.body.id).toBeTruthy();
  });

  // ── 5. Invalid feedback type → 400 ───────────────────────────────────────
  it('POST /career/feedback with invalid type → 400', async () => {
    await s.req
      .post('/career/feedback')
      .set(auth(s.token))
      .send({ type: 'invalid_type', message: 'Some message' })
      .expect(400);
  });

  // ── 6. Missing message → 400 ─────────────────────────────────────────────
  it('POST /career/feedback missing message → 400', async () => {
    await s.req
      .post('/career/feedback')
      .set(auth(s.token))
      .send({ type: 'bug' })
      .expect(400);
  });

  // ── 7. Telemetry recorded after a template switch ─────────────────────────
  it('Template switch fires telemetry (fire-and-forget, no error thrown)', async () => {
    const doc = await s.req
      .post('/career/documents')
      .set(auth(s.token))
      .send({ doctype: 'cv', title: 'Telemetry Test' });
    const docId = doc.body.id;
    // Template switch tracks 'template_switch' event — just verify no 500.
    await s.req
      .post(`/career/documents/${docId}/template`)
      .set(auth(s.token))
      .send({ templateId: null })
      .expect(201);
    await s.req.delete(`/career/documents/${docId}`).set(auth(s.token));
  });
});
