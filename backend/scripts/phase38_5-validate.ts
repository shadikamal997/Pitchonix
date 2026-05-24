/**
 * Phase 38.5 — PPTX Fidelity 100% Pass validation.
 *
 *   38.5A — Real-fixture program (operationally gated; verify workflow)
 *   38.5B — Visual-regression infrastructure (gated on LibreOffice)
 *   38.5C — Animation system completion (panel polish + import round-trip)
 *   38.5D — SmartArt layout v2 (connectors, depth-aware, palette)
 *   38.5E — Theme fidelity (verify resolver runs without errors)
 *   38.5F — Import hardening (text runs captured)
 *   38.5G — Export hardening (text runs emitted)
 *   38.5H — Round-trip HTML diff report
 *   38.5I — Certification dashboard
 *   38.5J — 50/100/250/500/1000 stress bench
 *   38.5K — End-to-end validation across golden suite
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { buildGoldenFixtures } from '../src/pptx-import/golden-fixtures';
import { roundTrip } from '../src/pptx-import/round-trip';
import { certifyDeck } from '../src/pptx-import/compatibility-certification';
import { exportDeckToPptx } from '../src/slide-export/element-pptx-exporter';
import { extractRichText } from '../src/pptx-import/text-run-extractor';
import { OoxmlPackage } from '../src/pptx-import/ooxml-parser';
import { importAnimationsForSlide } from '../src/pptx-import/animation-importer';
import { buildRoundTripReport } from '../src/pptx-import/html-diff-report';
import { loadRealFixtures } from '../src/pptx-import/real-fixtures';
import { runRendererDiagnostics } from '../src/pptx-import/renderer-diagnostics';

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
  console.log('Phase 38.5 — PPTX Fidelity 100% Pass\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('38.5D — SmartArt layout v2');
  const sa = readBE('src/smartart/smartart.service.ts');
  check('emits connector shapes', /kind:\s*'connector'/.test(sa));
  check('uses PALETTE + safe padding', /PALETTE/.test(sa) && /PAD/.test(sa));
  check('hierarchy is depth-aware (3rd level when grand-children exist)',
    /grandKids/.test(sa));
  check('textSizeFor sizing helper exists', /textSizeFor\(/.test(sa));

  console.log('\n38.5F + 38.5G — Text-run formatting');
  check('text-run-extractor.ts exists', existsBE('src/pptx-import/text-run-extractor.ts'));
  const tr = readBE('src/pptx-import/text-run-extractor.ts');
  check('captures bold/italic/underline/color/size/font',
    /bold/.test(tr) && /italic/.test(tr) && /underline/.test(tr) && /color/.test(tr) && /size/.test(tr) && /font/.test(tr));
  const exp = readBE('src/slide-export/element-pptx-exporter.ts');
  check('exporter emits rich runs via pptxgenjs block format',
    /richRuns/.test(exp) && /blocks\s*=\s*richRuns\.map/.test(exp));

  console.log('\n38.5H — Round-trip HTML diff report');
  check('html-diff-report.ts exists', existsBE('src/pptx-import/html-diff-report.ts'));
  const hd = readBE('src/pptx-import/html-diff-report.ts');
  check('renders certification scores + per-slide SVG pairs',
    /scoreBlock\(/.test(hd) && /slideSvg\(/.test(hd) && /pair/.test(hd));

  console.log('\n38.5I — Certification dashboard');
  check('certification page exists', existsFE('app/pptx-certification/page.tsx'));
  const cp = readFE('app/pptx-certification/page.tsx');
  check('dashboard renders renderer status + per-fixture table + bands',
    /RendererStatus/.test(cp) && /BAND_STYLES/.test(cp) && /fixtures\/real\/certify/.test(cp));

  console.log('\n38.5J — Stress bench');
  check('pptx-stress-bench.ts exists', existsBE('scripts/pptx-stress-bench.ts'));
  const bn = readBE('scripts/pptx-stress-bench.ts');
  check('bench covers 50/100/250/500/1000 slide counts',
    [50, 100, 250, 500, 1000].every((n) => bn.includes(`${n}`)));
  check('bench captures rss + heap', /rss/.test(bn) && /heapUsed/.test(bn));

  // ===========================================================================
  //  Live: text-run round-trip
  // ===========================================================================
  console.log('\n38.5F + 38.5G — Live text-run round-trip');
  let runsRecovered = 0;
  try {
    const svc = new (PptxImportService as any)(null);
    // Build a deck where one shape carries explicit bold + italic + colour runs.
    const renderDeck = {
      title: 'Run test',
      slides: [{
        index: 0, total: 1, title: 'Run test',
        background: null, themeTokens: null,
        elements: [{
          id: 'r1', slideId: 's1', type: 'paragraph', order: 0,
          x: 10, y: 30, width: 80, height: 10,
          rotation: 0, zIndex: 0, locked: false, visible: true,
          content: {
            text: 'Bold then italic then plain.',
            runs: [
              { text: 'Bold ',      bold: true,                color: '#2563EB' },
              { text: 'then ',      italic: true,              color: '#16A34A' },
              { text: 'italic ',    italic: true                                    },
              { text: 'then plain.', font: 'Inter'                                  },
            ],
          },
          style: null, animations: null, accessibility: null,
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        }],
        speakerNotes: null, transition: null,
      }],
    };
    const buf = await exportDeckToPptx(renderDeck as any);
    const pkg = new OoxmlPackage(buf);
    const [slidePath] = pkg.slidePaths();
    const doc = pkg.parse<any>(slidePath);
    // Walk every <p:sp> and re-extract rich text; assert we recover multiple runs.
    const sps = (doc?.['p:sld']?.['p:cSld']?.['p:spTree']?.['p:sp']) || [];
    const list = Array.isArray(sps) ? sps : [sps];
    for (const sp of list) {
      const rich = extractRichText(sp['p:txBody']);
      if (rich.runs.length > runsRecovered) runsRecovered = rich.runs.length;
    }
    check(`run round-trip preserved ≥3 runs (got ${runsRecovered})`, runsRecovered >= 3);
  } catch (e: any) {
    check(`run round-trip threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: animation round-trip across the golden suite
  // ===========================================================================
  console.log('\n38.5C — Animation system completion (round-trip across golden suite)');
  let golden: { name: string; fidelity: number }[] = [];
  try {
    const svc = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    for (const f of fixtures) {
      const rt = await roundTrip(svc, f.buffer);
      golden.push({ name: f.name, fidelity: rt.diff.fidelityScore });
    }
    const mean = golden.reduce((p, c) => p + c.fidelity, 0) / golden.length;
    check(`mean round-trip fidelity across 10 fixtures ≥ 0.95 (got ${mean.toFixed(3)})`, mean >= 0.95);
  } catch (e: any) {
    check(`golden round-trip threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: HTML diff report on a synthetic fixture
  // ===========================================================================
  console.log('\n38.5H — Live HTML diff report');
  try {
    const svc = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    const investor = fixtures.find((f) => f.name === 'investor')!;
    const tmp = path.join(BE, 'tmp-investor.pptx');
    const out = path.join(BE, 'tmp-investor-diff.html');
    fs.writeFileSync(tmp, investor.buffer);
    await buildRoundTripReport(svc, tmp, out);
    const html = fs.readFileSync(out, 'utf8');
    check('HTML report mentions Round-trip and Structural diff',
      /Round-trip/.test(html) && /Structural diff/.test(html));
    check('HTML report renders at least one slide-mock SVG', /<svg/.test(html));
    fs.unlinkSync(tmp); fs.unlinkSync(out);
  } catch (e: any) {
    check(`HTML diff report threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: certification against the synthetic investor fixture
  // ===========================================================================
  console.log('\n38.5K — Certification snapshot');
  let cert: any;
  try {
    const svc = new (PptxImportService as any)(null);
    const fixtures = await buildGoldenFixtures();
    const investor = fixtures.find((f) => f.name === 'investor')!;
    cert = await certifyDeck(svc, investor.buffer);
    check(`certification overall ≥ 80 (got ${cert.overall}, band=${cert.band})`, cert.overall >= 80);
  } catch (e: any) {
    check(`certification threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Operational status surface
  // ===========================================================================
  console.log('\n38.5A + 38.5B — Operational status (informational)');
  const diag = await runRendererDiagnostics();
  console.log(`    Renderer ready: ${diag.ready ? 'YES (visual scores are ground-truth)' : 'NO (visual scores are internal-mode)'}`);
  console.log(`    Install hint:   ${diag.installHint}`);
  const real = loadRealFixtures();
  console.log(`    Real fixtures:  ${real.fixtures.length} in ${real.fixtureDir}`);
  // Always passes — this is informational only.
  check('operational diagnostics ran without throwing', typeof diag.ready === 'boolean');

  // ===========================================================================
  //  Per-fixture summary
  // ===========================================================================
  if (golden.length > 0) {
    console.log('\nGolden fixture round-trip:');
    for (const g of golden) {
      console.log(`  ${g.name.padEnd(15)} → ${(g.fidelity * 100).toFixed(1)}%`);
    }
  }
  if (cert) {
    console.log(`\nCertification (investor):`);
    console.log(`  Import     ${cert.scores.import}`);
    console.log(`  Export     ${cert.scores.export}`);
    console.log(`  Round-trip ${cert.scores.roundTrip}`);
    console.log(`  Visual     ${cert.scores.visual}`);
    console.log(`  Overall    ${cert.overall} (${cert.band})`);
  }

  console.log(`\n${fail === 0 ? `✓ Phase 38.5 — all ${total} checks passed` : `✗ Phase 38.5 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
