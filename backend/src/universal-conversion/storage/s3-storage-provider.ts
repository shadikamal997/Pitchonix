import * as crypto from 'crypto';
import * as path from 'path';
import { ConversionStorageProvider, SavedFile, StorageHealth } from './storage-provider';

// =============================================================================
//  Phase 41.2D — S3StorageProvider.
//
//  Dynamic-import the AWS SDK so we don't bloat node_modules for users who
//  stay on local disk. Install on demand:
//
//      pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
//
//  Config env vars (read at construction time):
//      CONVERSION_S3_BUCKET            (required)
//      CONVERSION_S3_REGION            (required)
//      CONVERSION_S3_PREFIX            (default "pitchonix/converted/")
//      CONVERSION_S3_PUBLIC_BASE_URL   (optional — return direct URLs)
//      AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY (standard SDK chain)
//
//  When CONVERSION_S3_PUBLIC_BASE_URL is set, `url` is
//      `${PUBLIC_BASE_URL}/<key>` (you typically front S3 with CloudFront).
//  Otherwise we generate a 7-day presigned URL so the editor can fetch.
// =============================================================================

interface S3Sdk {
  S3Client:        any;
  PutObjectCommand: any;
  GetObjectCommand: any;
  DeleteObjectCommand: any;
  ListObjectsV2Command: any;
  HeadBucketCommand: any;
}

export class S3StorageProvider implements ConversionStorageProvider {
  readonly name = 's3' as const;
  private client?:  any;
  private sdk?:     S3Sdk;
  private presigner?: any;

  constructor(
    private readonly bucket = process.env.CONVERSION_S3_BUCKET || '',
    private readonly region = process.env.CONVERSION_S3_REGION || 'us-east-1',
    private readonly prefix = process.env.CONVERSION_S3_PREFIX || 'pitchonix/converted/',
    private readonly publicBaseUrl = process.env.CONVERSION_S3_PUBLIC_BASE_URL || '',
  ) {
    if (!bucket) {
      // We don't throw — let it fail at first save() with a clear message,
      // so unit tests can construct the class without an envronment present.
    }
  }

  private async ensure(): Promise<{ client: any; sdk: S3Sdk; presigner: any }> {
    if (this.client && this.sdk && this.presigner) return { client: this.client, sdk: this.sdk, presigner: this.presigner };
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.sdk = require('@aws-sdk/client-s3');
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      this.presigner = require('@aws-sdk/s3-request-presigner');
    } catch (e: any) {
      throw new Error(`[s3-storage] @aws-sdk/client-s3 not installed (pnpm add @aws-sdk/client-s3 @aws-sdk/s3-request-presigner): ${e?.message}`);
    }
    if (!this.bucket) throw new Error('[s3-storage] CONVERSION_S3_BUCKET not set');
    this.client = new this.sdk!.S3Client({ region: this.region });
    return { client: this.client, sdk: this.sdk!, presigner: this.presigner };
  }

  async save(buffer: Buffer, originalFilename: string, mimetype = 'application/octet-stream'): Promise<SavedFile> {
    const { client, sdk } = await this.ensure();
    const key = this.prefix + crypto.randomUUID() + pickExt(originalFilename);
    await client.send(new sdk.PutObjectCommand({
      Bucket:      this.bucket,
      Key:         key,
      Body:        buffer,
      ContentType: mimetype,
    }));
    const url = await this.urlFor(key);
    return { handle: key, url, bytes: buffer.length };
  }

  async read(handle: string): Promise<Buffer> {
    const { client, sdk } = await this.ensure();
    const res: any = await client.send(new sdk.GetObjectCommand({ Bucket: this.bucket, Key: handle }));
    // res.Body is a Readable in Node; collect to Buffer.
    return streamToBuffer(res.Body);
  }

  async delete(handle: string): Promise<void> {
    const { client, sdk } = await this.ensure();
    try { await client.send(new sdk.DeleteObjectCommand({ Bucket: this.bucket, Key: handle })); }
    catch { /* idempotent */ }
  }

  async list(prefix?: string) {
    const { client, sdk } = await this.ensure();
    const res: any = await client.send(new sdk.ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix ? this.prefix + prefix : this.prefix,
    }));
    const items: any[] = res.Contents || [];
    const rows = await Promise.all(items.map(async (it) => ({
      handle: it.Key,
      url:    await this.urlFor(it.Key),
      bytes:  it.Size,
    })));
    return rows;
  }

  async healthcheck(): Promise<StorageHealth> {
    const t0 = Date.now();
    try {
      const { client, sdk } = await this.ensure();
      await client.send(new sdk.HeadBucketCommand({ Bucket: this.bucket }));
      return { ok: true, provider: 's3', bucket: this.bucket, latencyMs: Date.now() - t0 };
    } catch (e: any) {
      return { ok: false, provider: 's3', bucket: this.bucket, error: e?.message || String(e) };
    }
  }

  private async urlFor(key: string): Promise<string> {
    if (this.publicBaseUrl) return `${this.publicBaseUrl.replace(/\/$/, '')}/${key}`;
    const { client, sdk, presigner } = await this.ensure();
    return presigner.getSignedUrl(
      client,
      new sdk.GetObjectCommand({ Bucket: this.bucket, Key: key }),
      { expiresIn: 7 * 24 * 3600 },
    );
  }
}

function pickExt(filename: string): string {
  const m = filename?.match(/\.[a-z0-9]+$/i);
  return m ? m[0].toLowerCase() : '.bin';
}

async function streamToBuffer(stream: any): Promise<Buffer> {
  if (Buffer.isBuffer(stream)) return stream;
  if (stream && typeof stream.transformToByteArray === 'function') {
    return Buffer.from(await stream.transformToByteArray());
  }
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}
