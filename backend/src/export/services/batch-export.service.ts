import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportJob } from '@prisma/client';
import { ExportService } from '../export.service';
import * as path from 'path';
import * as fs from 'fs';
import AdmZip from 'adm-zip';

export interface CreateBatchJobDto {
  deckIds: string[];
  format: 'pptx' | 'pdf';
  templateId?: string;
  options: Record<string, any>;
  userId: string;
}

export interface BatchJobStatus {
  id: string;
  status: string;
  progress: number;
  currentDeck: string | null;
  completedDecks: number;
  totalDecks: number;
  outputUrls: string[];
  errors: any;
  startedAt: Date | null;
  estimatedCompletion: Date | null;
}

/** Maximum decks processed concurrently within a single batch job. */
const MAX_CONCURRENT = 3;

/**
 * In-memory cancellation registry.
 * Maps jobId → AbortController so processBatchJob can check abort.signal
 * and stop processing mid-flight when cancelJob() is called.
 */
const cancelRegistry = new Map<string, AbortController>();

@Injectable()
export class BatchExportService {
  private readonly logger = new Logger(BatchExportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService,
  ) {}

  /**
   * Create a new batch export job and start processing asynchronously.
   */
  async createBatchJob(data: CreateBatchJobDto): Promise<ExportJob> {
    if (!['pptx', 'pdf'].includes(data.format)) {
      throw new BadRequestException(
        `Unsupported batch format '${data.format}'. Supported: pptx, pdf.`,
      );
    }

    const decks = await this.prisma.deck.findMany({
      where: { id: { in: data.deckIds }, project: { userId: data.userId } },
    });

    if (decks.length !== data.deckIds.length) {
      throw new NotFoundException('One or more decks not found or not owned by user');
    }

    if (data.templateId) {
      const template = await this.prisma.exportTemplate.findUnique({
        where: { id: data.templateId },
      });
      if (!template) throw new NotFoundException('Template not found');
    }

    const job = await this.prisma.exportJob.create({
      data: {
        deckIds: data.deckIds,
        format: data.format,
        templateId: data.templateId,
        options: data.options,
        status: 'pending',
        progress: 0,
        outputUrls: [],
        userId: data.userId,
      },
    });

    this.processBatchJob(job.id).catch((error) => {
      this.logger.error(`Batch job ${job.id} failed:`, error);
    });

    return job;
  }

  /**
   * Process a batch export job with real concurrency cap and cancellation.
   */
  async processBatchJob(jobId: string): Promise<void> {
    const ac = new AbortController();
    cancelRegistry.set(jobId, ac);

    try {
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: { status: 'processing', startedAt: new Date() },
      });

      const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
      if (!job) throw new Error('Job not found');

      const outputUrls: string[] = [];
      const errors: any[] = [];
      const totalDecks = job.deckIds.length;

      // Process in fixed-size windows of MAX_CONCURRENT
      for (let i = 0; i < totalDecks; i += MAX_CONCURRENT) {
        if (ac.signal.aborted) {
          this.logger.log(`Batch job ${jobId} aborted at deck index ${i}`);
          break;
        }

        const window = job.deckIds.slice(i, i + MAX_CONCURRENT);

        const results = await Promise.allSettled(
          window.map(async (deckId, idx) => {
            if (ac.signal.aborted) throw new Error('Job cancelled');

            await this.prisma.exportJob.update({
              where: { id: jobId },
              data: {
                currentDeck: deckId,
                progress: Math.round(((i + idx + 1) / totalDecks) * 100),
              },
            });

            return this.exportDeck(
              deckId,
              job.format,
              job.templateId,
              (job.options as Record<string, any>) ?? {},
            );
          }),
        );

        for (let k = 0; k < results.length; k++) {
          const r = results[k];
          if (r.status === 'fulfilled') {
            outputUrls.push(r.value);
          } else {
            this.logger.error(`Error exporting deck ${window[k]}:`, r.reason);
            errors.push({ deckId: window[k], error: r.reason?.message ?? String(r.reason) });
          }
        }
      }

      const allFailed = errors.length === totalDecks;
      const wasCancelled = ac.signal.aborted;
      const finalStatus = wasCancelled ? 'failed' : allFailed ? 'failed' : 'completed';

