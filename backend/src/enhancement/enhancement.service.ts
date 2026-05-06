import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AIEnhancementService } from '../generation/ai-enhancement.service';
import { GenerationService } from '../generation/generation.service';
import { SlidesService } from '../slides/slides.service';
import { QualityControlService } from '../generation/quality/quality-control.service';
import { WizardInput } from '../generation/slide-types/types';

export interface EnhancementResult {
  success: boolean;
  slideId?: string;
  updatedContent?: any;
  message: string;
}

@Injectable()
export class EnhancementService {
  constructor(
    private prisma: PrismaService,
    private aiService: AIEnhancementService,
    private generationService: GenerationService,
    private slidesService: SlidesService,
    private qualityService: QualityControlService,
  ) {}

  /**
   * Improve slide content using AI
   */
  async improveSlide(slideId: string): Promise<EnhancementResult> {
    try {
      const slide = await this.prisma.slide.findUnique({
        where: { id: slideId },
      });

      if (!slide) {
        return {
          success: false,
          message: 'Slide not found',
        };
      }

      // Use AI to improve content
      const improvedContent = await this.aiService.improveSlideContent(
        slide.content,
        slide.type,
      );

      // Update slide
      const updatedSlide = await this.prisma.slide.update({
        where: { id: slideId },
        data: { content: improvedContent },
      });

      return {
        success: true,
        slideId: updatedSlide.id,
        updatedContent: updatedSlide.content,
        message: 'Slide improved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to improve slide: ${error.message}`,
      };
    }
  }

  /**
   * Shorten slide content
   */
  async shortenSlide(slideId: string): Promise<EnhancementResult> {
    try {
      const slide = await this.prisma.slide.findUnique({
        where: { id: slideId },
      });

      if (!slide) {
        return {
          success: false,
          message: 'Slide not found',
        };
      }

      // Shorten content by removing redundant information
      const shortenedContent = await this.aiService.shortenContent(
        slide.content,
        slide.type,
      );

      // Update slide
      const updatedSlide = await this.prisma.slide.update({
        where: { id: slideId },
        data: { content: shortenedContent },
      });

      return {
        success: true,
        slideId: updatedSlide.id,
        updatedContent: updatedSlide.content,
        message: 'Slide content shortened successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to shorten slide: ${error.message}`,
      };
    }
  }

  /**
   * Expand slide content with more detail
   */
  async expandSlide(slideId: string): Promise<EnhancementResult> {
    try {
      const slide = await this.prisma.slide.findUnique({
        where: { id: slideId },
      });

      if (!slide) {
        return {
          success: false,
          message: 'Slide not found',
        };
      }

      // Expand content with additional details
      const expandedContent = await this.aiService.expandContent(
        slide.content,
        slide.type,
      );

      // Update slide
      const updatedSlide = await this.prisma.slide.update({
        where: { id: slideId },
        data: { content: expandedContent },
      });

      return {
        success: true,
        slideId: updatedSlide.id,
        updatedContent: updatedSlide.content,
        message: 'Slide content expanded successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to expand slide: ${error.message}`,
      };
    }
  }

  /**
   * Make slide content more professional
   */
  async makeProfessional(slideId: string): Promise<EnhancementResult> {
    try {
      const slide = await this.prisma.slide.findUnique({
        where: { id: slideId },
      });

      if (!slide) {
        return {
          success: false,
          message: 'Slide not found',
        };
      }

      // Improve tone and language to be more professional
      const professionalContent = await this.aiService.makeProfessional(
        slide.content,
        slide.type,
      );

      // Update slide
      const updatedSlide = await this.prisma.slide.update({
        where: { id: slideId },
        data: { content: professionalContent },
      });

      return {
        success: true,
        slideId: updatedSlide.id,
        updatedContent: updatedSlide.content,
        message: 'Slide made more professional',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to make professional: ${error.message}`,
      };
    }
  }

  /**
   * Make slide content investor-ready
   */
  async makeInvestorReady(slideId: string): Promise<EnhancementResult> {
    try {
      const slide = await this.prisma.slide.findUnique({
        where: { id: slideId },
      });

      if (!slide) {
        return {
          success: false,
          message: 'Slide not found',
        };
      }

      // Optimize for investor audience
      const investorContent = await this.aiService.makeInvestorReady(
        slide.content,
        slide.type,
      );

      // Update slide
      const updatedSlide = await this.prisma.slide.update({
        where: { id: slideId },
        data: { content: investorContent },
      });

      return {
        success: true,
        slideId: updatedSlide.id,
        updatedContent: updatedSlide.content,
        message: 'Slide optimized for investors',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to make investor-ready: ${error.message}`,
      };
    }
  }

