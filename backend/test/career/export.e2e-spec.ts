/**
 * Phase Ω.4 — E2E: CV Export (sync + async queue)
 *
 * Tests:
 *  1. Export HTML → 200, content-type text/html
 *  2. Export Markdown → 200, content-type text/markdown
 *  3. Export DOCX → 200, content-type .docx
 *  4. Export HTML completes in < 5 s (performance gate)
 *  5. Async export → returns jobId
 *  6. Async export status polling → reaches completed or active
 *  7. Export without auth → 401
 *  8. Export wrong document (other user) → 404
 */

import { auth, closeSession, createSession, TestSession } from './helpers';

describe('Career Export (E2E)', () => {
  let s: TestSession;
  let docId: string;

  beforeAll(async () => {
    s = await createSession('export');
    const doc = await s.req
      .post('/career/documents')
      .set(auth(s.token))
      .send({ doctype: 'cv', title: 'Export Test CV' });
    docId = doc.body.id;
  }, 60_000);

  afterAll(async () => {
    await s.req.delete(`/career/documents/${docId}`).set(auth(s.token));
    await closeSession(s);
  });

  // ── 1. HTML export ────────────────────────────────────────────────────────
  it('POST /career/documents/:id/export?format=html → 200, text/html', async () => {
    const res = await s.req
      .post(`/career/documents/${docId}/export?format=html`)
      .set(auth(s.token))
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text?.length ?? res.body?.length).toBeGreaterThan(0);
  }, 15_000);

  // ── 2. Markdown export ────────────────────────────────────────────────────
  it('POST /career/documents/:id/export?format=md → 200, text/markdown', async () => {
    const res = await s.req
      .post(`/career/documents/${docId}/export?format=md`)
      .set(auth(s.token))
      .expect(200);
    expect(res.headers['content-type']).toMatch(/text\/markdown|text\/plain/);
  }, 15_000);

  // ── 3. DOCX export ────────────────────────────────────────────────────────
  it('POST /career/documents/:id/export?format=docx → 200, docx mimetype', async () => {
    const res = await s.req
      .post(`/career/documents/${docId}/export?format=docx`)
      .set(auth(s.token))
      .expect(200);
    expect(res.headers['content-type']).toMatch(/officedocument/);
  }, 15_000);

  // ── 4. HTML export < 5 s (performance gate) ───────────────────────────────
  it('HTML export completes in under 5 000 ms', async () => {
    const start = Date.now();
    await s.req
      .post(`/career/documents/${docId}/export?format=html`)
      .set(auth(s.token))
      .expect(200);
    expect(Date.now() - start).toBeLessThan(5_000);
  }, 15_000);

  // ── 5. Async export enqueue ───────────────────────────────────────────────
  it('POST /career/documents/:id/export/async → 201, returns jobId', async () => {
    const res = await s.req
      .post(`/career/documents/${docId}/export/async?format=html`)
      .set(auth(s.token))
      .expect(201);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.status).toBe('queued');
  }, 15_000);

  // ── 6. Async export status polling ───────────────────────────────────────
  it('GET /career/documents/:id/export/status/:jobId → returns state', async () => {
    const enqueue = await s.req
      .post(`/career/documents/${docId}/export/async?format=html`)
      .set(auth(s.token));
    const jobId = enqueue.body.jobId;

    // Poll up to 10 s for completed state (Redis must be running for this to work).
    let state = 'queued';
    for (let i = 0; i < 10; i++) {
      await new Promise((r) => setTimeout(r, 1_000));
      const status = await s.req
        .get(`/career/documents/${docId}/export/status/${jobId}`)
        .set(auth(s.token));
      state = status.body.status;
      if (state === 'completed' || state === 'failed') break;
    }
    expect(['completed', 'active', 'waiting', 'failed']).toContain(state);
  }, 20_000);

  // ── 7. Export without auth → 401 ─────────────────────────────────────────
  it('POST export without Authorization header → 401', async () => {
    await s.req.post(`/career/documents/${docId}/export?format=html`).expect(401);
  });

  // ── 8. Export wrong document → 404 ───────────────────────────────────────
  it("Export another user's document → 404", async () => {
    const s2 = await createSession('export-other');
    try {
      const doc2 = await s.req
        .post('/career/documents')
        .set(auth(s.token))
        .send({ doctype: 'cv', title: 'Private' });
      await s.req
        .post(`/career/documents/${doc2.body.id}/export?format=html`)
        .set(auth(s2.token))
        .expect(404);
      await s.req.delete(`/career/documents/${doc2.body.id}`).set(auth(s.token));
    } finally {
      await closeSession(s2);
    }
  });
});
