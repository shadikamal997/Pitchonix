import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

// =============================================================================
//  Phase 38.3G — OleWorkspaceService
//
//  Owns the management surface around imported OLE attachments. Each OLE
//  element on a slide carries:
//    {
//      kind:     'excel'|'word'|'pdf'|'powerpoint'|'binary',
//      filename: string,
//      url:      '/uploads/embeddings/…',
//      bytes:    number,
//      label?:   string,
//      version?: number,        ← Phase 38.3G — bumped on each replace
//      history?: [{ version, url, bytes, replacedAt, replacedBy }]
//    }
//
//  Operations:
//    preview(elementId)     → returns kind + URL + small metadata for the card
//    replace(elementId, file) → swap the binary, bump version, push to history
//    refresh(elementId)     → re-read bytes from disk to recompute size hash
//    versions(elementId)    → return history (most recent first)
//    revert(elementId, ver) → restore an older version from history
//
//  The actual file storage mirrors the brand-kit ZIP / media pipeline:
//  `uploads/embeddings/` with UUID filenames. We never delete old versions
//  here — pruning is a future operational task.
// =============================================================================

const UPLOAD_DIR = process.env.UPLOAD_DIR
  ? path.resolve(process.env.UPLOAD_DIR, 'embeddings')
  : path.resolve(process.cwd(), 'uploads', 'embeddings');

const PUBLIC_PREFIX = '/uploads/embeddings';

export interface OleHistoryEntry {
  version:    number;
  url:        string;
  filename:   string;
  bytes:      number;
  replacedAt: string;
  replacedBy?: string;
}

export interface OleContent {
  kind:      'excel' | 'word' | 'pdf' | 'powerpoint' | 'binary';
  filename:  string;
  url:       string;
  bytes:     number;
  label?:    string;
  version?:  number;
  history?:  OleHistoryEntry[];
}

@Injectable()
export class OleWorkspaceService {
  private readonly logger = new Logger(OleWorkspaceService.name);

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(UPLOAD_DIR)) {
      try { fs.mkdirSync(UPLOAD_DIR, { recursive: true }); } catch { /* logged on first write */ }
    }
  }

  // ---------------------------------------------------------------------------
  //  Read
  // ---------------------------------------------------------------------------

  async preview(elementId: string): Promise<OleContent> {
    const c = await this.read(elementId);
    return c;
  }

  async versions(elementId: string): Promise<OleHistoryEntry[]> {
    const c = await this.read(elementId);
    const list = (c.history || []).slice().sort((a, b) => b.version - a.version);
    return list;
  }

  // ---------------------------------------------------------------------------
  //  Mutations
  // ---------------------------------------------------------------------------

  async replace(elementId: string, file: { buffer: Buffer; originalname?: string }, userId?: string): Promise<OleContent> {
    if (!file?.buffer) throw new BadRequestException('Missing file buffer');
    const c = await this.read(elementId);

    // Persist the new binary.
    const original = file.originalname || c.filename || 'replacement.bin';
    const ext  = path.extname(original).toLowerCase() || pickExtByMagic(file.buffer);
    const safe = `${crypto.randomUUID()}${ext}`;
    const full = path.join(UPLOAD_DIR, safe);
    fs.writeFileSync(full, file.buffer);

    // Push current state into history.
    const nextVersion = (c.version ?? 1) + 1;
    const history = c.history ? [...c.history] : [];
    history.unshift({
      version:    c.version ?? 1,
      url:        c.url,
      filename:   c.filename,
      bytes:      c.bytes,
      replacedAt: new Date().toISOString(),
      replacedBy: userId,
    });

    const next: OleContent = {
      kind:     kindFor(ext) || c.kind,
      filename: original,
      url:      `${PUBLIC_PREFIX}/${safe}`,
      bytes:    file.buffer.length,
      label:    c.label,
      version:  nextVersion,
      history,
    };
    await this.write(elementId, next);
    return next;
  }

  async revert(elementId: string, version: number, userId?: string): Promise<OleContent> {
    const c = await this.read(elementId);
    if (!c.history || c.history.length === 0) throw new BadRequestException('No history to revert');
    const target = c.history.find((h) => h.version === version);
    if (!target) throw new NotFoundException(`Version ${version} not found in history`);

    // Push current into history, swap to target.
    const nextHistory = c.history.filter((h) => h.version !== version);
    nextHistory.unshift({
      version:    c.version ?? 1,
      url:        c.url,
      filename:   c.filename,
      bytes:      c.bytes,
      replacedAt: new Date().toISOString(),
      replacedBy: userId,
    });

    const next: OleContent = {
      kind:     c.kind,
      filename: target.filename,
      url:      target.url,
      bytes:    target.bytes,
      label:    c.label,
      version:  (c.version ?? 1) + 1,
      history:  nextHistory,
    };
    await this.write(elementId, next);
    return next;
  }

  /** Refresh fs-derived metadata (bytes) by re-stat'ing the on-disk file. */
  async refresh(elementId: string): Promise<OleContent> {
    const c = await this.read(elementId);
    const filename = path.basename(c.url);
    const full     = path.join(UPLOAD_DIR, filename);
    try {
      const st = fs.statSync(full);
      const next = { ...c, bytes: st.size };
      await this.write(elementId, next);
      return next;
    } catch (e: any) {
      throw new NotFoundException(`OLE binary missing on disk: ${e?.message}`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Internals
  // ---------------------------------------------------------------------------

  private async read(elementId: string): Promise<OleContent> {
    const el = await this.prisma.slideElement.findUnique({ where: { id: elementId } });
    if (!el) throw new NotFoundException('Element not found');
    if (el.type !== 'oleObject') throw new BadRequestException('Element is not an OLE object');
    return (el.content as any) as OleContent;
  }

  private async write(elementId: string, content: OleContent): Promise<void> {
    await this.prisma.slideElement.update({
      where: { id: elementId },
      data:  { content: content as any },
    });
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function pickExtByMagic(buf: Buffer): string {
  if (buf.length < 4) return '.bin';
  if (buf[0] === 0x50 && buf[1] === 0x4B && buf[2] === 0x03 && buf[3] === 0x04) return '.xlsx';
  if (buf[0] === 0x25 && buf[1] === 0x50 && buf[2] === 0x44 && buf[3] === 0x46) return '.pdf';
  if (buf[0] === 0xD0 && buf[1] === 0xCF && buf[2] === 0x11 && buf[3] === 0xE0) return '.xls';
  return '.bin';
}

function kindFor(ext: string): OleContent['kind'] | undefined {
  const e = ext.toLowerCase();
  if (e === '.xlsx' || e === '.xls' || e === '.xlsm') return 'excel';
  if (e === '.docx' || e === '.doc')                  return 'word';
  if (e === '.pdf')                                    return 'pdf';
  if (e === '.pptx' || e === '.ppt')                  return 'powerpoint';
  return 'binary';
}
