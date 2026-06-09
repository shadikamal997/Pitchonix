/**
 * Phase Ω.4 — E2E: ATS Analysis
 *
 * Tests:
 *  1. POST /career/ats/analyze → 201, returns overallScore
 *  2. Score is in 0-100 range
 *  3. Response has breakdown, recommendations, risks, strengths
 *  4. ATS analysis completes in < 2 000 ms (performance gate)
 *  5. POST /career/ats/analyze-profile (public) → 201
 *  6. Missing documentId → 400
 *  7. Wrong document owner → 404
 *  8. ATS analysis without job description returns baseline score
 *  9. ATS analysis with job description updates keywords score
 */

import { auth, closeSession, createSession, TestSession } from './helpers';

describe('Career ATS Analysis (E2E)', () => {
  let s: TestSession;
  let docId: string;

  beforeAll(async () => {
    s = await createSession('ats');
    const doc = await s.req
      .post('/career/documents')
      .set(auth(s.token))
      .send({ doctype: 'cv', title: 'ATS Test CV' });
    docId = doc.body.id;
  }, 60_000);

  afterAll(async () => {
    await s.req.delete(`/career/documents/${docId}`).set(auth(s.token));
    await closeSession(s);
  });

  // ── 1. Basic ATS analyze ──────────────────────────────────────────────────
  it('POST /career/ats/analyze → 201, overallScore present', async () => {
    const res = await s.req
      .post('/career/ats/analyze')
      .set(auth(s.token))
      .send({ documentId: docId })
      .expect(201);
    expect(typeof res.body.overallScore).toBe('number');
  });

  // ── 2. Score range ────────────────────────────────────────────────────────
  it('overallScore is between 0 and 100', async () => {
    const res = await s.req
      .post('/career/ats/analyze')
      .set(auth(s.token))
      .send({ documentId: docId });
    expect(res.body.overallScore).toBeGreaterThanOrEqual(0);
    expect(res.body.overallScore).toBeLessThanOrEqual(100);
  });

  // ── 3. Response shape ─────────────────────────────────────────────────────
  it('Response has breakdown, recommendations, risks, strengths', async () => {
    const res = await s.req
      .post('/career/ats/analyze')
      .set(auth(s.token))
      .send({ documentId: docId });
    expect(res.body.breakdown).toBeDefined();
    expect(Array.isArray(res.body.recommendations)).toBe(true);
    expect(Array.isArray(res.body.risks)).toBe(true);
    expect(Array.isArray(res.body.strengths)).toBe(true);
  });

  // ── 4. Performance gate: ATS < 2 000 ms ──────────────────────────────────
  it('ATS analysis completes in under 2 000 ms', async () => {
    const start = Date.now();
    await s.req.post('/career/ats/analyze').set(auth(s.token)).send({ documentId: docId });
    expect(Date.now() - start).toBeLessThan(2_000);
  });

  // ── 5. Public profile endpoint ────────────────────────────────────────────
  it('POST /career/ats/analyze-profile → 201 (public endpoint)', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    const res = await s.req
      .post('/career/ats/analyze-profile')
      .send({ profile: profile.body })
      .expect(201);
    expect(typeof res.body.overallScore).toBe('number');
  });

  // ── 6. Missing documentId → 400 ──────────────────────────────────────────
  it('Missing documentId → 400', async () => {
    await s.req.post('/career/ats/analyze').set(auth(s.token)).send({}).expect(400);
  });

  // ── 7. Wrong document owner → 404 ────────────────────────────────────────
  it("ATS with another user's documentId → 404", async () => {
    const s2 = await createSession('ats-other');
    try {
      const doc2 = await s.req
        .post('/career/documents')
        .set(auth(s.token))
        .send({ doctype: 'cv', title: 'Private ATS Doc' });
      await s.req
        .post('/career/ats/analyze')
        .set(auth(s2.token))
        .send({ documentId: doc2.body.id })
        .expect(404);
      await s.req.delete(`/career/documents/${doc2.body.id}`).set(auth(s.token));
    } finally {
      await closeSession(s2);
    }
  });

  // ── 8. Baseline score without job description ─────────────────────────────
  it('Without jobDescription → returns baseline score', async () => {
    const res = await s.req
      .post('/career/ats/analyze')
      .set(auth(s.token))
      .send({ documentId: docId });
    expect(res.body.overallScore).toBeGreaterThan(0);
  });

  // ── 9. With job description → keywords score present ─────────────────────
  it('With jobDescription → keywords breakdown is populated', async () => {
    const res = await s.req.post('/career/ats/analyze').set(auth(s.token)).send({
      documentId: docId,
      jobDescription: 'We need a senior software engineer with TypeScript and React experience.',
    });
    expect(res.body.breakdown?.keywords).toBeDefined();
  });
});
