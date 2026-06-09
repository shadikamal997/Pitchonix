/**
 * Phase Ω.CONTENT.3A — Certification Failure Forensics (READ-ONLY).
 * Inspects the live ledger. Repairs nothing, changes no scoring.
 */
import { PrismaService } from '../src/prisma/prisma.service';
import { ContentLedgerService } from '../src/content-ledger/content-ledger.service';

const iso = (d: any) => (d ? new Date(d).toISOString() : null);
const prev = (s: any, n = 80) => (s ? String(s).replace(/\s+/g, ' ').slice(0, n) : null);

async function main() {
  const prisma = new PrismaService();
  await prisma.$connect();
  const ledger = new ContentLedgerService(prisma);
  const nodes = (prisma as any).contentNode;

  // ── PHASE 1 — every broken node, full fields ────────────────────────────────
  const all: any[] = await nodes.findMany({});
  const byDoc = new Map<string, any[]>();
  for (const r of all) (byDoc.get(r.sourceDocumentId) || byDoc.set(r.sourceDocumentId, []).get(r.sourceDocumentId)!).push(r);

  const broken: any[] = [];
  for (const [docId, group] of byDoc) {
    const b = await ledger.calculateLoss(docId, group);
    const byId = new Map(group.map((g) => [g.id, g]));
    for (const x of b) {
      const raw = byId.get(x.id);
      broken.push({
        nodeId: x.id, module: x.module, type: x.type, sourceDocumentId: docId,
        lossReason: x.reason, failurePoint: x.failurePoint, destination: x.destination,
        createdAt: iso(raw?.createdAt), importedAt: iso(raw?.importedAt), renderedAt: iso(raw?.renderedAt),
        exportedAt: iso(raw?.exportedAt), reopenedAt: iso(raw?.reopenedAt),
        imported: raw?.imported, rendered: raw?.rendered, exported: raw?.exported, reopened: raw?.reopened,
        renderer: raw?.renderer, sourceType: raw?.sourceType,
        metadataNeedle: raw?.metadata?.needle, metadataBinary: raw?.metadata?.binary,
        content: prev(raw?.content),
      });
    }
  }

  console.log('===== PHASE 1: BROKEN NODES =====');
  console.log(`total broken: ${broken.length}`);
  console.log(JSON.stringify(broken, null, 2));

  // ── PHASE 1b — group by (module,type,lossReason,failurePoint) ────────────────
  const groups = new Map<string, number>();
  for (const b of broken) {
    const k = `${b.module} | ${b.type} | ${b.lossReason} | ${b.failurePoint}`;
    groups.set(k, (groups.get(k) || 0) + 1);
  }
  console.log('\n===== PHASE 1b: GROUPED =====');
  for (const [k, n] of [...groups.entries()].sort((a, b) => b[1] - a[1])) console.log(`${n.toString().padStart(3)}  ${k}`);

  // ── PHASE 2 — timeline span of ledger writes (to spot stale data) ────────────
  const times = all.map((r) => new Date(r.createdAt).getTime());
  const reopenTimes = all.filter((r) => r.reopenedAt).map((r) => new Date(r.reopenedAt).getTime());
  console.log('\n===== PHASE 2: TIMELINE =====');
  console.log(`total nodes in ledger: ${all.length}`);
  console.log(`createdAt range: ${iso(Math.min(...times))}  →  ${iso(Math.max(...times))}`);
  if (reopenTimes.length) console.log(`reopenedAt range: ${iso(Math.min(...reopenTimes))}  →  ${iso(Math.max(...reopenTimes))}`);
  // distinct reopen "runs" per document (cluster reopenedAt)
  for (const [docId, group] of byDoc) {
    const rt = group.filter((g) => g.reopenedAt).map((g) => iso(g.reopenedAt));
    const distinct = [...new Set(rt)];
    const created = [...new Set(group.map((g) => iso(g.createdAt)))];
    console.log(`\n  doc ${docId} (${group[0].module}): ${group.length} nodes`);
    console.log(`    created: ${created.join(', ')}`);
    console.log(`    exported: ${[...new Set(group.filter((g) => g.exportedAt).map((g) => iso(g.exportedAt)))].join(', ') || 'never'}`);
    console.log(`    reopened runs: ${distinct.length ? distinct.join(', ') : 'never'}`);
    console.log(`    reopened=true: ${group.filter((g) => g.reopened).length}/${group.length}`);
  }

  // ── PHASE 4 — importedLayout node lifecycle ─────────────────────────────────
  const layouts = all.filter((r) => r.type === 'importedLayout');
  console.log('\n===== PHASE 4: importedLayout NODES =====');
  console.log(`count: ${layouts.length}`);
  for (const n of layouts) {
    console.log(`  ${n.id} doc=${n.sourceDocumentId} imp=${n.imported} ren=${n.rendered} exp=${n.exported} reo=${n.reopened} loss=${n.lossReason} binary=${n.metadata?.binary} needle="${prev(n.metadata?.needle, 40)}" content="${prev(n.content, 40)}"`);
  }

  // ── PHASE 5 — slide title nodes ─────────────────────────────────────────────
  const titles = all.filter((r) => /title/i.test(r.type) || r.lossReason === 'slide_title_missing' || r.lossReason === 'title_lost');
  console.log('\n===== PHASE 5: SLIDE TITLE NODES =====');
  console.log(`count: ${titles.length}`);
  for (const n of titles) {
    console.log(`  ${n.id} doc=${n.sourceDocumentId} type=${n.type} imp=${n.imported} ren=${n.rendered} exp=${n.exported} reo=${n.reopened} loss=${n.lossReason} needle="${prev(n.metadata?.needle, 40)}" content="${prev(n.content, 50)}"`);
  }

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
