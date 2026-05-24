import * as sharp from 'sharp';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
//  Phase 41.2A — PDF bitmap extraction.
//
//  pdfjs-dist parses image XObjects into `page.objs` / `page.commonObjs`
//  during `getOperatorList()`. We:
//
//    1. Walk the operator list looking for `paintImageXObject`
//    2. Resolve each image id via `page.objs.get(id, cb)`  (callback-style)
//    3. Convert the resulting `{ width, height, kind, data }` object into a
//       PNG using sharp (data is raw RGBA / grayscale / etc.)
//    4. Write the PNG under uploads/images/ and return its public URL
//
//  This works WITHOUT node-canvas: we never render the page, just resolve
//  the already-parsed image objects. The trade-off is that we get the raw
//  bitmap, not the page-composited image — colour-space conversion and
//  masks are applied by sharp, not pdfjs's painter.
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'images')
  : path.resolve(process.cwd(), 'uploads', 'images');
const PUBLIC_PREFIX = '/uploads/images';

export interface ExtractedImage {
  url:    string;
  width:  number;
  height: number;
  bytes:  number;
  /** Index of the image on the page (matches operator order). */
  index:  number;
}

/** Extract every paint-image-xobject bitmap from a single pdfjs page. */
export async function extractPageImages(pdfPage: any, pdfjs: any): Promise<ExtractedImage[]> {
  ensureDir(UPLOAD_DIR);

  const ops = await pdfPage.getOperatorList();
  if (!ops?.fnArray) return [];

  const OPS = pdfjs.OPS || {};
  const target = OPS.paintImageXObject;
  const targetInline = OPS.paintInlineImageXObject;

  const out: ExtractedImage[] = [];
  let idx = 0;
  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    if (fn !== target && fn !== targetInline) continue;
    const args = ops.argsArray[i];
    const imgId = args?.[0];
    if (!imgId) continue;

    let img: any = null;
    try {
      // pdfjs page object cache is callback-based; wrap in a promise.
      img = await new Promise<any>((resolve, reject) => {
        const t = setTimeout(() => reject(new Error('image-resolve timeout')), 10_000);
        pdfPage.objs.get(imgId, (resolved: any) => {
          clearTimeout(t);
          resolve(resolved);
        });
      });
    } catch {
      continue;
    }

    if (!img || !img.data || !img.width || !img.height) continue;
    try {
      const png = await rawToPng(img);
      if (!png) continue;
      const safe = `${crypto.randomUUID()}.png`;
      const full = path.join(UPLOAD_DIR, safe);
      fs.writeFileSync(full, png);
      out.push({
        url:    `${PUBLIC_PREFIX}/${safe}`,
        width:  img.width,
        height: img.height,
        bytes:  png.length,
        index:  idx++,
      });
    } catch {
      // Skip unconvertible images (rare PDF colour spaces); count is still
      // captured upstream via paintImageXObject operator counter.
    }
  }
  return out;
}

// =============================================================================
//  RGBA / RGB / grayscale → PNG conversion.
//
//  pdfjs's image objects expose `kind` per ImageKind enum:
//    1 = GRAYSCALE_1BPP    (1 byte per pixel, single channel)
//    2 = RGB_24BPP         (3 bytes per pixel, no alpha)
//    3 = RGBA_32BPP        (4 bytes per pixel, with alpha)
//
//  sharp's `raw` input accepts width/height/channels; we pick channels
//  based on `kind` (defaulting to 4 when unknown).
// =============================================================================

async function rawToPng(img: { data: Uint8Array | Buffer; width: number; height: number; kind?: number }): Promise<Buffer | null> {
  const channels = pickChannels(img.kind, img.data.length, img.width, img.height);
  if (!channels) return null;
  try {
    return await (sharp as any)(Buffer.from(img.data), {
      raw: { width: img.width, height: img.height, channels },
    }).png().toBuffer();
  } catch {
    return null;
  }
}

function pickChannels(kind: number | undefined, dataLength: number, width: number, height: number): 1 | 3 | 4 | null {
  // Trust the channel count we'd derive from data length first; fall back to kind.
  const pixels = width * height;
  if (pixels <= 0) return null;
  const ratio = Math.round(dataLength / pixels);
  if (ratio === 1) return 1;
  if (ratio === 3) return 3;
  if (ratio === 4) return 4;
  // Fall back to kind enum.
  if (kind === 1) return 1;
  if (kind === 2) return 3;
  if (kind === 3) return 4;
  return null;
}

function ensureDir(dir: string): void {
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* logged on first write */ }
  }
}
