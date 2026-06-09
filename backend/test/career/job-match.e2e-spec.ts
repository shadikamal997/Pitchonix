/**
 * Phase Ω.4 — E2E: Job Matching
 *
 * Tests:
 *  1. POST /career/ats/match-job → 201, score present
 *  2. Score is in 0-100 range
 *  3. Response has breakdown and recommendation
 *  4. Job match completes in < 2 000 ms (performance gate)
 *  5. Missing jobDescription → 400
 *  6. Missing documentId → 400
 *  7. Wrong document owner → 404
 *  8. POST /career/ats/match-job-profile (public) → 201
 *  9. Short job description still returns a result
 */

import { auth, closeSession, createSession, TestSession } from './helpers';

const JD_SAMPLE = `
We are looking for a Senior Software Engineer with 5+ years of experience.
Required skills: TypeScript, Node.js, React, PostgreSQL, AWS.
You will design scalable microservices and collaborate with cross-functional teams.
`;

describe('Career Job Match (E2E)', () => {
  let s: TestSession;
  let docId: string;

  beforeAll(async () => {
    s = await createSession('job-match');
    const doc = await s.req
      .post('/career/documents')
      .set(auth(s.token))
      .send({ doctype: 'cv', title: 'Job Match Test CV' });
    docId = doc.body.id;
  }, 60_000);

  afterAll(async () => {
    await s.req.delete(`/career/documents/${docId}`).set(auth(s.token));
    await closeSession(s);
  });

  // ── 1. Basic job match ────────────────────────────────────────────────────
  it('POST /career/ats/match-job → 201, matchScore present', async () => {
    const res = await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ documentId: docId, jobDescription: JD_SAMPLE })
      .expect(201);
    // matchScore or overallScore depending on JobMatcherService shape
    const score = res.body.matchScore ?? res.body.overallScore ?? res.body.score;
    expect(typeof score).toBe('number');
  });

  // ── 2. Score range ────────────────────────────────────────────────────────
  it('Match score is between 0 and 100', async () => {
    const res = await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ documentId: docId, jobDescription: JD_SAMPLE });
    const score = res.body.matchScore ?? res.body.overallScore ?? res.body.score;
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });

  // ── 3. Response shape ─────────────────────────────────────────────────────
  it('Response has breakdown and recommendation', async () => {
    const res = await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ documentId: docId, jobDescription: JD_SAMPLE });
    expect(res.body.breakdown ?? res.body.categories).toBeDefined();
    expect(res.body.recommendation ?? res.body.summary).toBeDefined();
  });

  // ── 4. Performance gate: < 2 000 ms ──────────────────────────────────────
  it('Job match completes in under 2 000 ms', async () => {
    const start = Date.now();
    await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ documentId: docId, jobDescription: JD_SAMPLE });
    expect(Date.now() - start).toBeLessThan(2_000);
  });

  // ── 5. Missing jobDescription → 400 ──────────────────────────────────────
  it('Missing jobDescription → 400', async () => {
    await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ documentId: docId })
      .expect(400);
  });

  // ── 6. Missing documentId → 400 ──────────────────────────────────────────
  it('Missing documentId → 400', async () => {
    await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ jobDescription: JD_SAMPLE })
      .expect(400);
  });

  // ── 7. Wrong document owner → 404 ────────────────────────────────────────
  it("Another user's documentId → 404", async () => {
    const s2 = await createSession('jm-other');
    try {
      const doc2 = await s.req
        .post('/career/documents')
        .set(auth(s.token))
        .send({ doctype: 'cv', title: 'Private JM' });
      await s.req
        .post('/career/ats/match-job')
        .set(auth(s2.token))
        .send({ documentId: doc2.body.id, jobDescription: JD_SAMPLE })
        .expect(404);
      await s.req.delete(`/career/documents/${doc2.body.id}`).set(auth(s.token));
    } finally {
      await closeSession(s2);
    }
  });

  // ── 8. Public profile endpoint ────────────────────────────────────────────
  it('POST /career/ats/match-job-profile (public) → 201', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    const res = await s.req
      .post('/career/ats/match-job-profile')
      .send({ profile: profile.body, jobDescription: JD_SAMPLE })
      .expect(201);
    const score = res.body.matchScore ?? res.body.overallScore ?? res.body.score;
    expect(typeof score).toBe('number');
  });

  // ── 9. Short job description ──────────────────────────────────────────────
  it('Short job description still returns a result', async () => {
    const res = await s.req
      .post('/career/ats/match-job')
      .set(auth(s.token))
      .send({ documentId: docId, jobDescription: 'Engineer needed.' });
    const score = res.body.matchScore ?? res.body.overallScore ?? res.body.score;
    expect(typeof score).toBe('number');
  });
});
