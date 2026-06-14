/**
 * Ω.PRODUCT.3B — live editor certification shared library.
 * Seeds real data (Prisma), logs in via the real form, opens the editor,
 * and exposes helpers for real browser-driven journeys + DB verification.
 */
import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';
import { PrismaService } from '../src/prisma/prisma.service';

export const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3002';
export const API = process.env.BACKEND_URL || 'http://localhost:4000/api';
export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function makeSession() {
  const ts = Date.now() + Math.floor(Math.random() * 1000);
  const email = `editorcert-${ts}@example.com`;
  const reg = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Test1234!@#', name: 'Editor Cert' }) });
  const { token, user } = await reg.json() as any;
  if (!token) throw new Error('registration failed');
  return { email, token, user };
}

export async function seedDeck(prisma: any, userId: string, els = 2) {
  // Element endpoints are guarded by workspace role (RequireRole) — a fresh user
  // has no workspace until onboarding, so seed org + workspace + owner membership.
  const uniq = `${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
  const org = await prisma.organization.create({ data: { slug: `cert-org-${uniq}`, name: 'Editor Cert Org', ownerId: userId } });
  const workspace = await prisma.workspace.create({ data: { organizationId: org.id, name: 'Editor Cert Workspace' } });
  await prisma.workspaceMember.create({ data: { workspaceId: workspace.id, userId, role: 'owner' } });
  const project = await prisma.project.create({ data: { userId, workspaceId: workspace.id, name: 'Editor Cert Project', documentFormat: 'slides', status: 'generated' } });
  const deck = await prisma.deck.create({ data: { projectId: project.id, title: 'Editor Cert Deck', status: 'ready', exportReady: true } });
  const slide = await prisma.slide.create({ data: { deckId: deck.id, type: 'cover', order: 0, title: 'Cover', subtitle: 'cert', content: {}, elementsVersion: 1 } });
  const now = new Date();
  const data = [
    { slideId: slide.id, type: 'heading', name: 'Title', order: 0, x: 8, y: 30, width: 84, height: 18, zIndex: 1, visible: true, content: { text: 'SEED Title Alpha' }, style: { fontSize: 44, color: '#111827' }, createdAt: now, updatedAt: now },
    { slideId: slide.id, type: 'paragraph', name: 'Body', order: 1, x: 8, y: 54, width: 84, height: 14, zIndex: 2, visible: true, content: { text: 'SEED Body paragraph beta.' }, style: { fontSize: 20, color: '#374151' }, createdAt: now, updatedAt: now },
  ].slice(0, els);
  await prisma.slideElement.createMany({ data });
  return { org, workspace, project, deck, slide };
}

// ── per-editor seeds (userId-owned; no workspace guard on these editors) ──────
export async function seedPdf(prisma: any, userId: string) {
  const project = await prisma.project.create({ data: { userId, name: 'PDF Cert Project', documentFormat: 'pdf', status: 'generated' } });
  const doc = await prisma.pdfDocument.create({ data: { projectId: project.id, title: 'PDF Cert Document', documentType: 'business_plan', templateType: 'clean_business_report', status: 'draft', metadata: { templateType: 'clean_business_report' } } });
  const now = new Date();
  const page = await prisma.pdfPage.create({ data: { documentId: doc.id, order: 0, pageNumber: 1, pageType: 'cover', title: 'Cover', content: { text: 'PDF SEED original body text', html: '<p>PDF SEED original body text</p>', placedImages: [{ id: 'cert-image-1', url: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22160%22 height=%2290%22%3E%3Crect width=%22160%22 height=%2290%22 fill=%22%234F7563%22/%3E%3Ctext x=%2280%22 y=%2248%22 text-anchor=%22middle%22 fill=%22white%22 font-size=%2218%22%3ECert%3C/text%3E%3C/svg%3E', x: 8, y: 18, width: 18, height: 10, fit: 'cover', opacity: 1, zIndex: 4 }] }, createdAt: now, updatedAt: now } });
  return { project, doc, page };
}

export async function seedCareer(prisma: any, userId: string) {
  const profile = await prisma.cvProfile.create({ data: { userId, personal: { fullName: 'Cert Person', headline: 'Original Headline', summary: 'Original summary text.', location: 'Austin' }, experience: [{ id: 'x1', company: 'SeedCo', role: 'Engineer', start: '2020', bullets: ['did things'] }], education: [{ id: 'e1', institution: 'Seed University', degree: 'BS', field: 'CS', start: '2016', end: '2020' }], skills: [{ id: 's1', name: 'TypeScript', category: 'technical', level: 'expert' }], languages: [], projects: [], certifications: [], awards: [], publications: [], references: [] } });
  const doc = await prisma.cvDocument.create({ data: { profileId: profile.id, userId, doctype: 'cv', title: 'Cert CV', content: { sectionOrder: ['header', 'summary', 'experience', 'education', 'skills'] } } });
  return { profile, doc };
}

export async function seedExcel(prisma: any, userId: string) {
  const workbookDir = path.join(process.cwd(), 'uploads', 'excel-studio', 'workbooks');
  fs.mkdirSync(workbookDir, { recursive: true });
  const filename = `editor-cert-${Date.now()}-${Math.floor(Math.random() * 1e6)}.xlsx`;
  const relPath = path.join('uploads', 'excel-studio', 'workbooks', filename);
  const fullPath = path.join(process.cwd(), relPath);
  const aoa = [
    ['Header', 'Amount', 'Total'],
    ['Units', 42, { f: 'B2*2', v: 84 }],
    ['Notes', 'Original', 'Ready'],
  ];
  const workbook = XLSX.utils.book_new();
  const worksheet = XLSX.utils.aoa_to_sheet(aoa);
  worksheet['!cols'] = [{ wch: 18 }, { wch: 14 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1');
  XLSX.writeFile(workbook, fullPath);

  const cells = [
    [
      { address: 'A1', row: 0, column: 0, value: 'Header', rawValue: 'Header', type: 's', style: { bold: true } },
      { address: 'B1', row: 0, column: 1, value: 'Amount', rawValue: 'Amount', type: 's', style: { bold: true } },
      { address: 'C1', row: 0, column: 2, value: 'Total', rawValue: 'Total', type: 's', style: { bold: true } },
    ],
    [
      { address: 'A2', row: 1, column: 0, value: 'Units', rawValue: 'Units', type: 's' },
      { address: 'B2', row: 1, column: 1, value: '42', rawValue: 42, type: 'n' },
      { address: 'C2', row: 1, column: 2, value: '84', rawValue: 84, formula: 'B2*2', type: 'n' },
    ],
    [
      { address: 'A3', row: 2, column: 0, value: 'Notes', rawValue: 'Notes', type: 's' },
      { address: 'B3', row: 2, column: 1, value: 'Original', rawValue: 'Original', type: 's' },
      { address: 'C3', row: 2, column: 2, value: 'Ready', rawValue: 'Ready', type: 's' },
    ],
  ];
  const analysis = {
    summary: {
      sheets: 1,
      rows: 3,
      columns: 3,
      tables: 1,
      namedRanges: 0,
      charts: 0,
      pivots: 0,
      formulas: 1,
      errorCells: 0,
      validations: 0,
      conditionalFormatting: 0,
      hiddenSheets: 0,
      mergedCells: 0,
      duplicateRows: 0,
      blankRows: 0,
      blankColumns: 0,
      blankCells: 0,
      dependencies: 1,
    },
    scores: {
      workbookQuality: 86,
      formulaIntegrity: 90,
      formattingConsistency: 82,
      readability: 88,
      dashboardReadiness: 78,
      dataQuality: 84,
      visualizationQuality: 72,
      executiveReadiness: 80,
      overall: 84,
    },
    scoreExplanations: {
      workbookQuality: ['Certification fixture with structured data.'],
      formulaIntegrity: ['One formula is present and parseable.'],
      formattingConsistency: ['Header row uses bold styling.'],
      readability: ['Compact sheet with clear labels.'],
      dashboardReadiness: ['Small source table can power a dashboard.'],
      dataQuality: ['No blanks in the source range.'],
      visualizationQuality: ['No charts in the seed workbook.'],
      executiveReadiness: ['Usable baseline workbook for live certification.'],
      overall: ['Workbook is valid and editable.'],
    },
    issues: [],
    worksheets: [{
      id: 'sheet1',
      name: 'Sheet1',
      rows: 3,
      columns: 3,
      usedRange: 'A1:C3',
      hidden: false,
      mergedCells: 0,
      errorCells: 0,
      currencyLikeCells: 0,
      dateLikeCells: 0,
      numericCells: 2,
      formulas: 1,
      blanks: 0,
      blankRows: 0,
      blankColumns: 0,
      duplicateRows: 0,
      previewRows: [['Header', 'Amount', 'Total'], ['Units', '42', '84'], ['Notes', 'Original', 'Ready']],
      cells,
      merges: [],
      columnWidths: [18, 14, 14],
      rowHeights: [],
    }],
    recommendations: ['Certification fixture ready for live editor operations.'],
    auditGeneratedAt: new Date().toISOString(),
  };
  const project = await prisma.excelProject.create({ data: { userId, title: 'Excel Cert Project', filename: 'cert.xlsx', originalFilePath: relPath, mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', fileSize: fs.statSync(fullPath).size, status: 'analyzed', activeTemplateId: 'executive-emerald', analysis, enhancementPlan: [], appliedActions: [], exports: [] } });
  return { project };
}

export async function login(token: string, user: any, email: string) {
  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--window-size=1600,1000'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  await page.evaluateOnNewDocument((t: string, u: any) => { try { localStorage.setItem('token', t); localStorage.setItem('pitchonix-auth', t); localStorage.setItem('user', JSON.stringify(u)); } catch {} }, token, user);
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 20000 });
  await page.type('input[type="email"], input[name="email"]', email, { delay: 8 });
  await page.type('input[type="password"], input[name="password"]', 'Test1234!@#', { delay: 8 });
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
    page.click('button[type="submit"]').catch(() => page.keyboard.press('Enter')),
  ]);
  await sleep(1200);
  return { browser, page };
}

/** Open the editor for a slide and wait for the canvas elements to mount. */
export async function openEditor(page: any, projectId: string, slideId: string, timeoutMs = 40000) {
  await page.goto(`${FRONTEND}/projects/${projectId}/edit/${slideId}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const n = await page.evaluate(() => document.querySelectorAll('[data-element-id]').length).catch(() => 0);
    if (n > 0) return n;
    await sleep(800);
  }
  return 0;
}

