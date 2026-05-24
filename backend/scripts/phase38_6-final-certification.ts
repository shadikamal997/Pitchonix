/**
 * Phase 38.6C — Final Enterprise Certification Report.
 *
 * Runs the full ground-truth certification pipeline across:
 *   - All 10 synthetic golden archetypes (always available)
 *   - Every real customer PPTX in scripts/fixtures-pptx/ (when present)
 *
 * Aggregates per-category averages + overall bands and writes:
 *   - phase38_6-final-certification.json   (machine-readable)
 *   - phase38_6-final-certification.csv    (spreadsheet-friendly)
 *
 * Prints a human-readable summary table.
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { certifyDeck, CertificationResult } from '../src/pptx-import/compatibility-certification';
import { buildGoldenFixtures } from '../src/pptx-import/golden-fixtures';
import { loadRealFixtures, readRealFixture } from '../src/pptx-import/real-fixtures';
import { runRendererDiagnostics } from '../src/pptx-import/renderer-diagnostics';

interface Row {
  source:   'synthetic' | 'real';
  name:     string;
  category: string;
  cert:     CertificationResult;
  ms:       number;
}

async function main() {
  console.log('Phase 38.6 — Final PPTX Enterprise Certification\n');

  const diag = await runRendererDiagnostics();
  console.log(`Renderer ready: ${diag.ready ? 'YES — ground-truth visual mode active' : 'NO — internal-mode visual scores'}`);
  console.log(`  soffice:  ${diag.soffice.available  ? `${diag.soffice.version}`  : 'MISSING'}`);
  console.log(`  pdftoppm: ${diag.pdftoppm.available ? `${diag.pdftoppm.version}` : 'MISSING'}`);
  if (diag.endToEnd.succeeded) {
    console.log(`  e2e:      ${diag.endToEnd.pngBytes}B in ${diag.endToEnd.latencyMs}ms`);
  }

  const svc = new (PptxImportService as any)(null);
  const rows: Row[] = [];

  // ---------------------------------------------------------------------------
  //  Synthetic archetypes
  // ---------------------------------------------------------------------------
  console.log(`\n→ Certifying 10 synthetic archetypes…`);
  const fixtures = await buildGoldenFixtures();
  for (const f of fixtures) {
    const t0 = Date.now();
    const cert = await certifyDeck(svc, f.buffer);
    rows.push({ source: 'synthetic', name: f.name, category: f.name, cert, ms: Date.now() - t0 });
    process.stdout.write('.');
  }
  console.log(' done.');

  // ---------------------------------------------------------------------------
  //  Real fixtures (when present)
  // ---------------------------------------------------------------------------
  const real = loadRealFixtures();
  console.log(`\n→ Real fixtures in ${real.fixtureDir}: ${real.fixtures.length}`);
  for (const fx of real.fixtures) {
    const t0 = Date.now();
    try {
      const cert = await certifyDeck(svc, readRealFixture(fx));
      rows.push({ source: 'real', name: fx.filename, category: fx.kind, cert, ms: Date.now() - t0 });
      process.stdout.write('.');
    } catch (e: any) {
      console.warn(`  ! ${fx.filename}: ${e?.message}`);
    }
  }
  if (real.fixtures.length > 0) console.log(' done.');

  // ---------------------------------------------------------------------------
  //  Aggregate
  // ---------------------------------------------------------------------------
  const all = rows.map((r) => r.cert);
  const avg = (k: 'import' | 'export' | 'roundTrip' | 'visual'): number =>
    all.length ? Math.round(all.reduce((p, c) => p + (c.scores as any)[k], 0) / all.length) : 0;
  const avgOverall =
    all.length ? Math.round(all.reduce((p, c) => p + c.overall, 0) / all.length) : 0;

  const bands: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0, basic: 0 };
  for (const c of all) bands[c.band] = (bands[c.band] || 0) + 1;

  // Per-category aggregation.
  const perCat = new Map<string, Row[]>();
  for (const r of rows) {
    if (!perCat.has(r.category)) perCat.set(r.category, []);
    perCat.get(r.category)!.push(r);
  }

  // ---------------------------------------------------------------------------
  //  Report
  // ---------------------------------------------------------------------------
  console.log('\n\nPer-fixture results');
  console.log('─'.repeat(95));
  console.log(`${'fixture'.padEnd(28)} ${'category'.padEnd(16)} ${'imp'.padStart(4)} ${'exp'.padStart(4)} ${'rt'.padStart(4)} ${'vis'.padStart(4)} ${'overall'.padStart(8)} ${'band'.padEnd(9)} ms`);
  console.log('─'.repeat(95));
  for (const r of rows) {
    const c = r.cert;
    console.log(`${r.name.padEnd(28)} ${r.category.padEnd(16)} ${String(c.scores.import).padStart(4)} ${String(c.scores.export).padStart(4)} ${String(c.scores.roundTrip).padStart(4)} ${String(c.scores.visual).padStart(4)} ${String(c.overall).padStart(8)} ${c.band.padEnd(9)} ${r.ms}`);
  }
  console.log('─'.repeat(95));

  console.log('\nCategory averages');
  console.log('─'.repeat(75));
  console.log(`${'category'.padEnd(16)} ${'n'.padStart(3)} ${'imp'.padStart(4)} ${'exp'.padStart(4)} ${'rt'.padStart(4)} ${'vis'.padStart(4)} ${'overall'.padStart(8)}`);
  console.log('─'.repeat(75));
  for (const [cat, list] of perCat) {
    const imp = Math.round(list.reduce((p, c) => p + c.cert.scores.import,    0) / list.length);
    const exp = Math.round(list.reduce((p, c) => p + c.cert.scores.export,    0) / list.length);
    const rt  = Math.round(list.reduce((p, c) => p + c.cert.scores.roundTrip, 0) / list.length);
    const vis = Math.round(list.reduce((p, c) => p + c.cert.scores.visual,    0) / list.length);
    const ovr = Math.round(list.reduce((p, c) => p + c.cert.overall,          0) / list.length);
    console.log(`${cat.padEnd(16)} ${String(list.length).padStart(3)} ${String(imp).padStart(4)} ${String(exp).padStart(4)} ${String(rt).padStart(4)} ${String(vis).padStart(4)} ${String(ovr).padStart(8)}`);
  }
  console.log('─'.repeat(75));

  console.log('\nOverall enterprise certification');
  console.log('─'.repeat(50));
  console.log(`  Fixtures certified: ${rows.length}   (${rows.filter(r => r.source === 'real').length} real, ${rows.filter(r => r.source === 'synthetic').length} synthetic)`);
  console.log(`  Avg import score:   ${avg('import')}`);
  console.log(`  Avg export score:   ${avg('export')}`);
  console.log(`  Avg round-trip:     ${avg('roundTrip')}`);
  console.log(`  Avg visual:         ${avg('visual')}  ${diag.ready ? '(ground-truth)' : '(internal-mode)'}`);
  console.log(`  Avg overall:        ${avgOverall}`);
  console.log(`  Bands:              ${JSON.stringify(bands)}`);

  // Persist artefacts.
  const outDir = path.join(__dirname);
  const jsonPath = path.join(outDir, 'phase38_6-final-certification.json');
  const csvPath  = path.join(outDir, 'phase38_6-final-certification.csv');
  try {
    fs.writeFileSync(jsonPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      renderer: diag,
      rows,
      averages: {
        import:    avg('import'),
        export:    avg('export'),
        roundTrip: avg('roundTrip'),
        visual:    avg('visual'),
        overall:   avgOverall,
      },
      bands,
    }, null, 2));

    const header = 'source,name,category,import,export,roundTrip,visual,overall,band,latencyMs\n';
    const csv = rows.map((r) => [
      r.source, r.name, r.category,
      r.cert.scores.import, r.cert.scores.export, r.cert.scores.roundTrip, r.cert.scores.visual,
      r.cert.overall, r.cert.band, r.ms,
    ].join(',')).join('\n');
    fs.writeFileSync(csvPath, header + csv + '\n');
    console.log(`\nArtefacts:`);
    console.log(`  ${jsonPath}`);
    console.log(`  ${csvPath}`);
  } catch (e: any) {
    console.warn(`  Failed to write artefacts: ${e?.message}`);
  }

  console.log('');
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