      // If merge was requested, create a ZIP
      let finalUrls = outputUrls;
      const options = (job.options as Record<string, any>) ?? {};
      if (options.merge && outputUrls.length > 1 && !wasCancelled) {
        try {
          const zipUrl = await this.zipExports(outputUrls, job.format, jobId);
          finalUrls = [zipUrl];
        } catch (zipErr: any) {
          this.logger.error(`ZIP merge failed for job ${jobId}: ${zipErr.message}`);
          // Return individual files rather than losing them
        }
      }

      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: finalStatus,
          progress: wasCancelled ? job.progress : 100,
          currentDeck: null,
          outputUrls: finalUrls,
          errors: errors.length > 0
            ? [...errors, ...(wasCancelled ? [{ error: 'Cancelled by user' }] : [])]
            : wasCancelled ? [{ error: 'Cancelled by user' }] : null,
          completedAt: new Date(),
        },
      });
    } catch (error: any) {
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errors: [{ error: error.message }],
          completedAt: new Date(),
        },
      }).catch(() => {}); // ignore DB errors in error handler
      throw error;
    } finally {
      cancelRegistry.delete(jobId);
    }
  }

  private async exportDeck(
    deckId: string,
    format: string,
    templateId?: string,
    options?: Record<string, any>,
  ): Promise<string> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { slides: { orderBy: { order: 'asc' } }, brandKit: true },
    });

    if (!deck) throw new NotFoundException(`Deck ${deckId} not found`);
    if (!deck.exportReady) throw new Error(`Deck ${deckId} is not ready for export`);

    let template = null;
    if (templateId) {
      template = await this.prisma.exportTemplate.findUnique({ where: { id: templateId } });
    }

    if (format === 'pptx') {
      return this.exportService.exportToPPTX(deck);
    } else if (format === 'pdf') {
      return this.exportService.exportToPDF(deck, { template, ...options });
    }

    throw new Error(`Unsupported format: ${format}`);
  }

  /**
   * Get batch job status (ownership-enforced).
   */
  async getJobStatus(jobId: string, userId: string): Promise<BatchJobStatus> {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');

    const completedDecks = job.outputUrls.length;
    const totalDecks = job.deckIds.length;
    let estimatedCompletion: Date | null = null;

    if (job.status === 'processing' && job.startedAt && completedDecks > 0) {
      const elapsed = Date.now() - job.startedAt.getTime();
      const avgTimePerDeck = elapsed / completedDecks;
      const remainingTime = avgTimePerDeck * (totalDecks - completedDecks);
      estimatedCompletion = new Date(Date.now() + remainingTime);
    }

    return {
      id: job.id,
      status: job.status,
      progress: job.progress,
      currentDeck: job.currentDeck,
      completedDecks,
      totalDecks,
      outputUrls: job.outputUrls,
      errors: job.errors,
      startedAt: job.startedAt,
      estimatedCompletion,
    };
  }

  /**
   * Cancel a running or pending batch job.
   * Signals the AbortController so the processing loop stops on the next
   * window boundary (within the current MAX_CONCURRENT window the in-flight
   * exports will still complete; no work is lost or partially written).
   */
  async cancelJob(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');
    if (job.status !== 'pending' && job.status !== 'processing') {
      throw new BadRequestException('Can only cancel pending or processing jobs');
    }

    // Signal the processing loop to stop
    const ac = cancelRegistry.get(jobId);
    if (ac) {
      ac.abort();
      this.logger.log(`Abort signal sent for job ${jobId}`);
    } else {
      // Job is in DB as pending but hasn't started yet — update status directly
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errors: [{ error: 'Cancelled by user' }],
          completedAt: new Date(),
        },
      });
    }
  }

  /**
   * Retry a failed batch job.
   */
  async retryJob(jobId: string, userId: string): Promise<ExportJob> {
    const job = await this.prisma.exportJob.findUnique({ where: { id: jobId } });
    if (!job) throw new NotFoundException('Job not found');
    if (job.userId !== userId) throw new ForbiddenException('Access denied');
    if (job.status !== 'failed') throw new BadRequestException('Can only retry failed jobs');

    const updatedJob = await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'pending',
        progress: 0,
        currentDeck: null,
        outputUrls: [],
        errors: null,
        startedAt: null,
        completedAt: null,
      },
    });

    this.processBatchJob(jobId).catch((error) => {
      this.logger.error(`Error retrying batch job ${jobId}:`, error);
    });

    return updatedJob;
  }

  /**
   * ZIP all export files into one archive.
   * Returns the path/URL of the ZIP file.
   */
  private async zipExports(urls: string[], _format: string, jobId: string): Promise<string> {
    const exportDir = process.env.EXPORT_DIR ?? path.join(process.cwd(), 'exports');
    const zipName = `batch_${jobId}.zip`;
    const zipPath = path.join(exportDir, zipName);

    const zip = new AdmZip();

    for (const url of urls) {
      const filePath = url.startsWith('/')
        ? path.join(exportDir, path.basename(url))
        : url;

      if (fs.existsSync(filePath)) {
        zip.addLocalFile(filePath);
      } else {
        this.logger.warn(`ZIP: file not found at ${filePath} — skipping`);
      }
    }

    zip.writeZip(zipPath);
    this.logger.log(`ZIP created: ${zipPath} (${urls.length} files)`);
    return `/exports/${zipName}`;
  }

  /**
   * Clean up old completed/failed jobs and their ZIP artifacts.
   */
  async cleanupOldJobs(daysOld = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const oldJobs = await this.prisma.exportJob.findMany({
      where: {
        status: { in: ['completed', 'failed'] },
        completedAt: { lt: cutoffDate },
      },
      select: { id: true, outputUrls: true },
    });

    // Delete ZIP artifacts
    const exportDir = process.env.EXPORT_DIR ?? path.join(process.cwd(), 'exports');
    for (const job of oldJobs) {
      for (const url of job.outputUrls) {
        if (url.includes(`batch_${job.id}`)) {
          const filePath = path.join(exportDir, path.basename(url));
          try {
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          } catch {
            // Ignore cleanup errors
          }
        }
      }
    }

    const result = await this.prisma.exportJob.deleteMany({
      where: {
        status: { in: ['completed', 'failed'] },
        completedAt: { lt: cutoffDate },
      },
    });

    return result.count;
  }

  async getUserJobs(userId: string, limit = 10): Promise<ExportJob[]> {
    return this.prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
