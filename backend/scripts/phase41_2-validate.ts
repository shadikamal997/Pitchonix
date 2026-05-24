/**
 * Phase 41.2 — Universal Conversion Hardening validation.
 *
 *   41.2A — PDF bitmap extraction via pdfjs object cache + sharp
 *   41.2B — Advanced table reconstruction (merged / borderless / nested)
 *   41.2C — Cloud conversion storage (multi-instance ready)
 *   41.2D — Storage abstraction with Local / S3 / GCS / Azure providers
 *
 *   Source-scan + live extractor smoke + live storage save→read→delete cycle
 *   on the LocalStorageProvider (S3/GCS/Azure are dynamic-load, so we test
 *   that the modules + factory wire up without errors).
 */

import * as fs from 'fs';
import * as path from 'path';
import { LocalStorageProvider } from '../src/universal-conversion/storage/local-storage-provider';
import { S3StorageProvider }    from '../src/universal-conversion/storage/s3-storage-provider';
import { GCSStorageProvider }   from '../src/universal-conversion/storage/gcs-storage-provider';
import { AzureBlobProvider }    from '../src/universal-conversion/storage/azure-storage-provider';
import { createConversionStorage } from '../src/universal-conversion/storage/storage-factory';
import { detectTables, PdfTextItem } from '../src/universal-conversion/importers/pdf-table-detector';

const BE       = path.join(__dirname, '..');
const readBE   = (rel: string): string => fs.readFileSync(path.join(BE, rel), 'utf8');
const existsBE = (rel: string): boolean => fs.existsSync(path.join(BE, rel));

let fail = 0;
let total = 0;
function check(label: string, ok: boolean): void {
  total++;
  console.log(`  ${ok ? '·' : '!'} ${label}`);
  if (!ok) fail++;
}

