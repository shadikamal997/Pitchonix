import fs from 'node:fs';
import path from 'node:path';
import puppeteer from 'puppeteer';

const IN_DIR = process.env.IN_DIR || '/tmp/pitchonix-template-audit-all20-deep';
const OUT_DIR = process.env.OUT_DIR || path.join(IN_DIR, '_contact-sheets');
const CHROME_EXECUTABLE = process.env.CHROME_EXECUTABLE
  || (fs.existsSync('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
    ? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
    : undefined);

const slideTypes = [
  ['cover', 'slide-00-cover.png'],
  ['executive-summary', 'slide-01-executive_summary.png'],
  ['problem', 'slide-02-problem.png'],
  ['solution', 'slide-03-solution.png'],
  ['market', 'slide-04-market_opportunity.png'],
  ['business-model', 'slide-05-business_model.png'],
  ['traction', 'slide-06-traction.png'],
  ['competition', 'slide-07-competition.png'],
  ['team', 'slide-08-team.png'],
  ['roadmap', 'slide-09-roadmap.png'],
  ['pricing', 'slide-10-pricing.png'],
  ['ask', 'slide-11-ask.png'],
];

function imageDataUrl(filePath) {
  return `data:image/png;base64,${fs.readFileSync(filePath).toString('base64')}`;
}

function templateDirs() {
  return fs.readdirSync(IN_DIR)
    .filter((name) => !name.startsWith('_'))
    .map((name) => path.join(IN_DIR, name))
    .filter((candidate) => fs.statSync(candidate).isDirectory())
    .sort();
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const dirs = templateDirs();
  const browser = await puppeteer.launch({
    headless: true,
    ...(CHROME_EXECUTABLE ? { executablePath: CHROME_EXECUTABLE } : {}),
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--allow-file-access-from-files',
      '--window-size=2200,2200',
    ],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 2200, height: 2200, deviceScaleFactor: 1 });

  for (const [label, filename] of slideTypes) {
    const cards = dirs.map((dir) => {
      const templateId = path.basename(dir);
      const imagePath = path.join(dir, filename);
      if (!fs.existsSync(imagePath)) return '';
      return `
        <figure>
          <img src="${imageDataUrl(imagePath)}" />
          <figcaption>${templateId}</figcaption>
        </figure>`;
    }).join('\n');
    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              margin: 0;
              background: #0b0d12;
              color: #f8fafc;
              font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
            }
            .sheet {
              padding: 28px;
              display: grid;
              grid-template-columns: repeat(4, 1fr);
              gap: 18px;
            }
            figure {
              margin: 0;
              padding: 10px;
              background: #151924;
              border: 1px solid rgba(255,255,255,0.12);
              border-radius: 12px;
            }
            img {
              display: block;
              width: 100%;
              aspect-ratio: 16 / 10;
              object-fit: cover;
              border-radius: 6px;
              background: white;
            }
            figcaption {
              margin-top: 8px;
              font-size: 13px;
              color: #cbd5e1;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }
          </style>
        </head>
        <body><main class="sheet">${cards}</main></body>
      </html>`;
    await page.setContent(html, { waitUntil: 'load' });
    const out = path.join(OUT_DIR, `${label}.png`);
    await page.screenshot({ path: out, fullPage: true });
    console.log(out);
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
