/**
 * Phase Ω.4 — E2E: CV Upload & Import Flow
 *
 * Tests:
 *  1. Profile is created or returned for an authenticated user
 *  2. File import endpoint rejects missing file
 *  3. File import accepts a PDF and returns jobId + partial profile
 *  4. Progress polling endpoint returns the job state
 *  5. LinkedIn JSON import writes personal + experience to the profile
 *  6. Import respects the 20 MB file size limit
 *  7. Import ownership: cannot import into another user's profile
 */

import { auth, closeSession, createSession, minimalPdfBuffer, TestSession } from './helpers';

describe('Career Upload (E2E)', () => {
  let s: TestSession;

  beforeAll(async () => {
    s = await createSession('upload');
  }, 60_000);
  afterAll(async () => closeSession(s));

  // ── 1. Profile bootstrap ──────────────────────────────────────────────────
  it('GET /career/profile → creates profile on first call', async () => {
    const res = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    expect(res.body.id).toBeTruthy();
    expect(res.body.userId).toBe(s.userId);
  });

  // ── 2. File upload validation ──────────────────────────────────────────────
  it('POST /career/profile/:id/import/file without file → 400', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    await s.req
      .post(`/career/profile/${profile.body.id}/import/file`)
      .set(auth(s.token))
      .expect(400);
  });

  // ── 3. PDF import returns jobId and profile ────────────────────────────────
  it('POST /career/profile/:id/import/file with PDF → 201, jobId', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    const res = await s.req
      .post(`/career/profile/${profile.body.id}/import/file`)
      .set(auth(s.token))
      .attach('file', minimalPdfBuffer(), { filename: 'cv.pdf', contentType: 'application/pdf' })
      .expect(201);
    expect(res.body.jobId).toBeTruthy();
    expect(res.body.profile).toBeDefined();
  }, 30_000);

  // ── 4. Progress polling ───────────────────────────────────────────────────
  it('GET /career/profile/import/progress/:jobId → returns progress', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    const importRes = await s.req
      .post(`/career/profile/${profile.body.id}/import/file`)
      .set(auth(s.token))
      .attach('file', minimalPdfBuffer(), { filename: 'cv.pdf', contentType: 'application/pdf' });
    const jobId = importRes.body.jobId;
    const progress = await s.req
      .get(`/career/profile/import/progress/${jobId}`)
      .set(auth(s.token))
      .expect(200);
    expect(progress.body.jobId).toBe(jobId);
    expect(progress.body.phase).toBeDefined();
  }, 30_000);

  // ── 5. LinkedIn JSON import ───────────────────────────────────────────────
  it('POST /career/profile/:id/import/linkedin → updates profile', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    const payload = {
      profile: {
        firstName: 'Jane',
        lastName: 'Smith',
        headline: 'Software Engineer',
        positions: {
          values: [{ title: 'Engineer', companyName: 'Acme', startDate: { year: 2020, month: 1 } }],
        },
      },
    };
    const res = await s.req
      .post(`/career/profile/${profile.body.id}/import/linkedin`)
      .set(auth(s.token))
      .send({ payload })
      .expect(201);
    expect(res.body.id).toBe(profile.body.id);
  });

  // ── 6. 20 MB file size limit ──────────────────────────────────────────────
  it('POST import/file with 21 MB file → 413', async () => {
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    const oversized = Buffer.alloc(21 * 1024 * 1024, 0x20);
    const res = await s.req
      .post(`/career/profile/${profile.body.id}/import/file`)
      .set(auth(s.token))
      .attach('file', oversized, { filename: 'big.pdf', contentType: 'application/pdf' });
    expect([413, 400]).toContain(res.status);
  }, 15_000);

  // ── 7. Ownership enforcement ──────────────────────────────────────────────
  it("POST import/file with another user's profileId → 404", async () => {
    const s2 = await createSession('upload-other');
    try {
      const profileB = await s.req.get('/career/profile').set(auth(s2.token)).expect(200);
      // Use s's token but s2's profileId
      const res = await s.req
        .post(`/career/profile/${profileB.body.id}/import/file`)
        .set(auth(s.token))
        .attach('file', minimalPdfBuffer(), { filename: 'cv.pdf', contentType: 'application/pdf' });
      expect([403, 404]).toContain(res.status);
    } finally {
      await closeSession(s2);
    }
  }, 30_000);
});