  /**
   * Regenerate a single slide from scratch
   */
  async regenerateSlide(slideId: string, input: Partial<WizardInput>): Promise<EnhancementResult> {
    try {
      const slide = await this.prisma.slide.findUnique({
        where: { id: slideId },
        include: { deck: true },
      });

      if (!slide) {
        return {
          success: false,
          message: 'Slide not found',
        };
      }

      // Create minimal wizard input for enhancement
      const wizardInput: WizardInput = {
        ...input,
        documentType: 'pitch_deck',
        companyName: input.companyName || 'Company',
        industry: input.industry || 'Technology',
        audience: input.audience || 'investors',
        tone: input.tone || 'professional',
        problem: input.problem || '',
        solution: input.solution || '',
        slideCount: 10,
        contentDepth: 'balanced',
        includeCharts: false,
        includeFinancials: false,
        includeSpeakerNotes: false,
        includeExecutiveSummary: false,
        theme: 'modern',
        brandColors: { primary: '#000000', secondary: '#666666', accent: '#0066cc' },
        fontStyle: 'modern',
        visualStyle: 'minimal',
      } as WizardInput;

      // Use AI to enhance/regenerate the slide
      const enhanced = await this.aiService.enhanceSlide(
        slide as any,
        wizardInput,
        { enhanceContent: true, enhanceSpeakerNotes: true },
      );

      // Update slide
      const updatedSlide = await this.prisma.slide.update({
        where: { id: slideId },
        data: {
          content: enhanced.content as any,
          title: enhanced.title || slide.title,
          subtitle: enhanced.subtitle || slide.subtitle,
        },
      });

      return {
        success: true,
        slideId: updatedSlide.id,
        updatedContent: updatedSlide.content,
        message: 'Slide regenerated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to regenerate slide: ${error.message}`,
      };
    }
  }

  /**
   * Fix structure of entire deck
   */
  async fixStructure(deckId: string): Promise<{ success: boolean; message: string; fixedCount?: number }> {
    try {
      const deck = await this.prisma.deck.findUnique({
        where: { id: deckId },
        include: { slides: { orderBy: { order: 'asc' } } },
      });

      if (!deck) {
        return {
          success: false,
          message: 'Deck not found',
        };
      }

      // Basic structure validation - check if slides exist
      const hasSlides = deck.slides && deck.slides.length > 0;
      
      if (hasSlides && this.findDuplicateSlides(deck.slides).length === 0) {
        return {
          success: true,
          message: 'Deck structure is already correct',
          fixedCount: 0,
        };
      }

      // Fix structural issues
      let fixedCount = 0;

      // Reorder slides logically
      const properOrder = this.getProperSlideOrder(deck.slides);
      for (let i = 0; i < properOrder.length; i++) {
        await this.prisma.slide.update({
          where: { id: properOrder[i].id },
          data: { order: i + 1 },
        });
      }
      fixedCount++;

      // Remove duplicates
      const duplicates = this.findDuplicateSlides(deck.slides);
      for (const slideId of duplicates) {
        await this.prisma.slide.delete({ where: { id: slideId } });
        fixedCount++;
      }

      return {
        success: true,
        message: `Fixed ${fixedCount} structural issues`,
        fixedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fix structure: ${error.message}`,
      };
    }
  }

  /**
   * Fix all issues in deck automatically
   */
  async fixAllIssues(deckId: string): Promise<{ success: boolean; message: string; fixedCount?: number }> {
    try {
      const deck = await this.prisma.deck.findUnique({
        where: { id: deckId },
        include: { slides: { orderBy: { order: 'asc' } } },
      });

      if (!deck) {
        return {
          success: false,
          message: 'Deck not found',
        };
      }

      let fixedCount = 0;

      // Fix structural issues
      const structureResult = await this.fixStructure(deckId);
      if (structureResult.success) {
        fixedCount += structureResult.fixedCount || 0;
      }

      // Improve slides (optional - could check quality score here)
      for (const slide of deck.slides) {
        // Simple heuristic: if slide has minimal content, improve it
        const hasMinimalContent = !slide.content || 
          (typeof slide.content === 'object' && Object.keys(slide.content).length < 2);
        
        if (hasMinimalContent) {
          await this.improveSlide(slide.id);
          fixedCount++;
        }
      }

      return {
        success: true,
        message: `Fixed ${fixedCount} issues in the deck`,
        fixedCount,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to fix all issues: ${error.message}`,
      };
    }
  }

  /**
   * Helper: Get proper slide order based on slide types
   */
  private getProperSlideOrder(slides: any[]): any[] {
    const orderMap = {
      COVER: 1,
      EXECUTIVE_SUMMARY: 2,
      PROBLEM: 3,
      SOLUTION: 4,
      MARKET_OPPORTUNITY: 5,
      PRODUCT_FEATURES: 6,
      BUSINESS_MODEL: 7,
      GO_TO_MARKET: 8,
      COMPETITION: 9,
      TRACTION: 10,
      FINANCIALS: 11,
      ROADMAP: 12,
      TEAM: 13,
      ASK: 14,
    };

    return [...slides].sort((a, b) => {
      const orderA = orderMap[a.type] || 100;
      const orderB = orderMap[b.type] || 100;
      return orderA - orderB;
    });
  }

  /**
   * Helper: Find duplicate slides
   */
  private findDuplicateSlides(slides: any[]): string[] {
    const seen = new Map<string, string>();
    const duplicates: string[] = [];

    for (const slide of slides) {
      const key = `${slide.type}-${slide.title}`;
      if (seen.has(key)) {
        duplicates.push(slide.id);
      } else {
        seen.set(key, slide.id);
      }
    }

    return duplicates;
  }
}
