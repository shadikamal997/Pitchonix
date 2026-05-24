/**
 * Phase 41 — Universal Document Conversion validation.
 *
 *   41A — UniversalImportService entry + format detection
 *   41B — Universal Document Model
 *   41C — PDF importer
 *   41D — DOCX importer
 *   41E — Excel + CSV importer
 *   41F — HTML importer
 *   41G — Markdown importer
 *   41H — Universal export engine (PPTX/PDF/DOCX/HTML/MD/TXT/RTF)
 *   41I — Document → Presentation transform
 *   41J — Presentation → Document transform
 *   41K — PDF → Presentation pipeline
 *   41L — DOCX → Presentation pipeline
 *   41M — Presentation → PDF Studio pipeline
 *   41N — Conversion wizard UI
 *   41O — Batch conversion
 *   41P — Brand preservation hook
 *   41Q — Conversion quality report
 *   41T — API surface
 *   41U — Performance targets (<2s DOCX, <5s PDF/PPTX)
 *   41V — Cross-format round-trip tests
 */

import * as fs from 'fs';
import * as path from 'path';
import { PptxImportService } from '../src/pptx-import/pptx-import.service';
import { UniversalConversionService } from '../src/universal-conversion/universal-conversion.service';
import {
  emptyDocument, heading, paragraph, bulletList, table, image, totalNodes, detectFormat, FORMAT_FAMILY,
} from '../src/universal-conversion/document-model';
import { exportHtml } from '../src/universal-conversion/exporters/html-exporter';
import { exportMarkdown } from '../src/universal-conversion/exporters/markdown-exporter';
import { exportText, exportRtf } from '../src/universal-conversion/exporters/text-exporter';
import { exportDocx } from '../src/universal-conversion/exporters/docx-exporter';
import { exportPptx } from '../src/universal-conversion/exporters/pptx-exporter';

