import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { QualityControlService } from './quality/quality-control.service';
import { GenerationStage } from './quality/types';
import { UnifiedGenerationPipeline } from './pipeline/unified-pipeline.service';

// =============================================================================
//  GenerationProcessor — Phase 31.5
//
//  The Bull queue handler for "generate-deck" jobs is now a thin shell over
//  the UnifiedGenerationPipeline. It:
//
//    1. Flips deck status → generating + starts quality monitoring
//    2. Builds a GenerationCommand and calls pipeline.execute()
//    3. Records quality-history + flips deck/project status from the
//       pipeline's PipelineResult
//
//  All slide generation, smart-component attachment, optional AI enhancement,
//  scorecard, migration, and persistence live inside the pipeline. The
//  processor owns only the job-lifecycle concerns (monitoring + status).
//
//  Phase 31.5 removed ~150 LOC of inline orchestration that previously lived
//  in this file.
// =============================================================================

@Injectable()
@Processor('generation')
export class GenerationProcessor {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private qualityControlService: QualityControlService,
    private pipeline: UnifiedGenerationPipeline,
  ) {}

  @Process('generate-deck')
  async handleGenerateDeck(job: Job) {
    const { projectId, deckId, input, useAI = false } = job.data;
    this.logger.log(`Processing GENERATE job for deck ${deckId}${useAI ? ' (with AI)' : ''}`);

    // Pre-pipeline: monitoring + status flip.
    const estimatedSlideCount = this.estimateSlideCount(input.documentType);
    this.qualityControlService.startMonitoring(deckId, projectId, estimatedSlideCount);
    this.qualityControlService.updateStage(deckId, GenerationStage.BASE_GENERATION, 'Pipeline starting…');

    await this.prisma.deck.update({ where: { id: deckId }, data: { status: 'generating' } });

    try {
      // Hand off to the unified pipeline. Quality / migration / persistence
      // all happen inside execute().
      const result = await this.pipeline.execute({
        type: 'GENERATE',
        projectId,
        deckId,
        wizardInput: input,
        options: {
          useEnhancement: !!useAI,
          source: 'queue',
          jobId: `gen-${deckId}`,
        },
      });

      if (!result.ok) {
        throw new Error(`Pipeline failed at stage ${result.error?.stage}: ${result.error?.reason}`);
      }

      // Map pipeline stage transitions to quality-monitor stages so the
      // existing telemetry dashboards stay populated.
      if (useAI) {
        this.qualityControlService.updateStage(deckId, GenerationStage.AI_ENHANCEMENT, 'AI enhancement complete');
      }
      this.qualityControlService.updateStage(deckId, GenerationStage.QUALITY_CHECK, 'Quality scored');

      const metrics = result.context.metrics;
      this.qualityControlService.updateSlideProgress(
        deckId,
        metrics?.slidesGenerated || 0,
        `Generated ${metrics?.slidesGenerated || 0} slides`,
      );

      // Persist deck-level quality score on the project (preserves prior
      // behaviour where the queue processor wrote project.qualityScore).
      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'completed', qualityScore: metrics?.qualityScore ?? 0 },
      });

      this.qualityControlService.completeGeneration(deckId, true);

      this.logger.log(
        `Pipeline completed for deck ${deckId} in ${result.durationMs}ms ` +
        `(${metrics?.slidesGenerated} slides, ${metrics?.elementsCreated} elements, quality ${metrics?.qualityScore})`,
      );

      return {
        success: true,
        deckId,
        slidesCount:    metrics?.slidesGenerated ?? 0,
        // Smart Components carry charts/images in their element trees; the
        // legacy `chartsCount`/`imagesCount` aggregates are no longer
        // meaningful on the slide-content layer — reported as 0 for backwards
        // compatibility with consumers that read these fields.
        chartsCount:    0,
        imagesCount:    0,
        qualityScore:   metrics?.qualityScore ?? 0,
        qualityGrade:   gradeFor(metrics?.qualityScore ?? 0),
        exportReady:    (metrics?.qualityScore ?? 0) >= 70,
        smartComponentsAttached: metrics?.smartComponentsAttached ?? 0,
        elementsCreated:         metrics?.elementsCreated ?? 0,
        pipelineStages: result.stages.map((s) => ({ stage: s.stage, ms: s.ms })),
      };
    } catch (error: any) {
      this.logger.error(`Failed to generate deck ${deckId}: ${error.message}`);
      this.qualityControlService.recordError(deckId, error.message, false);
      this.qualityControlService.completeGeneration(deckId, false);
      await this.prisma.deck.update({ where: { id: deckId }, data: { status: 'draft' } });
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
      throw error;
    }
  }

  private estimateSlideCount(documentType: string): number {
    return {
      pitch_deck: 10, business_plan: 20, sales_deck: 12,
      one_pager: 1, company_profile: 8, marketing_plan: 15,
    }[documentType] ?? 10;
  }
}

function gradeFor(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
