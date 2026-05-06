import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  HttpException,
  HttpStatus,
  Logger,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { Public } from '../../auth/public.decorator';
import { GetUser } from '../../auth/get-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { ContentAnalysisService } from '../services/content-analysis.service';
import { ContentEnhancementService, EnhancementOptions } from '../services/content-enhancement.service';
import { ContentStructureService } from '../services/content-structure.service';
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
  ) {}

  /**
   * Analyze raw content
   * POST /api/pdf-studio/smart-builder/analyze
   */
  @Public()
  @Post('analyze')
  @UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
  async analyzeContent(
    @Body() dto: AnalyzeContentDto,
  ) {
    const { rawContent } = dto;
    try {
      this.logger.log(`Analyzing content (${rawContent.length} chars)`);

      const analysisResult = await this.contentAnalysisService.analyzeContent(
        rawContent,
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

      // First analyze to detect issues
      const analysisResult = await this.contentAnalysisService.analyzeContent(
        rawContent,
      );

      // Build enhancement options
      let enhancementOptions: EnhancementOptions;
      if (fixAll) {
        // Apply all fixes
        enhancementOptions = {
          improveWriting: true,
          fixGrammar: true,
          restructure: true,
          expand: false,
          shorten: false,
          tone: options?.tone as any || 'professional',
        };
      } else {
        // Apply selected fixes
        enhancementOptions = {
          improveWriting: options?.improveWriting || false,
          fixGrammar: options?.fixGrammar || false,
          restructure: options?.addStructure || false,
          expand: false,
          shorten: false,
          tone: options?.tone as any || 'professional',
        };
      }

      // Enhance content
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
          remainingIssues: [], // TODO: Re-analyze to find remaining issues
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
   */
  @Public()
  @Post('generate')
  async generateDocument(
    @GetUser() user: any,
    @Body('rawContent') rawContent: string,
    @Body('config') config: {
      documentGoal?: string;
      targetAudience?: string;
      tone?: string;
      designStyle?: string;
      brandKitId?: string;
      title?: string;
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
    },
  ) {
    try {
      if (!rawContent || rawContent.trim().length === 0) {
        throw new HttpException(
          'Raw content is required',
          HttpStatus.BAD_REQUEST,
        );
      }

      const userId = user?.id || null;
      this.logger.log(
        `Generating PDF document ${userId ? `for user ${userId}` : '(anonymous)'} (${rawContent.length} chars)`,
      );

      // Step 1: Create project (only if user is authenticated)
      let project = null;
      if (userId) {
        project = await this.prisma.project.create({
          data: {
            userId: userId,
            name: config.title || 'Smart PDF Document',
            documentType: 'smart_pdf',
            documentFormat: 'pdf',
            status: 'draft',
            audience: config.targetAudience,
            tone: config.tone,
          },
        });
      }

      // Step 2: Analyze content
      this.logger.log('Step 1/5: Analyzing content...');
      const analysisResult = await this.contentAnalysisService.analyzeContent(
        rawContent,
      );

      // Step 3: Enhance content if requested
      let enhancedContent = rawContent;
      if (config.improveWriting || config.fixGrammar) {
        this.logger.log('Step 2/5: Enhancing content...');
        const enhancementOptions: EnhancementOptions = {
          improveWriting: config.improveWriting,
          fixGrammar: config.fixGrammar,
          restructure: config.addStructure,
          expand: config.expandContent,
          shorten: config.shortenContent,
          tone: config.tone as any,
        };

        const enhancementResult =
          await this.contentEnhancementService.enhanceContent(
            rawContent,
            enhancementOptions,
          );

        enhancedContent = enhancementResult.enhancedContent;

        this.logger.log(
          `Content enhanced: ${enhancementResult.changes.length} changes, ${enhancementResult.improvement.toFixed(1)}% improvement`,
        );
      }

      // Step 4: Structure content
      this.logger.log('Step 3/5: Structuring content...');
      const structuredDoc =
        await this.contentStructureService.structureContent(
          enhancedContent,
          analysisResult,
          {
            generateIntro: config.generateIntro,
            generateSummary: config.generateSummary,
            generateConclusion: config.generateConclusion,
            includeTableOfContents: config.includeTableOfContents,
            includeCoverPage: config.includeCoverPage,
          },
        );

      // Remove duplicate sections
      const cleanedSections =
        this.contentStructureService.mergeDuplicateSections(
          structuredDoc.sections,
        );

      // Remove redundancy
      const finalSections =
        this.contentStructureService.removeRedundancy(cleanedSections);

      // Step 5: Create PDF document (only if user is authenticated)
      if (!userId) {
        // For anonymous users, return the structured content without saving
        return {
          success: true,
          message: 'Document generated successfully (anonymous mode)',
          data: {
            content: structuredDoc,
            analysis: analysisResult,
            requiresAuth: true,
            sections: finalSections,
          },
        };
      }

      this.logger.log('Step 4/5: Creating PDF document...');
      const pdfDocument = await this.prisma.pdfDocument.create({
        data: {
          projectId: project.id,
          title: config.title || analysisResult.suggestedTitle,
          documentType: this.mapDetectedTypeToDocumentType(
            analysisResult.detectedType,
          ),
          brandKitId: config.brandKitId,
          status: 'draft',
          outline: {
            detectedType: analysisResult.detectedType,
            confidence: analysisResult.confidence,
            keywords: analysisResult.keywords,
            topics: analysisResult.topics,
          },
          metadata: {
            documentGoal: config.documentGoal,
            targetAudience: config.targetAudience,
            tone: config.tone,
            designStyle: config.designStyle,
            generatedSections: finalSections.length,
            estimatedPages: structuredDoc.totalPages,
          },
        },
      });

      // Step 6: Create pages
      this.logger.log('Step 5/5: Creating pages...');
      const pages = await Promise.all(
        finalSections.map((section, index) =>
          this.prisma.pdfPage.create({
            data: {
              documentId: pdfDocument.id,
              order: section.order,
              pageType: section.type,
              title: section.title,
              content: {
                text: section.content,
                template: section.pageTemplate,
                metadata: section.metadata,
              },
            },
          }),
        ),
      );

      // Save content analysis
      await this.contentAnalysisService.saveAnalysis(
        pdfDocument.id,
        rawContent,
        analysisResult,
      );

      // Save smart builder config
      await this.prisma.smartBuilderConfig.create({
        data: {
          documentId: pdfDocument.id,
          documentGoal: config.documentGoal,
          targetAudience: config.targetAudience,
          tone: config.tone || 'formal',
          designStyle: config.designStyle || 'modern',
          improveWriting: config.improveWriting || false,
          fixGrammar: config.fixGrammar || false,
          addStructure: config.addStructure || false,
          generateIntro: config.generateIntro || false,
          generateSummary: config.generateSummary || false,
          generateConclusion: config.generateConclusion || false,
          expandContent: config.expandContent || false,
          shortenContent: config.shortenContent || false,
          includeTableOfContents: config.includeTableOfContents !== false,
          includeCoverPage: config.includeCoverPage !== false,
          includePageNumbers: true,
          includeHeaders: true,
          includeFooters: true,
        },
      });

      this.logger.log(
        `PDF document generated successfully: ${pdfDocument.id} with ${pages.length} pages`,
      );

      return {
        success: true,
        data: {
          document: pdfDocument,
          pages,
          analysis: analysisResult,
          sections: finalSections.length,
          estimatedPages: structuredDoc.totalPages,
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
        improveWriting: true,
        fixGrammar: true,
        restructure: true,
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

  /**
   * Get enhancement options from type
   */
  private getEnhancementOptions(enhancementType: string): EnhancementOptions {
    const optionsMap: Record<string, EnhancementOptions> = {
      improve_writing: {
        improveWriting: true,
        fixGrammar: false,
        restructure: false,
      },
      fix_grammar: {
        improveWriting: false,
        fixGrammar: true,
        restructure: false,
      },
      restructure: {
        improveWriting: false,
        fixGrammar: false,
        restructure: true,
      },
      expand: {
        improveWriting: false,
        fixGrammar: false,
        expand: true,
      },
      shorten: {
        improveWriting: false,
        fixGrammar: false,
        shorten: true,
      },
      professionalize: {
        improveWriting: false,
        fixGrammar: false,
        professionalize: true,
      },
      engage: {
        improveWriting: false,
        fixGrammar: false,
        makeEngaging: true,
      },
    };

    return optionsMap[enhancementType] || { improveWriting: true };
  }
}
