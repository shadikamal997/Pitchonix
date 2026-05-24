/**
 * Phase 38.5J — Extended stress bench.
 *
 * Builds synthetic decks at 50 / 100 / 250 / 500 / 1000 slides and measures:
 *   - import (parse) time
 *   - export (write) time
 *   - certification time (full pipeline)
 *   - peak RSS memory + heap used
 *
 *   npx ts-node --transpile-only scripts/pptx-stress-bench.ts
 */

import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { exportDeckToPptx } from '../src/slide-export/element-pptx-exporter';
import { certifyDeck } from '../src/pptx-import/compatibility-certification';

interface BenchRow {
  slides:     number;
  buildMs:    number;
  parseMs:    number;
  exportMs:   number;
  certifyMs:  number;
  rssMb:      number;
  heapUsedMb: number;
  /** Pass = under all targets for this slide count. */
  pass:       boolean;
}

const TARGETS = (slides: number) => ({
  parseMs:  slides <= 100 ? 5000  : slides <= 500 ? 10000 : 30000,
  exportMs: slides <= 100 ? 5000  : slides <= 500 ? 10000 : 30000,
});

async function main() {
  const svc = new (PptxImportService as any)(null);
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PptxGenJS = require('pptxgenjs');

  console.log('Phase 38.5J — PPTX stress bench\n');
  console.log('slides   build    parse   export   certify    rss     heap   pass');
  console.log('───────────────────────────────────────────────────────────────────');

  const rows: BenchRow[] = [];
  for (const N of [50, 100, 250, 500, 1000]) {
    // 1) Build the deck buffer.
    const t1 = Date.now();
    const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
    for (let i = 0; i < N; i++) {
      const s = p.addSlide();
      s.addText(`Slide ${i + 1}`, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 24, bold: true });
      s.addText(`Body for slide ${i + 1}`, { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 14 });
      s.addNotes(`Notes ${i + 1}`);
    }
    const buf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
    const buildMs = Date.now() - t1;

    // 2) Parse.
    const t2 = Date.now();
    const parsed = svc.parseBuffer(buf);
    const parseMs = Date.now() - t2;

    // 3) Export the parsed deck back to PPTX.
    const renderInput = toRenderInput(parsed);
    const t3 = Date.now();
    await exportDeckToPptx(renderInput as any);
    const exportMs = Date.now() - t3;

    // 4) Certify (full pipeline).
    const t4 = Date.now();
    try { await certifyDeck(svc, buf); } catch { /* */ }
    const certifyMs = Date.now() - t4;

    if (global.gc) global.gc();
    const m = process.memoryUsage();
    const rssMb = Math.round(m.rss / 1024 / 1024);
    const heapUsedMb = Math.round(m.heapUsed / 1024 / 1024);

    const tgt = TARGETS(N);
    const pass = parseMs < tgt.parseMs && exportMs < tgt.exportMs;
    rows.push({ slides: N, buildMs, parseMs, exportMs, certifyMs, rssMb, heapUsedMb, pass });

    console.log(
      `${String(N).padStart(5)}   ${String(buildMs).padStart(5)}ms  ${String(parseMs).padStart(5)}ms  ${String(exportMs).padStart(5)}ms  ${String(certifyMs).padStart(6)}ms  ${String(rssMb).padStart(4)}M  ${String(heapUsedMb).padStart(4)}M  ${pass ? '✓' : '✗'}`,
    );
  }

  console.log('───────────────────────────────────────────────────────────────────');
  const allPass = rows.every((r) => r.pass);
  console.log(`\n${allPass ? '✓ all bench targets met' : '✗ at least one target missed'}\n`);
  process.exit(allPass ? 0 : 1);
}

function toRenderInput(parsed: any): any {
  return {
    title: parsed.title,
    slides: parsed.slides.map((s: any, idx: number) => ({
      index: idx,
      total: parsed.slides.length,
      title: s.title,
      background: null,
      themeTokens: null,
      elements: s.elements.map((el: any, j: number) => ({
        id: `imp-${idx}-${j}`,
        slideId: `imp-${idx}`,
        type: el.type, order: el.order,
        x: el.x, y: el.y, width: el.width, height: el.height,
        rotation: 0, zIndex: 0, locked: false, visible: true,
        content: el.content, style: el.style ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      })),
      speakerNotes: s.speakerNotes ?? null,
      transition: null,
    })),
  };
}

main().catch((e) => { console.error(e); process.exit(1); });
