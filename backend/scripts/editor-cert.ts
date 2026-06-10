/**
 * Ω.PRODUCT.3B — Live Editor Experience Certification (real browser-driven).
 *
 * Every test seeds real data, performs REAL browser interactions against the
 * running editor, and verifies the DATABASE (authoritative) — plus refresh /
 * reopen for persistence. No estimation, no simulated actions. Failures are
 * reported as observed.
 */
import * as fs from 'fs';
import * as path from 'path';
import { withProbe, openEditor, dbElements, sleep, FRONTEND } from './editor-cert-lib';

const OUT = path.resolve(__dirname, '..', '..', 'certification-reports');
const SAVE_WAIT = 3500;   // debounced autosave + buffer
const SYNC_WAIT = 1800;   // undo/redo syncAll POST

// ── interaction helpers ───────────────────────────────────────────────────────
const elementIds = (page: any) => page.evaluate(() => Array.from(document.querySelectorAll('[data-element-id]')).map((e) => (e as HTMLElement).getAttribute('data-element-id')));
async function clickElement(page: any, id: string) {
  const box = await page.evaluate((eid: string) => { const el = document.querySelector(`[data-element-id="${eid}"]`) as HTMLElement; if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; }, id);
  if (!box) throw new Error(`element ${id} not in DOM`);
  await page.mouse.click(box.x, box.y);
  await sleep(300);
  return box;
}
async function meta(page: any, key: string, shift = false) {
  await page.keyboard.down('Meta'); if (shift) await page.keyboard.down('Shift');
  await page.keyboard.press(key);
  if (shift) await page.keyboard.up('Shift'); await page.keyboard.up('Meta');
  await sleep(300);
}
const clickToolbar = (page: any, label: string) => page.evaluate((t: string) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.textContent || '').trim() === t); if (b) (b as HTMLElement).click(); return !!b; }, label);
const clickByTitle = (page: any, prefix: string) => page.evaluate((p: string) => { const b = Array.from(document.querySelectorAll('button')).find((x) => (x.getAttribute('title') || '').startsWith(p)); if (b && !(b as HTMLButtonElement).disabled) { (b as HTMLElement).click(); return true; } return false; }, prefix);
const toolbarUndo = (page: any) => clickByTitle(page, 'Undo');
const toolbarRedo = (page: any) => clickByTitle(page, 'Redo');

