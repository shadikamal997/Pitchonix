/**
 * Phase Ω.CONTENT.3A — Phase 3/6 Reproduction (READ-ONLY, no DB writes).
 * Re-parse the ACTUAL exported deck with CURRENT code and recompute presence
 * for every currently-broken node, to see which results change.
 */
import * as fs from 'fs';
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentLedgerService } from '../src/content-ledger/content-ledger.service';
import { PptxImportLedgerService } from '../src/content-ledger/pptx-import-ledger.service';

const EXPORT = 'exports/ledger-import-test-deck-1780955529347.pptx';
const norm = (s: any): string => String(s ?? '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const ledger = new ContentLedgerService(prisma);
  const svc = new PptxImportLedgerService(ledger);

  const buf = fs.readFileSync(EXPORT);
  const rawText = await svc.extractText(buf, 'pptx');
  const hay = norm(rawText);
  console.log(`Export: ${EXPORT} (${buf.length} bytes)`);
  console.log(`Extracted text layer length: ${rawText.length} chars\n`);

  // Pull the currently-broken pptx_import nodes for the affected doc.
  const docId = 'pi-3899ad15-8947-4b5d-8190-e45a0265e71e';
  const nodes: any[] = await (prisma as any).contentNode.findMany({ where: { sourceDocumentId: docId } });
  const broken = nodes.filter((n) => n.exported && !n.reopened);

  // CURRENT presence logic (mirrors pptx-import-ledger.recordExportReopen).
  const rich = true; // pptx
  const evalNode = (n: any) => {
    const needle: string = n.metadata?.needle || '';
    const structural = n.metadata?.binary || n.type === 'importedLayout';
    return structural ? rich : (!needle || hay.includes(needle));
  };

  let flips = 0;
  console.log('node type                 | needle                              | OLD reopened | CURRENT-code present');
  console.log('--------------------------|-------------------------------------|--------------|---------------------');
  for (const n of broken) {
    const present = evalNode(n);
    if (present) flips++;
    console.log(`${n.type.padEnd(25)} | ${String(n.metadata?.needle || '').padEnd(35)} | ${'false'.padEnd(12)} | ${present}`);
  }
  console.log(`\n${flips}/${broken.length} currently-broken nodes would REOPEN under current code.`);

  // Detector spot-checks (Phase 6): is the title text actually in the export?
  console.log('\n=== Phase 6: needle presence in actual export text layer ===');
  const probes = ['slide 2', 'slide 4', 'slide 10', 'slide 12', 'slide 14', 'slide 16', 'slide 18', 'slide 20', 'slide title number 1', 'slide title number 10', 'ppt slidelayouts slidelayout1 xml'];
  for (const p of probes) console.log(`  hay.includes("${p}") = ${hay.includes(p)}`);

  // Raw occurrences of "slide 1" / "slide 2" families to explain the 10/12 split.
  console.log('\n=== raw "slide NN" tokens present in text layer ===');
  const found = [...new Set((hay.match(/slide \d+/g) || []))].sort();
  console.log('  ' + (found.join(', ') || '(none)'));

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
