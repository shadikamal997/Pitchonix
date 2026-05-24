import { XMLParser } from 'fast-xml-parser';
import AdmZip = require('adm-zip');

// =============================================================================
//  Phase 38.1A — OOXML parser primitives.
//
//  Wraps fast-xml-parser with the conventions our higher-level importer needs:
//    - preserves namespaces as part of element names (so we can match
//      `<p:sp>`, `<a:p>`, `<c:chart>` exactly the way OOXML uses them)
//    - flips attributes into a `@` map so geometry / refs stay queryable
//    - exposes a Pack helper that knows the .rels graph + slide order
// =============================================================================

const xml = new XMLParser({
  ignoreAttributes:    false,
  attributeNamePrefix: '@',
  parseAttributeValue: false,
  preserveOrder:       false,
  trimValues:          true,
  allowBooleanAttributes: true,
});

export function parseXml<T = any>(content: string | Buffer | undefined | null): T | null {
  if (!content) return null;
  try { return xml.parse(typeof content === 'string' ? content : content.toString('utf8')) as T; }
  catch { return null; }
}

// =============================================================================
//  OoxmlPackage — the read-side abstraction over a .pptx zip.
// =============================================================================

export interface RelEntry { id: string; type: string; target: string }

export class OoxmlPackage {
  private zip: AdmZip;
  private cache = new Map<string, string>();   // path → utf8

  constructor(buffer: Buffer) {
    this.zip = new AdmZip(buffer);
  }

  /** Return the canonical entry list (paths). */
  entries(): string[] {
    return this.zip.getEntries().map((e) => e.entryName);
  }

  /** Read a file as utf8 text. */
  read(p: string): string | null {
    if (this.cache.has(p)) return this.cache.get(p)!;
    const e = this.zip.getEntry(p);
    if (!e) return null;
    const s = e.getData().toString('utf8');
    this.cache.set(p, s);
    return s;
  }

  /** Read a file as a binary Buffer (used for media extraction). */
  readBinary(p: string): Buffer | null {
    const e = this.zip.getEntry(p);
    return e ? e.getData() : null;
  }

  parse<T = any>(p: string): T | null {
    return parseXml<T>(this.read(p));
  }

  /** List entries matching a regex. */
  list(regex: RegExp): string[] {
    return this.entries().filter((n) => regex.test(n));
  }

  /** Parse the `_rels` companion for a given xml part. Returns id→{type,target}. */
  rels(partPath: string): Map<string, RelEntry> {
    const dir  = partPath.replace(/[^/]+$/, '');
    const base = partPath.split('/').pop()!;
    const rels = this.parse<any>(`${dir}_rels/${base}.rels`);
    const out  = new Map<string, RelEntry>();
    if (!rels?.Relationships?.Relationship) return out;
    const list = asArray(rels.Relationships.Relationship);
    for (const r of list) {
      // Resolve relative targets like "../media/image1.png" against the part dir.
      const target = normalisePath(dir + r['@Target']);
      out.set(r['@Id'], { id: r['@Id'], type: r['@Type'], target });
    }
    return out;
  }

  /** Slides in canonical (numeric) order. */
  slidePaths(): string[] {
    return this.list(/^ppt\/slides\/slide\d+\.xml$/)
      .sort((a, b) => numAt(a) - numAt(b));
  }

  notePathForSlide(slidePath: string): string | null {
    const rels = this.rels(slidePath);
    for (const r of rels.values()) {
      if (r.type.endsWith('/notesSlide')) return r.target;
    }
    return null;
  }

  layoutPathForSlide(slidePath: string): string | null {
    const rels = this.rels(slidePath);
    for (const r of rels.values()) {
      if (r.type.endsWith('/slideLayout')) return r.target;
    }
    return null;
  }

  masterPathForLayout(layoutPath: string): string | null {
    const rels = this.rels(layoutPath);
    for (const r of rels.values()) {
      if (r.type.endsWith('/slideMaster')) return r.target;
    }
    return null;
  }

