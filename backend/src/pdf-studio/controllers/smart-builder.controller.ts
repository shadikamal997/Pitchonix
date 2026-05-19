import {
  Controller,
  Post,
  Get,
  Delete,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Public } from '../../auth/public.decorator';
import { GetUser } from '../../auth/get-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentAnalysisService } from '../services/content-analysis.service';
import { ContentEnhancementService, EnhancementOptions } from '../services/content-enhancement.service';
import { ContentStructureService } from '../services/content-structure.service';
import { QualityCheckService } from '../services/quality-check.service';
import { ContentNormalizerService } from '../services/content-normalizer.service';
import { ContentBlockExtractorService } from '../services/content-block-extractor.service';
import { OutlineBuilderService } from '../services/outline-builder.service';
import { RuleBasedPagePlannerService, PlannedPage } from '../services/rule-based-page-planner.service';
import { DocumentCompositionService, PageComposition } from '../services/document-composition.service';
import { PageDensityBalancerService } from '../services/page-density-balancer.service';
import { SemanticContinuationService } from '../services/semantic-continuation.service';
import { DynamicCoverComposerService } from '../services/dynamic-cover-composer.service';
import { AdaptiveLayoutEngineService } from '../services/adaptive-layout-engine.service';
import { PublishingIntelligenceService } from '../services/publishing-intelligence.service';
import { AnalyzeContentDto, EnhanceContentDto, GenerateDocumentDto } from '../dto/smart-builder.dto';

@Controller('pdf-studio/smart-builder')
@UseGuards(JwtAuthGuard)
export class SmartBuilderController {
  private readonly logger = new Logger(SmartBuilderController.name);

  constructor(
    private prisma: PrismaService,
    private contentAnalysisService: ContentAnalysisService,
    private contentEnhancementService: ContentEnhancementService,
    private contentStructureService: ContentStructureService,
    private qualityCheckService: QualityCheckService,
    private contentNormalizerService: ContentNormalizerService,
    private contentBlockExtractorService: ContentBlockExtractorService,
    private outlineBuilderService: OutlineBuilderService,
    private ruleBasedPagePlannerService: RuleBasedPagePlannerService,
    // NEW: Production-quality composition services
    private documentCompositionService: DocumentCompositionService,
    private pageDensityBalancerService: PageDensityBalancerService,
    private semanticContinuationService: SemanticContinuationService,
    private dynamicCoverComposerService: DynamicCoverComposerService,
    private adaptiveLayoutEngineService: AdaptiveLayoutEngineService,
    private publishingIntelligenceService: PublishingIntelligenceService,
  ) {}

