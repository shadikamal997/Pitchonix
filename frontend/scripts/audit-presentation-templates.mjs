import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const FRONTEND = process.env.FRONTEND_URL || 'http://localhost:3002';
const BACKEND = process.env.BACKEND_URL || 'http://localhost:4000/api';
const TOKEN = process.env.PITCHONIX_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;
const DECK_ID = process.env.DECK_ID;
const OUT_DIR = process.env.OUT_DIR || '/tmp/pitchonix-template-audit';
const CHROME_EXECUTABLE = process.env.CHROME_EXECUTABLE
  || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined);

const templates = [
  'crimson-dark-business',
  'purple-gradient-startup',
  'editorial-business-report',
  'dark-luxury-proposal',
  'ultra-minimal-swiss',
  'investor-geometric-beige',
  'yellow-digital-course',
  'light-blue-business-marketing',
  'teal-business-plan',
  'monochrome-corporate-strategy',
  'fintech-investor-deck',
  'startup-pitch-modern',
  'product-launch-showcase',
  'training-course-pro',
  'board-meeting-executive',
  'sales-deck-conversion',
  'strategy-roadmap',
  'agency-campaign-deck',
  'healthcare-clean-brief',
  'sustainability-impact-deck',
];

if (!TOKEN || !PROJECT_ID || !DECK_ID) {
  console.error('Required env: PITCHONIX_TOKEN PROJECT_ID DECK_ID');
  process.exit(2);
}

