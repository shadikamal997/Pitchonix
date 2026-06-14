/** Ω.PRODUCT.3C — diagnostic: confirm each doc editor loads seeded content + dump editable surface. */
import { withSession, seedPdf, seedCareer, seedExcel, openPath, sleep, FRONTEND } from './editor-cert-lib';

async function diag(label: string, urlPath: string, waitSel: string, seedText: string[], page: any) {
  console.log(`\n=== ${label} :: ${urlPath} ===`);
  const loaded = await openPath(page, urlPath, waitSel, 35000);
  await sleep(2000);
  const d = await page.evaluate((seeds: string[]) => {
    const txt = document.body.innerText || '';
    const sel = (s: string) => document.querySelectorAll(s).length;
    const sampleAttrs = (s: string) => Array.from(document.querySelectorAll(s)).slice(0, 3).map((e) => (e as HTMLElement).outerHTML.slice(0, 90));
    return {
      url: location.href,
      redirectedToLogin: /\/login/.test(location.href),
      bodyLen: txt.length,
      seedFound: seeds.filter((s) => txt.includes(s)),
      contentEditable: sel('[contenteditable="true"]'),
      inputs: sel('input'),
      textareas: sel('textarea'),
      cellLike: sel('[data-cell-address],[data-row],td,[role="gridcell"]'),
      ceSample: sampleAttrs('[contenteditable="true"]'),
      inputSample: Array.from(document.querySelectorAll('input,textarea')).slice(0, 6).map((e) => { const el = e as HTMLInputElement; return `${el.tagName}[${el.type || ''}] name=${el.name} ph="${(el.placeholder || '').slice(0, 24)}" val="${(el.value || '').slice(0, 24)}"`; }),
    };
  }, seedText).catch((e: any) => ({ error: e.message }));
  console.log(`  loaded(selector ${waitSel}): ${loaded}`);
  console.log('  ' + JSON.stringify(d, null, 2).replace(/\n/g, '\n  '));
}

(async () => {
  await withSession(async ({ prisma, page, user }) => {
    const pdf = await seedPdf(prisma, user.id);
    await diag('PDF Studio', `/pdf-studio/editor/${pdf.doc.id}`, '[contenteditable], main, .editor', ['PDF SEED original body text', 'Cover'], page);
    const career = await seedCareer(prisma, user.id);
    await diag('Career Docs', `/career/builder/${career.doc.id}`, 'input, textarea, main', ['Cert Person', 'Original Headline', 'Original summary'], page);
    const excel = await seedExcel(prisma, user.id);
    await diag('Excel Studio', `/excel-studio/editor/${excel.project.id}`, 'td, [data-cell-address], [role="gridcell"], main', ['Header', 'Sheet1'], page);
  });
})().catch((e) => { console.error('DIAG ERROR', e?.stack || e); process.exit(1); });
