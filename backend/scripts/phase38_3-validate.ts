/**
 * Phase 38.3 — PPTX Enterprise Compatibility Finalization validation
 *
 *   38.3A — LibreOffice render adapter (gated; skip when unavailable)
 *   38.3B — Animation import (parses <p:timing> back into SlideAnimation)
 *   38.3C — Live SmartArt editing (SmartArt service + node CRUD)
 *   38.3D — SmartArt round-trip preservation (preserved.dataXml etc)
 *   38.3E — Full text style inheritance (a:lvl1pPr … a:lvl9pPr)
 *   38.3F — Advanced placeholder inheritance (carried by 38.2C resolver)
 *   38.3G — OLE workspace (preview / replace / revert / refresh / versions)
 *   38.3H — Extension XML preservation
 *   38.3I — Visual regression suite
 *   38.3J — 10-archetype golden fixture library
 *   38.3K — Compatibility certification aggregator
 *   38.3L — 1000-slide perf bench
 *
 *   Source-scan + live execution + bench.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { roundTrip } from '../src/pptx-import/round-trip';
import { buildGoldenFixtures } from '../src/pptx-import/golden-fixtures';
import { runVisualRegressionSuite } from '../src/pptx-import/visual-regression';
import { certifyDeck } from '../src/pptx-import/compatibility-certification';
import { isLibreOfficeAvailable } from '../src/pptx-import/libreoffice-renderer';
import { importAnimationsForSlide } from '../src/pptx-import/animation-importer';
import { OoxmlPackage } from '../src/pptx-import/ooxml-parser';
import { exportDeckToPptx } from '../src/slide-export/element-pptx-exporter';

const BE       = path.join(__dirname, '..');
const FE       = path.join(__dirname, '..', '..', 'frontend');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
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
  console.log('Phase 38.3 — PPTX Enterprise Compatibility Finalization\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('38.3B — Animation import');
  check('animation-importer.ts exists', existsBE('src/pptx-import/animation-importer.ts'));
  const ai = readBE('src/pptx-import/animation-importer.ts');
  check('reads p:timing > p:par walker',           /p:timing/.test(ai) && /p:par/.test(ai));
  check('mapPresetBack covers exit/emph/path/entry', /presetClass\b|cls === 'exit'/.test(ai) && /'flyOut'/.test(ai) && /'pulse'/.test(ai));

  console.log('\n38.3C — SmartArt service');
  check('smartart.service.ts exists',  existsBE('src/smartart/smartart.service.ts'));
  const sa = readBE('src/smartart/smartart.service.ts');
  check('node CRUD: add / remove / update / reorder', /addNode/.test(sa) && /removeNode/.test(sa) && /updateNode/.test(sa) && /reorderNode/.test(sa));
  check('changeLayout invalidates preserved XML',     /changeLayout/.test(sa) && /c\.preserved\s*=\s*undefined/.test(sa));
  check('layoutShapes covers process/cycle/hierarchy/pyramid/matrix',
    ['process', 'cycle', 'hierarchy', 'pyramid', 'matrix'].every((k) => sa.includes(`case '${k}'`)));
  check('SmartArt module registered',  /SmartArtModule/.test(readBE('src/app.module.ts')));

  console.log('\n38.3D — SmartArt round-trip preservation');
  const sai = readBE('src/pptx-import/smartart-importer.ts');
  check('preserved.drawingXml/dataXml/layoutXml captured', /drawingXml/.test(sai) && /dataXml/.test(sai) && /layoutXml/.test(sai));

  console.log('\n38.3E — Text-style inheritance');
  check('text-style-inheritance.ts exists', existsBE('src/pptx-import/text-style-inheritance.ts'));
  const tsi = readBE('src/pptx-import/text-style-inheritance.ts');
  check('walks lvl1..lvl9 pPr',     /lvl\${lvl}pPr|a:lvl\$\{lvl\}pPr/.test(tsi) && /lvl <= 9/.test(tsi));
  check('captures bullet + indent + lineSpacing + defaultRun', /bullet/.test(tsi) && /indent/.test(tsi) && /lineSpacing/.test(tsi) && /defaultRun/.test(tsi));

  console.log('\n38.3G — OLE workspace');
  check('ole-workspace.service.ts exists', existsBE('src/ole-workspace/ole-workspace.service.ts'));
  const ow = readBE('src/ole-workspace/ole-workspace.service.ts');
  check('replace + revert + refresh + versions exposed',
    /replace\(/.test(ow) && /revert\(/.test(ow) && /refresh\(/.test(ow) && /versions\(/.test(ow));
  check('OleWorkspaceModule registered', /OleWorkspaceModule/.test(readBE('src/app.module.ts')));

  console.log('\n38.3H — Extension XML');
  check('extension-xml.ts exists', existsBE('src/pptx-import/extension-xml.ts'));
  const ex = readBE('src/pptx-import/extension-xml.ts');
  check('walks p:extLst + a:extLst', /p:extLst/.test(ex) && /a:extLst/.test(ex));

  console.log('\n38.3A + 38.3I — LibreOffice + visual regression');
  check('libreoffice-renderer.ts exists', existsBE('src/pptx-import/libreoffice-renderer.ts'));
  const lo = readBE('src/pptx-import/libreoffice-renderer.ts');
  check('uses LIBREOFFICE_BIN env + isAvailable gate',
    /LIBREOFFICE_BIN/.test(lo) && /isLibreOfficeAvailable/.test(lo));
  check('visual-regression.ts exists', existsBE('src/pptx-import/visual-regression.ts'));
  const vr = readBE('src/pptx-import/visual-regression.ts');
  check('regression suite degrades to internal mode when LibreOffice missing',
    /rendererAvailable/.test(vr) && /diffDecks/.test(vr));

  console.log('\n38.3J — 10-archetype fixtures');
  const gf = readBE('src/pptx-import/golden-fixtures.ts');
  check('10 fixture kinds (incl consulting/government/productLaunch)',
    ['investor', 'sales', 'corporate', 'training', 'financial', 'healthcare', 'enterprise', 'consulting', 'government', 'productLaunch']
      .every((k) => gf.includes(`'${k}'`)));

  console.log('\n38.3K — Compatibility certification');
  check('compatibility-certification.ts exists', existsBE('src/pptx-import/compatibility-certification.ts'));
  const cc = readBE('src/pptx-import/compatibility-certification.ts');
  check('aggregates import/export/round-trip/visual into a banded score',
    /scores.import/.test(cc) && /scores.export/.test(cc) && /scores.roundTrip/.test(cc) && /scores.visual/.test(cc) && /platinum/.test(cc));

  // SmartArt editor (frontend)
  console.log('\n38.3C — SmartArt editor (frontend)');
  check('SmartArtEditor.tsx exists', existsFE('features/pptx-editing/SmartArtEditor.tsx'));
  const sae = readFE('features/pptx-editing/SmartArtEditor.tsx');
  check('SmartArtEditor surfaces kind dropdown + node CRUD',
    /KIND_OPTIONS/.test(sae) && /changeKind/.test(sae) && /addRoot/.test(sae));

  // ===========================================================================
  //  Live: animation import round-trip
  // ===========================================================================
  console.log('\n38.3B — Live animation round-trip');
  let animImportCount = 0;
  try {
    const svc = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    // Build a synthetic deck with an animation, export it through our writer
    // (which emits <p:timing>), then re-parse and verify the importer recovered it.
    const renderDeck = {
      title: 'Anim test',
      slides: [{
        index: 0, total: 1, title: 'Anim test',
        background: null, themeTokens: null,
        elements: [{
          id: '12345', slideId: 's1', type: 'paragraph', order: 0,
          x: 10, y: 30, width: 80, height: 10,
          rotation: 0, zIndex: 0, locked: false, visible: true,
          content: { text: 'Animated' }, data: null, style: null,
          animations: [{
            id: 'a1', class: 'entr', effect: 'fade',
            duration: 600, delay: 100, order: 0, trigger: 'click',
          }],
          accessibility: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }],
        speakerNotes: null, transition: null,
      }],
    };
    const buf = await exportDeckToPptx(renderDeck as any);
    // Use OoxmlPackage to find the slide path and run the animation importer directly.
    const pkg = new OoxmlPackage(buf);
    const [slidePath] = pkg.slidePaths();
    const imported = importAnimationsForSlide(pkg, slidePath);
    animImportCount = imported.length;
    check(`animation round-trip recovers at least one anim (got ${animImportCount})`, animImportCount >= 1);
    if (animImportCount > 0) {
      check(`recovered effect is 'fade' (got ${imported[0].effect})`, imported[0].effect === 'fade');
      check(`recovered class is 'entr'`,                              imported[0].class  === 'entr');
    }
    // Silence unused warning.
    void fixtures;
  } catch (e: any) {
    check(`animation round-trip threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: visual regression on the 10-archetype suite (skips LibreOffice if absent)
  // ===========================================================================
  console.log('\n38.3I — Live visual regression');
  const hasLO = await isLibreOfficeAvailable();
  console.log(`    LibreOffice available: ${hasLO ? 'YES (using as ground truth)' : 'NO (degrading to internal-mode diff)'}`);
  let regressionMean = 0;
  try {
    const svc = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    const reg = await runVisualRegressionSuite(svc, fixtures, 'compare');
    regressionMean = reg.averageFidelity;
    check(`regression suite ran for 10 fixtures (got ${reg.fixtures.length})`, reg.fixtures.length === 10);
    check(`regression mean fidelity ≥ 0.8 (got ${regressionMean})`, regressionMean >= 0.8);
  } catch (e: any) {
    check(`visual regression threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: certification on the investor fixture
  // ===========================================================================
  console.log('\n38.3K — Certification on investor fixture');
  let cert: any;
  try {
    const svc = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    const investor = fixtures.find((f) => f.name === 'investor')!;
    cert = await certifyDeck(svc, investor.buffer);
    check(`certification overall ≥ 70 (got ${cert.overall}, band=${cert.band})`, cert.overall >= 70);
    check(`scores.import/export/roundTrip/visual all present`,
      typeof cert.scores.import === 'number' && typeof cert.scores.export === 'number' &&
      typeof cert.scores.roundTrip === 'number' && typeof cert.scores.visual === 'number');
  } catch (e: any) {
    check(`certification threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Bench (38.3L) — 1000-slide synthetic deck
  // ===========================================================================
  console.log('\n38.3L — 1000-slide bench');
  let bench1000 = -1;
  try {
    const svc = new (PptxImportService as any)(null);
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PptxGenJS = require('pptxgenjs');
    const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
    for (let i = 0; i < 1000; i++) {
      const s = p.addSlide();
      s.addText(`Slide ${i + 1}`, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 24, bold: true });
      s.addText(`Body for slide ${i + 1}`, { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 14 });
    }
    const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
    const t0 = Date.now();
    const result = svc.parseBuffer(buf);
    bench1000 = Date.now() - t0;
    check(`1000-slide parse in <30000ms (took ${bench1000}ms, ${result.slides.length} slides)`,
      bench1000 < 30000 && result.slides.length === 1000);
  } catch (e: any) {
    check(`bench threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log('');
  if (cert) {
    console.log(`Certification (investor fixture):`);
    console.log(`  Import      : ${cert.scores.import}`);
    console.log(`  Export      : ${cert.scores.export}`);
    console.log(`  Round-trip  : ${cert.scores.roundTrip}`);
    console.log(`  Visual      : ${cert.scores.visual}`);
    console.log(`  Overall     : ${cert.overall} (${cert.band})`);
  }
  console.log(`Regression mean fidelity (10 fixtures): ${(regressionMean * 100).toFixed(1)}%`);
  console.log(`1000-slide parse:                       ${bench1000}ms`);
  console.log(`Animation round-trip recovered count:   ${animImportCount}`);
  console.log(`\n${fail === 0 ? `✓ Phase 38.3 — all ${total} checks passed` : `✗ Phase 38.3 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
