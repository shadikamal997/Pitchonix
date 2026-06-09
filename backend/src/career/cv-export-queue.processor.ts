import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { CvExportService, CvExportFormat } from './cv-export.service';
import { CvProfilesService } from './cv-profiles.service';
import { CvDocumentsService } from './cv-documents.service';
import { BetaTelemetryService } from './beta-telemetry.service';

// =============================================================================
//  Phase Ω.4 — Async export queue processor.
//
//  Processes export jobs off the main request thread so LibreOffice PDF
//  conversion (2-9s) doesn't block the event loop or hit HTTP timeouts.
//
//  Queue name: 'cv-export'
//  Job data:   CvExportJobData
//  Job result: CvExportJobResult
// =============================================================================

export const CV_EXPORT_QUEUE = 'cv-export';

export interface CvExportJobData {
  documentId: string;
  profileId: string;
  userId: string;
  format: CvExportFormat;
  templateId?: string | null;
  brandKitId?: string | null;
  brandTokens?: any;
}

export interface CvExportJobResult {
  jobId: string;
  documentId: string;
  format: CvExportFormat;
  mode: string;
  durationMs: number;
  // Base64-encoded buffer — stored in Redis; client downloads via /export/result/:jobId
  bufferB64: string;
  mimetype: string;
  extension: string;
  filename: string;
}

@Processor(CV_EXPORT_QUEUE)
export class CvExportQueueProcessor {
  private readonly logger = new Logger(CvExportQueueProcessor.name);

  constructor(
    private readonly exporter: CvExportService,
    private readonly profiles: CvProfilesService,
    private readonly documents: CvDocumentsService,
    private readonly telemetry: BetaTelemetryService,
  ) {}

  @Process()
  async handleExport(job: Job<CvExportJobData>): Promise<CvExportJobResult> {
    const { documentId, profileId, userId, format, templateId, brandKitId, brandTokens } = job.data;
    const t0 = Date.now();
    this.logger.log(
      `[EXPORT-QUEUE] start job=${job.id} doc=${documentId} fmt=${format} user=${userId}`,
    );

    const doc = await this.documents.findOne(documentId);
    const profile = await this.profiles.get(profileId);

    const renderDoc = templateId !== undefined ? { ...doc, templateId: templateId ?? null } : doc;

    const r = await this.exporter.export(format, profile, renderDoc, brandTokens ?? undefined);
    const durationMs = Date.now() - t0;

    this.logger.log(`[EXPORT-QUEUE] done job=${job.id} mode=${r.mode} dur=${durationMs}ms`);
    this.telemetry.track('export_done', {
      userId,
      durationMs,
      meta: { fmt: format, docId: documentId, mode: r.mode, queued: true },
    });

    const safe = (doc.title || 'document').replace(/[^a-z0-9.-]/gi, '_');
    return {
      jobId: String(job.id),
      documentId,
      format,
      mode: r.mode ?? 'html',
      durationMs,
      bufferB64: r.buffer.toString('base64'),
      mimetype: r.mimetype,
      extension: r.extension,
      filename: `${safe}.${r.extension}`,
    };
  }
}
