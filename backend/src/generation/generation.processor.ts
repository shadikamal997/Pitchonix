import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GenerationService } from './generation.service';
import { SlidesService } from '../slides/slides.service';
import { QualityControlService } from './quality/quality-control.service';
import { GenerationStage } from './quality/types';

@Injectable()
@Processor('generation')
export class GenerationProcessor {
  private readonly logger = new Logger(GenerationProcessor.name);

  constructor(
    private prisma: PrismaService,
    private generationService: GenerationService,
    private slidesService: SlidesService,
    private qualityControlService: QualityControlService,
  ) {}

  @Process('generate-deck')
  async handleGenerateDeck(job: Job) {
    const { 
      projectId, 
      deckId, 
      input, 
      useAI = false,
      generateVisuals = true,
    } = job.data;

    this.logger.log(`Processing generation job for deck: ${deckId}${useAI ? ' (with AI)' : ''}${generateVisuals ? ' (with visuals)' : ''}`);

    try {
      // 1. Start quality monitoring
      const estimatedSlideCount = this.estimateSlideCount(input.documentType);
      this.qualityControlService.startMonitoring(deckId, projectId, estimatedSlideCount);
      
      // Update deck status
      await this.prisma.deck.update({
        where: { id: deckId },
        data: { status: 'generating' },
      });

      // 2. Update to BASE_GENERATION stage
      this.qualityControlService.updateStage(
        deckId,
        GenerationStage.BASE_GENERATION,
        'Generating slide content...',
      );

      // Generate complete presentation with content, AI, and visual layer
      this.logger.log('Generating presentation...');
      const visualSlides = await this.generationService.generatePresentation(
        input, 
        { 
          useAI,
          generateVisuals,
        },
      );

      // Update progress after base generation
      this.qualityControlService.updateSlideProgress(
        deckId,
        visualSlides.length,
        'Base content generated',
      );

      // 3. If AI enhancement was used, update stage
      if (useAI) {
        this.qualityControlService.updateStage(
          deckId,
          GenerationStage.AI_ENHANCEMENT,
          'AI enhancement completed',
        );
      }

      // 4. If visual generation was used, update stage
      if (generateVisuals) {
        this.qualityControlService.updateStage(
          deckId,
          GenerationStage.VISUAL_GENERATION,
          'Charts and visuals generated',
        );
      }

      // 5. Run quality check
      this.qualityControlService.updateStage(
        deckId,
        GenerationStage.QUALITY_CHECK,
        'Running quality checks...',
      );

      this.logger.log('Running quality checks...');
      const qualityReport = await this.qualityControlService.generateQualityReport(
        deckId,
        projectId,
        visualSlides,
        input,
        {
          aiUsed: useAI,
        },
      );

      // Check export readiness
      const exportReadiness = this.qualityControlService.isExportReady(
        visualSlides,
        input,
      );

      this.logger.log(
        `Quality Score: ${qualityReport.qualityScore.overall}/100 (${qualityReport.qualityScore.grade}) - Export Ready: ${exportReadiness.ready}`,
      );

      // PHASE 10: Record quality check in history
      try {
        const { QualityHistoryService } = await import('../export/services');
        const historyService = new QualityHistoryService(this.prisma);
        
        await historyService.recordQualityCheck({
          deckId,
          qualityMetrics: {
            overallScore: qualityReport.qualityScore.overall,
            grade: qualityReport.qualityScore.grade,
            dimensions: {
              content: qualityReport.qualityScore.dimensions.content,
              visual: qualityReport.qualityScore.dimensions.visual,
              ai: qualityReport.qualityScore.dimensions.aiEnhancement || 0,
              export: qualityReport.qualityScore.dimensions.exportReadiness,
            },
          },
          validationMetrics: {
            passed: exportReadiness.ready,
            errorCount: exportReadiness.issues.filter((i: string) => i.includes('error')).length,
            warningCount: exportReadiness.issues.filter((i: string) => i.includes('warning')).length,
            infoCount: 0,
          },
          trigger: 'generation',
        });
        
        this.logger.log('Quality check recorded in history');
      } catch (error) {
        this.logger.error('Failed to record quality history:', error);
        // Don't fail the job if history recording fails
      }

      // Validate content (check base slide structure)
      const baseSlides = visualSlides.map((vs, index) => ({
        type: vs.type as any, // Type assertion needed for slide type
        order: index,
        title: vs.title,
        subtitle: vs.subtitle,
        content: vs.content,
        speakerNotes: vs.speakerNotes,
        qualityScore: vs.qualityScore,
      }));
      
      if (!this.generationService.validateSlideContent(baseSlides as any)) {
        throw new Error('Generated content validation failed');
      }

      // 6. Save slides to database (including visual metadata)
      this.logger.log(`Creating ${visualSlides.length} slides...`);
      await this.slidesService.createMany(deckId, baseSlides);

      // 7. Update deck with quality data
      await this.prisma.deck.update({
        where: { id: deckId },
        data: { 
          status: 'ready',
          qualityScore: qualityReport.qualityScore as any,
          validationResult: qualityReport.validation as any,
          generationMetrics: qualityReport.generationStatus.metrics as any,
          lastQualityCheck: new Date(),
          exportReady: exportReadiness.ready,
        },
      });

      // 8. Complete quality monitoring
      this.qualityControlService.completeGeneration(deckId, true);

      // Update project status
      await this.prisma.project.update({
        where: { id: projectId },
        data: { 
          status: 'completed',
          qualityScore: qualityReport.qualityScore.overall,
        },
      });

      this.logger.log(`Successfully generated deck: ${deckId} (${visualSlides.length} slides, ${visualSlides.filter(s => s.charts?.length).length} with charts)`);

      return { 
        success: true, 
        deckId, 
        slidesCount: visualSlides.length,
        chartsCount: visualSlides.reduce((sum, s) => sum + (s.charts?.length || 0), 0),
        imagesCount: visualSlides.reduce((sum, s) => sum + (s.images?.length || 0), 0),
        qualityScore: qualityReport.qualityScore.overall,
        qualityGrade: qualityReport.qualityScore.grade,
        exportReady: exportReadiness.ready,
      };
    } catch (error) {
      this.logger.error(`Failed to generate deck: ${error.message}`);

      // Record error in monitoring
      this.qualityControlService.recordError(deckId, error.message, false);
      this.qualityControlService.completeGeneration(deckId, false);

      // Update statuses to failed
      await this.prisma.deck.update({
        where: { id: deckId },
        data: { status: 'draft' },
      });

      await this.prisma.project.update({
        where: { id: projectId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }

  /**
   * Estimate slide count based on document type
   */
  private estimateSlideCount(documentType: string): number {
    const estimates: Record<string, number> = {
      pitch_deck: 10,
      business_plan: 20,
      sales_deck: 12,
      one_pager: 1,
      company_profile: 8,
      marketing_plan: 15,
    };

    return estimates[documentType] || 10;
  }
}