const BE       = path.join(__dirname, '..');
const FE       = path.join(__dirname, '..', '..', 'frontend');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
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
  console.log('Phase 41 — Universal Document Conversion validation\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('41B — Universal Document Model');
  check('document-model.ts exists', existsBE('src/universal-conversion/document-model.ts'));
  check('FORMAT_FAMILY classifies pptx/pdf/docx/xlsx/md/html/csv/txt',
    FORMAT_FAMILY.pptx === 'presentation' &&
    FORMAT_FAMILY.pdf  === 'pdf' &&
    FORMAT_FAMILY.docx === 'document' &&
    FORMAT_FAMILY.xlsx === 'spreadsheet' &&
    FORMAT_FAMILY.md   === 'document' &&
    FORMAT_FAMILY.html === 'document' &&
    FORMAT_FAMILY.csv  === 'spreadsheet' &&
    FORMAT_FAMILY.txt  === 'plaintext');
  check('detectFormat infers from filename',  detectFormat('foo.pptx') === 'pptx' && detectFormat('a.csv') === 'csv');
  check('detectFormat infers from mimetype',  detectFormat(undefined, 'application/pdf') === 'pdf');

  console.log('\n41A + 41C-G — Importers exist');
  for (const f of [
    'src/universal-conversion/importers/pdf-importer.ts',
    'src/universal-conversion/importers/docx-importer.ts',
    'src/universal-conversion/importers/xlsx-importer.ts',
    'src/universal-conversion/importers/html-importer.ts',
    'src/universal-conversion/importers/markdown-importer.ts',
    'src/universal-conversion/importers/text-importer.ts',
    'src/universal-conversion/importers/pptx-adapter.ts',
  ]) check(`file exists: ${f}`, existsBE(f));

  console.log('\n41H — Exporters exist');
  for (const f of [
    'src/universal-conversion/exporters/markdown-exporter.ts',
    'src/universal-conversion/exporters/html-exporter.ts',
    'src/universal-conversion/exporters/text-exporter.ts',
    'src/universal-conversion/exporters/docx-exporter.ts',
    'src/universal-conversion/exporters/pptx-exporter.ts',
    'src/universal-conversion/exporters/pdf-exporter.ts',
  ]) check(`file exists: ${f}`, existsBE(f));

  console.log('\n41I + 41J — Cross-format transforms');
  check('document-to-presentation.ts exists',  existsBE('src/universal-conversion/transforms/document-to-presentation.ts'));
  check('presentation-to-document.ts exists',  existsBE('src/universal-conversion/transforms/presentation-to-document.ts'));

  console.log('\n41T — API + wiring');
  check('service exists', existsBE('src/universal-conversion/universal-conversion.service.ts'));
  const svc = readBE('src/universal-conversion/universal-conversion.service.ts');
  check('service exposes convert + startBatch + getBatch',
    /async convert\(/.test(svc) && /startBatch\(/.test(svc) && /getBatch\(/.test(svc));
  check('quality report shape includes preserved/modified/lost/scores/overall',
    /preserved:/.test(svc) && /modified:/.test(svc) && /lost:/.test(svc) && /scores:/.test(svc) && /overall:/.test(svc));
  const ctl = readBE('src/universal-conversion/universal-conversion.controller.ts');
  check('controller exposes /convert + /convert/preview + /convert/batch + /convert/status + /convert/result',
    /@Post\(\)/.test(ctl) && /'preview'/.test(ctl) && /'batch'/.test(ctl) && /'status\/:jobId'/.test(ctl) && /'result\/:jobId'/.test(ctl));
  check('UniversalConversionModule registered in app.module',
    /UniversalConversionModule/.test(readBE('src/app.module.ts')));

  console.log('\n41N — Conversion wizard UI');
  check('frontend convert page exists', existsFE('app/convert/page.tsx'));
  const pg = fs.readFileSync(path.join(FE, 'app/convert/page.tsx'), 'utf8');
  check('wizard has upload → format → options → preview → convert flow',
    /step === 'upload'/.test(pg) && /step === 'format'/.test(pg) && /step === 'preview'/.test(pg) && /step === 'convert'/.test(pg));

  // ===========================================================================
  //  Live: smoke-test every exporter against a synthetic UDM
  // ===========================================================================
  console.log('\n41H — Live exporter smoke');
  const sample = emptyDocument('docx', 'Conversion Smoke');
  sample.pages.push({
    title: 'Cover',
    nodes: [
      heading(1, 'Universal Conversion Smoke'),
      paragraph('Verifying every exporter produces a non-empty buffer.'),
      bulletList(['First bullet', 'Second bullet', 'Third bullet']),
      table([[{ text: 'Col A' }, { text: 'Col B' }], [{ text: '1' }, { text: '2' }]], true),
      image('https://example.com/image.png', 'Alt'),
    ],
    notes: 'Speaker notes preserved.',
  });
  sample.pages.push({ title: 'Page 2', nodes: [heading(2, 'Section'), paragraph('Body.')] });

  const md   = exportMarkdown(sample);  check(`markdown export emits ${md.length}B`,   md.length > 100);
  const html = exportHtml(sample);      check(`html export emits ${html.length}B + has DOCTYPE`, html.length > 200 && html.toString('utf8').includes('<!DOCTYPE'));
  const txt  = exportText(sample);      check(`text export emits ${txt.length}B`,     txt.length > 50);
  const rtf  = exportRtf(sample);       check(`rtf export emits ${rtf.length}B + starts with rtf header`, rtf.length > 50 && rtf.toString('utf8').includes('rtf1'));
  const docx = await exportDocx(sample);check(`docx export emits ${docx.length}B`, docx.length > 1000);
  const pptx = await exportPptx(sample);check(`pptx export emits ${pptx.length}B`, pptx.length > 5000);

  // ===========================================================================
  //  Live: cross-format round-trip suite (41V)
  // ===========================================================================
  console.log('\n41V — Cross-format conversions');
  const pptxImport = new (PptxImportService as any)(null);
  const conv       = new UniversalConversionService(pptxImport, null as any);

  // Markdown → PPTX
  {
    const md = Buffer.from('# Deck Title\n\n## First section\n\nBody line one.\n\n- a\n- b\n\n---\n\n## Second\n\nMore.', 'utf8');
    const t0 = Date.now();
    const r = await conv.convert({ buffer: md, filename: 'in.md', targetFormat: 'pptx' });
    const dt = Date.now() - t0;
    check(`MD → PPTX produced PPTX (${r.buffer.length}B in ${dt}ms)`, r.format === 'pptx' && r.buffer.length > 5000);
    check(`MD → PPTX report has scores`, typeof r.report.overall === 'number');
  }
  // HTML → DOCX
  {
    const html = Buffer.from('<html><body><h1>Title</h1><h2>Section</h2><p>Body</p><ul><li>One</li><li>Two</li></ul></body></html>', 'utf8');
    const t0 = Date.now();
    const r = await conv.convert({ buffer: html, filename: 'in.html', targetFormat: 'docx' });
    const dt = Date.now() - t0;
    check(`HTML → DOCX produced DOCX (${r.buffer.length}B in ${dt}ms; target <2s)`, r.format === 'docx' && r.buffer.length > 1000 && dt < 2000);
  }
  // CSV → HTML
  {
    const csv = Buffer.from('A,B,C\n1,2,3\n4,5,6\n', 'utf8');
    const r = await conv.convert({ buffer: csv, filename: 'in.csv', targetFormat: 'html' });
    check(`CSV → HTML produced HTML containing the headers`,
      r.format === 'html' && r.buffer.toString('utf8').includes('A') && r.buffer.toString('utf8').includes('B'));
  }
  // Markdown → DOCX (perf target)
  {
    const md = Buffer.from('# Hi\n\nBody\n\n## Next\n\nMore body and a list:\n\n- one\n- two\n- three\n'.repeat(20), 'utf8');
    const t0 = Date.now();
    const r = await conv.convert({ buffer: md, filename: 'in.md', targetFormat: 'docx' });
    const dt = Date.now() - t0;
    check(`MD → DOCX in <2s (took ${dt}ms)`, r.format === 'docx' && dt < 2000);
  }
  // HTML → PPTX
  {
    const html = Buffer.from('<h1>Strategy</h1><h2>Q1</h2><p>Body 1</p><h2>Q2</h2><p>Body 2</p>', 'utf8');
    const r = await conv.convert({ buffer: html, filename: 'in.html', targetFormat: 'pptx' });
    check(`HTML → PPTX produced PPTX`, r.format === 'pptx' && r.buffer.length > 5000);
  }

  // ===========================================================================
  //  Live: PPTX → DOCX (depends on the PPTX adapter)
  // ===========================================================================
  console.log('\n41J — Presentation → Document');
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const PptxGenJS = require('pptxgenjs');
    const p = new PptxGenJS(); p.layout = 'LAYOUT_WIDE';
    for (const t of ['Cover', 'Problem', 'Solution']) {
      const s = p.addSlide();
      s.addText(t, { x: 0.5, y: 0.4, w: 12, h: 1, fontSize: 28, bold: true });
      s.addText(`Body for ${t}`, { x: 0.5, y: 1.5, w: 12, h: 1, fontSize: 16 });
      s.addNotes(`Notes for ${t}`);
    }
    const pptxBuf = (await p.write({ outputType: 'nodebuffer' })) as Buffer;
    const t0 = Date.now();
    const r = await conv.convert({ buffer: pptxBuf, filename: 'in.pptx', targetFormat: 'docx' });
    const dt = Date.now() - t0;
    check(`PPTX → DOCX in <5s (took ${dt}ms, ${r.buffer.length}B)`, r.format === 'docx' && r.buffer.length > 1000 && dt < 5000);
    check(`PPTX → DOCX quality overall ≥ 60 (got ${r.report.overall})`, r.report.overall >= 60);
  } catch (e: any) {
    check(`PPTX → DOCX threw: ${e?.message}`, false);
  }

  // ===========================================================================
  //  Live: batch (41O)
  // ===========================================================================
  console.log('\n41O — Batch');
  const job = conv.startBatch([
    { buffer: Buffer.from('# A', 'utf8'), filename: 'a.md', targetFormat: 'html' },
    { buffer: Buffer.from('# B', 'utf8'), filename: 'b.md', targetFormat: 'txt'  },
    { buffer: Buffer.from('# C', 'utf8'), filename: 'c.md', targetFormat: 'rtf'  },
  ]);
  // Spin briefly until done (synthetic conversions are fast).
  for (let i = 0; i < 50 && job.status !== 'complete' && job.status !== 'failed'; i++) {
    await new Promise((r) => setTimeout(r, 50));
  }
  check(`batch completed (status=${job.status}, done=${job.done}/${job.total})`,
    job.status === 'complete' && job.done === 3 && job.results.every((r) => r.ok));

  // ===========================================================================
  //  Quality scoring shape (41Q)
  // ===========================================================================
  console.log('\n41Q — Quality report shape');
  {
    const md = Buffer.from('# Deck\n\n## A\n\nText.\n', 'utf8');
    const r = await conv.convert({ buffer: md, filename: 'in.md', targetFormat: 'pptx' });
    check('quality report has scores object',           typeof r.report.scores === 'object' && r.report.scores !== null);
    check('quality report has preserved/modified/lost', Array.isArray(r.report.preserved) && Array.isArray(r.report.modified) && Array.isArray(r.report.lost));
    check('overall is 0..100',                          r.report.overall >= 0 && r.report.overall <= 100);
  }

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 41 — all ${total} checks passed` : `✗ Phase 41 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
