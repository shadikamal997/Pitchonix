/**
 * Ω.PRODUCT.3C — Live certification for PDF Studio, Career Docs, and Excel Studio.
 *
 * Seeds real records, drives the real browser UI, then verifies Prisma state
 * and refresh recovery. Missing optional controls are reported as NOT_IMPLEMENTED
 * instead of failed, per phase instructions.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  API,
  FRONTEND,
  openPath,
  seedCareer,
  seedExcel,
  seedPdf,
  sleep,
  withSession,
} from './editor-cert-lib';

const OUT = path.resolve(__dirname, '..', '..', 'certification-reports');
const SAVE_WAIT = 3800;
const SYNC_WAIT = 1700;

type Status = 'PASS' | 'FAIL' | 'NOT_IMPLEMENTED';
type CertResult = {
  area: 'PDF Studio' | 'Career Docs' | 'Excel Studio';
  action: string;
  status: Status;
  evidence: Record<string, any>;
};

function assert(condition: any, message: string) {
  if (!condition) throw new Error(message);
}

async function waitFor<T>(fn: () => Promise<T>, ok: (value: T) => boolean, timeoutMs = 12000, intervalMs = 500) {
  const start = Date.now();
  let last: T;
  while (Date.now() - start < timeoutMs) {
    last = await fn();
    if (ok(last)) return last;
    await sleep(intervalMs);
  }
  return fn();
}

function plain(value: any) {
  return value == null ? '' : String(value);
}

async function bodyIncludes(page: any, text: string) {
  return page.evaluate((needle: string) => (document.body.innerText || '').includes(needle), text);
}

async function clickButtonByText(page: any, text: string) {
  return page.evaluate((needle: string) => {
    const button = Array.from(document.querySelectorAll('button')).find((item) =>
      ((item.textContent || '').trim().toLowerCase()).includes(needle.toLowerCase()),
    ) as HTMLButtonElement | undefined;
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, text);
}

async function clickButtonByTitle(page: any, titlePrefix: string) {
  return page.evaluate((prefix: string) => {
    const button = Array.from(document.querySelectorAll('button')).find((item) =>
      (item.getAttribute('title') || '').startsWith(prefix),
    ) as HTMLButtonElement | undefined;
    if (!button || button.disabled) return false;
    button.click();
    return true;
  }, titlePrefix);
}

async function setContentEditable(page: any, text: string) {
  return page.evaluate((value: string) => {
    const el = document.querySelector('[contenteditable="true"]') as HTMLElement | null;
    if (!el) return false;
    el.focus();
    el.innerHTML = `<p>${value}</p>`;
    el.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertText', data: value }));
    return true;
  }, text);
}

async function setInputByLabel(page: any, labelText: string, value: string) {
  const focused = await page.evaluate((needle: string) => {
    const labels = Array.from(document.querySelectorAll('label'));
    const label = labels.find((item) => (item.textContent || '').toLowerCase().includes(needle.toLowerCase()));
    const input = label?.querySelector('input,textarea') as HTMLInputElement | HTMLTextAreaElement | null;
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  }, labelText);
  if (!focused) return false;
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  return true;
}

async function setTextareaByPlaceholder(page: any, placeholder: string, value: string) {
  const focused = await page.evaluate((needle: string) => {
    const input = Array.from(document.querySelectorAll('textarea')).find((item) =>
      ((item as HTMLTextAreaElement).placeholder || '').toLowerCase().includes(needle.toLowerCase()),
    ) as HTMLTextAreaElement | undefined;
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  }, placeholder);
  if (!focused) return false;
  await page.keyboard.type(value);
  await page.keyboard.press('Tab');
  return true;
}

async function setInputByValue(page: any, currentValue: string, nextValue: string) {
  const focused = await page.evaluate((currentValue: string) => {
    const input = Array.from(document.querySelectorAll('input')).find((item) => (item as HTMLInputElement).value === currentValue) as HTMLInputElement | undefined;
    if (!input) return false;
    input.focus();
    input.select();
    return true;
  }, currentValue);
  if (!focused) return false;
  await page.keyboard.type(nextValue);
  await page.keyboard.press('Tab');
  return true;
}

async function clickText(page: any, text: string) {
  return page.evaluate((needle: string) => {
    const match = Array.from(document.querySelectorAll('button, [role="button"]')).find((item) =>
      ((item.textContent || '').trim().toLowerCase()).includes(needle.toLowerCase()),
    ) as HTMLElement | undefined;
    if (!match) return false;
    match.click();
    return true;
  }, text);
}

async function setFormulaBar(page: any, value: string) {
  return page.evaluate((nextValue: string) => {
    const input = Array.from(document.querySelectorAll('input')).find((item) =>
      (item as HTMLInputElement).placeholder === 'Empty cell',
    ) as HTMLInputElement | undefined;
    if (!input) return false;
    input.focus();
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, nextValue);
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    return true;
  }, value);
}

async function selectExcelCellByText(page: any, text: string) {
  return page.evaluate((needle: string) => {
    const cell = Array.from(document.querySelectorAll('td')).find((item) =>
      ((item.textContent || '').trim()).includes(needle),
    ) as HTMLElement | undefined;
    if (!cell) return false;
    cell.click();
    return true;
  }, text);
}

async function doubleClickSheetTab(page: any, sheetName: string) {
  const box = await page.evaluate((needle: string) => {
    const button = Array.from(document.querySelectorAll('button')).find((item) => (item.textContent || '').trim() === needle) as HTMLElement | undefined;
    if (!button) return null;
    const r = button.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, sheetName);
  if (!box) return false;
  await page.mouse.click(box.x, box.y, { clickCount: 2 });
  return true;
}

async function dragElement(page: any, selector: string, dx: number, dy: number) {
  const box = await page.evaluate((itemSelector: string) => {
    const el = document.querySelector(itemSelector) as HTMLElement | null;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    return { x: r.x + r.width / 2, y: r.y + r.height / 2 };
  }, selector);
  if (!box) return false;
  await page.mouse.move(box.x, box.y);
  await page.mouse.down();
  await page.mouse.move(box.x + dx, box.y + dy, { steps: 10 });
  await page.mouse.up();
  return true;
}

function findCell(project: any, sheetName: string, address: string) {
  const sheet = project.analysis?.worksheets?.find((item: any) => item.name === sheetName);
  return sheet?.cells?.flat?.().find((cell: any) => cell.address === address);
}

async function apiGet(token: string, urlPath: string) {
  const response = await fetch(`${API}${urlPath}`, { headers: { Authorization: `Bearer ${token}` } });
  return { status: response.status, data: response.ok ? await response.json() : null };
}

async function runPdf(ctx: any, results: CertResult[]) {
  const { prisma, page, token, user } = ctx;
  const seed = await seedPdf(prisma, user.id);
  const loaded = await openPath(page, `/pdf-studio/editor/${seed.doc.id}`, '[contenteditable="true"]', 40000);
  assert(loaded, 'PDF editor did not load contenteditable body');

  const apiInitial = await apiGet(token, `/pdf-documents/${seed.doc.id}`);
  const initialDom = await bodyIncludes(page, 'PDF SEED original body text');
  results.push({ area: 'PDF Studio', action: 'open seeded document', status: initialDom && apiInitial.status === 200 ? 'PASS' : 'FAIL', evidence: { domSeedFound: initialDom, apiStatus: apiInitial.status } });

  const beforeDragRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
  const beforeImage = beforeDragRow?.content?.placedImages?.[0];
  const imageDragged = await dragElement(page, '[data-pdf-placed-image-id="cert-image-1"]', 80, 45);
  await sleep(SAVE_WAIT);
  let imageRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
  const afterImage = imageRow?.content?.placedImages?.find((img: any) => img.id === 'cert-image-1');
  const imageMoved = imageDragged && beforeImage && afterImage && (Math.abs(afterImage.x - beforeImage.x) > 0.1 || Math.abs(afterImage.y - beforeImage.y) > 0.1);
  results.push({ area: 'PDF Studio', action: 'drag/drop image placement', status: imageMoved ? 'PASS' : 'FAIL', evidence: { imageDragged, before: beforeImage ? { x: beforeImage.x, y: beforeImage.y } : null, after: afterImage ? { x: afterImage.x, y: afterImage.y } : null } });

  const editedText = 'PDF CERT edited body text';
  assert(await setContentEditable(page, editedText), 'PDF contenteditable body not found');
  await sleep(500);
  await sleep(SAVE_WAIT);
  let pageRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
  const savedEdit = plain(pageRow?.content?.text || pageRow?.content?.html).includes(editedText);
  results.push({ area: 'PDF Studio', action: 'inline text edit + autosave', status: savedEdit ? 'PASS' : 'FAIL', evidence: { dbText: pageRow?.content?.text, dbHtmlContains: plain(pageRow?.content?.html).includes(editedText) } });

  const undoClicked = await clickButtonByTitle(page, 'Undo');
  await sleep(SAVE_WAIT);
  pageRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
  const undone = plain(pageRow?.content?.text || pageRow?.content?.html).includes('PDF SEED original body text');
  const redoClicked = await clickButtonByTitle(page, 'Redo');
  await sleep(SAVE_WAIT);
  pageRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
  const redone = plain(pageRow?.content?.text || pageRow?.content?.html).includes(editedText);
  results.push({ area: 'PDF Studio', action: 'undo/redo text edit', status: undoClicked && redoClicked && undone && redone ? 'PASS' : 'FAIL', evidence: { undoClicked, redoClicked, dbUndone: undone, dbRedone: redone } });

  await openPath(page, `/pdf-studio/editor/${seed.doc.id}`, '[contenteditable="true"]', 40000);
  const recovered = await bodyIncludes(page, editedText);
  results.push({ area: 'PDF Studio', action: 'refresh recovery', status: recovered ? 'PASS' : 'FAIL', evidence: { domRecoveredText: recovered } });

  const titleEdited = await page.evaluate(() => {
    const input = Array.from(document.querySelectorAll('input')).find((item) => (item as HTMLInputElement).value === 'Cover') as HTMLInputElement | undefined;
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'Certified Cover');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    input.dispatchEvent(new FocusEvent('blur', { bubbles: true }));
    return true;
  });
  await sleep(SAVE_WAIT);
  pageRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
  results.push({ area: 'PDF Studio', action: 'section/page title edit', status: titleEdited && pageRow?.title === 'Certified Cover' ? 'PASS' : 'FAIL', evidence: { titleEdited, dbTitle: pageRow?.title } });

  const insertedBlock = await clickButtonByText(page, 'Blocks');
  await sleep(500);
  const blockOptionClicked = await clickButtonByText(page, 'KPI').catch(() => false);
  if (insertedBlock && blockOptionClicked) {
    await sleep(SAVE_WAIT);
    pageRow = await prisma.pdfPage.findUnique({ where: { id: seed.page.id } });
    const blockSaved = plain(pageRow?.content?.html).includes('data-pitchonix-block');
    results.push({ area: 'PDF Studio', action: 'section/block insert edit', status: blockSaved ? 'PASS' : 'FAIL', evidence: { blockSaved } });
  } else {
    results.push({ area: 'PDF Studio', action: 'section/block insert edit', status: 'NOT_IMPLEMENTED', evidence: { insertedBlock, blockOptionClicked, note: 'Block picker control was not reachable in this seeded path.' } });
  }

  const beforeTemplate = (await prisma.pdfDocument.findUnique({ where: { id: seed.doc.id } }))?.metadata;
  const templateUi = await clickButtonByTitle(page, 'Templates') || await clickButtonByText(page, 'Templates');
  await waitFor(
    () => page.evaluate(() => document.querySelectorAll('button[data-pdf-template-id]').length),
    Boolean,
    5000,
    250,
  );
  const templateOption = await page.evaluate(() => {
    const option = Array.from(document.querySelectorAll('button[data-pdf-template-id]')).find((button) =>
      button.getAttribute('data-pdf-template-id') !== 'clean_business_report',
    ) as HTMLButtonElement | undefined;
    if (!option || option.disabled) return false;
    option.click();
    return true;
  }).catch(() => false);
  await sleep(SYNC_WAIT);
  const afterTemplate = (await prisma.pdfDocument.findUnique({ where: { id: seed.doc.id } }))?.metadata;
  const templateChanged = JSON.stringify(beforeTemplate) !== JSON.stringify(afterTemplate);
  results.push({ area: 'PDF Studio', action: 'template change', status: templateUi && templateOption && templateChanged ? 'PASS' : 'FAIL', evidence: { templateUi, templateOption, beforeTemplate, afterTemplate } });

  const exportAvailable = await page.evaluate(() => /export/i.test(document.body.innerText || ''));
  results.push({ area: 'PDF Studio', action: 'export button availability', status: exportAvailable ? 'PASS' : 'FAIL', evidence: { exportAvailable } });
}

async function runCareer(ctx: any, results: CertResult[]) {
  const { prisma, page, token, user } = ctx;
  const seed = await seedCareer(prisma, user.id);
  const loaded = await openPath(page, `/career/builder/${seed.doc.id}`, 'input, textarea', 40000);
  assert(loaded, 'Career builder did not load editable fields');

  const apiInitial = await apiGet(token, `/career/documents/${seed.doc.id}`);
  const inputValues = await page.evaluate(() => Array.from(document.querySelectorAll('input,textarea')).map((item: any) => item.value).filter(Boolean));
  results.push({ area: 'Career Docs', action: 'open seeded CV document', status: inputValues.includes('Cert Person') && apiInitial.status === 200 ? 'PASS' : 'FAIL', evidence: { inputValues: inputValues.slice(0, 8), apiStatus: apiInitial.status } });

  const nameOk = await setInputByLabel(page, 'Full Name', 'Certified Person');
  const headlineOk = await setInputByLabel(page, 'Headline', 'Certified Headline');
  await sleep(SYNC_WAIT);
  let profile = await prisma.cvProfile.findUnique({ where: { id: seed.profile.id } });
  results.push({ area: 'Career Docs', action: 'edit name and headline', status: nameOk && headlineOk && profile?.personal?.fullName === 'Certified Person' && profile?.personal?.headline === 'Certified Headline' ? 'PASS' : 'FAIL', evidence: { nameOk, headlineOk, personal: profile?.personal } });

  await clickText(page, 'Summary');
  await sleep(250);
  const summaryOk = await setTextareaByPlaceholder(page, 'professional summary', 'Certified summary text with no field loss.');
  await sleep(SYNC_WAIT);
  profile = await prisma.cvProfile.findUnique({ where: { id: seed.profile.id } });
  results.push({ area: 'Career Docs', action: 'edit summary', status: summaryOk && profile?.personal?.summary === 'Certified summary text with no field loss.' ? 'PASS' : 'FAIL', evidence: { summaryOk, summary: profile?.personal?.summary } });

  await clickText(page, 'Experience');
  await sleep(250);
  await clickText(page, 'Engineer');
  await sleep(300);
  const roleOk = await setInputByLabel(page, 'Role', 'Certified Engineer');
  await sleep(SYNC_WAIT);
  const companyOk = await setInputByLabel(page, 'Company', 'CertifiedCo');
  await sleep(SYNC_WAIT);
  const bulletsOk = await setInputByLabel(page, 'Bullets', 'Certified bullet one\nCertified bullet two');
  await sleep(SYNC_WAIT);
  profile = await prisma.cvProfile.findUnique({ where: { id: seed.profile.id } });
  const exp = profile?.experience?.[0];
  results.push({ area: 'Career Docs', action: 'edit experience', status: roleOk && companyOk && bulletsOk && exp?.role === 'Certified Engineer' && exp?.company === 'CertifiedCo' && exp?.bullets?.length === 2 ? 'PASS' : 'FAIL', evidence: { roleOk, companyOk, bulletsOk, experience: exp } });

  await clickText(page, 'Education');
  await sleep(250);
  await clickText(page, 'Seed University');
  await sleep(300);
  const institutionOk = await setInputByLabel(page, 'Institution', 'Certified University');
  const degreeOk = await setInputByLabel(page, 'Degree', 'MSc');
  await sleep(SYNC_WAIT);
  profile = await prisma.cvProfile.findUnique({ where: { id: seed.profile.id } });
  const edu = profile?.education?.[0];
  results.push({ area: 'Career Docs', action: 'edit education', status: institutionOk && degreeOk && edu?.institution === 'Certified University' && edu?.degree === 'MSc' ? 'PASS' : 'FAIL', evidence: { institutionOk, degreeOk, education: edu } });

  await clickText(page, 'Skills');
  await sleep(250);
  const skillOk = await setInputByValue(page, 'TypeScript', 'Certified Skill');
  await sleep(SYNC_WAIT);
  profile = await prisma.cvProfile.findUnique({ where: { id: seed.profile.id } });
  results.push({ area: 'Career Docs', action: 'edit skill', status: skillOk && profile?.skills?.[0]?.name === 'Certified Skill' ? 'PASS' : 'FAIL', evidence: { skillOk, skill: profile?.skills?.[0] } });

  const photoArea = await page.evaluate(() => (document.body.textContent || '').includes('Profile Photo'));
  results.push({ area: 'Career Docs', action: 'photo area presence', status: photoArea ? 'PASS' : 'FAIL', evidence: { photoArea } });

  await clickText(page, 'Design');
  await waitFor(
    () => page.evaluate(() => document.querySelectorAll('button[data-cv-template-id]').length),
    (count) => Number(count) > 0,
    8000,
    300,
  );
  const beforeTemplate = (await prisma.cvDocument.findUnique({ where: { id: seed.doc.id } }))?.templateId || null;
  const templateClicked = await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button[data-cv-template-id]')) as HTMLButtonElement[];
    const button = buttons.find((item) => !item.disabled);
    if (!button) return false;
    button.click();
    return true;
  });
  await sleep(SYNC_WAIT);
  const afterTemplate = (await prisma.cvDocument.findUnique({ where: { id: seed.doc.id } }))?.templateId || null;
  results.push({ area: 'Career Docs', action: 'template change', status: templateClicked && beforeTemplate !== afterTemplate ? 'PASS' : 'FAIL', evidence: { templateClicked, beforeTemplate, afterTemplate } });

  await openPath(page, `/career/builder/${seed.doc.id}`, 'input, textarea', 40000);
  const recoveredValues = await page.evaluate(() => Array.from(document.querySelectorAll('input,textarea')).map((item: any) => item.value).filter(Boolean));
  results.push({ area: 'Career Docs', action: 'autosave + refresh recovery', status: recoveredValues.includes('Certified Person') && recoveredValues.includes('Certified Headline') ? 'PASS' : 'FAIL', evidence: { recoveredValues: recoveredValues.slice(0, 12) } });

  const undoPresent = await page.evaluate(() => /undo/i.test(document.body.innerText || '') || Array.from(document.querySelectorAll('button')).some((b) => /^Undo/.test(b.getAttribute('title') || '')));
  results.push({ area: 'Career Docs', action: 'undo/redo controls', status: undoPresent ? 'PASS' : 'NOT_IMPLEMENTED', evidence: { undoPresent } });
}

async function runExcel(ctx: any, results: CertResult[]) {
  const { prisma, page, token, user } = ctx;
  const seed = await seedExcel(prisma, user.id);
  const loaded = await openPath(page, `/excel-studio/editor/${seed.project.id}`, 'td, input[placeholder="Empty cell"]', 40000);
  assert(loaded, 'Excel editor did not load grid/formula bar');

  const apiInitial = await apiGet(token, `/excel-studio/projects/${seed.project.id}`);
  const initialDom = await bodyIncludes(page, 'Header');
  results.push({ area: 'Excel Studio', action: 'open seeded workbook', status: initialDom && apiInitial.status === 200 ? 'PASS' : 'FAIL', evidence: { initialDom, apiStatus: apiInitial.status } });

  assert(await selectExcelCellByText(page, 'Header'), 'A1/Header cell not selectable');
  assert(await setFormulaBar(page, 'Certified Header'), 'Formula bar was not editable for A1');
  await sleep(SYNC_WAIT);
  let project = await prisma.excelProject.findUnique({ where: { id: seed.project.id } });
  let a1 = findCell(project, 'Sheet1', 'A1');
  let operations = await prisma.excelWorkbookOperation.findMany({ where: { projectId: seed.project.id, userId: user.id }, orderBy: { sequence: 'asc' } });
  results.push({ area: 'Excel Studio', action: 'edit cell + create operation', status: a1?.value === 'Certified Header' && operations.some((op: any) => op.type === 'setCellValue') ? 'PASS' : 'FAIL', evidence: { a1, operations: operations.map((op: any) => ({ type: op.type, status: op.status, target: op.target, payload: op.payload })) } });

  assert(await selectExcelCellByText(page, '84'), 'Formula cell C2 not selectable');
  assert(await setFormulaBar(page, '=B2*3'), 'Formula bar was not editable for C2');
  await sleep(SYNC_WAIT);
  project = await prisma.excelProject.findUnique({ where: { id: seed.project.id } });
  const c2 = findCell(project, 'Sheet1', 'C2');
  operations = await prisma.excelWorkbookOperation.findMany({ where: { projectId: seed.project.id, userId: user.id }, orderBy: { sequence: 'asc' } });
  results.push({ area: 'Excel Studio', action: 'edit formula cell', status: c2?.formula === 'B2*3' && operations.some((op: any) => op.type === 'setFormula') ? 'PASS' : 'FAIL', evidence: { c2, operationTypes: operations.map((op: any) => op.type) } });

  const undoClicked = await clickButtonByTitle(page, 'Undo');
  await sleep(SYNC_WAIT);
  project = await prisma.excelProject.findUnique({ where: { id: seed.project.id } });
  const c2AfterUndo = findCell(project, 'Sheet1', 'C2');
  operations = await prisma.excelWorkbookOperation.findMany({ where: { projectId: seed.project.id, userId: user.id }, orderBy: { sequence: 'asc' } });
  const redoClicked = await clickButtonByTitle(page, 'Redo');
  await sleep(SYNC_WAIT);
  project = await prisma.excelProject.findUnique({ where: { id: seed.project.id } });
  const c2AfterRedo = findCell(project, 'Sheet1', 'C2');
  results.push({ area: 'Excel Studio', action: 'undo and redo operation', status: undoClicked && redoClicked && c2AfterUndo?.formula === 'B2*2' && c2AfterRedo?.formula === 'B2*3' ? 'PASS' : 'FAIL', evidence: { undoClicked, redoClicked, c2AfterUndo, c2AfterRedo, operationStatuses: operations.map((op: any) => ({ type: op.type, status: op.status })) } });

  assert(await doubleClickSheetTab(page, 'Sheet1'), 'Sheet1 tab not reachable');
  await sleep(300);
  const renamed = await page.evaluate(() => {
    const input = Array.from(document.querySelectorAll('input')).find((item) => (item as HTMLInputElement).value === 'Sheet1') as HTMLInputElement | undefined;
    if (!input) return false;
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set?.call(input, 'CertSheet');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    return true;
  });
  await sleep(SYNC_WAIT);
  project = await prisma.excelProject.findUnique({ where: { id: seed.project.id } });
  const sheetRenamed = project?.analysis?.worksheets?.some((sheet: any) => sheet.name === 'CertSheet');
  results.push({ area: 'Excel Studio', action: 'rename sheet', status: renamed && sheetRenamed ? 'PASS' : 'FAIL', evidence: { renamed, sheetNames: project?.analysis?.worksheets?.map((sheet: any) => sheet.name) } });

  const addSheet = await clickButtonByTitle(page, 'Add sheet');
  await sleep(SYNC_WAIT);
  project = await prisma.excelProject.findUnique({ where: { id: seed.project.id } });
  const hasSecondSheet = (project?.analysis?.worksheets?.length || 0) >= 2;
  results.push({ area: 'Excel Studio', action: 'add sheet', status: addSheet && hasSecondSheet ? 'PASS' : 'FAIL', evidence: { addSheet, sheetNames: project?.analysis?.worksheets?.map((sheet: any) => sheet.name) } });

  await openPath(page, `/excel-studio/editor/${seed.project.id}`, 'td, input[placeholder="Empty cell"]', 40000);
  const recoveredHeader = await bodyIncludes(page, 'Certified Header');
  const recoveredSheet = await bodyIncludes(page, 'CertSheet');
  operations = await prisma.excelWorkbookOperation.findMany({ where: { projectId: seed.project.id, userId: user.id }, orderBy: { sequence: 'asc' } });
  results.push({ area: 'Excel Studio', action: 'refresh recovery + operation log', status: recoveredHeader && recoveredSheet && operations.length >= 4 ? 'PASS' : 'FAIL', evidence: { recoveredHeader, recoveredSheet, operations: operations.map((op: any) => ({ sequence: op.sequence, type: op.type, status: op.status })) } });

  const exportAvailable = await page.evaluate(() => /export/i.test(document.body.innerText || ''));
  results.push({ area: 'Excel Studio', action: 'export button availability', status: exportAvailable ? 'PASS' : 'FAIL', evidence: { exportAvailable } });
}

async function run() {
  const results: CertResult[] = [];
  await withSession(async (ctx) => {
    await runPdf(ctx, results);
    await runCareer(ctx, results);
    await runExcel(ctx, results);
  });

  fs.mkdirSync(OUT, { recursive: true });
  const report = {
    generatedAt: new Date().toISOString(),
    frontend: FRONTEND,
    api: API,
    results,
    summary: {
      pass: results.filter((item) => item.status === 'PASS').length,
      fail: results.filter((item) => item.status === 'FAIL').length,
      notImplemented: results.filter((item) => item.status === 'NOT_IMPLEMENTED').length,
    },
  };
  fs.writeFileSync(path.join(OUT, 'editor-docs-cert.json'), JSON.stringify(report, null, 2));
  for (const item of results) {
    const mark = item.status === 'PASS' ? '✓' : item.status === 'NOT_IMPLEMENTED' ? '○' : '✗';
    console.log(`${mark} ${item.area} — ${item.action}: ${item.status}`);
  }
  console.log(`\nDocs editor certification: ${report.summary.pass} PASS, ${report.summary.fail} FAIL, ${report.summary.notImplemented} NOT_IMPLEMENTED`);
  if (report.summary.fail > 0) process.exit(1);
}

run().catch((error) => {
  console.error('DOCS CERT ERROR', error?.stack || error);
  process.exit(1);
});
