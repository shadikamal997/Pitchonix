/**
 * Phase 38.1 — PPTX Fidelity Pass validation
 *
 *   38.1A — Full OOXML traversal (fast-xml-parser, masters/themes/layouts/
 *           slides/notes/charts/tables/media/groups)
 *   38.1B — Theme + master → DeckTheme + MasterSlide + LayoutTemplate
 *   38.1C — Media extraction pipeline (ppt/media/* → uploads/ → relink)
 *   38.1D — Chart importer
 *   38.1E — Table importer
 *   38.1F — OOXML <p:timing> animation export via zip post-processing
 *   38.1G — OOXML <p:transition> enhancements (morph + directional push/reveal/cover)
 *   38.1H — Round-trip harness + synthetic fixture
 *   38.1I — Structural diff metric
 *   38.1J — Import report shape + UI consumption
 *   38.1K — Performance: 100-slide synthetic round-trip bench
 *   38.1L — Run a real round-trip and assert minimum fidelity threshold
 *
 *   This script does source-scan + actual round-trip execution.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { roundTrip, buildSyntheticFixture } from '../src/pptx-import/round-trip';

const FE       = path.join(__dirname, '..', '..', 'frontend');
const BE       = path.join(__dirname, '..');
const readFE   = (rel: string): string => fs.readFileSync(path.join(FE, rel), 'utf8');
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
  console.log('Phase 38.1 — PPTX Fidelity Pass validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================

  console.log('38.1A — OOXML traversal');
  for (const f of [
    'src/pptx-import/ooxml-parser.ts',
    'src/pptx-import/pptx-import.service.ts',
  ]) check(`file exists: ${f}`, existsBE(f));

  const parser = readBE('src/pptx-import/ooxml-parser.ts');
  check('uses fast-xml-parser',          /from\s+['"]fast-xml-parser['"]/.test(parser));
  check('OoxmlPackage exports + rels()', /export class OoxmlPackage/.test(parser) && /rels\(/.test(parser));
  check('slidePaths/notePathForSlide/layoutPathForSlide helpers',
    /slidePaths\(/.test(parser) && /notePathForSlide\(/.test(parser) && /layoutPathForSlide\(/.test(parser));

  const svc = readBE('src/pptx-import/pptx-import.service.ts');
  check('service walks themes/masters/layouts', /importTheme\(/.test(svc) && /importMaster\(/.test(svc) && /importLayout\(/.test(svc));
  check('service handles pic + graphicFrame + grpSp',
    /handlePic\(/.test(svc) && /handleGraphicFrame\(/.test(svc) && /p:grpSp/.test(svc));
  check('service emits ImportReport with fidelityScore',
    /ImportReport/.test(svc) && /fidelityScore/.test(svc));

  console.log('\n38.1B — Theme + Master import');
  check('theme-master-importer exists', existsBE('src/pptx-import/theme-master-importer.ts'));
  const tm = readBE('src/pptx-import/theme-master-importer.ts');
  check('theme importer reads a:clrScheme + a:fontScheme', /a:clrScheme/.test(tm) && /a:fontScheme/.test(tm));
  check('master importer detects footer/pageNumber/logo slots',
    /hasFooter/.test(tm) && /hasPageNumbers/.test(tm) && /logos/.test(tm));
  check('layout importer reads p:sldLayout slots',     /p:sldLayout/.test(tm));

  console.log('\n38.1C — Media extraction');
  check('media-extractor exists', existsBE('src/pptx-import/media-extractor.ts'));
  const me = readBE('src/pptx-import/media-extractor.ts');
  check('iterates ppt/media/* and writes to UPLOAD_DIR',
    /ppt\/media\//.test(me) && /writeFileSync/.test(me));
  check('emits MediaEntry { zipPath, publicUrl, mimetype, bytes }',
    /publicUrl/.test(me) && /zipPath/.test(me));

  console.log('\n38.1D — Chart importer');
  check('chart-importer exists', existsBE('src/pptx-import/chart-importer.ts'));
  const ci = readBE('src/pptx-import/chart-importer.ts');
  check('maps barChart/lineChart/areaChart/pieChart/etc',
    /c:barChart/.test(ci) && /c:lineChart/.test(ci) && /c:pieChart/.test(ci) && /c:scatterChart/.test(ci));
  check('reads series.values + colors', /c:val/.test(ci) && /a:srgbClr/.test(ci));

  console.log('\n38.1E — Table importer');
  check('table-importer exists', existsBE('src/pptx-import/table-importer.ts'));
  const ti = readBE('src/pptx-import/table-importer.ts');
  check('handles header row + zebra', /firstRow/.test(ti) && /bandRow/.test(ti));
  check('detects merged cells via gridSpan / vMerge / hMerge',
    /gridSpan/.test(ti) && /vMerge/.test(ti) && /hMerge/.test(ti));

  console.log('\n38.1F — OOXML animation export');
  check('ooxml-animation-writer exists', existsBE('src/slide-export/ooxml-animation-writer.ts'));
  const aw = readBE('src/slide-export/ooxml-animation-writer.ts');
  check('emits <p:timing> with <p:par> children', /p:timing/.test(aw) && /<p:par>/.test(aw));
  check('pickPreset covers fade/appear/flyIn/zoom/grow/wipe',
    ['fade', 'appear', 'flyIn', 'zoom', 'grow', 'wipe'].every((eff) => aw.includes(`case '${eff}'`)));
  const expr = readBE('src/slide-export/element-pptx-exporter.ts');
  check('exporter wires postProcessAnimations', /postProcessAnimations\(/.test(expr));

  console.log('\n38.1G — OOXML transition export');
  check('buildTransition covers fade/push/reveal/cover/morph',
    ['fade', 'push', 'reveal', 'cover', 'morph'].every((eff) => aw.includes(`case '${eff}'`)));

  console.log('\n38.1H — Round-trip harness');
  check('round-trip module exists', existsBE('src/pptx-import/round-trip.ts'));
  const rt = readBE('src/pptx-import/round-trip.ts');
  check('exports roundTrip + buildSyntheticFixture + diffStructural',
    /export async function roundTrip/.test(rt) && /buildSyntheticFixture/.test(rt) && /export function diffStructural/.test(rt));
  const ctl = readBE('src/pptx-import/pptx-import.controller.ts');
  check('controller exposes /round-trip and /round-trip/synthetic',
    /'round-trip'/.test(ctl) && /round-trip\/synthetic/.test(ctl));

  console.log('\n38.1J — Import report UI');
  const importPage = readFE('app/pptx-import/page.tsx');
  check('import page renders fidelity badge',     /FidelityBadge/.test(importPage));
  check('import page surfaces report stats',      /Stat\s+label="Charts"/.test(importPage));
  check('import page lists warnings',             /report\.warnings/.test(importPage));

  // ===========================================================================
  //  Live round-trip on synthetic fixture (38.1L)
  // ===========================================================================

  console.log('\n38.1L — Live round-trip on synthetic fixture');
  let liveScore = 0;
  try {
    const service = new (PptxImportService as any)(null);   // PrismaService unused for parseBuffer
    const buf = await buildSyntheticFixture();
    const result = await roundTrip(service, buf);
    liveScore = result.diff.fidelityScore;
    check(`synthetic fixture parsed (${result.imported.slidesParsed} slides)`,
      result.imported.slidesParsed === 5);
    check(`re-import preserved slide count (Δ=${result.diff.slideCountDelta})`,
      result.diff.slideCountDelta === 0);
    check(`re-import preserved text frames (Δ=${result.diff.textFrameDelta})`,
      result.diff.textFrameDelta <= 2);   // text frame count is ±2 because notes are embedded
    check(`re-import preserved speaker notes (Δ=${result.diff.noteDelta})`,
      result.diff.noteDelta === 0);
    check(`structural fidelity ≥ 0.7 (got ${liveScore})`, liveScore >= 0.7);
  } catch (e: any) {
    check(`live round-trip threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Performance bench (38.1K)
  // ===========================================================================

  console.log('\n38.1K — Performance bench');
  let bench100 = -1;
  try {
    const service = new (PptxImportService as any)(null);
    // 100-slide synthetic deck.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PptxGenJS = require('pptxgenjs');
    const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
    for (let i = 0; i < 100; i++) {
      const s = p.addSlide();
      s.addText(`Slide ${i + 1}`, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
      s.addText(`Body for slide ${i + 1}`, { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 16 });
    }
    const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
    const t0 = Date.now();
    const result = service.parseBuffer(buf);
    bench100 = Date.now() - t0;
    check(`100-slide parse in <5000ms (took ${bench100}ms, ${result.slides.length} slides)`,
      bench100 < 5000 && result.slides.length === 100);
  } catch (e: any) {
    check(`bench threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\nFidelity score on synthetic round-trip: ${(liveScore * 100).toFixed(0)}%`);
  console.log(`100-slide parse benchmark:            ${bench100}ms\n`);
  console.log(`${fail === 0 ? `✓ Phase 38.1 — all ${total} checks passed` : `✗ Phase 38.1 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
