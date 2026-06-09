/**
 * Ω.PRODUCT.3B — GO/NO-GO feasibility probe for live editor certification.
 * Seeds a real deck via Prisma, authenticates, and loads the live presentation
 * editor headlessly to confirm it renders + is driveable. Read-only verdict.
 */
import puppeteer from 'puppeteer';
import { PrismaService } from '../src/prisma/prisma.service';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3000';
const API = process.env.BACKEND_URL || 'http://localhost:4000/api';

async function main() {
  const ts = Date.now();
  const email = `editorprobe-${ts}@example.com`;
  const reg = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password: 'Test1234!@#', name: 'Editor Probe' }) });
  const { token, user } = await reg.json() as any;
  if (!token) { console.log('NO-GO: registration did not return a token'); process.exit(1); }
  console.log(`auth ok (user ${user.id})`);

  const prisma = new PrismaService(); await prisma.$connect();
  const p: any = prisma as any;
  const project = await p.project.create({ data: { userId: user.id, name: 'Editor Probe Project', documentFormat: 'slides', status: 'generated' } });
  const deck = await p.deck.create({ data: { projectId: project.id, title: 'Editor Probe Deck', status: 'ready', exportReady: true } });
  const slide = await p.slide.create({ data: { deckId: deck.id, type: 'cover', order: 0, title: 'Cover', subtitle: 'probe', content: {}, elementsVersion: 1 } });
  const now = new Date();
  await p.slideElement.createMany({ data: [
    { slideId: slide.id, type: 'heading', name: 'Title', order: 0, x: 8, y: 34, width: 84, height: 20, zIndex: 1, content: { text: 'Live Editor Probe Title' }, style: { fontSize: 48, color: '#111827' }, createdAt: now, updatedAt: now },
    { slideId: slide.id, type: 'paragraph', name: 'Body', order: 1, x: 8, y: 58, width: 84, height: 12, zIndex: 2, content: { text: 'Seeded paragraph element for the live editor probe.' }, style: { fontSize: 20, color: '#374151' }, createdAt: now, updatedAt: now },
  ] });
  console.log(`seeded project=${project.id} deck=${deck.id} slide=${slide.id}`);

  const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000 });
  await page.evaluateOnNewDocument((t, u) => { try { localStorage.setItem('token', t); localStorage.setItem('pitchonix-auth', t); localStorage.setItem('user', JSON.stringify(u)); } catch {} }, token, user);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(String(e).slice(0, 120)));

  // Drive the REAL login form so the server issues a proper session cookie.
  console.log('logging in via the real login form…');
  await page.goto(`${FRONTEND}/login`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1000));
  try {
    await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 15000 });
    await page.type('input[type="email"], input[name="email"]', email, { delay: 10 });
    await page.type('input[type="password"], input[name="password"]', 'Test1234!@#', { delay: 10 });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => null),
      page.click('button[type="submit"]').catch(() => page.keyboard.press('Enter')),
    ]);
    await new Promise((r) => setTimeout(r, 1500));
    console.log(`post-login url: ${page.url()}`);
  } catch (e: any) { console.log('login form not drivable:', e?.message?.slice(0, 100)); }

  const url = `${FRONTEND}/projects/${project.id}/edit/${slide.id}`;
  console.log(`navigating ${url}`);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });

  let rendered = false, sawElements = 0, finalUrl = '';
  try {
    await page.waitForSelector('[data-element-id]', { timeout: 30000 });
    rendered = true;
  } catch { /* */ }
  await new Promise((r) => setTimeout(r, 1500));
  finalUrl = page.url();
  sawElements = await page.evaluate(() => document.querySelectorAll('[data-element-id]').length);
  const bodyText = (await page.evaluate(() => document.body.innerText || '')).slice(0, 200);
  await page.screenshot({ path: '/tmp/editor-probe.png' });

  console.log(`\n=== PROBE RESULT ===`);
  console.log(`finalUrl: ${finalUrl}`);
  console.log(`redirected to login? ${/login|signin|auth/i.test(finalUrl)}`);
  console.log(`editor rendered ([data-element-id]): ${rendered} · elements seen: ${sawElements}`);
  console.log(`page errors: ${errors.length ? errors.slice(0, 3).join(' | ') : 'none'}`);
  console.log(`body excerpt: ${JSON.stringify(bodyText)}`);
  console.log(`verdict: ${rendered && sawElements > 0 ? 'GO — editor is live-driveable' : 'NO-GO — see above'}`);

  await browser.close(); await prisma.$disconnect();
}
main().catch((e) => { console.error('PROBE ERROR', e?.message || e); process.exit(1); });
