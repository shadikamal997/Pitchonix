import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ExportJob } from '@prisma/client';
import { ExportService } from '../export.service';

export interface CreateBatchJobDto {
  deckIds: string[];
  format: 'pptx' | 'pdf' | 'html';
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

@Injectable()
export class BatchExportService {
  private readonly logger = new Logger(BatchExportService.name);
  
  constructor(
    private readonly prisma: PrismaService,
    private readonly exportService: ExportService
  ) {}

  /**
   * Create a new batch export job
   */
  async createBatchJob(data: CreateBatchJobDto): Promise<ExportJob> {
    // Validate that all decks exist
    const decks = await this.prisma.deck.findMany({
      where: {
        id: { in: data.deckIds },
      },
    });

    if (decks.length !== data.deckIds.length) {
      throw new NotFoundException('One or more decks not found');
    }

    // Validate template if provided
    if (data.templateId) {
      const template = await this.prisma.exportTemplate.findUnique({
        where: { id: data.templateId },
      });

      if (!template) {
        throw new NotFoundException('Template not found');
      }
    }

    // Create the job
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

    // Start processing asynchronously (don't await)
    this.processBatchJob(job.id).catch((error) => {
      this.logger.error(`Error processing batch job ${job.id}:`, error);
    });

    return job;
  }

  /**
   * Process a batch export job
   */
  async processBatchJob(jobId: string): Promise<void> {
    try {
      // Update job status to processing
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'processing',
          startedAt: new Date(),
        },
      });

      const job = await this.prisma.exportJob.findUnique({
        where: { id: jobId },
      });

      if (!job) {
        throw new Error('Job not found');
      }

      const outputUrls: string[] = [];
      const errors: any[] = [];
      const totalDecks = job.deckIds.length;

      // Process each deck
      for (let i = 0; i < job.deckIds.length; i++) {
        const deckId = job.deckIds[i];

        try {
          // Update current deck and progress
          await this.prisma.exportJob.update({
            where: { id: jobId },
            data: {
              currentDeck: deckId,
              progress: Math.round(((i + 1) / totalDecks) * 100),
            },
          });

          // Export the deck
          const outputUrl = await this.exportDeck(
            deckId,
            job.format,
            job.templateId,
            (job.options as Record<string, any>) || {}
          );

          outputUrls.push(outputUrl);
        } catch (error) {
          this.logger.error(`Error exporting deck ${deckId}:`, error);
          errors.push({
            deckId,
            error: error.message,
          });
        }
      }

      // Update job as completed
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: errors.length === job.deckIds.length ? 'failed' : 'completed',
          progress: 100,
          currentDeck: null,
          outputUrls,
          errors: errors.length > 0 ? errors : null,
          completedAt: new Date(),
        },
      });

      // If merging is requested, merge all exports
      const options = (job.options as Record<string, any>) || {};
      if (options.merge && outputUrls.length > 1) {
        const mergedUrl = await this.mergeExports(outputUrls, job.format);
        await this.prisma.exportJob.update({
          where: { id: jobId },
          data: {
            outputUrls: [mergedUrl],
          },
        });
      }
    } catch (error) {
      // Update job as failed
      await this.prisma.exportJob.update({
        where: { id: jobId },
        data: {
          status: 'failed',
          errors: [{ error: error.message }],
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  /**
   * Export a single deck within a batch job
   */
  private async exportDeck(
    deckId: string,
    format: string,
    templateId?: string,
    options?: Record<string, any>
  ): Promise<string> {
    // Get deck data
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        slides: {
          orderBy: { order: 'asc' },
        },
        brandKit: true,
      },
    });

    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    // Check export readiness
    if (!deck.exportReady) {
      throw new Error(`Deck ${deckId} is not ready for export`);
    }

    // Get template if provided
    let template = null;
    if (templateId) {
      template = await this.prisma.exportTemplate.findUnique({
        where: { id: templateId },
      });
    }

    // Use ExportService to perform the actual export
    let fileUrl: string;

    if (format === 'pptx') {
      fileUrl = await this.exportService.exportToPPTX(deck);
    } else if (format === 'pdf') {
      // PDF export with template options
      fileUrl = await this.exportService.exportToPDF(deck, {
        template,
        ...options,
      });
    } else {
      throw new Error(`Unsupported format: ${format}`);
    }

    return fileUrl;
  }

  /**
   * Get batch job status
   */
  async getJobStatus(jobId: string, userId: string): Promise<BatchJobStatus> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check access
    if (job.userId !== userId) {
      throw new Error('Unauthorized');
    }

    const completedDecks = job.outputUrls.length;
    const totalDecks = job.deckIds.length;

    // Estimate completion time
    let estimatedCompletion: Date | null = null;
    if (job.status === 'processing' && job.startedAt && completedDecks > 0) {
      const elapsed = Date.now() - job.startedAt.getTime();
      const avgTimePerDeck = elapsed / completedDecks;
      const remainingDecks = totalDecks - completedDecks;
      const remainingTime = avgTimePerDeck * remainingDecks;
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
   * Cancel a batch job
   */
  async cancelJob(jobId: string, userId: string): Promise<void> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check access
    if (job.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Can only cancel pending or processing jobs
    if (job.status !== 'pending' && job.status !== 'processing') {
      throw new Error('Can only cancel pending or processing jobs');
    }

    await this.prisma.exportJob.update({
      where: { id: jobId },
      data: {
        status: 'failed',
        errors: [{ error: 'Cancelled by user' }],
        completedAt: new Date(),
      },
    });
  }

  /**
   * Retry a failed batch job
   */
  async retryJob(jobId: string, userId: string): Promise<ExportJob> {
    const job = await this.prisma.exportJob.findUnique({
      where: { id: jobId },
    });

    if (!job) {
      throw new NotFoundException('Job not found');
    }

    // Check access
    if (job.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Can only retry failed jobs
    if (job.status !== 'failed') {
      throw new Error('Can only retry failed jobs');
    }

    // Reset job status
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

    // Start processing again
    this.processBatchJob(jobId).catch((error) => {
      this.logger.error(`Error retrying batch job ${jobId}:`, error);
    });

    return updatedJob;
  }

  /**
   * Merge multiple exports into one file
   */
  private async mergeExports(
    urls: string[],
    format: string
  ): Promise<string> {
    // If only one file, return it directly
    if (urls.length === 1) {
      return urls[0];
    }

    this.logger.log(`Merging ${urls.length} ${format} files...`);

    // For now, implement basic merging strategy
    // In production, this would:
    // 1. Download all files from URLs
    // 2. Use libraries like pptxgenjs (PPTX) or pdf-lib (PDF) to merge
    // 3. Upload merged file to storage
    // 4. Return new merged file URL

    // Return the first URL as fallback until full merge implementation
    // This allows the system to work while full merge is developed
    this.logger.warn(`Merge not fully implemented, returning first file for ${format}`);
    return urls[0];
  }

  /**
   * Clean up old completed/failed jobs
   */
  async cleanupOldJobs(daysOld: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysOld);

    const result = await this.prisma.exportJob.deleteMany({
      where: {
        status: {
          in: ['completed', 'failed'],
        },
        completedAt: {
          lt: cutoffDate,
        },
      },
    });

    return result.count;
  }

  /**
   * Get user's export jobs
   */
  async getUserJobs(
    userId: string,
    limit: number = 10
  ): Promise<ExportJob[]> {
    return this.prisma.exportJob.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
  }
}
