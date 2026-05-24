import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  UniversalConversionService, ConversionResult, OutputFormat,
} from './universal-conversion.service';
import { ConversionStorageProvider } from './storage/storage-provider';
import { createConversionStorage } from './storage/storage-factory';

// =============================================================================
//  Phase 41.1I-K + 41.2C/D — Cross-format conversion lineage.
//
//  Owns the lifecycle of `ConvertedFile` rows. Binary storage is delegated
//  to a `ConversionStorageProvider` (local / S3 / GCS / Azure) chosen by
//  the CONVERSION_STORAGE env var. The handle field on each entry is what
//  the provider returns from save(); url is for embedding in the UI.
//
//  Operations:
//    record(...)            → persist a fresh conversion + store the binary
//    chain(id)              → walk parent → root + collect children
//    list(userId|wsId)      → list a user's / workspace's converted files
//    restore(id, target)    → re-trigger the conversion using the stored
//                             binary via storage.read()
//    delete(id)             → remove DB row + best-effort delete from store
// =============================================================================

export interface ConvertedFileEntry {
  id:             string;
  sourceFilename: string;
  sourceFormat:   string;
  targetFormat:   string;
  outputUrl:      string;
  qualityScore:   number;
  parentId:       string | null;
  createdAt:      string;
}

export interface LineageView {
  chain:    ConvertedFileEntry[];   // root → ... → this file
  children: ConvertedFileEntry[];   // direct descendants
}

@Injectable()
export class ConversionLineageService {
  private readonly logger = new Logger(ConversionLineageService.name);
  private readonly storage: ConversionStorageProvider;

  constructor(
    private readonly prisma: PrismaService,
    private readonly conversion: UniversalConversionService,
  ) {
    this.storage = createConversionStorage();
    this.logger.log(`Conversion storage provider: ${this.storage.name}`);
  }

  /** Expose the active storage backend for diagnostics / admin endpoints. */
  getStorage(): ConversionStorageProvider { return this.storage; }

  // ---------------------------------------------------------------------------
  //  Persist
  // ---------------------------------------------------------------------------

  async record(opts: {
    result:         ConversionResult;
    sourceFilename: string;
    sourceBuffer:   Buffer;
    userId?:        string | null;
    workspaceId?:   string | null;
    parentId?:      string | null;
    brandKitId?:    string | null;
    notes?:         string;
  }): Promise<ConvertedFileEntry> {
    const ext = opts.result.extension;
    // Phase 41.2C/D — delegate binary storage to the active provider.
    const saved = await this.storage.save(
      opts.result.buffer,
      `${opts.sourceFilename}.${ext}`,
      opts.result.mimetype,
    );
    const row = await this.prisma.convertedFile.create({
      data: {
        userId:         opts.userId      ?? null,
        workspaceId:    opts.workspaceId ?? null,
        parentId:       opts.parentId    ?? null,
        sourceFilename: opts.sourceFilename,
        sourceFormat:   opts.result.report.inputFormat,
        sourceBytes:    opts.sourceBuffer.length,
        targetFormat:   opts.result.format,
        outputUrl:      saved.url,
        storageHandle:  saved.handle,
        storageBackend: this.storage.name,
        outputBytes:    saved.bytes,
        qualityScore:   opts.result.report.overall,
        qualityReport:  opts.result.report as any,
        durationMs:     opts.result.durationMs,
        brandKitId:     opts.brandKitId ?? null,
        notes:          opts.notes ?? null,
      },
    });
    return toEntry(row);
  }

  // ---------------------------------------------------------------------------
  //  Read
  // ---------------------------------------------------------------------------

  async findOne(id: string): Promise<ConvertedFileEntry> {
    const row = await this.prisma.convertedFile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('ConvertedFile not found');
    return toEntry(row);
  }

  list(opts: { userId?: string | null; workspaceId?: string | null }) {
    const where: any = {};
    if (opts.userId)      where.userId      = opts.userId;
    if (opts.workspaceId) where.workspaceId = opts.workspaceId;
    return this.prisma.convertedFile.findMany({
      where, orderBy: { createdAt: 'desc' }, take: 100,
    }).then((rows) => rows.map(toEntry));
  }

  async chain(id: string): Promise<LineageView> {
    const chain: ConvertedFileEntry[] = [];
    let cur = await this.prisma.convertedFile.findUnique({ where: { id } });
    if (!cur) throw new NotFoundException('ConvertedFile not found');
    while (cur) {
      chain.unshift(toEntry(cur));
      if (!cur.parentId) break;
      cur = await this.prisma.convertedFile.findUnique({ where: { id: cur.parentId } });
    }
    const children = await this.prisma.convertedFile.findMany({
      where: { parentId: id }, orderBy: { createdAt: 'asc' },
    });
    return { chain, children: children.map(toEntry) };
  }

  // ---------------------------------------------------------------------------
  //  Restore (41.1K) — re-run the conversion starting from the chain root.
  // ---------------------------------------------------------------------------

  async restore(id: string, target: OutputFormat): Promise<ConvertedFileEntry> {
    const view = await this.chain(id);
    const root = view.chain[0];
    if (!root) throw new NotFoundException('Chain root not found');
    // Fetch the root's binary via the active storage provider. This works
    // identically against local disk, S3, GCS, or Azure — the handle is
    // opaque to the lineage service.
    const rootRow = await this.prisma.convertedFile.findUnique({ where: { id: root.id } });
    if (!rootRow) throw new NotFoundException('Root row missing');
    const handle = rootRow.storageHandle || basenameFromUrl(rootRow.outputUrl);
    let buf: Buffer;
    try { buf = await this.storage.read(handle); }
    catch (e: any) { throw new NotFoundException(`Root binary missing in ${this.storage.name} storage: ${e?.message}`); }

    const result = await this.conversion.convert({
      buffer:       buf,
      filename:     `${root.sourceFilename}`,
      targetFormat: target,
    });
    return this.record({
      result,
      sourceFilename: root.sourceFilename,
      sourceBuffer:   buf,
      parentId:       id,
      notes:          `Restored from ${root.targetFormat} → ${target}`,
    });
  }

  async remove(id: string): Promise<void> {
    const row = await this.prisma.convertedFile.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('ConvertedFile not found');
    const handle = row.storageHandle || basenameFromUrl(row.outputUrl);
    try { await this.storage.delete(handle); }
    catch { /* idempotent */ }
    await this.prisma.convertedFile.delete({ where: { id } });
  }
}

function basenameFromUrl(url: string): string {
  // Used for backwards-compatibility with pre-41.2 rows where the handle
  // wasn't persisted separately. Strips query strings and path prefix.
  const noQuery = (url || '').split('?')[0];
  return noQuery.split('/').pop() || noQuery;
}

function toEntry(row: any): ConvertedFileEntry {
  return {
    id:             row.id,
    sourceFilename: row.sourceFilename,
    sourceFormat:   row.sourceFormat,
    targetFormat:   row.targetFormat,
    outputUrl:      row.outputUrl,
    qualityScore:   row.qualityScore,
    parentId:       row.parentId,
    createdAt:      row.createdAt.toISOString(),
  };
}
