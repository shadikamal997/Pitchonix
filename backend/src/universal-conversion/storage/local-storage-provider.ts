import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { ConversionStorageProvider, SavedFile, StorageHealth } from './storage-provider';

// =============================================================================
//  Phase 41.2D — LocalStorageProvider.
//
//  Writes binaries under <UPLOAD_DIR>/converted/. The handle is the basename
//  on disk; the URL is `/uploads/converted/<basename>`.
//
//  Default backing dir: `process.cwd()/uploads/converted`.
//  Override via env: `UPLOAD_DIR=/var/data/pitchonix-uploads`.
// =============================================================================

const STORAGE_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'converted')
  : path.resolve(process.cwd(), 'uploads', 'converted');

const PUBLIC_PREFIX = '/uploads/converted';

export class LocalStorageProvider implements ConversionStorageProvider {
  readonly name = 'local' as const;

  constructor() {
    if (!fs.existsSync(STORAGE_DIR)) {
      try { fs.mkdirSync(STORAGE_DIR, { recursive: true }); } catch { /* logged on first write */ }
    }
  }

  async save(buffer: Buffer, originalFilename: string, _mimetype?: string): Promise<SavedFile> {
    const ext  = pickExt(originalFilename);
    const safe = `${crypto.randomUUID()}${ext}`;
    const full = path.join(STORAGE_DIR, safe);
    fs.writeFileSync(full, buffer);
    return { handle: safe, url: `${PUBLIC_PREFIX}/${safe}`, bytes: buffer.length };
  }

  async read(handle: string): Promise<Buffer> {
    const full = path.join(STORAGE_DIR, path.basename(handle));
    return fs.readFileSync(full);
  }

  async delete(handle: string): Promise<void> {
    const full = path.join(STORAGE_DIR, path.basename(handle));
    try { fs.unlinkSync(full); } catch { /* idempotent */ }
  }

  async list(prefix?: string) {
    if (!fs.existsSync(STORAGE_DIR)) return [];
    return fs.readdirSync(STORAGE_DIR)
      .filter((n) => !prefix || n.startsWith(prefix))
      .map((n) => {
        const stat = fs.statSync(path.join(STORAGE_DIR, n));
        return { handle: n, url: `${PUBLIC_PREFIX}/${n}`, bytes: stat.size };
      });
  }

  async healthcheck(): Promise<StorageHealth> {
    const t0 = Date.now();
    try {
      const probe = path.join(STORAGE_DIR, `.health-${process.pid}-${Date.now()}`);
      fs.writeFileSync(probe, 'ok');
      fs.unlinkSync(probe);
      return { ok: true, provider: 'local', latencyMs: Date.now() - t0 };
    } catch (e: any) {
      return { ok: false, provider: 'local', error: e?.message || String(e) };
    }
  }
}

function pickExt(filename: string): string {
  const m = filename?.match(/\.[a-z0-9]+$/i);
  return m ? m[0].toLowerCase() : '.bin';
}
