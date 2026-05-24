import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { OoxmlPackage } from './ooxml-parser';

// =============================================================================
//  Phase 38.1C — Media extraction pipeline.
//
//  Walks `ppt/media/*` once at import-time, writes every binary to the shared
//  uploads dir (same location the editor uses for native uploads), and returns
//  a map: original path inside the zip → public URL.
//
//  The importer later swaps `<a:blipFill>` references against this map so the
//  imported elements point at the new public URLs.
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'images')
  : path.resolve(process.cwd(), 'uploads', 'images');

const PUBLIC_PREFIX = '/uploads/images';

export interface MediaEntry {
  zipPath:   string;
  publicUrl: string;
  mimetype:  string | null;
  bytes:     number;
}

export function extractMedia(pkg: OoxmlPackage): Map<string, MediaEntry> {
  ensureDir(UPLOAD_DIR);
  const out = new Map<string, MediaEntry>();

  for (const entry of pkg.entries()) {
    if (!entry.startsWith('ppt/media/')) continue;
    const data = pkg.readBinary(entry);
    if (!data) continue;
    const ext = pickExt(entry) || '.bin';
    const safe = `${crypto.randomUUID()}${ext}`;
    const full = path.join(UPLOAD_DIR, safe);
    try {
      fs.writeFileSync(full, data);
    } catch (e: any) {
      // Soft-fail: keep import going, just skip this asset.
      console.warn(`[pptx-import] failed to write media ${entry}: ${e?.message}`);
      continue;
    }
    out.set(entry, {
      zipPath:   entry,
      publicUrl: `${PUBLIC_PREFIX}/${safe}`,
      mimetype:  mimeFor(ext),
      bytes:     data.length,
    });
  }
  return out;
}

function ensureDir(dir: string) {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* logged on first write */ }
  }
}

function pickExt(p: string): string {
  const m = p.match(/\.([a-zA-Z0-9]+)$/);
  return m ? `.${m[1].toLowerCase()}` : '';
}

function mimeFor(ext: string): string | null {
  switch (ext) {
    case '.png':  return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.gif':  return 'image/gif';
    case '.webp': return 'image/webp';
    case '.svg':  return 'image/svg+xml';
    case '.mp4':  return 'video/mp4';
    case '.mov':  return 'video/quicktime';
    case '.webm': return 'video/webm';
    case '.mp3':  return 'audio/mpeg';
    case '.wav':  return 'audio/wav';
    case '.m4a':  return 'audio/mp4';
    default:      return null;
  }
}
