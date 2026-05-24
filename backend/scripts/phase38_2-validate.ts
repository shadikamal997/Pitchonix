/**
 * Phase 38.2 — PPTX Enterprise Fidelity validation
 *
 *   38.2A — SmartArt importer (smartart-importer.ts)
 *   38.2B — OLE objects (ole-importer.ts)
 *   38.2C — Full theme inheritance (theme-inheritance.ts)
 *   38.2D — Advanced animations (motion path, exit, emphasis, paragraph, repeat)
 *   38.2E — MotionPathEditor (frontend)
 *   38.2F — Pixel diff (visual-fidelity.ts via pixelmatch)
 *   38.2G — Golden PPTX suite (golden-fixtures.ts — 7 archetypes)
 *   38.2H — Compatibility report (ImportReport.compatibility)
 *   38.2I — Export compatibility report (ExportCompatReportService)
 *   38.2J — 50/100/250/500 slide perf bench
 *   38.2K — Live round-trip across the golden suite
 *
 *   Static source-scan + live execution + benchmarks.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { roundTrip } from '../src/pptx-import/round-trip';
import { buildGoldenFixtures } from '../src/pptx-import/golden-fixtures';
import { diffDecks } from '../src/pptx-import/visual-fidelity';

const FE       = path.join(__dirname, '..', '..', 'frontend');
const BE       = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));
const existsFE = (rel: string): boolean => fs.existsSync(path.join(FE, rel));

let fail = 0;
let total = 0;
function check(label: string, ok: boolean): void {
  total++;
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 38.2 — PPTX Enterprise Fidelity validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('38.2A — SmartArt');
  check('smartart-importer.ts exists', existsBE('src/pptx-import/smartart-importer.ts'));
  const sa = readBE('src/pptx-import/smartart-importer.ts');
  check('reads dgm:dataModel + pt + cxn',         /dgm:dataModel/.test(sa) && /dgm:pt/.test(sa) && /dgm:cxnLst/.test(sa));
  check('kind inference covers 8 layouts',        ['process', 'cycle', 'hierarch', 'pyramid', 'relat', 'matrix', 'list', 'picture'].every((k) => sa.includes(k)));
  check('flattens pre-rendered shape tree',       /dsp:spTree|p:spTree/.test(sa));

  console.log('\n38.2B — OLE objects');
  check('ole-importer.ts exists', existsBE('src/pptx-import/ole-importer.ts'));
  const ol = readBE('src/pptx-import/ole-importer.ts');
  check('reads ppt/embeddings/* + writes to uploads', /ppt\/embeddings\//.test(ol) && /writeFileSync/.test(ol));
  check('detects excel/word/pdf/powerpoint kinds',  /'excel'/.test(ol) && /'word'/.test(ol) && /'pdf'/.test(ol) && /'powerpoint'/.test(ol));

  console.log('\n38.2C — Theme inheritance');
  check('theme-inheritance.ts exists', existsBE('src/pptx-import/theme-inheritance.ts'));
  const ti = readBE('src/pptx-import/theme-inheritance.ts');
  check('walks theme → master → layout → slide chain',
    /resolveTokensForSlide/.test(ti) && /masterPath/.test(ti) && /layoutPath/.test(ti) && /sBg/.test(ti));
  check('resolves placeholders + background',     /placeholders/.test(ti) && /background/.test(ti));

  console.log('\n38.2D + 38.2E — Advanced animations + motion paths');
  const aw = readBE('src/slide-export/ooxml-animation-writer.ts');
  check('writer covers entry/exit/emphasis/path', /presetClass="exit"/.test(aw) && /presetClass="emph"/.test(aw) && /presetClass="path"/.test(aw));
  check('animMotion uses motionPath value',       /<p:animMotion/.test(aw) && /motionPath/.test(aw));
  check('repeat + byParagraph supported',         /repeatCount/.test(aw) && /pRg/.test(aw));
  const sas = readBE('src/slide-animations/slide-animations.service.ts');
  check('service type supports class + motionPath + repeat',
    /AnimationClass/.test(sas) && /motionPath\?:/.test(sas) && /repeat\?:/.test(sas));
  check('MotionPathEditor component exists',      existsFE('features/pptx-editing/MotionPathEditor.tsx'));
  const mp = readFE('features/pptx-editing/MotionPathEditor.tsx');
  check('MotionPathEditor supports line/curve/custom', /line.*curve.*custom|'line', 'curve', 'custom'/.test(mp));
  const apanel = readFE('features/pptx-editing/AnimationsPanel.tsx');
  check('AnimationsPanel shows class selector',   /CLASS_LABELS/.test(apanel));

  console.log('\n38.2F — Pixel diff');
  check('visual-fidelity.ts exists',              existsBE('src/pptx-import/visual-fidelity.ts'));
  const vf = readBE('src/pptx-import/visual-fidelity.ts');
  check('uses pixelmatch + pngjs',                /pixelmatch/.test(vf) && /from\s+['"]pngjs['"]/.test(vf));
  check('diffDecks + per-slide breakdown',        /diffDecks/.test(vf) && /SlideDiff/.test(vf) && /driftBreakdown/.test(vf));

  console.log('\n38.2G — Golden PPTX suite');
  check('golden-fixtures.ts exists',              existsBE('src/pptx-import/golden-fixtures.ts'));
  const gf = readBE('src/pptx-import/golden-fixtures.ts');
  check('covers 7 archetypes',                    ['investor', 'sales', 'corporate', 'training', 'financial', 'healthcare', 'enterprise'].every((k) => gf.includes(`'${k}'`)));

  console.log('\n38.2H + 38.2I — Compatibility reports');
  const svc = readBE('src/pptx-import/pptx-import.service.ts');
  check('ImportReport has compatibility section', /CompatibilityReport/.test(svc) && /partiallyImported/.test(svc));
  check('Export compat report service exists',    existsBE('src/slide-export/export-compat-report.service.ts'));
  const ec = readBE('src/slide-export/export-compat-report.service.ts');
  check('flags motion path / smartArt / OLE / chart downgrades',
    /motionPath/.test(ec) && /smartArt/.test(ec) && /oleObject/.test(ec) && /chartKind/.test(ec));

  // ===========================================================================
  //  Live round-trip across the golden suite (38.2K)
  // ===========================================================================
  console.log('\n38.2K — Golden suite round-trip');
  let aggScore = 0;
  let aggN = 0;
  let fixtureBreakdown: string[] = [];
  try {
    const service = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    for (const f of fixtures) {
      const rt = await roundTrip(service, f.buffer);
      aggScore += rt.diff.fidelityScore;
      aggN++;
      fixtureBreakdown.push(`${f.name.padEnd(10)} (${f.slides} slides) → fidelity ${(rt.diff.fidelityScore * 100).toFixed(1)}%`);
      check(`${f.name} round-trip fidelity ≥ 0.65`, rt.diff.fidelityScore >= 0.65);
    }
  } catch (e: any) {
    check(`golden suite threw: ${e?.message}`, false);
  }
  const meanGolden = aggN > 0 ? aggScore / aggN : 0;
  for (const line of fixtureBreakdown) console.log(`    ${line}`);

  // ===========================================================================
  //  Pixel diff sanity (38.2F live check on synthetic deck)
  // ===========================================================================
  console.log('\n38.2F — Pixel diff sanity');
  let pixelScore = 0;
  try {
    const service = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    const investor = fixtures.find((f) => f.name === 'investor')!;
    const parsedA = service.parseBuffer(investor.buffer);
    const parsedB = service.parseBuffer(investor.buffer);   // identical → should diff = 0
    const dd = await diffDecks(parsedA, parsedB);
    pixelScore = dd.fidelityScore;
    check(`pixel diff on identical decks = 1.0 (got ${pixelScore})`, pixelScore >= 0.99);
    check(`pixel diff worstRatio < 0.05 (got ${dd.worstRatio})`,    dd.worstRatio < 0.05);
  } catch (e: any) {
    check(`pixel diff threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Benchmarks (38.2J) — 50 / 100 / 250 / 500 slides
  // ===========================================================================
  console.log('\n38.2J — Bench (synthetic decks)');
  const benches: Record<number, number> = {};
  try {
    const service = new (PptxImportService as any)(null);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PptxGenJS = require('pptxgenjs');
    for (const N of [50, 100, 250, 500]) {
      const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
      for (let i = 0; i < N; i++) {
        const s = p.addSlide();
        s.addText(`Slide ${i + 1}`, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
        s.addText(`Body for slide ${i + 1}`, { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 16 });
      }
      const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
      const t0 = Date.now();
      service.parseBuffer(buf);
      const dt = Date.now() - t0;
      benches[N] = dt;
      const target = N <= 100 ? 5000 : 10000;
      check(`${N}-slide parse in <${target}ms (took ${dt}ms)`, dt < target);
    }
  } catch (e: any) {
    check(`bench threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\nGolden suite mean fidelity:       ${(meanGolden * 100).toFixed(1)}%`);
  console.log(`Pixel diff (identical sanity):    ${(pixelScore * 100).toFixed(1)}%`);
  console.log(`Benchmarks (ms):                  ${JSON.stringify(benches)}`);
  console.log(`\n${fail === 0 ? `✓ Phase 38.2 — all ${total} checks passed` : `✗ Phase 38.2 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