  themePathForMaster(masterPath: string): string | null {
    const rels = this.rels(masterPath);
    for (const r of rels.values()) {
      if (r.type.endsWith('/theme')) return r.target;
    }
    return null;
  }

  chartPathFor(slidePath: string, relId: string): string | null {
    const rels = this.rels(slidePath);
    const r = rels.get(relId);
    if (!r) return null;
    return r.type.endsWith('/chart') ? r.target : null;
  }

  mediaPathFor(slidePath: string, relId: string): { path: string; mimeHint?: string } | null {
    const rels = this.rels(slidePath);
    const r = rels.get(relId);
    if (!r) return null;
    if (r.type.endsWith('/image') || r.type.endsWith('/media') || r.type.endsWith('/video') || r.type.endsWith('/audio')) {
      return { path: r.target };
    }
    return null;
  }
}

// =============================================================================
//  Generic helpers
// =============================================================================

export function asArray<T>(x: T | T[] | undefined | null): T[] {
  if (x == null) return [];
  return Array.isArray(x) ? x : [x];
}

export function numAt(name: string): number {
  const m = name.match(/(\d+)\.xml$/);
  return m ? Number(m[1]) : 0;
}

export function normalisePath(p: string): string {
  // Collapse "ppt/slides/../slideLayouts/slideLayout1.xml" → "ppt/slideLayouts/slideLayout1.xml"
  const parts = p.split('/');
  const out: string[] = [];
  for (const part of parts) {
    if (part === '..') out.pop();
    else if (part !== '.' && part !== '') out.push(part);
  }
  return out.join('/');
}

// =============================================================================
//  EMU + percent helpers (PowerPoint coordinate system).
// =============================================================================

/** Standard 16:9 slide is 12192000 × 6858000 EMU (LAYOUT_WIDE). */
export const SLIDE_W_EMU = 12192000;
export const SLIDE_H_EMU = 6858000;

export function emuToPctX(emu: number): number {
  if (!Number.isFinite(emu)) return 0;
  return clampPct((emu / SLIDE_W_EMU) * 100);
}
export function emuToPctY(emu: number): number {
  if (!Number.isFinite(emu)) return 0;
  return clampPct((emu / SLIDE_H_EMU) * 100);
}
export function clampPct(v: number): number {
  return Math.max(0, Math.min(100, v));
}

// =============================================================================
//  Text extraction helpers (any DrawingML node).
// =============================================================================

/** Concatenate every <a:t> inside an arbitrary parsed node. */
export function extractText(node: any): string {
  if (!node) return '';
  const acc: string[] = [];
  walk(node, (k, v) => {
    if (k === 'a:t' && typeof v === 'string') acc.push(v);
    if (k === 'a:t' && v && typeof v === 'object' && typeof v['#text'] === 'string') acc.push(v['#text']);
  });
  return acc.join('').trim();
}

/** Walk every (key, value) pair recursively. Used by extractors. */
export function walk(obj: any, cb: (k: string, v: any) => void) {
  if (obj == null) return;
  if (Array.isArray(obj)) { for (const x of obj) walk(x, cb); return; }
  if (typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    cb(k, v);
    walk(v, cb);
  }
}

/** Read `<a:off x="…" y="…"/>` + `<a:ext cx="…" cy="…"/>` from a shape. */
export function readBox(spPr: any): { x: number; y: number; w: number; h: number } | null {
  const xfrm = spPr?.['a:xfrm'];
  if (!xfrm) return null;
  const off = xfrm['a:off']; const ext = xfrm['a:ext'];
  if (!off || !ext) return null;
  const x = emuToPctX(Number(off['@x'] || 0));
  const y = emuToPctY(Number(off['@y'] || 0));
  const w = emuToPctX(Number(ext['@cx'] || 0));
  const h = emuToPctY(Number(ext['@cy'] || 0));
  return { x, y, w, h };
}
