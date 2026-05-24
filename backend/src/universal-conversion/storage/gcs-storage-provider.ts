import * as crypto from 'crypto';
import { ConversionStorageProvider, SavedFile, StorageHealth } from './storage-provider';

// =============================================================================
//  Phase 41.2D — GCSStorageProvider.
//
//  Dynamic-load @google-cloud/storage. Install on demand:
//
//      pnpm add @google-cloud/storage
//
//  Auth: standard ADC (GOOGLE_APPLICATION_CREDENTIALS) or workload identity.
//
//  Config env:
//      CONVERSION_GCS_BUCKET           (required)
//      CONVERSION_GCS_PREFIX           (default "pitchonix/converted/")
//      CONVERSION_GCS_PUBLIC_BASE_URL  (optional, e.g. https://storage.googleapis.com/<bucket>)
// =============================================================================

export class GCSStorageProvider implements ConversionStorageProvider {
  readonly name = 'gcs' as const;
  private bucket?: any;

  constructor(
    private readonly bucketName    = process.env.CONVERSION_GCS_BUCKET || '',
    private readonly prefix        = process.env.CONVERSION_GCS_PREFIX || 'pitchonix/converted/',
    private readonly publicBaseUrl = process.env.CONVERSION_GCS_PUBLIC_BASE_URL || '',
  ) {}

  private ensure(): any {
    if (this.bucket) return this.bucket;
    let Storage: any;
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      Storage = require('@google-cloud/storage').Storage;
    } catch (e: any) {
      throw new Error(`[gcs-storage] @google-cloud/storage not installed (pnpm add @google-cloud/storage): ${e?.message}`);
    }
    if (!this.bucketName) throw new Error('[gcs-storage] CONVERSION_GCS_BUCKET not set');
    this.bucket = new Storage().bucket(this.bucketName);
    return this.bucket;
  }

  async save(buffer: Buffer, originalFilename: string, mimetype = 'application/octet-stream'): Promise<SavedFile> {
    const bucket = this.ensure();
    const key = this.prefix + crypto.randomUUID() + pickExt(originalFilename);
    await bucket.file(key).save(buffer, { contentType: mimetype, resumable: false });
    const url = await this.urlFor(key);
    return { handle: key, url, bytes: buffer.length };
  }

  async read(handle: string): Promise<Buffer> {
    const bucket = this.ensure();
    const [data] = await bucket.file(handle).download();
    return data;
  }

  async delete(handle: string): Promise<void> {
    try { await this.ensure().file(handle).delete({ ignoreNotFound: true }); }
    catch { /* idempotent */ }
  }

  async list(prefix?: string) {
    const bucket = this.ensure();
    const [files] = await bucket.getFiles({ prefix: prefix ? this.prefix + prefix : this.prefix });
    return Promise.all(files.map(async (f: any) => ({
      handle: f.name,
      url:    await this.urlFor(f.name),
      bytes:  Number(f.metadata?.size) || undefined,
    })));
  }

  async healthcheck(): Promise<StorageHealth> {
    const t0 = Date.now();
    try {
      const bucket = this.ensure();
      const [exists] = await bucket.exists();
      if (!exists) return { ok: false, provider: 'gcs', bucket: this.bucketName, error: 'bucket does not exist' };
      return { ok: true, provider: 'gcs', bucket: this.bucketName, latencyMs: Date.now() - t0 };
    } catch (e: any) {
      return { ok: false, provider: 'gcs', bucket: this.bucketName, error: e?.message || String(e) };
    }
  }

  private async urlFor(key: string): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    // Generate a 7-day signed URL.
    const [url] = await this.ensure().file(key).getSignedUrl({
      action:  'read',
      expires: Date.now() + 7 * 24 * 3600 * 1000,
    });
    return url;
  }
}

function pickExt(filename: string): string {
  const m = filename?.match(/\.[a-z0-9]+$/i);
  return m ? m[0].toLowerCase() : '.bin';
}