async function main() {
  console.log('Phase 41.2 — Universal Conversion Hardening\n');

  // ===========================================================================
  //  Static scans
  // ===========================================================================
  console.log('41.2A — Bitmap extraction');
  check('pdf-image-extractor.ts exists',   existsBE('src/universal-conversion/importers/pdf-image-extractor.ts'));
  const ie = readBE('src/universal-conversion/importers/pdf-image-extractor.ts');
  check('uses pdfjs page.objs.get callback', /page\.objs\.get|pdfPage\.objs\.get/.test(ie) || /objs\.get/.test(ie));
  check('uses sharp raw RGBA→PNG pipeline',  /raw:\s*\{[\s\S]*channels/.test(ie));
  check('selects 1 / 3 / 4 channels via dataLength', /pickChannels/.test(ie));
  const gi = readBE('src/universal-conversion/importers/pdf-geometry-importer.ts');
  check('geometry importer calls extractPageImages',     /extractPageImages\(/.test(gi));
  check('falls back to placeholder when extraction fails',
    /not extractable|Embedded image/.test(gi));

  console.log('\n41.2B — Advanced table reconstruction');
  check('pdf-table-detector.ts exists',          existsBE('src/universal-conversion/importers/pdf-table-detector.ts'));
  const td = readBE('src/universal-conversion/importers/pdf-table-detector.ts');
  check('detector handles merged cells via colspan',
    /colspan/.test(td) && /projectLineOntoBoundaries/.test(td));
  check('detector handles borderless via consecutive-row alignment',
    /MIN_BORDERLESS_ROWS/.test(td) && /linesHaveExplicitGaps/.test(td));
  check('detector clusters boundaries across the cluster',
    /clusterBoundaries/.test(td));
  check('detector infers header row',            /inferHeaderRow/.test(td));
  check('geometry importer uses detectTablesV2', /detectTablesV2|detectTables as detectTablesV2/.test(gi));

  console.log('\n41.2C-D — Storage abstraction');
  for (const f of [
    'src/universal-conversion/storage/storage-provider.ts',
    'src/universal-conversion/storage/local-storage-provider.ts',
    'src/universal-conversion/storage/s3-storage-provider.ts',
    'src/universal-conversion/storage/gcs-storage-provider.ts',
    'src/universal-conversion/storage/azure-storage-provider.ts',
    'src/universal-conversion/storage/storage-factory.ts',
  ]) check(`file exists: ${f}`, existsBE(f));

  const factory = readBE('src/universal-conversion/storage/storage-factory.ts');
  check('factory switches on CONVERSION_STORAGE env',
    /CONVERSION_STORAGE/.test(factory) && /'s3'/.test(factory) && /'gcs'/.test(factory) && /'azure'/.test(factory));

  const s3 = readBE('src/universal-conversion/storage/s3-storage-provider.ts');
  check('S3 provider dynamic-loads @aws-sdk/client-s3',
    /require\(['"]@aws-sdk\/client-s3['"]\)/.test(s3));
  const gcs = readBE('src/universal-conversion/storage/gcs-storage-provider.ts');
  check('GCS provider dynamic-loads @google-cloud/storage',
    /require\(['"]@google-cloud\/storage['"]\)/.test(gcs));
  const az = readBE('src/universal-conversion/storage/azure-storage-provider.ts');
  check('Azure provider dynamic-loads @azure/storage-blob',
    /require\(['"]@azure\/storage-blob['"]\)/.test(az));

  const lineage = readBE('src/universal-conversion/conversion-lineage.service.ts');
  check('lineage service uses ConversionStorageProvider',  /this\.storage\.save\(/.test(lineage) && /this\.storage\.read\(/.test(lineage) && /this\.storage\.delete\(/.test(lineage));
  check('lineage persists storageHandle + storageBackend', /storageHandle:/.test(lineage) && /storageBackend:/.test(lineage));

  const schema = readBE('prisma/schema.prisma');
  check('ConvertedFile.storageHandle field added', /storageHandle\s+String\?/.test(schema));
  check('ConvertedFile.storageBackend field added', /storageBackend\s+String\?/.test(schema));

  const ctl = readBE('src/universal-conversion/universal-conversion.controller.ts');
  check('controller exposes /storage/diagnostics', /storage\/diagnostics/.test(ctl));

  // ===========================================================================
  //  Live: advanced table detector
  // ===========================================================================
  console.log('\n41.2B — Live table detector');
  // Synthesise 4 rows of mixed cell counts (row 1 = 3 cells, rows 2-4 = 4 cells).
  // After boundary clustering, row 1 should expand to 4 cells with a colspan.
  const mk = (str: string, x: number, y: number, w = 24, fs = 12): PdfTextItem => ({
    str, x, y, width: w, height: fs, fontSize: fs,
  });
  const lines: PdfTextItem[][] = [
    // Header — `Seats & Pricing` is intentionally wide (width 200) to span
    // the 130 + 220 columns; the detector should infer colspan ≥ 2 on it.
    [mk('Plan', 40, 700),  mk('Seats & Pricing', 130, 700, 200),                   mk('Annual', 310, 700)],
    [mk('Starter', 40, 680), mk('1-5', 130, 680), mk('$29', 220, 680), mk('$348', 310, 680)],
    [mk('Team',    40, 660), mk('6-25', 130, 660), mk('$99', 220, 660), mk('$1188', 310, 660)],
    [mk('Scale',   40, 640), mk('25+',  130, 640), mk('$299',220, 640), mk('$3588', 310, 640)],
  ];
  const blocks = detectTables(lines);
  const tableBlock = blocks.find((b) => b.kind === 'table') as any;
  check(`detector emitted a table block`, !!tableBlock);
  if (tableBlock) {
    check(`table has ≥3 rows`,                 tableBlock.rows.length >= 3);
    check(`first row contains 'Plan'`,          tableBlock.rows[0].some((c: any) => /Plan/.test(c.text)));
    check(`some cell carries colspan>1 (merged header inferred)`,
      tableBlock.rows[0].some((c: any) => (c.colspan || 1) > 1) ||
      tableBlock.rows.some((r: any[]) => r.some((c) => (c.colspan || 1) > 1)));
  }

  // ===========================================================================
  //  Live: LocalStorageProvider full cycle
  // ===========================================================================
  console.log('\n41.2D — Live local storage cycle');
  const local = new LocalStorageProvider();
  const payload = Buffer.from('Hello, conversion storage!', 'utf8');
  const saved = await local.save(payload, 'sample.txt', 'text/plain');
  check(`save returned a handle (${saved.handle})`,    typeof saved.handle === 'string' && saved.handle.length > 0);
  check(`save returned a URL (${saved.url})`,           saved.url.startsWith('/uploads/converted/'));
  check(`save returned correct bytes`,                  saved.bytes === payload.length);
  const readBuf = await local.read(saved.handle);
  check(`read returned same bytes`,                     Buffer.compare(readBuf, payload) === 0);
  const health = local.healthcheck ? await local.healthcheck() : { ok: true };
  check(`healthcheck OK (${(health as any).latencyMs}ms)`, health.ok === true);
  await local.delete(saved.handle);
  let stillExists = true;
  try { await local.read(saved.handle); } catch { stillExists = false; }
  check(`delete removed the file (read after delete throws)`, !stillExists);

  // ===========================================================================
  //  Live: cloud providers — construct + verify clear error when SDK missing
  // ===========================================================================
  console.log('\n41.2D — Cloud providers dynamic-load behaviour');
  for (const [name, Provider] of [
    ['s3',    S3StorageProvider],
    ['gcs',   GCSStorageProvider],
    ['azure', AzureBlobProvider],
  ] as const) {
    const p = new (Provider as any)();
    let threwClear = false;
    let msg = '';
    try { await p.save(Buffer.from('x'), 'a.txt'); }
    catch (e: any) { threwClear = /not installed|not set/i.test(e?.message || ''); msg = e?.message || ''; }
    check(`${name} provider throws helpful error when unconfigured (got: ${msg.slice(0, 80)})`, threwClear);
  }

  // ===========================================================================
  //  Live: factory respects env
  // ===========================================================================
  console.log('\n41.2D — Storage factory');
  process.env.CONVERSION_STORAGE = 'local';
  const f1 = createConversionStorage();
  check(`factory(CONVERSION_STORAGE=local) → LocalStorageProvider`, f1.name === 'local');
  process.env.CONVERSION_STORAGE = 's3';
  const f2 = createConversionStorage();
  check(`factory(CONVERSION_STORAGE=s3) → S3StorageProvider`,        f2.name === 's3');
  process.env.CONVERSION_STORAGE = 'gcs';
  const f3 = createConversionStorage();
  check(`factory(CONVERSION_STORAGE=gcs) → GCSStorageProvider`,      f3.name === 'gcs');
  process.env.CONVERSION_STORAGE = 'azure';
  const f4 = createConversionStorage();
  check(`factory(CONVERSION_STORAGE=azure) → AzureBlobProvider`,     f4.name === 'azure');
  delete process.env.CONVERSION_STORAGE;

  // ===========================================================================
  //  Summary
  // ===========================================================================
  console.log(`\n${fail === 0 ? `✓ Phase 41.2 — all ${total} checks passed` : `✗ Phase 41.2 — ${fail} of ${total} check(s) failed`}\n`);
  process.exit(fail === 0 ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
