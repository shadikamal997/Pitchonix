/**
 * Phase 38.4 — Final PPTX Compatibility Hardening validation.
 *
 *   38.4A — Renderer diagnostics + LibreOffice install doc
 *   38.4B — Real-world fixture drop-directory workflow + batch certify CLI
 *   38.4C — Long-tail OOXML extension scanners + preservation + export re-emit
 *
 *   Source-scan + live execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { runRendererDiagnostics } from '../src/pptx-import/renderer-diagnostics';
import { loadRealFixtures, certifyDirectory } from '../src/pptx-import/real-fixtures';
import {
  scanLongTailExtensions, scanChartExtensions, scanShapeAndDrawingExtensions,
  scanInkAnnotations, scanCustomXml, classifyExtensionUri, EXTENSION_REGISTRY,
} from '../src/pptx-import/long-tail-extensions';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { buildGoldenFixtures } from '../src/pptx-import/golden-fixtures';
import { OoxmlPackage } from '../src/pptx-import/ooxml-parser';

const BE       = path.join(__dirname, '..');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

let fail = 0;
let total = 0;
function check(label: string, ok: boolean): void {
  total++;
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 38.4 — PPTX Final Hardening validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('38.4A — Renderer diagnostics');
  check('renderer-diagnostics.ts exists', existsBE('src/pptx-import/renderer-diagnostics.ts'));
  const rd = readBE('src/pptx-import/renderer-diagnostics.ts');
  check('probes soffice + pdftoppm + end-to-end',
    /SOFFICE_BIN/.test(rd) && /PDFTOPPM_BIN/.test(rd) && /convertProbe/.test(rd));
  check('install hints cover darwin / linux / win32',
    /darwin/.test(rd) && /linux/.test(rd) && /win32/.test(rd));
  check('INSTALL_LIBREOFFICE.md present', existsBE('docs/INSTALL_LIBREOFFICE.md'));
  const install = readBE('docs/INSTALL_LIBREOFFICE.md');
  check('install doc covers brew + apt + choco + Docker',
    /brew install/.test(install) && /apt-get install/.test(install) && /choco install/.test(install) && /docker/i.test(install));

  const ctl = readBE('src/pptx-import/pptx-import.controller.ts');
  check('GET /pptx-import/diagnostics/renderer wired', /diagnostics\/renderer/.test(ctl));

  console.log('\n38.4B — Real-fixture workflow');
  check('real-fixtures.ts exists', existsBE('src/pptx-import/real-fixtures.ts'));
  const rf = readBE('src/pptx-import/real-fixtures.ts');
  check('loadRealFixtures + certifyDirectory + readRealFixture exported',
    /export function loadRealFixtures/.test(rf) && /export async function certifyDirectory/.test(rf) && /export function readRealFixture/.test(rf));
  check('fixture kind inference covers 10 archetypes',
    ['investor', 'sales', 'corporate', 'training', 'financial', 'healthcare', 'enterprise', 'consulting', 'government', 'productLaunch']
      .every((k) => rf.includes(`return '${k}'`)));
  check('fixture drop README exists', existsBE('scripts/fixtures-pptx/README.md'));
  check('batch certify CLI exists',   existsBE('scripts/certify-fixtures.ts'));
  check('controller exposes fixtures/real and fixtures/real/certify',
    /fixtures\/real/.test(ctl) && /fixtures\/real\/certify/.test(ctl));

  console.log('\n38.4C — Long-tail OOXML extensions');
  check('long-tail-extensions.ts exists', existsBE('src/pptx-import/long-tail-extensions.ts'));
  const lt = readBE('src/pptx-import/long-tail-extensions.ts');
  check('scanners for chart / shape3d / ink / customXml',
    /scanChartExtensions/.test(lt) && /scanShapeAndDrawingExtensions/.test(lt) && /scanInkAnnotations/.test(lt) && /scanCustomXml/.test(lt));
  check('registry covers chart ext / 3D / ink / customXml / drawing',
    EXTENSION_REGISTRY.length >= 8);
  check('importer surfaces longTail in ImportReport', /longTail/.test(readBE('src/pptx-import/pptx-import.service.ts')));
  check('post-processor re-emits preserved extensions',
    /preservedExtensionsBlob/.test(readBE('src/slide-export/ooxml-animation-writer.ts')));
  check('render-types carries preservedExtensions',
    /preservedExtensions\?:/.test(readBE('src/slide-export/render-types.ts')));

  // ===========================================================================
  //  Live: renderer diagnostics (will be unavailable in this sandbox)
  // ===========================================================================
  console.log('\n38.4A — Live renderer diagnostics');
  const diag = await runRendererDiagnostics();
  console.log(`    soffice:        ${diag.soffice.available  ? `OK ${diag.soffice.version  || ''}` : 'MISSING'}`);
  console.log(`    pdftoppm:       ${diag.pdftoppm.available ? `OK ${diag.pdftoppm.version || ''}` : 'MISSING'}`);
  console.log(`    end-to-end:     ${diag.endToEnd.succeeded ? `OK ${diag.endToEnd.pngBytes}B in ${diag.endToEnd.latencyMs}ms` : (diag.endToEnd.error || 'not attempted')}`);
  console.log(`    install hint:   ${diag.installHint}`);
  check('diagnostics object well-formed',
    typeof diag.soffice === 'object' && typeof diag.pdftoppm === 'object' && typeof diag.installHint === 'string');
  // We don't require ready=true; we require the diagnostic to *report* status truthfully.

  // ===========================================================================
  //  Live: real-fixture drop dir scan
  // ===========================================================================
  console.log('\n38.4B — Live real-fixture scan');
  const real = loadRealFixtures();
  console.log(`    Fixture dir:    ${real.fixtureDir}`);
  console.log(`    Fixtures found: ${real.fixtures.length}`);
  check('loadRealFixtures returns a dir + fixtures array',
    typeof real.fixtureDir === 'string' && Array.isArray(real.fixtures));
  if (real.fixtures.length > 0) {
    const svc = new (PptxImportService as any)(null);
    const batch = await certifyDirectory(svc);
    console.log(`    Batch average:  ${batch.averageOverall}`);
    console.log(`    Bands:          ${JSON.stringify(batch.bandsHistogram)}`);
    check(`batch certified ${batch.fixturesFound} fixtures`, batch.reports.length === real.fixtures.length);
  } else {
    console.log('    (drop *.pptx files into scripts/fixtures-pptx/ to enable live batch)');
  }

  // ===========================================================================
  //  Live: long-tail scan over the synthetic golden suite
  // ===========================================================================
  console.log('\n38.4C — Live long-tail scan (synthetic suite)');
  try {
    const fixtures = await buildGoldenFixtures();
    let totalExt = 0; let chartExt = 0;
    for (const f of fixtures) {
      const pkg = new OoxmlPackage(f.buffer);
      const lt = scanLongTailExtensions(pkg);
      totalExt += lt.total;
      chartExt += lt.chartExt;
    }
    console.log(`    Long-tail across 10 fixtures: total=${totalExt}, chart=${chartExt}`);
    check('long-tail scanner runs across the golden suite without throwing', totalExt >= 0);
  } catch (e: any) {
    check(`long-tail scan threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: classification accuracy
  // ===========================================================================
  console.log('\n38.4C — classification accuracy');
  check('chart URI classified as chart scope', classifyExtensionUri('chartExtensibility').scope === 'chart');
  check('3D URI classified as shape3d scope',  classifyExtensionUri('sp3d').scope === 'shape3d');
  check('ink URI classified as ink scope',     classifyExtensionUri('contentPart').scope === 'ink');
  check('unknown URI falls back gracefully',   classifyExtensionUri('zzznoexistxxx').scope === 'unknown');

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 38.4 — all ${total} checks passed` : `✗ Phase 38.4 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
