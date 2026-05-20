// E2E test of SlideExportService — exercises all 4 formats against a real deck.
import { PrismaClient } from '@prisma/client';
import { SlideExportService } from './src/slide-export/slide-export.service';
import * as fs from 'fs';

async function main() {
  const prisma = new PrismaClient();
  const svc = new SlideExportService(prisma as any);

  // Pick the deck with the most elements (most expressive test).
  const decks = await prisma.deck.findMany({
    include: { slides: { include: { _count: { select: { elements: true } } } } },
  });
  const ranked = decks
    .map((d) => ({ id: d.id, title: d.title, els: d.slides.reduce((a, s) => a + s._count.elements, 0), slides: d.slides.length }))
    .sort((a, b) => b.els - a.els);
  if (!ranked.length) { console.error('No decks'); return; }
  const target = ranked[0];
  console.log(`Target deck: ${target.title}  (${target.slides} slides, ${target.els} elements)`);

  const results: any = {};

  for (const fmt of ['pptx', 'pdf', 'png', 'jpeg'] as const) {
    const t0 = Date.now();
    try {
      const res = await svc.export(target.id, fmt);
      const ms = Date.now() - t0;
      results[fmt] = {
        ok: true,
        ms,
        bytes: res.buffer.length,
        fileName: res.fileName,
        mime: res.mime,
        url: res.fileUrl,
        manifest: {
          slideCount: res.manifest.slideCount,
          elementTotal: res.manifest.elementTotal,
          warnings: res.manifest.warnings.length,
        },
      };
      console.log(`✓ ${fmt}: ${ms}ms, ${(res.buffer.length / 1024).toFixed(1)}KB → ${res.fileUrl}`);
      console.log(`  manifest: ${res.manifest.slideCount} slides / ${res.manifest.elementTotal} elements / ${res.manifest.warnings.length} warnings`);
    } catch (err: any) {
      results[fmt] = { ok: false, error: err.message };
      console.error(`✗ ${fmt}: ${err.message}\n${err.stack}`);
    }
  }

  fs.writeFileSync('/tmp/phase12-results.json', JSON.stringify(results, null, 2));
  console.log('\nSummary:');
  for (const [k, v] of Object.entries(results)) {
    const r = v as any;
    console.log(`  ${k.padEnd(6)} ${r.ok ? '✓' : '✗'}  ${r.ok ? `${(r.bytes/1024).toFixed(1)}KB in ${r.ms}ms` : r.error}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
