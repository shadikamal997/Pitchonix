/**
 * Phase Ω.CONTENT.3B — Phase 1/2 ledger remediation.
 *
 * Option C (safest, NON-DESTRUCTIVE): re-export/refresh affected decks by
 * re-running the reopen reconciliation with CURRENT code. No content is deleted.
 * Stale layout losses clear (structural), placeholder titles stop counting as
 * loss, and precise matching removes substring false positives.
 *
 * Usage: npx ts-node scripts/refresh-content-ledger.ts [--apply]
 *   (dry-run prints the plan; --apply performs the refresh)
 */
import * as fs from 'fs';
import * as path from 'path';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentLedgerService } from '../src/content-ledger/content-ledger.service';
import { PptxImportLedgerService } from '../src/content-ledger/pptx-import-ledger.service';
import { PresentationLedgerService } from '../src/content-ledger/presentation-ledger.service';

const EXPORT = path.join(__dirname, '..', 'exports', 'ledger-import-test-deck-1780955529347.pptx');
const DECK_ID = '3899ad15-8947-4b5d-8190-e45a0265e71e';

async function brokenCount(ledger: ContentLedgerService, docId: string) {
  return (await ledger.calculateLoss(docId)).length;
}

async function main() {
  const apply = process.argv.includes('--apply');
  const prisma = new PrismaService();
  await prisma.$connect();
  const ledger = new ContentLedgerService(prisma);
  const pptxLedger = new PptxImportLedgerService(ledger);
  const presLedger = new PresentationLedgerService(prisma, ledger);

  // ── PHASE 1 — classify ──────────────────────────────────────────────────────
  console.log('=== PHASE 1: classification ===');
  console.log(`Deck ${DECK_ID}`);
  console.log('  classification: TEST_FIXTURE (synthetic "ledger-import-test-deck"; titles "Slide Title Number N", placeholder "Slide N").');
  console.log('  decision: Option C — re-export & refresh with current code (non-destructive). No real user content; nothing deleted.\n');

  const docs = [`pi-${DECK_ID}`, DECK_ID];
  console.log('=== BEFORE ===');
  for (const d of docs) console.log(`  ${d}: broken=${await brokenCount(ledger, d)}`);

  if (!apply) {
    console.log('\n(dry-run) re-run with --apply to refresh. No changes made.');
    await prisma.$disconnect();
    return;
  }

  if (!fs.existsSync(EXPORT)) {
    console.error(`Export not found: ${EXPORT}. Cannot refresh without the exported deck.`);
    await prisma.$disconnect();
    process.exit(1);
  }
  const buffer = fs.readFileSync(EXPORT);

  // ── PHASE 2 — re-reopen with current code ───────────────────────────────────
  console.log('\n=== PHASE 2: refresh (re-reopen with current code) ===');
  const r1 = await pptxLedger.recordExportReopen(DECK_ID, buffer, 'pptx');
  console.log(`  pptx_import: ${JSON.stringify(r1)}`);
  const r2 = await presLedger.recordExportReopen(DECK_ID, buffer, 'pptx');
  console.log(`  presentation: ${JSON.stringify(r2)}`);

  console.log('\n=== AFTER ===');
  for (const d of docs) console.log(`  ${d}: broken=${await brokenCount(ledger, d)}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
