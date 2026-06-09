/**
 * Phase Ω.CONTENT.3 — Phases 8, 9 & 10.
 *
 * Produces the platform Content Safety Certification from REAL ledger data and:
 *   • writes CONTENT_SAFETY_CERTIFICATION.md (Phase 8)
 *   • writes a machine-readable baseline at .content-certification.baseline.json
 *   • runs the regression gate against the committed baseline (Phase 9)
 *
 * Usage:
 *   npm run certify:content            # generate report + baseline
 *   npm run certify:content -- --gate  # CI mode: fail (exit 1) on regression
 *   npm run certify:content -- --gate --fixture
 *   npm run certify:content -- --update-baseline
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentLedgerService } from '../src/content-ledger/content-ledger.service';
import { ContentCertificationService } from '../src/content-ledger/content-certification.service';
import { evaluateRegressionGate } from '../src/content-ledger/certification-gate';
import { PlatformCertification } from '../src/content-ledger/content-certification.types';

const REPO_ROOT = path.resolve(__dirname, '..', '..');
const REPORT_PATH = path.join(REPO_ROOT, 'CONTENT_SAFETY_CERTIFICATION.md');
const BASELINE_PATH = path.join(__dirname, '..', '.content-certification.baseline.json');

async function main() {
  const args = new Set(process.argv.slice(2));
  const gateMode = args.has('--gate');
  const updateBaseline = args.has('--update-baseline');
  const fixtureMode = args.has('--fixture') || process.env.CONTENT_CERT_MODE === 'fixture';

  let baseline: PlatformCertification | null = null;
  if (fs.existsSync(BASELINE_PATH)) {
    try {
      baseline = JSON.parse(fs.readFileSync(BASELINE_PATH, 'utf8'));
    } catch {
      baseline = null;
    }
  }

  if (fixtureMode) {
    if (!baseline) {
      console.error('✗ Fixture certification requires .content-certification.baseline.json');
      process.exit(1);
    }
    const cert = new ContentCertificationService({} as PrismaService, {} as ContentLedgerService);
    const report: PlatformCertification = {
      ...baseline,
      generatedAt: new Date().toISOString(),
    };
    fs.writeFileSync(REPORT_PATH, cert.renderMarkdown(report), 'utf8');
    console.log(`✓ Wrote ${path.relative(REPO_ROOT, REPORT_PATH)} from committed fixture baseline`);
    console.log(`  Platform grade ${report.overallGrade} · retention ${report.overallEffectiveRetention}% · broken ${report.totals.broken}`);

    const floor = process.env.CONTENT_CERT_MIN_RETENTION
      ? Number(process.env.CONTENT_CERT_MIN_RETENTION)
      : undefined;
    const gate = evaluateRegressionGate(report, baseline, floor != null ? { minRetention: floor } : {});
    if (gateMode && !gate.passed) {
      console.error('\n✗ CONTENT SAFETY REGRESSION GATE FAILED:');
      for (const v of gate.violations) console.error(`  - [${v.rule}] ${v.message}`);
      process.exit(1);
    }
    if (gate.passed) console.log('✓ Regression gate passed');
    else console.warn('⚠ Regression gate violations (non-gate mode):', gate.violations.map((v) => v.rule).join(', '));
    return;
  }

  const prisma = new PrismaService();
  await prisma.$connect();
  const ledger = new ContentLedgerService(prisma);
  const cert = new ContentCertificationService(prisma, ledger);

  const report = await cert.certifyPlatform();

  // Phase 8 — write the human-readable certification.
  fs.writeFileSync(REPORT_PATH, cert.renderMarkdown(report), 'utf8');
  console.log(`✓ Wrote ${path.relative(REPO_ROOT, REPORT_PATH)}`);
  console.log(`  Platform grade ${report.overallGrade} · retention ${report.overallEffectiveRetention}% · broken ${report.totals.broken}`);

  // Phase 9 — regression gate against the committed baseline.
  // Floor is configurable so teams can ratchet from the current baseline while
  // historical debt is paid down (default = the platform certification target).
  const floor = process.env.CONTENT_CERT_MIN_RETENTION ? Number(process.env.CONTENT_CERT_MIN_RETENTION) : undefined;
  const gate = evaluateRegressionGate(report, baseline, floor != null ? { minRetention: floor } : {});

  if (gateMode && !gate.passed) {
    console.error('\n✗ CONTENT SAFETY REGRESSION GATE FAILED:');
    for (const v of gate.violations) console.error(`  - [${v.rule}] ${v.message}`);
    await prisma.$disconnect();
    process.exit(1);
  }
  if (gate.passed) console.log('✓ Regression gate passed');
  else console.warn('⚠ Regression gate violations (non-gate mode):', gate.violations.map((v) => v.rule).join(', '));

  // Refresh baseline when explicitly asked or when none exists yet.
  if (updateBaseline || !baseline) {
    fs.writeFileSync(BASELINE_PATH, JSON.stringify(report, null, 2), 'utf8');
    console.log(`✓ Baseline written to ${path.relative(REPO_ROOT, BASELINE_PATH)}`);
  }

  await prisma.$disconnect();
}

main().catch((err) => { console.error(err); process.exit(1); });
