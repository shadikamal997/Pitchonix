/**
 * Phase 38.4B — Batch certification CLI.
 *
 * Drops the certification pipeline over every PPTX in
 * `backend/scripts/fixtures-pptx/` and writes a CSV alongside.
 *
 *   npx ts-node --transpile-only scripts/certify-fixtures.ts
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { certifyDirectory } from '../src/pptx-import/real-fixtures';

async function main() {
  const svc = new (PptxImportService as any)(null);
  const t0 = Date.now();
  const res = await certifyDirectory(svc);
  const dt = Date.now() - t0;

  console.log(`Fixture directory: ${res.fixtureDir}`);
  console.log(`Fixtures found:    ${res.fixturesFound}`);
  if (res.fixturesFound === 0) {
    console.log('\nNo fixtures dropped yet. See scripts/fixtures-pptx/README.md.');
    process.exit(0);
  }

  console.log(`\nPer-fixture results:`);
  console.log('─'.repeat(110));
  console.log(`${'filename'.padEnd(40)} ${'kind'.padEnd(14)} ${'import'.padStart(7)} ${'export'.padStart(7)} ${'rt'.padStart(6)} ${'visual'.padStart(7)} ${'overall'.padStart(9)} band`);
  console.log('─'.repeat(110));
  for (const r of res.reports) {
    if (r.error) {
      console.log(`${r.fixture.filename.padEnd(40)} ${r.fixture.kind.padEnd(14)} !! ${r.error}`);
      continue;
    }
    const c = r.certified!;
    console.log(`${r.fixture.filename.padEnd(40)} ${r.fixture.kind.padEnd(14)} ${String(c.scores.import).padStart(7)} ${String(c.scores.export).padStart(7)} ${String(c.scores.roundTrip).padStart(6)} ${String(c.scores.visual).padStart(7)} ${String(c.overall).padStart(9)} ${c.band}`);
  }
  console.log('─'.repeat(110));
  console.log(`Average overall:   ${res.averageOverall}`);
  console.log(`Bands histogram:   ${JSON.stringify(res.bandsHistogram)}`);
  console.log(`Total time:        ${dt}ms`);

  // CSV next to the fixtures.
  const csvPath = path.join(res.fixtureDir, '.results.csv');
  try {
    const header = 'filename,kind,bytes,import,export,roundTrip,visual,overall,band,error\n';
    const rows = res.reports.map((r) => {
      const c = r.certified;
      return [
        csvEscape(r.fixture.filename),
        r.fixture.kind,
        r.fixture.bytes,
        c?.scores.import ?? '',
        c?.scores.export ?? '',
        c?.scores.roundTrip ?? '',
        c?.scores.visual ?? '',
        c?.overall ?? '',
        c?.band ?? '',
        csvEscape(r.error ?? ''),
      ].join(',');
    }).join('\n');
    fs.writeFileSync(csvPath, header + rows + '\n');
    console.log(`CSV written to:    ${csvPath}`);
  } catch (e: any) {
    console.warn(`CSV write failed: ${e?.message}`);
  }
}

function csvEscape(s: string): string {
  if (!s) return '';
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

main().catch((e) => { console.error(e); process.exit(1); });
