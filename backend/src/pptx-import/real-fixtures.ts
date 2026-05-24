import * as fs from 'fs';
import * as path from 'path';
import type { PptxImportService } from './pptx-import.service';
import { certifyDeck, CertificationResult } from './compatibility-certification';
import { roundTrip } from './round-trip';

// =============================================================================
//  Phase 38.4B — Real-world fixture drop directory.
//
//  Real customer / enterprise PPTX files can't ship in the repo (licence + IP).
//  Instead we provide a stable drop directory:
//
//      backend/scripts/fixtures-pptx/
//        investor-acme.pptx
//        sales-q4.pptx
//        consulting-deloitte-redacted.pptx
//        …
//
//  This module:
//    1. Scans the drop dir for *.pptx / *.potx
//    2. Returns each as a tagged fixture (kind inferred from filename prefix)
//    3. Batch-certifies them via the existing certification pipeline
//    4. Aggregates results into a CSV / JSON report
//
//  The CLI runner at `scripts/certify-fixtures.ts` exposes this on the command
//  line so ops can drop a batch and run a single command to grade them.
// =============================================================================

const FIXTURE_DIR = process.env.PPTX_FIXTURE_DIR
  ? path.resolve(process.env.PPTX_FIXTURE_DIR)
  : path.resolve(__dirname, '..', '..', 'scripts', 'fixtures-pptx');

export interface RealFixture {
  filename: string;
  fullPath: string;
  kind:     string;
  bytes:    number;
}

export interface RealFixtureReport {
  fixture:    RealFixture;
  certified?: CertificationResult;
  /** Mean position drift from the round-trip diff (lower is better). */
  positionDrift?: number;
  error?:     string;
}

export interface BatchCertificationResult {
  fixtureDir:    string;
  fixturesFound: number;
  reports:       RealFixtureReport[];
  averageOverall:    number;
  bandsHistogram:    Record<string, number>;
}

/** List every PPTX in the drop directory. */
export function loadRealFixtures(): { fixtureDir: string; fixtures: RealFixture[] } {
  if (!fs.existsSync(FIXTURE_DIR)) {
    return { fixtureDir: FIXTURE_DIR, fixtures: [] };
  }
  const files = fs.readdirSync(FIXTURE_DIR)
    .filter((n) => /\.(pptx|potx)$/i.test(n))
    .sort();
  const fixtures = files.map((filename) => {
    const fullPath = path.join(FIXTURE_DIR, filename);
    const stat = fs.statSync(fullPath);
    return {
      filename,
      fullPath,
      kind:  inferKind(filename),
      bytes: stat.size,
    };
  });
  return { fixtureDir: FIXTURE_DIR, fixtures };
}

/** Read the binary for one fixture. */
export function readRealFixture(fixture: RealFixture): Buffer {
  return fs.readFileSync(fixture.fullPath);
}

/** Run certification against every fixture in the drop dir. */
export async function certifyDirectory(service: PptxImportService): Promise<BatchCertificationResult> {
  const { fixtureDir, fixtures } = loadRealFixtures();
  const reports: RealFixtureReport[] = [];

  for (const fx of fixtures) {
    const r: RealFixtureReport = { fixture: fx };
    try {
      const buffer = readRealFixture(fx);
      const cert   = await certifyDeck(service, buffer);
      r.certified  = cert;
      // Augment with the structural diff's position-drift number for ops dashboards.
      try {
        const rt = await roundTrip(service, buffer);
        r.positionDrift = rt.diff.meanPositionDrift;
      } catch { /* non-fatal */ }
    } catch (e: any) {
      r.error = e?.message || 'certify failed';
    }
    reports.push(r);
  }

  const overalls = reports.map((r) => r.certified?.overall ?? 0).filter((n) => n > 0);
  const averageOverall = overalls.length ? Math.round(overalls.reduce((a, b) => a + b, 0) / overalls.length) : 0;

  const bandsHistogram: Record<string, number> = { platinum: 0, gold: 0, silver: 0, bronze: 0, basic: 0, error: 0 };
  for (const r of reports) {
    const b = r.certified?.band ?? (r.error ? 'error' : 'basic');
    bandsHistogram[b] = (bandsHistogram[b] || 0) + 1;
  }

  return {
    fixtureDir,
    fixturesFound: fixtures.length,
    reports,
    averageOverall,
    bandsHistogram,
  };
}

// -----------------------------------------------------------------------------

function inferKind(filename: string): string {
  const base = filename.toLowerCase();
  if (base.startsWith('investor'))    return 'investor';
  if (base.startsWith('sales'))       return 'sales';
  if (base.startsWith('corporate'))   return 'corporate';
  if (base.startsWith('training'))    return 'training';
  if (base.startsWith('financial'))   return 'financial';
  if (base.startsWith('healthcare'))  return 'healthcare';
  if (base.startsWith('enterprise'))  return 'enterprise';
  if (base.startsWith('consulting'))  return 'consulting';
  if (base.startsWith('government'))  return 'government';
  if (base.startsWith('product') || base.startsWith('launch')) return 'productLaunch';
  return 'other';
}