fs.mkdirSync(OUT_DIR, { recursive: true });

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function api(url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let body;
  try { body = text ? JSON.parse(text) : null; } catch { body = text; }
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text.slice(0, 500)}`);
  return body;
}

async function main() {
  const browser = await puppeteer.launch({
    headless: true,
    ...(CHROME_EXECUTABLE ? { executablePath: CHROME_EXECUTABLE } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--disable-background-networking',
      '--disable-background-timer-throttling',
      '--disable-renderer-backgrounding',
      '--window-size=1600,1000',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1600, height: 1000, deviceScaleFactor: 1 });
  page.on('console', (msg) => {
    const text = msg.text();
    if (/ThrottleException|error|failed|warning/i.test(text)) {
      console.log(`[browser:${msg.type()}] ${text.slice(0, 300)}`);
    }
  });

  await page.goto(FRONTEND, { waitUntil: 'domcontentloaded' });
  await page.evaluate((token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('pitchonix-auth', token);
    document.cookie = `pitchonix-auth=${token}; path=/`;
  }, TOKEN);

  const results = [];

  for (const templateId of templates) {
    console.log(`\n== ${templateId} ==`);
    // Unmount the editor before applying the template so the next load observes
    // the persisted theme/background metadata from a clean page lifecycle.
    await page.goto('about:blank');
    const switched = await api(`${BACKEND}/slides/deck/${DECK_ID}/apply-template`, {
      method: 'POST',
      body: JSON.stringify({ templateId }),
    });
    const slides = await api(`${BACKEND}/slides/deck/${DECK_ID}`);
    const templateDir = path.join(OUT_DIR, templateId);
    fs.mkdirSync(templateDir, { recursive: true });

    const templateResult = {
      templateId,
      firstSlideId: slides.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))[0]?.id || null,
      slidesGenerated: 0,
      slidesPreserved: switched.slidesApplied,
      elementsRestyled: switched.elementsRestyled,
      slideResults: [],
    };

    for (const slide of slides.sort((a, b) => (a.order ?? 0) - (b.order ?? 0))) {
      const url = `${FRONTEND}/projects/${PROJECT_ID}/edit/${slide.id}`;
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForSelector('[data-element-id]', { timeout: 30000 }).catch(() => null);
      await sleep(500);

      const metrics = await page.evaluate(() => {
        const elements = [...document.querySelectorAll('[data-element-id]')];
        const errors = document.body.innerText.match(/ThrottleException|Too Many Requests|Unhandled Runtime Error|Cannot find module|Error:/gi) || [];
        const stage = document.querySelector('[data-slide-canvas="true"]')
          || (elements.length ? elements[0].parentElement?.parentElement || null : null);
        const stageRect = stage?.getBoundingClientRect?.();
        let outside = 0;
        let zeroish = 0;
        let likelyClipped = 0;
        let overlaps = 0;
        const boxes = [];
        if (stageRect) {
          for (const node of elements) {
            const r = node.getBoundingClientRect();
            if (r.width < 2 || r.height < 2) zeroish += 1;
            if (
              r.left < stageRect.left - 2 ||
              r.top < stageRect.top - 2 ||
              r.right > stageRect.right + 2 ||
              r.bottom > stageRect.bottom + 2
            ) outside += 1;
            if (
              node.scrollWidth > node.clientWidth + 2 ||
              node.scrollHeight > node.clientHeight + 2
            ) likelyClipped += 1;
            if (r.width > 3 && r.height > 3) {
              boxes.push({
                id: node.getAttribute('data-element-id'),
                left: r.left,
                top: r.top,
                right: r.right,
                bottom: r.bottom,
                width: r.width,
                height: r.height,
              });
            }
          }
          for (let i = 0; i < boxes.length; i += 1) {
            for (let j = i + 1; j < boxes.length; j += 1) {
              const a = boxes[i];
              const b = boxes[j];
              const x = Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
              const y = Math.max(0, Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top));
              const area = x * y;
              if (!area) continue;
              const minArea = Math.min(a.width * a.height, b.width * b.height);
              if (area / Math.max(1, minArea) > 0.12) overlaps += 1;
            }
          }
        }
        const thumbs = [...document.querySelectorAll('[data-slide-thumbnail], [data-testid*="thumbnail"], aside canvas, aside [style*="background"]')];
        const thumbnailCount = thumbs.length;
        const warningBadges = [...document.querySelectorAll('*')].filter((n) => {
          const t = n.textContent || '';
          return /ThrottleException|Too Many Requests|⚠|✕/.test(t);
        }).length;
        return {
          elementCount: elements.length,
          outside,
          zeroish,
          likelyClipped,
          overlaps,
          thumbnailCount,
          errors: [...new Set(errors)],
          warningBadges,
          bodyTextLength: document.body.innerText.length,
        };
      });

      const file = path.join(templateDir, `slide-${String(slide.order ?? 0).padStart(2, '0')}-${slide.type || 'slide'}.png`);
      const stageHandle = await page.$('[data-slide-canvas="true"]');
      if (stageHandle) {
        await stageHandle.screenshot({ path: file });
      } else {
        await page.screenshot({ path: file, fullPage: false });
      }
      templateResult.slideResults.push({ id: slide.id, order: slide.order, type: slide.type, screenshot: file, ...metrics });
      console.log(`slide ${slide.order} ${slide.type}: elements=${metrics.elementCount} outside=${metrics.outside} clipped=${metrics.likelyClipped} overlaps=${metrics.overlaps} errors=${metrics.errors.length}`);
    }

    results.push(templateResult);
    fs.writeFileSync(path.join(OUT_DIR, 'report.json'), JSON.stringify(results, null, 2));
  }

  await browser.close();
  const summary = results.map((r) => ({
    templateId: r.templateId,
    slides: r.slideResults.length,
    errors: r.slideResults.reduce((n, s) => n + s.errors.length, 0),
    blank: r.slideResults.filter((s) => s.elementCount === 0).length,
    outside: r.slideResults.reduce((n, s) => n + s.outside, 0),
    clipped: r.slideResults.reduce((n, s) => n + s.likelyClipped, 0),
    overlaps: r.slideResults.reduce((n, s) => n + s.overlaps, 0),
    elementsCreated: r.elementsCreated,
  }));
  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify(summary, null, 2));
  console.table(summary);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
