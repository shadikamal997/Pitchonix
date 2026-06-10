/**
 * Ω.PRODUCT.3B — live editor certification shared library.
 * Seeds real data (Prisma), logs in via the real form, opens the editor,
 * and exposes helpers for real browser-driven journeys + DB verification.
 */
import puppeteer from 'puppeteer';
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

export async function withProbe(fn: (ctx: any) => Promise<void>) {
  const prisma = new PrismaService(); await prisma.$connect();
  const p: any = prisma as any;
  const sess = await makeSession();
  const seed = await seedDeck(p, sess.user.id);
  const { browser, page } = await login(sess.token, sess.user, sess.email);
  try { await fn({ prisma: p, page, browser, token: sess.token, ...sess, ...seed }); }
  finally { await browser.close(); await prisma.$disconnect(); }
}
