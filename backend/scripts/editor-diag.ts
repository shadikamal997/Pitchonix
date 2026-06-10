/** Ω.PRODUCT.3B — diagnostic: confirm seeded elements load into the editor. */
import { withProbe, openEditor, apiElements, dbElements, FRONTEND, sleep } from './editor-cert-lib';

withProbe(async ({ prisma, page, token, project, slide }) => {
  console.log(`seed: project=${project.id} slide=${slide.id}`);
  const db = await dbElements(prisma, slide.id);
  console.log(`DB elements: ${db.length} (${db.map((e: any) => e.type).join(', ')})`);
  const api = await apiElements(token, slide.id);
  console.log(`API GET /slides/${slide.id}/elements -> status ${api.status}, elements=${Array.isArray(api.elements) ? api.elements.length : api.elements}`);

  const n = await openEditor(page, project.id, slide.id, 30000);
  console.log(`editor [data-element-id] count after wait: ${n}`);
  const diag = await page.evaluate(() => ({
    url: location.href,
    canvas: document.querySelectorAll('[data-slide-canvas]').length,
    elementIds: document.querySelectorAll('[data-element-id]').length,
    bodyLen: document.body.innerText.length,
    hasSeedText: /SEED Title Alpha|SEED Body/.test(document.body.innerText),
    canvasHtml: (document.querySelector('[data-slide-canvas]')?.innerHTML || '').slice(0, 400),
  }));
  console.log('DOM diag:', JSON.stringify(diag, null, 2));
  await page.screenshot({ path: '/tmp/editor-diag.png' });
});