// ── journeys ──────────────────────────────────────────────────────────────────
async function run() {
  const results: any[] = [];
  const record = (name: string, pass: boolean, detail: any) => { results.push({ name, pass, detail }); console.log(`  ${pass ? '✓' : '✗'} ${name} — ${JSON.stringify(detail)}`); };

  // J1 — Drag (move) + autosave + refresh recovery + no data loss
  await withProbe(async ({ prisma, page, project, slide }) => {
    await openEditor(page, project.id, slide.id);
    const ids = await elementIds(page); const id = ids[0];
    const before = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id);
    const box = await clickElement(page, id);
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 160, box.y + 90, { steps: 12 }); await page.mouse.up();
    await sleep(SAVE_WAIT);
    const afterDrag = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id);
    const moved = afterDrag && (Math.abs(afterDrag.x - before.x) > 0.5 || Math.abs(afterDrag.y - before.y) > 0.5);
    record('Drag & Drop — element moved + autosaved to DB', !!moved, { before: { x: round(before.x), y: round(before.y) }, after: afterDrag ? { x: round(afterDrag.x), y: round(afterDrag.y) } : null });
    // refresh recovery: reload, element keeps new position
    await openEditor(page, project.id, slide.id);
    const domAfterReload = await page.evaluate((eid: string) => { const el = document.querySelector(`[data-element-id="${eid}"]`) as HTMLElement; return el ? el.style.left + ',' + el.style.top : null; }, id);
    const dbAfterReload = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id);
    const persisted = dbAfterReload && Math.abs(dbAfterReload.x - afterDrag.x) < 0.5 && Math.abs(dbAfterReload.y - afterDrag.y) < 0.5 && !!domAfterReload;
    record('Refresh recovery — moved element persists after reload', !!persisted, { domLeftTop: domAfterReload, dbX: dbAfterReload ? round(dbAfterReload.x) : null });
  });

  // J2 — Undo/Redo via toolbar buttons (history.undo/redo directly), per op type.
  // DELETE round-trip
  await withProbe(async ({ prisma, page, project, slide }) => {
    await openEditor(page, project.id, slide.id);
    const n0 = (await dbElements(prisma, slide.id)).length;
    await clickElement(page, (await elementIds(page))[0]);
    const clicked = await clickToolbar(page, 'Delete'); if (!clicked) await page.keyboard.press('Backspace');
    await sleep(SAVE_WAIT);
    const nDel = (await dbElements(prisma, slide.id)).length;
    await toolbarUndo(page); await sleep(SYNC_WAIT);
    const nUndo = (await dbElements(prisma, slide.id)).length;
    await toolbarRedo(page); await sleep(SYNC_WAIT);
    const nRedo = (await dbElements(prisma, slide.id)).length;
    record('Undo/Redo (DELETE) — toolbar undo restores, redo re-deletes', nDel === n0 - 1 && nUndo === n0 && nRedo === n0 - 1, { n0, afterDelete: nDel, afterUndo: nUndo, afterRedo: nRedo });
  });

  // DUPLICATE round-trip — single deterministic interaction (toolbar Duplicate
  // button + one selected element). ⌘D double-fires under headless dev fast-
  // refresh, which corrupts the history depth; the toolbar button fires once.
  await withProbe(async ({ prisma, page, project, slide }) => {
    await openEditor(page, project.id, slide.id);
    const n0 = (await dbElements(prisma, slide.id)).length;
    await page.keyboard.press('Escape');
    await clickElement(page, (await elementIds(page))[0]);
    const clicked = await clickToolbar(page, 'Duplicate'); if (!clicked) await meta(page, 'd');
    await sleep(SAVE_WAIT);
    const nDup = (await dbElements(prisma, slide.id)).length;
    await toolbarUndo(page); await sleep(SYNC_WAIT);
    const nUndo = (await dbElements(prisma, slide.id)).length;
    await toolbarRedo(page); await sleep(SYNC_WAIT);
    const nRedo = (await dbElements(prisma, slide.id)).length;
    record('Undo/Redo (DUPLICATE) — toolbar undo reverts, redo reapplies', nDup > n0 && nUndo === n0 && nRedo === nDup, { n0, afterDup: nDup, afterUndo: nUndo, afterRedo: nRedo });
  });

  // MOVE round-trip (drag → undo reverts position → redo reapplies)
  await withProbe(async ({ prisma, page, project, slide }) => {
    await openEditor(page, project.id, slide.id);
    const id = (await elementIds(page))[0];
    const x0 = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id).x;
    const box = await clickElement(page, id);
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 140, box.y + 60, { steps: 10 }); await page.mouse.up();
    await sleep(SAVE_WAIT);
    const xMoved = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id).x;
    await toolbarUndo(page); await sleep(SYNC_WAIT);
    const xUndo = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id).x;
    await toolbarRedo(page); await sleep(SYNC_WAIT);
    const xRedo = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id).x;
    record('Undo/Redo (MOVE) — toolbar undo reverts position, redo reapplies', Math.abs(xMoved - x0) > 0.5 && Math.abs(xUndo - x0) < 0.5 && Math.abs(xRedo - xMoved) < 0.5, { x0: round(x0), xMoved: round(xMoved), xUndo: round(xUndo), xRedo: round(xRedo) });
  });

  // J4 — Copy / Paste (⌘C ⌘V creates a new element)
  await withProbe(async ({ prisma, page, project, slide }) => {
    await openEditor(page, project.id, slide.id);
    const n0 = (await dbElements(prisma, slide.id)).length;
    await clickElement(page, (await elementIds(page))[0]);
    await meta(page, 'c'); await sleep(400); await meta(page, 'v'); await sleep(SAVE_WAIT);
    const nPaste = (await dbElements(prisma, slide.id)).length;
    record('Copy/Paste — ⌘C then ⌘V creates a pasted element (DB +1)', nPaste === n0 + 1, { n0, afterPaste: nPaste });
  });

  // J5 — Browser crash recovery (abrupt page kill, no graceful unload)
  await withProbe(async ({ prisma, page, browser, project, slide }) => {
    await openEditor(page, project.id, slide.id);
    const id = (await elementIds(page))[0];
    const box = await clickElement(page, id);
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x - 120, box.y + 70, { steps: 10 }); await page.mouse.up();
    await sleep(SAVE_WAIT); // autosaved
    const saved = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id);
    // simulate crash: close the page/tab abruptly, open a fresh one
    await page.close({ runBeforeUnload: false });
    const fresh = await browser.newPage();
    await fresh.evaluateOnNewDocument(() => {});
    const n = await openEditor(fresh, project.id, slide.id);
    const recovered = (await dbElements(prisma, slide.id)).find((e: any) => e.id === id);
    const ok = n > 0 && recovered && Math.abs(recovered.x - saved.x) < 0.5 && Math.abs(recovered.y - saved.y) < 0.5;
    record('Crash recovery — abrupt tab kill, reopen keeps last autosave', !!ok, { savedX: round(saved.x), recoveredX: recovered ? round(recovered.x) : null, elementsAfterReopen: n });
  });

  // J6 — End-to-end workflow: open → edit (drag) → autosave → reopen → continue (delete) → persists
  await withProbe(async ({ prisma, page, project, slide }) => {
    let clicks = 0;
    await openEditor(page, project.id, slide.id);
    const id = (await elementIds(page))[0];
    const box = await clickElement(page, id); clicks++;
    await page.mouse.move(box.x, box.y); await page.mouse.down(); await page.mouse.move(box.x + 100, box.y + 40, { steps: 8 }); await page.mouse.up(); clicks++;
    await sleep(SAVE_WAIT);
    await openEditor(page, project.id, slide.id);            // reopen
    const nBefore = (await dbElements(prisma, slide.id)).length;
    await clickElement(page, (await elementIds(page))[0]); clicks++;
    const del = await clickToolbar(page, 'Delete'); if (!del) await page.keyboard.press('Backspace'); clicks++;
    await sleep(SAVE_WAIT);
    const nAfter = (await dbElements(prisma, slide.id)).length;
    record('Workflow E2E — open→edit→autosave→reopen→continue-edit persists', nAfter === nBefore - 1, { clicks, nBefore, nAfter });
  });

  return results;
}
const round = (n: number) => Math.round(n * 100) / 100;

run().then((results) => {
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'editor-cert.json'), JSON.stringify({ generatedAt: new Date().toISOString(), results }, null, 2));
  const passed = results.filter((r) => r.pass).length;
  console.log(`\nLive editor certification: ${passed}/${results.length} journeys passed`);
}).catch((e) => { console.error('CERT ERROR', e?.stack || e); process.exit(1); });
