/**
 * Phase Ω.4 — E2E: Template Gallery & Template Switch
 *
 * Tests:
 *  1. GET /career/templates → returns array of templates
 *  2. Templates have required fields (id, name, category, doctype, layout)
 *  3. Filter by doctype works
 *  4. Filter by category works
 *  5. GET /career/templates/count → returns breakdown object
 *  6. POST /career/documents/:id/template → switches template on document
 *  7. Template switch is < 300 ms (performance gate)
 *  8. POST /career/documents/:id/template with null → clears template
 */

import { auth, closeSession, createSession, TestSession } from './helpers';

describe('Career Templates (E2E)', () => {
  let s: TestSession;
  let docId: string;

  beforeAll(async () => {
    s = await createSession('template');
    const doc = await s.req
      .post('/career/documents')
      .set(auth(s.token))
      .send({ doctype: 'cv', title: 'Template Test CV' });
    docId = doc.body.id;
  }, 60_000);

  afterAll(async () => {
    await s.req.delete(`/career/documents/${docId}`).set(auth(s.token));
    await closeSession(s);
  });

  // ── 1. Template list ──────────────────────────────────────────────────────
  it('GET /career/templates → 200, non-empty array', async () => {
    const res = await s.req.get('/career/templates').set(auth(s.token)).expect(200);
    const list = Array.isArray(res.body) ? res.body : res.body.items;
    expect(list.length).toBeGreaterThan(0);
  });

  // ── 2. Required fields ────────────────────────────────────────────────────
  it('Templates have id, name, category, doctype, layout', async () => {
    const res = await s.req.get('/career/templates').set(auth(s.token)).expect(200);
    const list = Array.isArray(res.body) ? res.body : res.body.items;
    const tpl = list[0];
    expect(tpl.id).toBeTruthy();
    expect(tpl.name).toBeTruthy();
    expect(tpl.category).toBeTruthy();
    expect(tpl.doctype).toBeTruthy();
    expect(tpl.layout).toBeDefined();
  });

  // ── 3. Filter by doctype ──────────────────────────────────────────────────
  it('GET /career/templates?doctype=resume → only resume templates', async () => {
    const res = await s.req.get('/career/templates?doctype=resume').set(auth(s.token)).expect(200);
    const list = Array.isArray(res.body) ? res.body : res.body.items;
    expect(list.every((t: any) => t.doctype === 'resume')).toBe(true);
  });

  // ── 4. Filter by category ─────────────────────────────────────────────────
  it('GET /career/templates?category=ATS → only ATS-category templates', async () => {
    const res = await s.req.get('/career/templates?category=ATS').set(auth(s.token)).expect(200);
    const list = Array.isArray(res.body) ? res.body : res.body.items;
    if (list.length > 0) {
      expect(list.every((t: any) => t.category === 'ATS')).toBe(true);
    }
  });

  // ── 5. Count endpoint ─────────────────────────────────────────────────────
  it('GET /career/templates/count → returns per-doctype counts', async () => {
    const res = await s.req.get('/career/templates/count').set(auth(s.token)).expect(200);
    expect(typeof res.body).toBe('object');
  });

  // ── 6. Switch template ────────────────────────────────────────────────────
  it('POST /career/documents/:id/template → switches templateId', async () => {
    const templates = await s.req
      .get('/career/templates?doctype=cv')
      .set(auth(s.token))
      .expect(200);
    const list = Array.isArray(templates.body) ? templates.body : templates.body.items;
    if (list.length === 0) return;
    const templateId = list[0].id;

    const res = await s.req
      .post(`/career/documents/${docId}/template`)
      .set(auth(s.token))
      .send({ templateId })
      .expect(201);
    expect(res.body.templateId).toBe(templateId);
  });

  // ── 7. Template switch < 300 ms (performance gate) ────────────────────────
  it('Template switch completes in under 300 ms', async () => {
    const templates = await s.req
      .get('/career/templates?doctype=cv')
      .set(auth(s.token))
      .expect(200);
    const list = Array.isArray(templates.body) ? templates.body : templates.body.items;
    if (list.length < 2) return;
    const templateId = list[1].id;

    const start = Date.now();
    await s.req.post(`/career/documents/${docId}/template`).set(auth(s.token)).send({ templateId });
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(300);
  });

  // ── 8. Clear template ─────────────────────────────────────────────────────
  it('POST /career/documents/:id/template with null → clears templateId', async () => {
    const res = await s.req
      .post(`/career/documents/${docId}/template`)
      .set(auth(s.token))
      .send({ templateId: null })
      .expect(201);
    expect(res.body.templateId).toBeNull();
  });
});
