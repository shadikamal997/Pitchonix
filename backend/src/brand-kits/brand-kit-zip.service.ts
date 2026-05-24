import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
// `archiver` is the existing zip writer used elsewhere in the codebase.
// adm-zip handles the read side without needing streaming.
// eslint-disable-next-line @typescript-eslint/no-var-requires
const archiverFactory: any = require('archiver');
import AdmZip = require('adm-zip');
import { BrandKitsService, BrandKitExportV1 } from './brand-kits.service';

// =============================================================================
//  Phase 37.2C — BrandKitZipService
//
//  Portable brand-kit transport that bundles asset *binaries* alongside the
//  JSON envelope. Output / input shape:
//
//    brand-kit.zip
//      ├ brand-kit.json    ← BrandKitExportV1 (Phase 37.1E) with assets[].url
//      │                     rewritten to relative paths inside the zip
//      └ assets/
//          ├ logo_primary-<hash>.png
//          ├ image-<hash>.jpg
//          └ …
//
//  On import we:
//    1. Read brand-kit.json + validate the V1 envelope.
//    2. Walk assets/, write each binary to the uploads folder, capture the
//       returned public URL.
//    3. Rewrite the JSON's assets[].url to the new public URLs.
//    4. Call BrandKitsService.importKit() with the rewritten envelope.
//
//  Returns the newly-created BrandKit.
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'images')
  : path.resolve(process.cwd(), 'uploads', 'images');

const PUBLIC_PREFIX = '/uploads/images';

@Injectable()
export class BrandKitZipService {
  private readonly logger = new Logger(BrandKitZipService.name);

  constructor(private kits: BrandKitsService) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); }
      catch { /* logged on first write attempt */ }
    }
  }

  // ---------------------------------------------------------------------------
  //  Export
  // ---------------------------------------------------------------------------

  async exportZip(brandKitId: string, userId: string): Promise<Buffer> {
    const json = await this.kits.exportKit(brandKitId, userId);
    const archive = archiverFactory('zip', { zlib: { level: 9 } });
    const chunks: Buffer[] = [];
    archive.on('data', (c: Buffer) => chunks.push(c));

    const done = new Promise<void>((resolve, reject) => {
      archive.on('end',   () => resolve());
      archive.on('error', (e: Error) => reject(e));
    });

    // Walk every asset URL. If it's a local /uploads file, embed its bytes
    // and rewrite the JSON URL to a relative `assets/<name>` path. Remote
    // URLs are left as-is (the importer will keep them as references).
    const remappedAssets: BrandKitExportV1['assets'] = [];
    for (const asset of json.assets || []) {
      const local = this.tryReadLocal(asset.url);
      if (local) {
        const ext  = path.extname(asset.url) || guessExt(asset.mimeType);
        const safe = sanitizeName(`${asset.kind}-${shortHash(asset.url)}${ext}`);
        archive.append(local, { name: `assets/${safe}` });
        remappedAssets.push({ ...asset, url: `assets/${safe}` });
      } else {
        remappedAssets.push(asset);   // remote URL or missing on disk
      }
    }

    // Also try to embed the kit's primary logo even if it wasn't listed
    // as a BrandAsset (legacy kits store the logo on the kit row only).
    let logoEntry: string | undefined;
    if (json.logo) {
      const local = this.tryReadLocal(json.logo);
      if (local) {
        const ext  = path.extname(json.logo) || '.png';
        const safe = sanitizeName(`logo_primary-${shortHash(json.logo)}${ext}`);
        archive.append(local, { name: `assets/${safe}` });
        logoEntry = `assets/${safe}`;
      }
    }

    const rewritten: BrandKitExportV1 = {
      ...json,
      logo:   logoEntry ?? json.logo,
      assets: remappedAssets,
    };
    archive.append(JSON.stringify(rewritten, null, 2), { name: 'brand-kit.json' });
    await archive.finalize();
    await done;
    return Buffer.concat(chunks);
  }

  // ---------------------------------------------------------------------------
  //  Import
  // ---------------------------------------------------------------------------

  async importZip(userId: string, zipBuffer: Buffer, workspaceId?: string) {
    let zip: AdmZip;
    try { zip = new AdmZip(zipBuffer); }
    catch (e: any) { throw new BadRequestException(`Invalid ZIP: ${e?.message}`); }

    const jsonEntry = zip.getEntry('brand-kit.json');
    if (!jsonEntry) throw new BadRequestException('Archive missing brand-kit.json');
    let payload: BrandKitExportV1;
    try { payload = JSON.parse(zip.readAsText(jsonEntry)); }
    catch (e: any) { throw new BadRequestException(`brand-kit.json is not valid JSON: ${e?.message}`); }

    // Extract every asset under assets/ into the uploads folder, capturing
    // the public URLs. Then rewrite the payload's URL references in-place.
    const remap = new Map<string, string>();   // zip path → public URL
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      if (!entry.entryName.startsWith('assets/')) continue;
      const url = this.writeAsset(entry.entryName, entry.getData());
      remap.set(entry.entryName, url);
    }

    if (payload.logo && remap.has(payload.logo)) {
      payload.logo = remap.get(payload.logo);
    }
    if (Array.isArray(payload.assets)) {
      payload.assets = payload.assets.map((a) => {
        const remapped = remap.get(a.url);
        return remapped ? { ...a, url: remapped } : a;
      });
    }

    return this.kits.importKit(userId, payload, workspaceId);
  }

  // ---------------------------------------------------------------------------
  //  Internals
  // ---------------------------------------------------------------------------

  /** Read a URL that points at our own /uploads/images path. Returns null
   *  for remote URLs or files missing on disk. */
  private tryReadLocal(url: string): Buffer | null {
    if (!url) return null;
    if (!url.startsWith(PUBLIC_PREFIX) && !url.startsWith(PUBLIC_PREFIX.replace(/^\//, ''))) return null;
    const fname = path.basename(url);
    const full  = path.join(UPLOAD_DIR, fname);
    try { return fs.readFileSync(full); }
    catch { return null; }
  }

  private writeAsset(zipEntryName: string, data: Buffer): string {
    const ext = path.extname(zipEntryName).toLowerCase() || '.bin';
    const safe = `${crypto.randomUUID()}${ext}`;
    const full = path.join(UPLOAD_DIR, safe);
    try {
      if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });
      fs.writeFileSync(full, data);
    } catch (e: any) {
      throw new BadRequestException(`Failed to write asset ${zipEntryName}: ${e?.message}`);
    }
    return `${PUBLIC_PREFIX}/${safe}`;
  }
}

// =============================================================================
//  helpers
// =============================================================================

function shortHash(s: string): string {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 8);
}
function sanitizeName(s: string): string {
  return s.replace(/[^a-zA-Z0-9._-]/g, '_');
}
function guessExt(mime?: string | null): string {
  if (!mime) return '';
  if (mime.includes('png'))  return '.png';
  if (mime.includes('jpeg')) return '.jpg';
  if (mime.includes('jpg'))  return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('svg'))  return '.svg';
  return '';
}
