import * as crypto from 'crypto';
import { ConversionStorageProvider, SavedFile, StorageHealth } from './storage-provider';

// =============================================================================
//  Phase 41.2D — AzureBlobProvider.
//
//  Dynamic-load @azure/storage-blob. Install on demand:
//
//      pnpm add @azure/storage-blob
//
//  Config env:
//      CONVERSION_AZURE_CONNECTION_STRING  (preferred)
//        OR
//      CONVERSION_AZURE_ACCOUNT + CONVERSION_AZURE_ACCOUNT_KEY
//      CONVERSION_AZURE_CONTAINER          (required)
//      CONVERSION_AZURE_PREFIX             (default "pitchonix/converted/")
//      CONVERSION_AZURE_PUBLIC_BASE_URL    (optional CDN base URL)
// =============================================================================

export class AzureBlobProvider implements ConversionStorageProvider {
  readonly name = 'azure' as const;
  private container?: any;
  private sdk?:       any;

  constructor(
    private readonly containerName  = process.env.CONVERSION_AZURE_CONTAINER || '',
    private readonly prefix         = process.env.CONVERSION_AZURE_PREFIX || 'pitchonix/converted/',
    private readonly publicBaseUrl  = process.env.CONVERSION_AZURE_PUBLIC_BASE_URL || '',
  ) {}

  private ensure(): { container: any; sdk: any } {
    if (this.container && this.sdk) return { container: this.container, sdk: this.sdk };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.sdk = require('@azure/storage-blob');
    } catch (e: any) {
      throw new Error(`[azure-storage] @azure/storage-blob not installed (pnpm add @azure/storage-blob): ${e?.message}`);
    }
    if (!this.containerName) throw new Error('[azure-storage] CONVERSION_AZURE_CONTAINER not set');

    const conn = process.env.CONVERSION_AZURE_CONNECTION_STRING;
    let serviceClient: any;
    if (conn) {
      serviceClient = this.sdk.BlobServiceClient.fromConnectionString(conn);
    } else {
      const account = process.env.CONVERSION_AZURE_ACCOUNT;
      const key     = process.env.CONVERSION_AZURE_ACCOUNT_KEY;
      if (!account || !key) {
        throw new Error('[azure-storage] missing connection string OR account+key env vars');
      }
      const cred = new this.sdk.StorageSharedKeyCredential(account, key);
      serviceClient = new this.sdk.BlobServiceClient(`https://${account}.blob.core.windows.net`, cred);
    }
    this.container = serviceClient.getContainerClient(this.containerName);
    return { container: this.container, sdk: this.sdk };
  }

  async save(buffer: Buffer, originalFilename: string, mimetype = 'application/octet-stream'): Promise<SavedFile> {
    const { container } = this.ensure();
    const key  = this.prefix + crypto.randomUUID() + pickExt(originalFilename);
    const blob = container.getBlockBlobClient(key);
    await blob.uploadData(buffer, {
      blobHTTPHeaders: { blobContentType: mimetype },
    });
    return { handle: key, url: await this.urlFor(key), bytes: buffer.length };
  }

  async read(handle: string): Promise<Buffer> {
    const { container } = this.ensure();
    const blob = container.getBlockBlobClient(handle);
    return blob.downloadToBuffer();
  }

  async delete(handle: string): Promise<void> {
    try { await this.ensure().container.getBlockBlobClient(handle).deleteIfExists(); }
    catch { /* idempotent */ }
  }

  async list(prefix?: string) {
    const { container } = this.ensure();
    const it = container.listBlobsFlat({ prefix: prefix ? this.prefix + prefix : this.prefix });
    const rows: Array<{ handle: string; url: string; bytes?: number }> = [];
    for await (const blob of it) {
      rows.push({
        handle: blob.name,
        url:    await this.urlFor(blob.name),
        bytes:  Number(blob.properties?.contentLength) || undefined,
      });
    }
    return rows;
  }

  async healthcheck(): Promise<StorageHealth> {
    const t0 = Date.now();
    try {
      const { container } = this.ensure();
      const exists = await container.exists();
      if (!exists) return { ok: false, provider: 'azure', bucket: this.containerName, error: 'container does not exist' };
      return { ok: true, provider: 'azure', bucket: this.containerName, latencyMs: Date.now() - t0 };
    } catch (e: any) {
      return { ok: false, provider: 'azure', bucket: this.containerName, error: e?.message || String(e) };
    }
  }

  private async urlFor(key: string): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    // Public URL of the blob (no SAS); for private containers, the caller can
    // wrap this provider to issue a SAS token in its own application layer.
    const { container } = this.ensure();
    return container.getBlockBlobClient(key).url;
  }
}

function pickExt(filename: string): string {
  const m = filename?.match(/\.[a-z0-9]+$/i);
  return m ? m[0].toLowerCase() : '.bin';
}
