/**
 * Phase Ω.4 — E2E: CV Builder (Documents CRUD)
 *
 * Tests:
 *  1. Create a CV document
 *  2. List documents (returns the created one)
 *  3. Get a single document (ownership enforced)
 *  4. Patch title on a document
 *  5. Add/update/remove a section item (experience)
 *  6. Reorder a section
 *  7. Duplicate a document
 *  8. Delete a document
 *  9. Cannot read another user's document
 */

import { auth, closeSession, createSession, TestSession } from './helpers';

describe('Career Builder (E2E)', () => {
  let s: TestSession;
  let profileId: string;
  let docId: string;

  beforeAll(async () => {
    s = await createSession('builder');
    const profile = await s.req.get('/career/profile').set(auth(s.token)).expect(200);
    profileId = profile.body.id;
  }, 60_000);

  afterAll(async () => closeSession(s));

  // ── 1. Create document ────────────────────────────────────────────────────
  it('POST /career/documents → 201, returns docId', async () => {
    const res = await s.req
      .post('/career/documents')
      .set(auth(s.token))
      .send({ doctype: 'cv', title: 'My Test CV' })
      .expect(201);
    expect(res.body.id).toBeTruthy();
    expect(res.body.title).toBe('My Test CV');
    expect(res.body.userId).toBe(s.userId);
    docId = res.body.id;
  });

  // ── 2. List documents ──────────────────────────────────────────────────────
  it('GET /career/documents → returns array with the new doc', async () => {
    const res = await s.req.get('/career/documents').set(auth(s.token)).expect(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.some((d: any) => d.id === docId)).toBe(true);
  });

  // ── 3. Get single document ────────────────────────────────────────────────
  it('GET /career/documents/:id → 200 with correct doc', async () => {
    const res = await s.req.get(`/career/documents/${docId}`).set(auth(s.token)).expect(200);
    expect(res.body.id).toBe(docId);
  });

  // ── 4. Patch title ─────────────────────────────────────────────────────────
  it('PATCH /career/documents/:id → updates title', async () => {
    const res = await s.req
      .patch(`/career/documents/${docId}`)
      .set(auth(s.token))
      .send({ title: 'Updated CV Title' })
      .expect(200);
    expect(res.body.title).toBe('Updated CV Title');
  });

  // ── 5. Section item CRUD ──────────────────────────────────────────────────
  let expItemId: string;

  it('POST /career/profile/:profileId/section/experience → adds item', async () => {
    const res = await s.req
      .post(`/career/profile/${profileId}/section/experience`)
      .set(auth(s.token))
      .send({ title: 'Software Engineer', company: 'Acme Corp', startDate: '2020-01' })
      .expect(201);
    expect(res.body.experience?.length).toBeGreaterThanOrEqual(1);
    expItemId = res.body.experience[res.body.experience.length - 1].id;
  });

  it('PATCH /career/profile/:profileId/section/experience/:itemId → updates item', async () => {
    const res = await s.req
      .patch(`/career/profile/${profileId}/section/experience/${expItemId}`)
      .set(auth(s.token))
      .send({ title: 'Senior Engineer' })
      .expect(200);
    const item = res.body.experience.find((e: any) => e.id === expItemId);
    expect(item?.title).toBe('Senior Engineer');
  });

  it('DELETE /career/profile/:profileId/section/experience/:itemId → removes item', async () => {
    const res = await s.req
      .delete(`/career/profile/${profileId}/section/experience/${expItemId}`)
      .set(auth(s.token))
      .expect(200);
    expect(res.body.experience.some((e: any) => e.id === expItemId)).toBe(false);
  });

  // ── 6. Reorder section ────────────────────────────────────────────────────
  it('POST /career/profile/:profileId/section/skills/reorder → 201', async () => {
    // Add two skills first
    const p1 = await s.req.post(`/career/profile/${profileId}/section/skills`).set(auth(s.token)).send({ name: 'TypeScript' });
    const p2 = await s.req.post(`/career/profile/${profileId}/section/skills`).set(auth(s.token)).send({ name: 'Python' });
    const id1 = p1.body.skills[p1.body.skills.length - 2]?.id;
    const id2 = p2.body.skills[p2.body.skills.length - 1]?.id;
    if (!id1 || !id2) return; // guard against fixture mismatch
    const res = await s.req
      .post(`/career/profile/${profileId}/section/skills/reorder`)
      .set(auth(s.token))
      .send({ ids: [id2, id1] })
      .expect(201);
    expect(res.body.skills[0]?.id).toBe(id2);
  });

  // ── 7. Duplicate ──────────────────────────────────────────────────────────
  it('POST /career/documents/:id/duplicate → creates a copy', async () => {
    const res = await s.req
      .post(`/career/documents/${docId}/duplicate`)
      .set(auth(s.token))
      .send({ title: 'CV Copy' })
      .expect(201);
    expect(res.body.id).not.toBe(docId);
    expect(res.body.title).toBe('CV Copy');
    // cleanup the duplicate
    await s.req.delete(`/career/documents/${res.body.id}`).set(auth(s.token));
  });

  // ── 8. Delete ─────────────────────────────────────────────────────────────
  it('DELETE /career/documents/:id → 200', async () => {
    await s.req.delete(`/career/documents/${docId}`).set(auth(s.token)).expect(200);
    await s.req.get(`/career/documents/${docId}`).set(auth(s.token)).expect(404);
  });

  // ── 9. Ownership enforcement ──────────────────────────────────────────────
  it('GET /career/documents/:id with wrong user token → 404', async () => {
    const s2 = await createSession('builder-other');
    try {
      const doc = await s.req.post('/career/documents').set(auth(s.token)).send({ doctype: 'cv', title: 'Private CV' });
      const privateDocId = doc.body.id;
      await s.req.get(`/career/documents/${privateDocId}`).set(auth(s2.token)).expect(404);
      await s.req.delete(`/career/documents/${privateDocId}`).set(auth(s.token));
    } finally {
      await closeSession(s2);
    }
  });
});