  /**
   * Analyze raw content
   * POST /api/pdf-studio/smart-builder/analyze
   */
  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ short: { limit: 5, ttl: 60000 } })
  @Post('analyze')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async analyzeContent(
    @Body() dto: AnalyzeContentDto,
  ) {
    const { rawContent } = dto;
    try {
      this.logger.log(`Analyzing content (${rawContent.length} chars)`);

      const plainContent = this.htmlToPlainText(rawContent);
      const analysisResult = await this.contentAnalysisService.analyzeContent(
        plainContent,
      );

      return {
        success: true,
        data: {
          documentType: analysisResult.detectedType,
          confidence: analysisResult.confidence,
          suggestedTitle: analysisResult.suggestedTitle,
          metrics: {
            words: analysisResult.wordCount,
            characters: analysisResult.characterCount,
            paragraphs: analysisResult.paragraphCount,
            sections: analysisResult.sectionCount,
            readability: analysisResult.readabilityScore,
            clarity: analysisResult.clarityScore,
          },
          features: {
            hasTitle: analysisResult.hasTitle,
            hasHeadings: analysisResult.hasHeadings,
            hasBullets: analysisResult.hasBullets,
            hasNumbers: analysisResult.hasNumbers,
          },
          issues: analysisResult.issues,
          grammarIssues: analysisResult.grammarIssues,
          spellingIssues: analysisResult.spellingIssues,
          suggestedStructure: analysisResult.suggestedSections,
          recommendedEnhancements: analysisResult.recommendedEnhancements,
          keywords: analysisResult.keywords,
          topics: analysisResult.topics,
          categories: analysisResult.categories,
        },
      };
    } catch (error) {
      this.logger.error('Content analysis failed', error);
      throw new HttpException(
        'Content analysis failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Enhance content with fixes and improvements
   * POST /api/pdf-studio/smart-builder/enhance-content
   */
  @Public()
  @Post('enhance-content')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async enhanceContentOnly(
    @Body() dto: EnhanceContentDto,
  ) {
    const { rawContent, fixAll, options } = dto;
    try {
      this.logger.log(`Enhancing content (${rawContent.length} chars)`);

      // Analysis still needs plain text — but enhancement gets the ORIGINAL HTML
      // so it can preserve paragraphs, headings, lists, tables, etc.
      const plainContent = this.htmlToPlainText(rawContent);
      const analysisResult = await this.contentAnalysisService.analyzeContent(
        plainContent,
      );

      // Map UI tone string to a valid enhancement tone. Anything unknown
      // falls back to 'business' (no destructive transformations).
      const validTones = ['neutral', 'business', 'executive', 'formal', 'academic', 'persuasive', 'technical', 'friendly'];
      const requestedTone = (options?.tone || '').toLowerCase();
      const tone = validTones.includes(requestedTone)
        ? requestedTone
        : (requestedTone === 'professional' ? 'business' : 'business');

      // Build enhancement options. Destructive flags (restructure / expand /
      // shorten / professionalize / makeEngaging) are NEVER enabled here.
      let enhancementOptions: EnhancementOptions;
      if (fixAll) {
        enhancementOptions = {
          fixGrammar: true,
          improveClarity: true,
          tone: tone as any,
        };
      } else {
        enhancementOptions = {
          fixGrammar: options?.fixGrammar || false,
          improveClarity: options?.improveWriting || false,
          tone: tone as any,
        };
      }

      // Enhance — pass HTML so structure is preserved.
      const enhancementResult =
        await this.contentEnhancementService.enhanceContent(
          rawContent,
          enhancementOptions,
        );

      // Structure the enhanced content
      const structuredDoc =
        await this.contentStructureService.structureContent(
          enhancementResult.enhancedContent,
          analysisResult,
          {
            generateIntro: false,
            generateSummary: false,
            generateConclusion: options?.addConclusion || false,
          },
        );

      return {
        success: true,
        data: {
          enhancedTitle: analysisResult.suggestedTitle,
          enhancedContent: enhancementResult.enhancedContent,
          sections: structuredDoc.sections.map(s => ({
            title: s.title,
            content: s.content,
            type: s.type,
          })),
          fixedIssues: enhancementResult.changes.map(c => c.type),
          remainingIssues: await (async () => {
            try {
              const reAnalysis = await this.contentAnalysisService.analyzeContent(
                enhancementResult.enhancedContent,
              );
              // Only surface issues that weren't addressed by the enhancement
              const fixedTypes = new Set<string>(enhancementResult.changes.map(c => c.type as string));
              return reAnalysis.issues.filter((i: any) => !fixedTypes.has(i.type));
            } catch (_) {
              return [];
            }
          })(),
          improvement: enhancementResult.improvement,
        },
      };
    } catch (error) {
      this.logger.error('Content enhancement failed', error);
      throw new HttpException(
        'Content enhancement failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Generate PDF document from raw content
   * POST /api/pdf-studio/smart-builder/generate
   *
   * NEW PIPELINE (deterministic, rule-based, no AI):
   *   normalize → extract blocks → analyze → build outline → plan pages → save
   * No content is silently removed at any stage.
   */
  @Public()
  @Post('generate')
  async generateDocument(
    @GetUser() user: any,
    @Body('rawContent') rawContent: string,
    @Body('documentType') documentType: string,
    @Body('config') config: {
      documentGoal?: string;
      targetAudience?: string;
      tone?: string;
      designStyle?: string;
      brandKitId?: string;
      title?: string;
      templateType?: string;
      improveWriting?: boolean;
      fixGrammar?: boolean;
      addStructure?: boolean;
      generateIntro?: boolean;
      generateSummary?: boolean;
      generateConclusion?: boolean;
      expandContent?: boolean;
      shortenContent?: boolean;
      includeTableOfContents?: boolean;
      includeCoverPage?: boolean;
      visualStyle?: string;
      layoutType?: string;
      hasImages?: boolean;
      hasCharts?: boolean;
    },
  ) {
    try {
      if (!rawContent || rawContent.trim().length === 0) {
        throw new HttpException('Raw content is required', HttpStatus.BAD_REQUEST);
      }

      const userId = user?.id || 'cf840a48-cfde-41ae-b884-5fec523e6fc9'; // Use real user for testing
      
      this.logger.log(`Generating document for user ${userId} (${rawContent.length} chars)`);

      // ── Step 1: Normalize (HTML → clean markdown-preserving text) ──────────
      this.logger.log('Step 1/5: Normalizing content...');
      const normalizedContent = this.contentNormalizerService.normalize(rawContent);

      // ── Step 2: Extract semantic blocks ───────────────────────────────────
      this.logger.log('Step 2/5: Extracting content blocks...');
      const blocks = this.contentBlockExtractorService.extract(normalizedContent);
      this.logger.log(`Extracted ${blocks.length} blocks`);

      // ── Step 3: Analyze (metadata, type detection, quality) ───────────────
      this.logger.log('Step 3/5: Analyzing content...');
      const analysisResult = await this.contentAnalysisService.analyzeContent(normalizedContent);

      // ── Optional: safe grammar-only enhancement (no content deletion) ─────
      let finalContent = normalizedContent;
      let finalBlocks  = blocks;
      if (config.improveWriting || config.fixGrammar) {
        // Safe enhancement only — destructive flags are not even sent.
        const validTones = ['neutral', 'business', 'executive', 'formal', 'academic', 'persuasive', 'technical', 'friendly'];
        const requestedTone = (config.tone || '').toLowerCase();
        const safeTone = validTones.includes(requestedTone) ? requestedTone : 'business';
        const enhancementOptions: EnhancementOptions = {
          fixGrammar: config.fixGrammar,
          improveClarity: config.improveWriting,
          tone: safeTone as any,
        };
        const enhResult = await this.contentEnhancementService.enhanceContent(normalizedContent, enhancementOptions);
        finalContent = enhResult.enhancedContent;
        finalBlocks  = this.contentBlockExtractorService.extract(finalContent);
        this.logger.log(`Enhancement: ${enhResult.changes.length} change types, quality ${enhResult.qualityBefore} → ${enhResult.qualityAfter}${enhResult.rolledBack ? ' (rolled back)' : ''}`);
      }

      // ── Step 4: Build outline ──────────────────────────────────────────────
      this.logger.log('Step 4/5: Building document outline...');
      const outline = this.outlineBuilderService.buildOutline(finalBlocks, analysisResult);
      this.logger.log(`Outline: ${outline.sections.length} sections, ~${outline.estimatedTotalPages} pages`);

      // ── Step 5: Plan pages (semantic, rule-based) ─────────────────────────
      this.logger.log('Step 5/5: Planning pages...');
      
      // Use semantic sections if available, otherwise fall back to outline sections
      const semanticSections = analysisResult.semanticAnalysis?.semanticSections || outline.sections.map(s => ({
        title: s.title,
        sectionType: s.sectionType,
      }));
      
      const plannedPages = this.ruleBasedPagePlannerService.planPages(outline, {
        includeCoverPage:       config.includeCoverPage !== false,
        includeTableOfContents: config.includeTableOfContents === true,
        title:                  config.title || outline.title,
        semanticSections,       // NEW: Pass semantic sections for TOC generation
      });
      this.logger.log(`Page plan: ${plannedPages.length} pages`);

      // Debug: Check content distribution
      const nonEmptyPages = plannedPages.filter(p => p.contentText && p.contentText.length > 50).length;
      this.logger.log(`DEBUG: Pages with content (>50 chars): ${nonEmptyPages}/${plannedPages.length}`);
      plannedPages.slice(0, 5).forEach((p, i) => {
        this.logger.log(`DEBUG: Page ${i + 1}: ${p.contentText?.length || 0} chars, type=${p.sectionType}`);
      });

      // ══ NEW: PRODUCTION-QUALITY COMPOSITION PIPELINE ═════════════════════════
      this.logger.log('🎨 Applying production-quality composition...');

      // Step 6A: Compose each page with adaptive layout intelligence
      const composedPages = plannedPages.map((planned, index) => {
        let composition;

        // Special handling for cover page
        if (planned.sectionType === 'cover' && config.includeCoverPage !== false) {
          composition = this.dynamicCoverComposerService.composeCover(
            {
              title: config.title || outline.title || 'Document',
              subtitle: config.documentGoal,
              description: this.buildCoverSummary(outline, 90),
              author: user?.name,
              company: config.brandKitId ? 'Brand' : undefined,
              date: new Date().toISOString(),
              accentColor: config.designStyle === 'modern' ? '#2563eb' : undefined,
            },
            this.dynamicCoverComposerService.autoDetectCoverStyle({
              title: config.title || outline.title || 'Document',
              subtitle: config.documentGoal,
            }),
          );
        } else {
          // Regular content page composition
          composition = this.documentCompositionService.composePage(
            planned.contentText,
            planned.sectionType === 'toc' ? 'toc' : 
            planned.sectionType === 'summary' ? 'summary' :
            planned.sectionType === 'conclusion' ? 'conclusion' : 'content',
            {
              targetDensity: 'balanced',
              maxLineLength: 65,
              emphasizeReadability: true,
            },
          );
        }

        // Set page number
        composition.pageNumber = index + 1;

        // NEW: Apply adaptive layout engine for intelligent density management
        const adaptiveComposition = this.adaptiveLayoutEngineService.composeAdaptivePage(
          planned,
          {
            pageWidth: 210,
            pageHeight: 297,
            margins: { top: 20, right: 20, bottom: 20, left: 20 },
            colorScheme: config.templateType || 'blue',
            templateType: config.templateType || 'report',
          },
        );

        // Auto-correct composition issues (under-utilization, overcrowding, etc.)
        const correctedComposition = this.adaptiveLayoutEngineService.autoCorrectComposition(
          adaptiveComposition,
        );

        // Log quality metrics
        if (correctedComposition.qualityScore < 80) {
          this.logger.warn(
            `Page ${correctedComposition.pageNumber} quality: ${correctedComposition.qualityScore}/100 - Issues: ${correctedComposition.issues.join(', ')}`,
          );
        }

        // Store adaptive layout data in composition metadata
        composition.adaptiveLayout = correctedComposition;

        return {
          plannedPage: planned,
          composition,
        };
      });

      this.logger.log(`✓ Composed ${composedPages.length} pages with adaptive layout intelligence`);

      // Step 6B: Unified publishing intelligence pass.
      // This is the foundation layer: grid planning, magazine composition,
      // smart auto-flow, pagination intelligence, density scoring, and
      // preflight-ready issue reporting all run as one pipeline.
      const publishingResult = this.publishingIntelligenceService.optimize(composedPages, {
        documentType,
        visualStyle: config.visualStyle,
        templateType: config.templateType,
      });

      const balancedCompositions: PageComposition[] = publishingResult.pages;
      const pageMetadata: Array<PlannedPage | null> = publishingResult.metadata;

      this.logger.log(
        `✓ Publishing intelligence: ${publishingResult.report.pagesBefore} → ${publishingResult.report.pagesAfter} pages, ` +
        `occupancy=${publishingResult.report.averageOccupancy}%, readiness=${publishingResult.report.exportReadinessScore}/100`,
      );

      // Step 6C: Add semantic continuations
      const sections = this.semanticContinuationService.identifySemanticSections(balancedCompositions);
      const toc = this.semanticContinuationService.buildTableOfContents(sections);

      const finalCompositions = balancedCompositions.map((composition, index) => {
        const pageNumber = index + 1;

        // Unique section IDs per page — prevents React duplicate-key rendering bugs
        const uniqueSections = composition.sections.map((s, sIdx) => ({
          ...s,
          id: `page-${pageNumber}-section-${sIdx}`,
        }));

        const compositionWithUniqueSections = { ...composition, sections: uniqueSections };

        const continuationMeta = this.semanticContinuationService.generateContinuationMetadata(
          pageNumber,
          sections,
          compositionWithUniqueSections,
        );

        return continuationMeta
          ? this.semanticContinuationService.addVisualContinuity(compositionWithUniqueSections, continuationMeta)
          : compositionWithUniqueSections;
      });

      this.logger.log(`✓ Added semantic continuations: ${sections.length} sections`);

      // Step 6D: Calculate overall quality metrics
      const avgQuality = finalCompositions.reduce(
        (sum, c) => sum + c.metrics.overallQuality,
        0,
      ) / finalCompositions.length;

      this.logger.log(`📊 Composition quality: ${avgQuality.toFixed(1)}/100`);

      // ══ END COMPOSITION PIPELINE ═════════════════════════════════════════════

      // ── Create or reuse project ────────────────────────────────────────────
      let project;
      if (userId === 'cf840a48-cfde-41ae-b884-5fec523e6fc9') {
        // For testing: reuse existing project
        project = await this.prisma.project.findFirst({
          where: { userId },
        });
        if (!project) {
          throw new Error('Test user project not found');
        }
      } else {
        project = await this.prisma.project.create({
          data: {
            userId,
            name:           config.title || outline.title || 'Smart PDF Document',
            documentType:   'smart_pdf',
            documentFormat: 'pdf',
            status:         'draft',
            audience:       config.targetAudience,
            tone:           config.tone,
          },
        });
      }

      // ── Create PDF document ────────────────────────────────────────────────
      const docTitle = config.title || outline.title || analysisResult.suggestedTitle;
      const pdfDocument = await this.prisma.pdfDocument.create({
        data: {
          projectId:    project.id,
          title:        docTitle,
          documentType: documentType || this.mapDetectedTypeToDocumentType(analysisResult.detectedType),
          brandKitId:   config.brandKitId,
          // TODO: Uncomment after schema migration is applied
          // proTemplateId: config.proTemplateId || null,
          // templateType:  config.templateType || 'clean_business_report',
          // layoutType:    config.layoutType || null,
          status:       'draft',
          outline: {
            detectedType:         analysisResult.detectedType,
            confidence:           analysisResult.confidence,
            keywords:             analysisResult.keywords,
            topics:               analysisResult.topics,
            sections:             outline.sections.map(s => ({ title: s.title, type: s.sectionType })),
            hasExplicitStructure: outline.hasExplicitStructure,
          },
          metadata: {
            documentGoal:     config.documentGoal,
            targetAudience:   config.targetAudience,
            tone:             config.tone,
            designStyle:      config.designStyle,
            generatedSections: finalCompositions.length,
            estimatedPages:   outline.estimatedTotalPages,
            templateType:     config.templateType || 'clean_business_report',
            proTemplateId:    (config as any).proTemplateId, // Store in metadata for now (TODO: add to schema)
            visualStyle:      config.visualStyle,
            layoutType:       config.layoutType,
            hasImages:        config.hasImages || false,
            hasCharts:        config.hasCharts || false,
            totalWordCount:   outline.totalWordCount,
            // NEW: Composition quality metrics
            compositionQuality: avgQuality,
            sections: sections.map(s => ({
              id: s.id,
              title: s.title,
              pageRange: `${s.pageRange.start}-${s.pageRange.end}`,
            })) as any,
            tableOfContents: toc as any,
            publishingIntelligence: publishingResult.report,
            publishingIssues: publishingResult.issues,
          } as any,
        },
      });

      // ── Persist pages with composition data ───────────────────────────────
      const pages = await Promise.all(
        finalCompositions.map((composition, index) => {
          const meta = pageMetadata[index];

          // Use the PlannedPage's contentText as the primary source — it is the
          // complete, planner-verified text for this page.
          // Fall back to composition sections only when meta is unavailable.
          const pageType = composition.layout === 'cover'
            ? 'cover'
            : (meta?.sectionType || 'content');

          const pageText = pageType === 'cover'
            ? JSON.stringify({
                title: docTitle,
                subtitle: config.documentGoal || analysisResult.detectedType || '',
                description: this.buildCoverSummary(outline, 110),
                date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
                overview: outline.sections
                  .filter((s: any) => !['cover', 'toc'].includes(String(s.type || '').toLowerCase()))
                  .slice(0, 6)
                  .map(s => s.title),
              })
            : (meta?.contentText || composition.sections.map(s => s.content || '').join('\n\n'));

          const pageTitle = meta?.pageTitle
            || composition.sections.find(s => s.type === 'heading')?.content
            || `Page ${index + 1}`;

          this.logger.log(
            `Persisting page ${index + 1}: type=${pageType}, sections=${composition.sections.length}, textLen=${pageText.length}`,
          );

          return this.prisma.pdfPage.create({
            data: {
              documentId: pdfDocument.id,
              order:      index + 1,
              pageNumber: index + 1,
              pageType,
              title:      pageTitle,
              semanticSectionId: meta?.sectionId || null,
              densityScore: composition.metrics?.densityScore || null,
              layoutType: composition.layout || null,
              blocks: composition.sections as any,
              styles: { visualStyle: config.visualStyle } as any,
              content: {
                text:           pageText,
                template:       meta?.pageTemplate || 'clean_business_report',
                isContinuation: meta?.isContinuation || false,
                sectionId:      meta?.sectionId,
                layoutType:     composition.layout,
                visualStyle:    config.visualStyle,
                // Store these in content for now until schema migration is applied
                pageNumber:     index + 1,
                semanticSectionId: meta?.sectionId,
                densityScore:   composition.metrics?.densityScore,
                blocks:         composition.sections,
                styles:         { visualStyle: config.visualStyle },
                images:         [],
                charts:         [],
                composition: {
                  density:  composition.density,
                  sections: composition.sections as any,
                  metrics:  composition.metrics,
                  intelligence: (composition as any).contentIntelligence,
                },
              } as any,
            },
          });
        }),
      );

      // ── Save analysis & builder config ─────────────────────────────────────
      await this.contentAnalysisService.saveAnalysis(pdfDocument.id, rawContent, analysisResult);

      await this.prisma.smartBuilderConfig.create({
        data: {
          documentId:             pdfDocument.id,
          documentGoal:           config.documentGoal,
          targetAudience:         config.targetAudience,
          tone:                   config.tone             || 'formal',
          designStyle:            config.designStyle      || 'modern',
          improveWriting:         config.improveWriting   || false,
          fixGrammar:             config.fixGrammar       || false,
          addStructure:           config.addStructure     || false,
          generateIntro:          config.generateIntro    || false,
          generateSummary:        config.generateSummary  || false,
          generateConclusion:     config.generateConclusion || false,
          expandContent:          config.expandContent    || false,
          shortenContent:         config.shortenContent   || false,
          includeTableOfContents: config.includeTableOfContents === true,
          includeCoverPage:       config.includeCoverPage !== false,
          includePageNumbers:     true,
          includeHeaders:         true,
          includeFooters:         true,
        },
      });

      // ── Quality check ──────────────────────────────────────────────────────
      let qualityScore = 0;
      try {
        const qResult = await this.qualityCheckService.checkQuality({
          title: pdfDocument.title,
          pages: pages.map(p => ({ title: p.title, content: p.content as any, pageType: p.pageType })),
        });
        qualityScore = qResult.overallScore;
        await this.prisma.pdfDocument.update({
          where: { id: pdfDocument.id },
          data: {
            qualityScore:    qResult.overallScore,
            validationResult:qResult as any,
            lastQualityCheck:new Date(),
            exportReady:     qResult.validationPassed,
          },
        });
        this.logger.log(`Quality score: ${qResult.overallScore}/100 (${qResult.grade})`);
      } catch (qErr) {
        this.logger.warn('Quality check failed (non-fatal):', qErr.message);
      }

      this.logger.log(`Document generated: ${pdfDocument.id} · ${pages.length} pages`);

      return {
        success: true,
        data: {
          document: { ...pdfDocument, qualityScore },
          pages,
          analysis: analysisResult,
          outline: {
            title:    outline.title,
            sections: outline.sections.map(s => ({ title: s.title, type: s.sectionType, estimatedPages: s.estimatedPages })),
          },
          sections:       outline.sections.length,
          estimatedPages: finalCompositions.length, // Use actual page count after balancing
        },
      };
    } catch (error) {
      this.logger.error('Document generation failed', error);
      throw new HttpException(
        error.message || 'Document generation failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Enhance existing document content
   * POST /api/pdf-studio/smart-builder/enhance
   */
  @Post('enhance')
  async enhanceDocument(
    @Body('documentId') documentId: string,
    @Body('enhancementType') enhancementType: string,
    @Body('targetId') targetId?: string, // Optional: enhance specific page/section
  ) {
    try {
      const document = await this.prisma.pdfDocument.findUnique({
        where: { id: documentId },
        include: { pages: true },
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      // If targetId provided, enhance specific page
      if (targetId) {
        const page = await this.prisma.pdfPage.findUnique({
          where: { id: targetId },
        });

        if (!page) {
          throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
        }

        const enhancementOptions = this.getEnhancementOptions(enhancementType);
        const content = (page.content as any).text || '';

        const result = await this.contentEnhancementService.enhanceContent(
          content,
          enhancementOptions,
        );

        // Update page
        await this.prisma.pdfPage.update({
          where: { id: targetId },
          data: {
            content: {
              ...(page.content as any),
              text: result.enhancedContent,
            },
          },
        });

        // Save enhancement record
        await this.contentEnhancementService.saveEnhancement(
          documentId,
          enhancementType,
          result,
        );

        return {
          success: true,
          data: {
            enhancedContent: result.enhancedContent,
            changes: result.changes,
            improvement: result.improvement,
          },
        };
      } else {
        // Enhance full document
        const allContent = document.pages
          .sort((a, b) => a.order - b.order)
          .map((p) => (p.content as any).text || '')
          .join('\n\n');

        const enhancementOptions = this.getEnhancementOptions(enhancementType);

        const result = await this.contentEnhancementService.enhanceContent(
          allContent,
          enhancementOptions,
        );

        // Note: In a full implementation, you'd redistribute enhanced content back to pages
        // For now, return the enhancement result

        await this.contentEnhancementService.saveEnhancement(
          documentId,
          enhancementType,
          result,
        );

        return {
          success: true,
          data: {
            enhancedContent: result.enhancedContent,
            changes: result.changes,
            improvement: result.improvement,
          },
        };
      }
    } catch (error) {
      this.logger.error('Content enhancement failed', error);
      throw new HttpException(
        error.message || 'Content enhancement failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Regenerate specific section
   * POST /api/pdf-studio/smart-builder/regenerate-section
   */
  @Post('regenerate-section')
  async regenerateSection(
    @Body('documentId') documentId: string,
    @Body('sectionId') sectionId: string,
  ) {
    try {
      const page = await this.prisma.pdfPage.findUnique({
        where: { id: sectionId },
      });

      if (!page) {
        throw new HttpException('Section not found', HttpStatus.NOT_FOUND);
      }

      // Get original content from analysis
      const analysis = await this.prisma.contentAnalysis.findUnique({
        where: { documentId },
      });

      if (!analysis) {
        throw new HttpException(
          'Content analysis not found',
          HttpStatus.NOT_FOUND,
        );
      }

      // Extract relevant portion of raw content for this section
      // In a full implementation, you'd use content analysis to identify the source
      // For now, just enhance existing content

      const content = (page.content as any).text || '';
      const enhancementOptions: EnhancementOptions = {
        improveClarity: true,
        fixGrammar: true,
        tone: 'business',
      };

      const result = await this.contentEnhancementService.enhanceContent(
        content,
        enhancementOptions,
      );

      // Update page
      await this.prisma.pdfPage.update({
        where: { id: sectionId },
        data: {
          content: {
            ...(page.content as any),
            text: result.enhancedContent,
          },
        },
      });

      return {
        success: true,
        data: {
          regeneratedContent: result.enhancedContent,
          changes: result.changes,
          improvement: result.improvement,
        },
      };
    } catch (error) {
      this.logger.error('Section regeneration failed', error);
      throw new HttpException(
        error.message || 'Section regeneration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Get document with pages
   * GET /api/pdf-studio/smart-builder/documents/:id
   */
  @Public()
  @Get('documents/:id')
  async getDocument(@Param('id') id: string) {
    try {
      const document = await this.prisma.pdfDocument.findUnique({
        where: { id },
        include: {
          pages: {
            orderBy: { order: 'asc' },
          },
          brandKit: true,
          project: true,
        },
      });

      if (!document) {
        throw new HttpException('Document not found', HttpStatus.NOT_FOUND);
      }

      // Get analysis if available
      const analysis = await this.prisma.contentAnalysis.findUnique({
        where: { documentId: id },
      });

      // Get builder config
      const builderConfig = await this.prisma.smartBuilderConfig.findUnique({
        where: { documentId: id },
      });

      return {
        success: true,
        data: {
          document,
          analysis,
          config: builderConfig,
        },
      };
    } catch (error) {
      this.logger.error('Failed to get document', error);
      throw new HttpException(
        error.message || 'Failed to get document',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Convert TipTap/rich-text HTML to plain text that analysis services can process.
   * Converts headings → markdown, paragraphs → double-newlines, list items → bullets.
   */
  private htmlToPlainText(html: string): string {
    if (!html || !html.includes('<')) {
      return html; // Already plain text or empty
    }

    return html
      // Headings → markdown syntax (so detectHeadings / splitByHeadings works)
      .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, '\n# $1\n')
      .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, '\n## $1\n')
      .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, '\n### $1\n')
      .replace(/<h4[^>]*>([\s\S]*?)<\/h4>/gi, '\n#### $1\n')
      .replace(/<h5[^>]*>([\s\S]*?)<\/h5>/gi, '\n##### $1\n')
      .replace(/<h6[^>]*>([\s\S]*?)<\/h6>/gi, '\n###### $1\n')
      // Paragraphs → double newline (so countParagraphs works)
      .replace(/<\/p>/gi, '\n\n')
      .replace(/<p[^>]*>/gi, '')
      // List items → bullet syntax (so detectBullets / splitByHeadings works)
      .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, '- $1\n')
      .replace(/<\/[uo]l>/gi, '\n')
      .replace(/<[uo]l[^>]*>/gi, '')
      // Block separators
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/div>/gi, '\n')
      .replace(/<\/blockquote>/gi, '\n')
      // Table cells
      .replace(/<\/td>/gi, ' ')
      .replace(/<\/tr>/gi, '\n')
      // Strip all remaining HTML tags
      .replace(/<[^>]+>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/&#(\d+);/g, (_, dec) => String.fromCharCode(parseInt(dec, 10)))
      // Normalize whitespace
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Map detected type to document type
   */
  private mapDetectedTypeToDocumentType(detectedType: string): string {
    const typeMap: Record<string, string> = {
      business: 'business_plan',
      academic: 'research_paper',
      report: 'report',
      technical: 'technical_documentation',
      article: 'article',
      notes: 'notes',
      mixed: 'general_document',
    };

    return typeMap[detectedType] || 'general_document';
  }

  private buildCoverSummary(outline: any, maxWords = 100): string {
    const body = (outline?.sections || [])
      .filter((section: any) => !['cover', 'toc'].includes(String(section?.type || '').toLowerCase()))
      .flatMap((section: any) => section?.blocks || [])
      .map((block: any) => block?.cleanText || block?.text || block?.content || '')
      .filter((text: string) => text && text.trim())
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();

    if (!body) {
      return outline?.title
        ? `This document presents a structured analysis of ${outline.title}, with the main topics organized into clear, readable sections.`
        : '';
    }

    const bodyWords = body.split(/\s+/);
    const words = bodyWords.slice(0, maxWords);
    return `${words.join(' ')}${bodyWords.length > maxWords ? '...' : ''}`;
  }

  /**
   * Get enhancement options from type
   */
  private getEnhancementOptions(enhancementType: string): EnhancementOptions {
    // All enhancement types map to combinations of SAFE flags only.
    // Destructive operations (paragraph→bullets, expansion, jargon swaps)
    // were intentionally removed.
    const optionsMap: Record<string, EnhancementOptions> = {
      improve_writing:  { improveClarity: true,  fixGrammar: false, tone: 'business' },
      fix_grammar:      { improveClarity: false, fixGrammar: true,  tone: 'neutral' },
      // Legacy types now map to the safe combination — never destructive.
      restructure:      { improveClarity: true,  fixGrammar: true,  tone: 'business' },
      expand:           { improveClarity: true,  fixGrammar: true,  tone: 'business' },
      shorten:          { improveClarity: true,  fixGrammar: false, tone: 'business' },
      professionalize:  { improveClarity: true,  fixGrammar: true,  tone: 'formal' },
      engage:           { improveClarity: true,  fixGrammar: true,  tone: 'business' },
    };

    return optionsMap[enhancementType] || { improveClarity: true, fixGrammar: true, tone: 'business' };
  }

  // ── Page management ──────────────────────────────────────────────────────────

  /** POST /api/pdf-studio/smart-builder/documents/:id/pages */
  @Post('documents/:id/pages')
  async addPage(
    @Param('id') documentId: string,
    @Body('pageType') pageType: string,
    @Body('title') title: string,
  ) {
    try {
      const lastPage = await this.prisma.pdfPage.findFirst({
        where: { documentId },
        orderBy: { order: 'desc' },
      });
      const order = (lastPage?.order ?? 0) + 1;
      const page = await this.prisma.pdfPage.create({
        data: {
          documentId,
          order,
          pageType: pageType || 'content',
          title: title || `Page ${order + 1}`,
          content: { text: '', template: null, metadata: {}, images: [], charts: [] },
        },
      });
      return { success: true, data: { page } };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to add page', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** DELETE /api/pdf-studio/smart-builder/documents/:id/pages/:pageId */
  @Delete('documents/:id/pages/:pageId')
  async deletePage(
    @Param('id') documentId: string,
    @Param('pageId') pageId: string,
  ) {
    try {
      const count = await this.prisma.pdfPage.count({ where: { documentId } });
      if (count <= 1) throw new HttpException('Cannot delete the only page', HttpStatus.BAD_REQUEST);
      await this.prisma.pdfPage.delete({ where: { id: pageId } });
      return { success: true, message: 'Page deleted' };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to delete page', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /** POST /api/pdf-studio/smart-builder/documents/:id/pages/:pageId/duplicate */
  @Post('documents/:id/pages/:pageId/duplicate')
  async duplicatePage(
    @Param('id') documentId: string,
    @Param('pageId') pageId: string,
  ) {
    try {
      const source = await this.prisma.pdfPage.findUnique({ where: { id: pageId } });
      if (!source) throw new HttpException('Page not found', HttpStatus.NOT_FOUND);
      const lastPage = await this.prisma.pdfPage.findFirst({
        where: { documentId },
        orderBy: { order: 'desc' },
      });
      const newPage = await this.prisma.pdfPage.create({
        data: {
          documentId,
          order: (lastPage?.order ?? 0) + 1,
          pageType: source.pageType,
          title: `${source.title || 'Page'} (copy)`,
          content: source.content as any,
        },
      });
      return { success: true, data: { page: newPage } };
    } catch (error) {
      throw new HttpException(error.message || 'Failed to duplicate page', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
