import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PptxImportService } from '../pptx-import/pptx-import.service';
import { PrismaService }     from '../prisma/prisma.service';
import {
  UniversalDocument, SupportedFormat, detectFormat, FORMAT_FAMILY, forEachNode, totalNodes,
} from './document-model';
import { importPdf }       from './importers/pdf-importer';
import { importPdfGeometry } from './importers/pdf-geometry-importer';
import { importDocx }      from './importers/docx-importer';
import { importXlsx, importCsv } from './importers/xlsx-importer';
import { importHtml }      from './importers/html-importer';
import { importMarkdown }  from './importers/markdown-importer';
import { importText, importRtf } from './importers/text-importer';
import { importPptxAsDocument } from './importers/pptx-adapter';

import { exportMarkdown } from './exporters/markdown-exporter';
import { exportHtml }     from './exporters/html-exporter';
import { exportText, exportRtf } from './exporters/text-exporter';
import { exportDocx }     from './exporters/docx-exporter';
import { exportPptx }     from './exporters/pptx-exporter';
import { exportPdf }      from './exporters/pdf-exporter';

import { documentToPresentation } from './transforms/document-to-presentation';
import { presentationToDocument } from './transforms/presentation-to-document';

// =============================================================================
//  Phase 41 — Universal Conversion Service.
//
//  Single entry point for all cross-format work. Flow:
//
//    1. Detect input format (by extension + mimetype + magic bytes fallback)
//    2. Run the matching importer → UniversalDocument
//    3. If input and output families differ (document ↔ presentation), run
//       the cross-format transform so the output exporter sees the shape
//       it expects.
//    4. Run the matching exporter → Buffer.
//    5. Compute the quality report (preserved / modified / lost feature
//       counts) so users see exactly what survived the trip.
//
//  Concurrency: each call is self-contained and stateless. Batch jobs are
//  tracked in an in-memory store (per process) so /convert/status can poll
//  results without re-doing work.
// =============================================================================

export type OutputFormat =
  | 'pptx' | 'pdf' | 'docx' | 'html' | 'md' | 'txt' | 'rtf';

export const OUTPUT_FORMATS: OutputFormat[] = ['pptx', 'pdf', 'docx', 'html', 'md', 'txt', 'rtf'];

export interface ConversionResult {
  /** The produced binary. */
  buffer:    Buffer;
  /** Effective format (may differ from requested if a fallback was used). */
  format:    OutputFormat | 'html';
  mimetype:  string;
  extension: string;
  durationMs: number;
  report:    ConversionQualityReport;
  /** The intermediate UDM (useful for previewing without re-importing). */
  document:  UniversalDocument;
}

export interface ConversionQualityReport {
  inputFormat:  SupportedFormat;
  outputFormat: OutputFormat | 'html';
  preserved:    Array<{ kind: string; count: number }>;
  modified:     Array<{ kind: string; count: number; note: string }>;
  lost:         Array<{ kind: string; count: number; note: string }>;
  /** Per-feature score 0..100. */
  scores:       Record<string, number>;
  /** Single rolled-up 0..100 score. */
  overall:      number;
  /** Phase 41.1L — Quality 2.0 sub-scores (each 0..100). */
  fidelity?: {
    layout:  number;
    image:   number;
    chart:   number;
    table:   number;
    text:    number;
    /** Weighted aggregate across the four. */
    overall: number;
  };
}

export interface ConvertInput {
  buffer:        Buffer;
  filename?:     string;
  mimetype?:     string;
  targetFormat:  OutputFormat;
  brandKitId?:   string | null;
}

export interface BatchJob {
  id:        string;
  total:     number;
  done:      number;
  status:    'queued' | 'running' | 'complete' | 'failed';
  startedAt: string;
  results:   Array<{ filename: string; ok: boolean; format?: string; durationMs?: number; error?: string; overall?: number }>;
  error?:    string;
}

@Injectable()
export class UniversalConversionService {
  private readonly logger = new Logger(UniversalConversionService.name);
  private batches = new Map<string, BatchJob>();

  constructor(
    private readonly pptxImport: PptxImportService,
    private readonly prisma:     PrismaService,
  ) {}

