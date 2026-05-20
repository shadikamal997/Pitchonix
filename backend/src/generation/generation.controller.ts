import { Controller, Post, Body, UseGuards, Get, Param, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { GenerateDto } from './dto/generate.dto';
import { QualityReportDto } from './dto/quality-report.dto';
import { GenerationStatusDto } from './dto/generation-status.dto';
import { ValidationResultDto, ExportReadinessDto } from './dto/validation-result.dto';
import { AggregateMetricsDto } from './dto/aggregate-metrics.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DecksService } from '../decks/decks.service';
import { QualityControlService } from './quality/quality-control.service';
import { PdfDocumentGenerationService } from '../pdf-documents/pdf-document-generation.service';
import { LayoutService } from './visual/layout.service';
import { ThemeService } from './visual/theme.service';
import { VisualSlideContent } from './visual/types';
import { LayoutType } from './visual/types';
import { SlideFactory } from './slide-types/slide.factory';
import { SlidesService } from '../slides/slides.service';
import { SlideElementsMigrationService } from '../slides/slide-elements-migration.service';
import { SlideElementsService } from '../slides/slide-elements.service';

@ApiTags('Generation')
@Controller('generate')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class GenerationController {
  constructor(
    @InjectQueue('generation') private generationQueue: Queue,
    private prisma: PrismaService,
    private decksService: DecksService,
    private qualityControlService: QualityControlService,
    private pdfDocumentGenerationService: PdfDocumentGenerationService,
    private layoutService: LayoutService,
    private themeService: ThemeService,
    private slideFactory: SlideFactory,
    private slidesService: SlidesService,
    private migrationService: SlideElementsMigrationService,
    private slideElementsService: SlideElementsService,
  ) {}

  // ---------------------------------------------------------------------------
  //  applyBrandAssets — drop user-uploaded logo + photos into the deck.
  //
  //  Strategy:
  //    - Cover slide: hero photo (left half) + logo (top-right) + brand mark
  //    - Team slide:  team photos as part of teamCard.members[].photoUrl
  //    - Problem / Solution / Market: one supporting image each (if available)
  //    - Every slide: small logo bottom-left as brand mark
  // ---------------------------------------------------------------------------
  private async applyBrandAssets(deckId: string, businessInfo: any): Promise<{ logos: number; photos: number }> {
    const logoUrl: string | null = businessInfo?.logo?.url || null;
    const photoUrls: string[] = Array.isArray(businessInfo?.images)
      ? (businessInfo.images.map((x: any) => x?.url).filter(Boolean))
      : [];
    if (!logoUrl && photoUrls.length === 0) return { logos: 0, photos: 0 };

    const slides = await this.slidesService.findAll(deckId);
    let logos = 0, photos = 0;
    const photoQueue = [...photoUrls];

    for (const slide of slides) {
      const isCover = slide.type === 'cover';
      const isTeam  = slide.type === 'team';

      // Cover slide: big hero photo on the right + logo top-right
      if (isCover && photoQueue.length > 0) {
        const url = photoQueue.shift()!;
        await this.slideElementsService.create(slide.id, {
          type: 'image' as any,
          name: 'Hero photo',
          x: 50, y: 10, width: 44, height: 70,
          zIndex: 1,
          content: { src: url, alt: 'Hero', fit: 'cover', focalX: 0.5, focalY: 0.5 },
        });
        photos++;
      }

      // Team slide: enrich existing teamCard with photo URLs
      if (isTeam && photoQueue.length > 0) {
        const teamEls = await this.slideElementsService.listForSlide(slide.id);
        const teamEl = teamEls.find((e) => e.type === 'teamCard');
        if (teamEl) {
          const members: any[] = ((teamEl.content as any)?.members) || [];
          for (const m of members) {
            if (photoQueue.length === 0) break;
            m.photoUrl = photoQueue.shift()!;
            photos++;
          }
          await this.slideElementsService.update(teamEl.id, { content: { ...(teamEl.content as any), members } });
        }
      }

      // Problem / Solution / Market: one supporting visual
      if (['problem', 'solution', 'market_opportunity', 'market', 'traction', 'business_model'].includes(slide.type) && photoQueue.length > 0) {
        const url = photoQueue.shift()!;
        await this.slideElementsService.create(slide.id, {
          type: 'image' as any,
          name: 'Supporting visual',
          x: 64, y: 38, width: 30, height: 44,
          zIndex: 1,
          content: { src: url, alt: 'Visual', fit: 'cover', focalX: 0.5, focalY: 0.5 },
        });
        photos++;
      }

      // Every slide: small logo bottom-left as brand mark
      if (logoUrl) {
        await this.slideElementsService.create(slide.id, {
          type: 'logo' as any,
          name: 'Brand mark',
          x: 6, y: 92, width: 8, height: 4,
          zIndex: 5,
          content: { src: logoUrl, height: 28 },
        });
        logos++;
      }
    }
    return { logos, photos };
  }

  @Post()
  @ApiOperation({ summary: 'Generate a new deck or PDF document (queue job)' })
  async generate(@Body() dto: GenerateDto) {
    // Determine document format based on type
    const documentType = dto.input.documentType;
    const format = this.getDocumentFormat(documentType);

    if (format === 'pdf') {
      // Route to PDF document generation
      return this.generatePdfDocument(dto);
    } else {
      // Route to slide presentation generation
      return this.generateSlidePresentation(dto);
    }
  }

  /**
   * Generate PDF document (synchronous)
   */
  private async generatePdfDocument(dto: GenerateDto) {
    // Update project status
    await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { status: 'generating' },
    });

    try {
      // Generate PDF document with pages
      const pdfDocument = await this.pdfDocumentGenerationService.generatePdfDocument({
        projectId: dto.projectId,
        documentType: dto.input.documentType,
        input: dto.input,
      });

      return {
        message: 'PDF document generated successfully',
        pdfDocumentId: pdfDocument.id,
        projectId: dto.projectId,
        format: 'pdf',
        pageCount: pdfDocument.pages?.length || 0,
      };
    } catch (error) {
      // Update project status to failed
      await this.prisma.project.update({
        where: { id: dto.projectId },
        data: { status: 'failed' },
      });

      throw error;
    }
  }

  /**
   * Generate slide presentation (queued job)
   */
  private async generateSlidePresentation(dto: GenerateDto) {
    // Create a deck first
    const deck = await this.decksService.create(dto.projectId, {
      title: dto.input.companyName
        ? `${dto.input.companyName} ${this.formatDocumentType(dto.input.documentType)}`
        : this.formatDocumentType(dto.input.documentType),
      description: 'AI-generated presentation',
      templateId: dto.templateId,
    });

    // Update project status
    await this.prisma.project.update({
      where: { id: dto.projectId },
      data: { status: 'generating' },
    });

    // Queue the generation job
    const job = await this.generationQueue.add('generate-deck', {
      projectId: dto.projectId,
      deckId: deck.id,
      input: dto.input,
    });

    return {
      message: 'Deck generation started',
      jobId: job.id,
      deckId: deck.id,
      projectId: dto.projectId,
      format: 'slides',
    };
  }

  /**
   * Determine if document type should generate PDF or slides
   */
  private getDocumentFormat(documentType: string): 'slides' | 'pdf' {
    const pdfTypes = [
      'business_plan',
      'proposal',
      'company_profile',
      'executive_summary',
      'marketing_plan',
      'financial_projection',
      'case_study',
      'internal_report',
      'partnership_proposal',
      'one_pager',
    ];

    return pdfTypes.includes(documentType) ? 'pdf' : 'slides';
  }

  /**
   * Format document type for display
   */
  private formatDocumentType(type: string): string {
    const typeMap: Record<string, string> = {
      pitch_deck: 'Pitch Deck',
      sales_deck: 'Sales Deck',
      board_meeting_deck: 'Board Meeting Deck',
      training_presentation: 'Training Presentation',
      product_launch: 'Product Launch Presentation',
      strategy_presentation: 'Strategy Presentation',
      business_plan: 'Business Plan',
      proposal: 'Proposal',
      company_profile: 'Company Profile',
      executive_summary: 'Executive Summary',
      marketing_plan: 'Marketing Plan',
      financial_projection: 'Financial Projections',
      case_study: 'Case Study',
      internal_report: 'Internal Report',
      partnership_proposal: 'Partnership Proposal',
      one_pager: 'One Pager',
    };

    return typeMap[type] || 'Presentation';
  }

  @Get('status/:jobId')
  @ApiOperation({ summary: 'Get generation job status' })
  async getStatus(@Param('jobId') jobId: string) {
    const job = await this.generationQueue.getJob(jobId);

    if (!job) {
      return { status: 'not_found' };
    }

    const state = await job.getState();
    const progress = job.progress();

    return {
      jobId: job.id,
      status: state,
      progress,
      data: job.data,
    };
  }

  @Get('quality/:deckId')
  @ApiOperation({ summary: 'Get quality report for a deck' })
  @ApiResponse({ status: 200, description: 'Quality report retrieved', type: QualityReportDto })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  async getQualityReport(@Param('deckId') deckId: string): Promise<QualityReportDto> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        id: true,
        qualityScore: true,
        validationResult: true,
        lastQualityCheck: true,
        exportReady: true,
      },
    });

    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    if (!deck.qualityScore || !deck.validationResult) {
      throw new NotFoundException(`Quality report not available for deck ${deckId}`);
    }

    const qualityScore = deck.qualityScore as any;
    const validationResult = deck.validationResult as any;

    return {
      deckId: deck.id,
      overall: qualityScore.overall,
      grade: qualityScore.grade,
      dimensions: {
        content: qualityScore.dimensions.content,
        visual: qualityScore.dimensions.visual,
        aiEnhancement: qualityScore.dimensions.aiEnhancement,
        exportReadiness: qualityScore.dimensions.exportReadiness,
      },
      validation: {
        isValid: validationResult.isValid,
        errorCount: validationResult.summary.errorCount,
        warningCount: validationResult.summary.warningCount,
        infoCount: validationResult.summary.infoCount,
        totalIssues: validationResult.summary.totalIssues,
      },
      recommendations: qualityScore.suggestions || [],
      exportReady: deck.exportReady,
      lastQualityCheck: deck.lastQualityCheck,
    };
  }

  @Post('apply-brand-assets/:projectId')
  @ApiOperation({ summary: 'Apply uploaded logo + photo URLs to an existing deck (re-runs the brand-asset materializer)' })
  async applyBrandAssetsEndpoint(
    @Param('projectId') projectId: string,
    @Body() body: { logoUrl?: string | null; imageUrls?: string[] },
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { decks: { include: { slides: { select: { id: true } } } } },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    // Find the populated deck (most recent with slides).
    const deck = [...project.decks].reverse().find((d) => d.slides.length > 0);
    if (!deck) throw new NotFoundException('No deck with slides to apply brand assets to. Generate first.');

    // Persist the new URLs onto businessInfo so re-applies / regenerates remember them.
    const oldBI = (project.businessInfo as any) || {};
    const businessInfo = {
      ...oldBI,
      logo:   body.logoUrl ? { url: body.logoUrl } : (oldBI.logo || {}),
      images: (body.imageUrls || []).map((url) => ({ url })),
    };
    await this.prisma.project.update({ where: { id: projectId }, data: { businessInfo } });

    // Remove any prior image / logo elements before re-applying — keeps the
    // count deterministic and avoids duplicates.
    await this.prisma.slideElement.deleteMany({
      where: {
        slide: { deckId: deck.id },
        type:  { in: ['image', 'logo'] },
      },
    });

    const result = await this.applyBrandAssets(deck.id, businessInfo);
    return {
      success: true,
      deckId: deck.id,
      logos: result.logos,
      photos: result.photos,
      message: `Applied ${result.photos} photo${result.photos === 1 ? '' : 's'} + ${result.logos} brand mark${result.logos === 1 ? '' : 's'}`,
    };
  }

  @Post('regenerate/:projectId')
  @ApiOperation({ summary: 'Synchronously regenerate slides for a project (bypasses Bull queue)' })
  async regenerate(@Param('projectId') projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { decks: { include: { slides: { select: { id: true } } } } },
    });
    if (!project) throw new NotFoundException(`Project ${projectId} not found`);

    const businessInfo = (project.businessInfo as any) || {};
    const input: any = {
      documentType: businessInfo.documentType || 'pitch_deck',
      companyName:  businessInfo.companyName  || project.name || 'My Company',
      industry:     businessInfo.industry     || 'Technology',
      stage:        businessInfo.businessStage || businessInfo.stage || 'seed',
      ...businessInfo,
    };

    await this.prisma.project.update({ where: { id: projectId }, data: { status: 'generating' } });

    // Pick or create the target deck. Reuse any empty deck so we don't
    // accumulate dead rows when the user retries multiple times.
    let deck = project.decks.find((d) => d.slides.length === 0);
    if (deck) {
      await this.prisma.deck.update({ where: { id: deck.id }, data: { status: 'generating' } });
    } else {
      deck = await this.decksService.create(projectId, {
        title: `${input.companyName} ${this.formatDocumentType(input.documentType)}`,
        description: 'AI-generated presentation',
      }) as any;
    }
    if (!deck) {
      throw new Error('Failed to acquire a target deck');
    }

    try {
      // Run the deterministic SlideFactory directly (no queue, no AI dependency).
      const generated = this.slideFactory.generateDeck(input);
      if (!generated || generated.length === 0) {
        throw new Error('SlideFactory produced 0 slides');
      }

      // Persist slides (createMany expects 0-indexed `order`).
      const baseSlides = generated.map((s: any, i: number) => ({
        type:         s.type,
        order:        i,
        title:        s.title || '',
        subtitle:     s.subtitle,
        content:      s.content || {},
        speakerNotes: s.speakerNotes,
      }));
      await this.slidesService.createMany(deck.id, baseSlides as any);

      // Materialise SlideElement rows so the new editor sees rich content immediately.
      const persisted = await this.prisma.slide.findMany({ where: { deckId: deck.id }, orderBy: { order: 'asc' }, select: { id: true } });
      let elementsCreated = 0;
      for (const s of persisted) {
        try {
          const n = await this.migrationService.migrateOne(s.id, { force: false });
          if (n !== null) elementsCreated += n;
        } catch (e: any) {
          // Don't fail the whole job if one slide's migration glitches.
        }
      }

      // Apply uploaded brand assets (logo + images) if any
      let assets = { logos: 0, photos: 0 };
      try {
        assets = await this.applyBrandAssets(deck.id, businessInfo);
      } catch (e: any) {
        // Don't fail the whole regen if image application glitches
      }

      await this.prisma.deck.update({ where: { id: deck.id }, data: { status: 'ready' } });
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'completed' } });

      const firstSlide = persisted[0];
      return {
        success: true,
        message: `Generated ${persisted.length} slides with ${elementsCreated} elements${assets.photos || assets.logos ? ` + ${assets.photos} photos + ${assets.logos} brand marks` : ''}`,
        deckId: deck.id,
        firstSlideId: firstSlide?.id || null,
        slidesGenerated: persisted.length,
        elementsCreated,
        photosApplied: assets.photos,
        logosApplied: assets.logos,
        projectId,
      };
    } catch (err: any) {
      await this.prisma.deck.update({ where: { id: deck.id }, data: { status: 'draft' } });
      await this.prisma.project.update({ where: { id: projectId }, data: { status: 'failed' } });
      // Re-throw so the frontend sees the real reason
      throw new Error(`Regeneration failed: ${err.message}`);
    }
  }

  @Post('validate/:deckId')
  @ApiOperation({ summary: 'Validate a deck and update validation results' })
  @ApiResponse({ status: 200, description: 'Validation completed', type: ValidationResultDto })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  async validateDeck(@Param('deckId') deckId: string): Promise<ValidationResultDto> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { slides: true },
    });

    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    // Convert slides to VisualSlideContent format
    const slides: VisualSlideContent[] = deck.slides.map((slide: any, index: number) => {
      // Get proper layout configuration
      const layoutType = (slide.layoutKey as LayoutType) || LayoutType.TITLE_CONTENT;
      const layout = this.layoutService.getLayout(layoutType) || 
        this.layoutService.getLayout(LayoutType.TITLE_CONTENT)!;
      
      // Get proper theme configuration
      const themeName = slide.themeKey || 'modern';
      const theme = this.themeService.getTheme(themeName) || 
        this.themeService.getTheme('modern')!;

      return {
        type: slide.type,
        order: index,
        title: slide.title,
        subtitle: slide.subtitle || undefined,
        content: slide.content,
        speakerNotes: slide.speakerNotes || undefined,
        layout,
        theme,
        qualityScore: slide.qualityScore || undefined,
      };
    });

    // Mock input for now - in real implementation, get from project
    const input = { documentType: 'pitch_deck' } as any;

    const validation = this.qualityControlService.quickValidation(slides, input);

    // Update database with validation results
    await this.prisma.deck.update({
      where: { id: deckId },
      data: {
        validationResult: validation as any,
        lastQualityCheck: new Date(),
      },
    });

    return {
      deckId: deck.id,
      isValid: validation.isValid,
      issues: validation.errors
        .concat(validation.warnings)
        .concat(validation.info)
        .map((issue) => ({
          rule: issue.rule,
          severity: issue.severity.toUpperCase() as 'ERROR' | 'WARNING' | 'INFO',
          message: issue.message,
          slideIndex: issue.slideIndex,
          suggestion: issue.suggestion,
        })),
      summary: {
        isValid: validation.isValid,
        errorCount: validation.summary.errorCount,
        warningCount: validation.summary.warningCount,
        infoCount: validation.summary.infoCount,
        totalIssues: validation.summary.totalIssues,
      },
      validatedAt: new Date(),
    };
  }

  @Get('generation-status/:deckId')
  @ApiOperation({ summary: 'Get real-time generation status' })
  @ApiResponse({ status: 200, description: 'Generation status retrieved', type: GenerationStatusDto })
  async getGenerationStatus(@Param('deckId') deckId: string): Promise<GenerationStatusDto | any> {
    const status = this.qualityControlService.getStatus(deckId);

    if (!status) {
      // Check database for completed generation
      const deck = await this.prisma.deck.findUnique({
        where: { id: deckId },
        select: {
          id: true,
          status: true,
          qualityScore: true,
          generationMetrics: true,
          createdAt: true,
          updatedAt: true,
        },
      });

      if (!deck) {
        throw new NotFoundException(`Deck ${deckId} not found`);
      }

      return {
        deckId: deck.id,
        status: deck.status,
        completed: deck.status === 'ready',
        progress: {
          stage: 'COMPLETE',
          percentage: 100,
          message: 'Generation completed',
          currentSlide: 0,
          totalSlides: 0,
        },
        startTime: deck.createdAt,
        endTime: deck.updatedAt,
        metrics: deck.generationMetrics || undefined,
      };
    }

    return {
      deckId: status.deckId,
      status: 'generating',
      completed: false,
      progress: {
        stage: status.status,
        percentage: status.progress.percentage,
        message: status.progress.message,
        currentSlide: status.progress.currentSlide,
        totalSlides: status.progress.totalSlides,
        estimatedTimeRemaining: status.progress.estimatedTimeRemaining,
      },
      errors: status.errors.map((err) => ({
        stage: err.stage,
        error: err.error,
        timestamp: err.timestamp,
        slideIndex: err.slideIndex,
        retryable: err.retryable,
      })),
      startTime: status.metrics.startTime,
      endTime: status.metrics.endTime,
    };
  }

  @Get('export-ready/:deckId')
  @ApiOperation({ summary: 'Check if deck is ready for export' })
  @ApiResponse({ status: 200, description: 'Export readiness checked', type: ExportReadinessDto })
  @ApiResponse({ status: 404, description: 'Deck not found' })
  async checkExportReady(@Param('deckId') deckId: string): Promise<ExportReadinessDto> {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      select: {
        id: true,
        exportReady: true,
        qualityScore: true,
        validationResult: true,
        slides: true,
      },
    });

    if (!deck) {
      throw new NotFoundException(`Deck ${deckId} not found`);
    }

    // If already checked, return cached result
    if (deck.qualityScore && deck.validationResult) {
      const qualityScore = deck.qualityScore as any;
      const validationResult = deck.validationResult as any;
      const blockers: string[] = [];

      if (!deck.exportReady) {
        if (!validationResult.isValid) {
          blockers.push(`Deck has ${validationResult.summary.errorCount} validation errors`);
        }
        if (qualityScore.overall < 60) {
          blockers.push(`Quality score too low (${qualityScore.overall}/100)`);
        }
        if (deck.slides.length === 0) {
          blockers.push('Deck has no slides');
        }
      }

      return {
        deckId: deck.id,
        ready: deck.exportReady,
        blockers: blockers.length > 0 ? blockers : undefined,
        qualityScore: qualityScore.overall,
        validationPassed: validationResult.isValid,
      };
    }

    // Need to run quality check first
    return {
      deckId: deck.id,
      ready: false,
      blockers: ['Quality check not yet performed'],
    };
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Get aggregate generation metrics (admin only)' })
  @ApiResponse({ status: 200, description: 'Metrics retrieved', type: AggregateMetricsDto })
  async getAggregateMetrics(): Promise<AggregateMetricsDto> {
    const stats = this.qualityControlService.getAggregateStats();

    // Get additional metrics from database
    const totalDecks = await this.prisma.deck.count();
    const exportReadyDecks = await this.prisma.deck.count({
      where: { exportReady: true },
    });

    // Calculate average quality score
    const decksWithQuality = await this.prisma.deck.findMany({
      where: { qualityScore: { not: null } },
      select: { qualityScore: true },
    });

    let averageQualityScore = 0;
    if (decksWithQuality.length > 0) {
      const sum = decksWithQuality.reduce((acc, deck) => {
        const score = deck.qualityScore as any;
        return acc + (score?.overall || 0);
      }, 0);
      averageQualityScore = sum / decksWithQuality.length;
    }

    const exportReadinessRate = totalDecks > 0 ? (exportReadyDecks / totalDecks) * 100 : 0;

    return {
      activeGenerations: stats.activeGenerations,
      averageDuration: stats.averageDuration,
      successRate: stats.successRate,
      totalCompleted: decksWithQuality.length,
      totalFailed: 0, // Would need to track this separately
      commonErrors: stats.commonErrors.map((err) => ({
        error: err.error,
        count: err.count,
      })),
      averageQualityScore,
      exportReadinessRate,
    };
  }

  // ===== PHASE 10: Quality History =====

  @Get('history/:deckId')
  @ApiOperation({ summary: 'Get quality history for a deck' })
  async getQualityHistory(@Param('deckId') deckId: string) {
    const { QualityHistoryService } = await import('../export/services');
    const historyService = new QualityHistoryService(this.prisma);
    
    const history = await historyService.getHistory(deckId, 50);
    const statistics = await historyService.getStatistics(deckId);

    return {
      history,
      statistics,
    };
  }

  @Get('trends/:deckId')
  @ApiOperation({ summary: 'Get quality trends over time' })
  async getQualityTrends(@Param('deckId') deckId: string) {
    const { QualityHistoryService } = await import('../export/services');
    const historyService = new QualityHistoryService(this.prisma);
    
    const trends = await historyService.getTrends(deckId, 30);
    const dimensionTrends = await historyService.getDimensionTrends(deckId, 30);

    return {
      overall: trends,
      dimensions: dimensionTrends,
    };
  }

  @Get('compare/:deckId')
  @ApiOperation({ summary: 'Compare quality between versions' })
  async compareQualityVersions(
    @Param('deckId') deckId: string,
  ) {
    const { QualityHistoryService } = await import('../export/services');
    const historyService = new QualityHistoryService(this.prisma);
    
    // Get latest two versions
    const history = await historyService.getHistory(deckId, 2);
    
    if (history.length < 2) {
      return {
        message: 'Not enough history to compare',
        availableVersions: history.length,
      };
    }

    const comparison = await historyService.compareVersions(
      deckId,
      history[1].version,
      history[0].version
    );

    return comparison;
  }

  @Post('quality-check/:deckId')
  @ApiOperation({ summary: 'Run quality check and record in history' })
  async runQualityCheck(@Param('deckId') deckId: string) {
    // Get deck first
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { slides: true, project: true },
    });
    
    if (!deck) {
      throw new NotFoundException('Deck not found');
    }
    
    // Convert slides to VisualSlideContent format
    const visualSlides = deck.slides.map((slide: any, index: number) => ({
      type: slide.type,
      order: index,
      title: slide.title,
      subtitle: slide.subtitle || '',
      content: slide.content,
      layout: slide.layoutKey || 'title-content',
      theme: slide.themeKey || 'modern',
    }));
    
    // Run quality check
    const qualityScore = await this.qualityControlService.quickQualityCheck(
      visualSlides,
      deck.project.businessInfo as any,
    );
    
    // Run validation
    const validation = await this.qualityControlService.quickValidation(
      visualSlides,
      deck.project.businessInfo as any,
    );
    
    // Record in history
    const { QualityHistoryService } = await import('../export/services');
    const historyService = new QualityHistoryService(this.prisma);
    
    await historyService.recordQualityCheck({
      deckId,
      qualityMetrics: {
        overallScore: qualityScore.overall,
        grade: qualityScore.grade,
        dimensions: {
          content: qualityScore.dimensions.content,
          visual: qualityScore.dimensions.visual,
          ai: qualityScore.dimensions.aiEnhancement || 0,
          export: qualityScore.dimensions.exportReadiness,
        },
      },
      validationMetrics: {
        passed: validation.isValid,
        errorCount: validation.summary.errorCount,
        warningCount: validation.summary.warningCount,
        infoCount: validation.summary.infoCount,
      },
      trigger: 'manual',
    });

    return {
      qualityScore,
      validation,
    };
  }
}
