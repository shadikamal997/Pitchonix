import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { OoxmlPackage } from './ooxml-parser';

// =============================================================================
//  Phase 38.2B — OLE embedded objects.
//
//  PowerPoint stores embedded Excel / Word / PDF / generic OLE objects as
//  binaries inside `ppt/embeddings/`. The slide's <p:oleObj> references the
//  binary via a `r:id`. We:
//
//    1. Extract every embedding to the uploads dir (mirrors the media pipeline)
//    2. Build an OleEntry per binary with sniffed kind + bytes + URL
//    3. The slide walker resolves <p:oleObj> in graphicFrames and emits an
//       `oleObject` element pointing to the public URL so the editor can
//       render a download card.
//
//  The "render embedded object card" UI lives client-side; the importer is
//  responsible for getting the bytes out and tagging them.
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'embeddings')
  : path.resolve(process.cwd(), 'uploads', 'embeddings');

const PUBLIC_PREFIX = '/uploads/embeddings';

export type OleKind = 'excel' | 'word' | 'pdf' | 'powerpoint' | 'binary';

export interface OleEntry {
  zipPath:   string;
  publicUrl: string;
  filename:  string;
  kind:      OleKind;
  bytes:     number;
}

export function extractOleObjects(pkg: OoxmlPackage): Map<string, OleEntry> {
  ensureDir(UPLOAD_DIR);
  const out = new Map<string, OleEntry>();

  for (const entry of pkg.entries()) {
    if (!entry.startsWith('ppt/embeddings/')) continue;
    const data = pkg.readBinary(entry);
    if (!data) continue;

    const original = path.basename(entry);
    const ext      = path.extname(original).toLowerCase() || pickExtByMagic(data);
    const safe     = `${crypto.randomUUID()}${ext}`;
    const full     = path.join(UPLOAD_DIR, safe);

    try { fs.writeFileSync(full, data); }
    catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(`[pptx-import] failed to write embedding ${entry}: ${e?.message}`);
      continue;
    }

    out.set(entry, {
      zipPath:   entry,
      publicUrl: `${PUBLIC_PREFIX}/${safe}`,
      filename:  original,
      kind:      kindFor(ext, data),
      bytes:     data.length,
    });
  }
  return out;
}

// -----------------------------------------------------------------------------

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* logged on first write */ }
  }
}

function pickExtByMagic(buf: Buffer): string {
  if (buf.length < 4) return '.bin';
  // PK\x03\x04 → zip-based (xlsx/docx/pptx)
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) {
    return '.xlsx';   // safe default — we'll refine in kindFor
  }
  // %PDF
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return '.pdf';
  // D0CF11E0 → compound binary (old .xls / .doc)
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return '.xls';
  return '.bin';
}

function kindFor(ext: string, buf: Buffer): OleKind {
  const e = ext.toLowerCase();
  if (e === '.xlsx' || e === '.xls' || e === '.xlsm') return 'excel';
  if (e === '.docx' || e === '.doc')                  return 'word';
  if (e === '.pdf')                                    return 'pdf';
  if (e === '.pptx' || e === '.ppt')                  return 'powerpoint';
  // Magic sniff fallback for unknown ext.
  if (buf.length >= 4) {
    if (buf[0] === 0x25 && buf[1] === 0x50) return 'pdf';
    if (buf[0] === 0xD0 && buf[1] === 0xCF) return 'excel';   // OOXML compound binary
    if (buf[0] === 0x50 && buf[1] === 0x4B) return 'excel';   // safe default for zip
  }
  return 'binary';
}