  // =========================================================================
  //  Phase Ω.1 — applyBrandKit
  //
  //  Fetches a brand kit by id and merges its tokens into the
  //  UniversalDocument's `theme` slot. Downstream exporters (pptx, docx,
  //  html, pdf, md) read `doc.theme.colors` / `doc.theme.fonts` to colour
  //  text, headings, tables, charts, headers and logos.
  // =========================================================================
  private async applyBrandKit(doc: UniversalDocument, brandKitId: string | null | undefined): Promise<void> {
    if (!brandKitId) return;
    try {
      const kit: any = await this.prisma.brandKit.findUnique({ where: { id: brandKitId } });
      if (!kit) return;
      const tokens = kit.tokens || {};
      const colors = tokens.colors || {};
      const typo   = tokens.typography || {};
      doc.theme = doc.theme || {};
      doc.theme.colors = {
        primary:    colors.primary    || kit.primaryColor   || doc.theme?.colors?.primary,
        secondary:  colors.secondary  || kit.secondaryColor || doc.theme?.colors?.secondary,
        accent:     colors.accent     || doc.theme?.colors?.accent,
        text:       colors.text       || doc.theme?.colors?.text,
        background: colors.background || doc.theme?.colors?.background,
      };
      doc.theme.fonts = {
        heading: typo.heading?.family || kit.fontFamily || doc.theme?.fonts?.heading,
        body:    typo.body?.family    || kit.fontFamily || doc.theme?.fonts?.body,
      };
      // Store the logo URL too — html/pdf exporters can render it in headers.
      doc.metadata.brandKitId = brandKitId;
      (doc.metadata as any).brandKitLogo = kit.logo || null;
      (doc.metadata as any).brandKitName = kit.name  || null;
    } catch (e) {
      this.logger.warn(`applyBrandKit(${brandKitId}) failed: ${(e as any)?.message || e}`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Single-file conversion
  // ---------------------------------------------------------------------------

  async convert(input: ConvertInput): Promise<ConversionResult> {
    const t0 = Date.now();
    const fmt = detectFormat(input.filename, input.mimetype);
    if (!fmt) throw new BadRequestException(`Unsupported or undetectable input format (filename=${input.filename}, mime=${input.mimetype})`);
    if (!OUTPUT_FORMATS.includes(input.targetFormat)) {
      throw new BadRequestException(`Unsupported target format "${input.targetFormat}"`);
    }

    // 1) Parse → UDM.
    const doc = await this.importToUdm(input.buffer, fmt, input.filename || `input.${fmt}`);

    // 2) Phase Ω.1 — brand kit application.
    //    Loads the kit and merges its colors/fonts/logo into doc.theme so
    //    every downstream exporter inherits the brand without per-format wiring.
    await this.applyBrandKit(doc, input.brandKitId);

    // 3) Cross-format reshape if needed.
    const reshaped = this.reshapeForTarget(doc, input.targetFormat);

    // 4) Export.
    const { buffer, mimetype, extension, format } = await this.exportFromUdm(reshaped, input.targetFormat);

    // 5) Quality report.
    const report = this.buildQualityReport(fmt, format, doc, reshaped);

    return {
      buffer,
      format,
      mimetype,
      extension,
      durationMs: Date.now() - t0,
      report,
      document: reshaped,
    };
  }

  // ---------------------------------------------------------------------------
  //  Batch conversion (in-memory tracking; queue up to N at once)
  // ---------------------------------------------------------------------------

  startBatch(items: ConvertInput[]): BatchJob {
    const id  = `batch-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
    const job: BatchJob = {
      id, total: items.length, done: 0, status: 'queued',
      startedAt: new Date().toISOString(), results: [],
    };
    this.batches.set(id, job);
    // Fire-and-forget worker.
    this.runBatch(job, items).catch((e) => {
      job.status = 'failed'; job.error = e?.message || String(e);
    });
    return job;
  }

  getBatch(id: string): BatchJob | null {
    return this.batches.get(id) || null;
  }

  private async runBatch(job: BatchJob, items: ConvertInput[]): Promise<void> {
    job.status = 'running';
    for (const item of items) {
      const t = Date.now();
      try {
        const res = await this.convert(item);
        job.results.push({
          filename:   item.filename || 'input',
          ok:         true,
          format:     res.format,
          durationMs: res.durationMs,
          overall:    res.report.overall,
        });
      } catch (e: any) {
        job.results.push({
          filename:   item.filename || 'input',
          ok:         false,
          durationMs: Date.now() - t,
          error:      e?.message || String(e),
        });
      } finally {
        job.done++;
      }
    }
    job.status = 'complete';
  }

  // ---------------------------------------------------------------------------
  //  Internals
  // ---------------------------------------------------------------------------

  private async importToUdm(buf: Buffer, fmt: SupportedFormat, filename: string): Promise<UniversalDocument> {
    switch (fmt) {
      case 'pdf':                  {
        // Phase 41.1A — try geometry-aware parser first; fall back to plain-text.
        try { return await importPdfGeometry(buf); }
        catch { return importPdf(buf); }
      }
      case 'docx': case 'doc': case 'odt':
                                   return importDocx(buf, filename);
      case 'xlsx': case 'xls': case 'ods':
                                   return importXlsx(buf, filename);
      case 'csv':                  return importCsv(buf, filename);
      case 'html': case 'htm':     return importHtml(buf, filename);
      case 'md': case 'markdown':  return importMarkdown(buf, filename);
      case 'txt':                  return importText(buf, filename);
      case 'rtf':                  return importRtf(buf, filename);
      case 'pptx': case 'potx':    return importPptxAsDocument(this.pptxImport, buf);
      default:
        throw new BadRequestException(`Importer not yet wired for format "${fmt}"`);
    }
  }

  private reshapeForTarget(doc: UniversalDocument, target: OutputFormat): UniversalDocument {
    const inputFamily  = FORMAT_FAMILY[doc.metadata.sourceFormat];
    const outputFamily = target === 'pptx' ? 'presentation' : 'document';
    if (inputFamily === outputFamily) return doc;
    if (outputFamily === 'presentation') return documentToPresentation(doc);
    if (outputFamily === 'document')     return presentationToDocument(doc);
    return doc;
  }

  private async exportFromUdm(doc: UniversalDocument, target: OutputFormat): Promise<{ buffer: Buffer; mimetype: string; extension: string; format: OutputFormat | 'html' }> {
    switch (target) {
      case 'md':
        return { buffer: exportMarkdown(doc), mimetype: 'text/markdown', extension: 'md', format: 'md' };
      case 'html':
        return { buffer: exportHtml(doc),     mimetype: 'text/html',     extension: 'html', format: 'html' };
      case 'txt':
        return { buffer: exportText(doc),     mimetype: 'text/plain',    extension: 'txt', format: 'txt' };
      case 'rtf':
        return { buffer: exportRtf(doc),      mimetype: 'application/rtf', extension: 'rtf', format: 'rtf' };
      case 'docx':
        return { buffer: await exportDocx(doc),
                 mimetype: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                 extension: 'docx', format: 'docx' };
      case 'pptx':
        return { buffer: await exportPptx(doc),
                 mimetype: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
                 extension: 'pptx', format: 'pptx' };
      case 'pdf': {
        const r = await exportPdf(doc);
        return { buffer: r.buffer, mimetype: r.mimetype, extension: r.extension, format: r.mode === 'libreoffice' ? 'pdf' : 'html' };
      }
      default:
        throw new BadRequestException(`Exporter not yet wired for "${target}"`);
    }
  }

  // ---------------------------------------------------------------------------
  //  Quality report (Phase 41Q)
  // ---------------------------------------------------------------------------

  private buildQualityReport(
    input: SupportedFormat,
    output: OutputFormat | 'html',
    before: UniversalDocument,
    after: UniversalDocument,
  ): ConversionQualityReport {
    const beforeCounts = countByType(before);
    const afterCounts  = countByType(after);

    const preserved: ConversionQualityReport['preserved'] = [];
    const modified:  ConversionQualityReport['modified']  = [];
    const lost:      ConversionQualityReport['lost']      = [];
    const scores: Record<string, number> = {};

    const KINDS = ['heading', 'paragraph', 'list', 'table', 'image', 'chart', 'quote', 'callout', 'code'];
    for (const k of KINDS) {
      const b = beforeCounts[k] || 0;
      const a = afterCounts[k]  || 0;
      if (b === 0 && a === 0) { scores[k] = 100; continue; }
      const ratio = b === 0 ? 1 : Math.min(1, a / b);
      scores[k] = Math.round(ratio * 100);
      if (a >= b)      preserved.push({ kind: k, count: a });
      else if (a > 0)  modified.push({ kind: k, count: a, note: `kept ${a} of ${b} (${Math.round(ratio * 100)}%)` });
      else             lost.push({ kind: k, count: b, note: `dropped during ${input} → ${output}` });
    }

    // Penalise downgrades from PPTX-specific features when exporting to flat formats.
    if (input === 'pptx' && output !== 'pptx') {
      if (beforeCounts['chart']   ?? 0)  modified.push({ kind: 'chart-rendering',   count: beforeCounts['chart'],   note: 'chart structure preserved as data; visual render is exporter-specific' });
      if (beforeCounts['smartArt'] ?? 0) lost.push({     kind: 'smartArt',          count: beforeCounts['smartArt'], note: `flattened to summary text in ${output}` });
    }

    const total = Math.max(1, totalNodes(before));
    const overall = Math.round(Math.min(100,
      (preserved.reduce((p, c) => p + c.count, 0) / total) * 100
      + (modified.reduce((p, c) => p + c.count, 0) / total) * 50
    ));

    // Phase 41.1L — Quality 2.0 sub-scores.
    // text   = text-frame preservation (paragraph + heading + quote + callout + code)
    // layout = page count + section count parity
    // image  = images preserved
    // chart  = charts preserved (and exported, since native rendering now lands)
    // table  = tables preserved (header rows + cell counts compared)
    const safe = (b: number, a: number): number => b === 0 ? 100 : Math.max(0, Math.min(100, Math.round((Math.min(a, b) / b) * 100)));

    const textScore = safe(
      (beforeCounts['paragraph'] || 0) + (beforeCounts['heading'] || 0) + (beforeCounts['quote'] || 0) + (beforeCounts['callout'] || 0) + (beforeCounts['code'] || 0),
      (afterCounts['paragraph']  || 0) + (afterCounts['heading']  || 0) + (afterCounts['quote']  || 0) + (afterCounts['callout']  || 0) + (afterCounts['code']  || 0),
    );
    const layoutScore = safe(Math.max(before.pages.length, 1), Math.max(after.pages.length, 1));
    const imageScore  = safe(beforeCounts['image'] || 0, afterCounts['image'] || 0);
    const chartScore  = safe(beforeCounts['chart'] || 0, afterCounts['chart'] || 0);
    const tableScore  = (() => {
      const bt = beforeCounts['table'] || 0; const at = afterCounts['table'] || 0;
      if (bt === 0) return 100;
      // Penalise cell-count drops in addition to row presence.
      const beforeCells = sumCells(before);
      const afterCells  = sumCells(after);
      const rowParity = safe(bt, at);
      const cellParity = safe(beforeCells, afterCells);
      return Math.round(rowParity * 0.4 + cellParity * 0.6);
    })();

    const fidelityOverall = Math.round(
      textScore   * 0.35 +
      layoutScore * 0.15 +
      imageScore  * 0.10 +
      chartScore  * 0.20 +
      tableScore  * 0.20,
    );

    return {
      inputFormat: input, outputFormat: output,
      preserved, modified, lost, scores, overall,
      fidelity: {
        text: textScore, layout: layoutScore, image: imageScore,
        chart: chartScore, table: tableScore, overall: fidelityOverall,
      },
    };
  }
}

function sumCells(doc: UniversalDocument): number {
  let n = 0;
  forEachNode(doc, (node) => {
    if (node.type === 'table' && Array.isArray(node.rows)) {
      for (const r of node.rows) n += r.length;
    }
  });
  return n;
}

function countByType(doc: UniversalDocument): Record<string, number> {
  const out: Record<string, number> = {};
  forEachNode(doc, (n) => { out[n.type] = (out[n.type] || 0) + 1; });
  return out;
}