export async function dbElements(prisma: any, slideId: string) {
  return prisma.slideElement.findMany({ where: { slideId }, orderBy: { order: 'asc' } });
}

export async function apiElements(token: string, slideId: string) {
  const r = await fetch(`${API}/slides/${slideId}/elements`, { headers: { Authorization: `Bearer ${token}` } });
  if (!r.ok) return { status: r.status, elements: null };
  return { status: r.status, elements: await r.json() };
}

/** Open an arbitrary editor path and wait for one of the given selectors. */
export async function openPath(page: any, urlPath: string, waitSelector: string, timeoutMs = 40000) {
  await page.goto(`${FRONTEND}${urlPath}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const found = await page.evaluate((s: string) => !!document.querySelector(s), waitSelector).catch(() => false);
    if (found) return true;
    await sleep(800);
  }
  return false;
}

/** Register + login only (no deck seed) — for the doc editors that seed their own. */
export async function withSession(fn: (ctx: any) => Promise<void>) {
  const prisma = new PrismaService(); await prisma.$connect();
  const p: any = prisma as any;
  const sess = await makeSession();
  const { browser, page } = await login(sess.token, sess.user, sess.email);
  try { await fn({ prisma: p, page, browser, ...sess }); }
  finally { await browser.close(); await prisma.$disconnect(); }
}

export async function withProbe(fn: (ctx: any) => Promise<void>) {
  const prisma = new PrismaService(); await prisma.$connect();
  const p: any = prisma as any;
  const sess = await makeSession();
  const seed = await seedDeck(p, sess.user.id);
  const { browser, page } = await login(sess.token, sess.user, sess.email);
  try { await fn({ prisma: p, page, browser, token: sess.token, ...sess, ...seed }); }
  finally { await browser.close(); await prisma.$disconnect(); }
}
