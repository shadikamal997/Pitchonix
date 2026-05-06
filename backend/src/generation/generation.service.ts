import { Injectable, Logger } from '@nestjs/common';
import { SlideFactory } from './slide-types/slide.factory';
import { WizardInput, SlideContent } from './slide-types/types';
import { AIEnhancementService } from './ai-enhancement.service';
import { VisualGenerationService } from './visual';
import { VisualSlideContent, VisualGenerationOptions } from './visual/types';
import { ProgressGateway } from './progress/progress.gateway';

@Injectable()
export class GenerationService {
  private readonly logger = new Logger(GenerationService.name);
  private slideFactory: SlideFactory;

  constructor(
    private aiEnhancementService: AIEnhancementService,
    private visualGenerationService: VisualGenerationService,
    private progressGateway: ProgressGateway,
  ) {
    this.slideFactory = new SlideFactory();
  }

  /**
   * Generate complete presentation with content, AI enhancement, and visual layer
   */
  async generatePresentation(
    input: WizardInput,
    options?: {
      useAI?: boolean;
      generateVisuals?: boolean;
      visualOptions?: Partial<VisualGenerationOptions>;
      jobId?: string; // For progress tracking
    },
  ): Promise<VisualSlideContent[]> {
    const jobId = options?.jobId || `job-${Date.now()}`;
    
    try {
      // Stage 1: Generate base slides
      this.progressGateway?.emitProgress({
        jobId,
        stage: 'outline',
        progress: 10,
        message: 'Generating presentation outline...',
        timestamp: new Date(),
      });

      const slides = await this.generateSlideContent(input, {
        useAI: options?.useAI,
        jobId,
      });

      // Stage 2: Slides generated
      this.progressGateway?.emitProgress({
        jobId,
        stage: 'slides',
        progress: 40,
        message: `Generated ${slides.length} slides`,
        details: { totalSlides: slides.length },
        timestamp: new Date(),
      });

      // Stage 3: Generate visual layer if requested
      if (options?.generateVisuals !== false) {
        this.progressGateway?.emitProgress({
          jobId,
          stage: 'design',
          progress: 60,
          message: 'Applying design and layout...',
          timestamp: new Date(),
        });

        const visualSlides = await this.visualGenerationService.generateVisualContent(
          slides,
          input,
          options?.visualOptions,
        );

        // Stage 4: Quality check
        this.progressGateway?.emitProgress({
          jobId,
          stage: 'quality',
          progress: 90,
          message: 'Running quality checks...',
          timestamp: new Date(),
        });

        // Stage 5: Complete
        this.progressGateway?.emitProgress({
          jobId,
          stage: 'complete',
          progress: 100,
          message: 'Presentation ready!',
          details: { totalSlides: visualSlides.length },
          timestamp: new Date(),
        });

        return visualSlides;
      }

      // Return slides without full visual enhancement (but with minimal structure)
      const minimalSlides = slides.map((slide) => ({
        ...slide,
        layout: this.visualGenerationService['layoutService'].getLayoutForSlide(slide),
        theme: this.visualGenerationService['themeService'].getThemeForPresentation(input),
        charts: [],
        images: [],
        renderStatus: 'pending' as const,
      }));

      this.progressGateway?.emitProgress({
        jobId,
        stage: 'complete',
        progress: 100,
        message: 'Presentation ready!',
        details: { totalSlides: minimalSlides.length },
        timestamp: new Date(),
      });

      return minimalSlides;
    } catch (error) {
      this.logger.error('Error generating presentation:', error.stack);
      
      // Emit error progress
      this.progressGateway?.emitProgress({
        jobId,
        stage: 'error',
        progress: 0,
        message: `Generation failed: ${error.message}`,
        details: { error: error.message },
        timestamp: new Date(),
      });

      throw new Error(`Presentation generation failed: ${error.message}`);
    }
  }

  /**
   * Generate structured slide content using modular generators
   * Replaces hardcoded mock with dynamic generation based on wizard input
   */
  async generateSlideContent(
    input: WizardInput,
    options?: { useAI?: boolean; jobId?: string },
  ): Promise<SlideContent[]> {
    const jobId = options?.jobId || `job-${Date.now()}`;
    
    try {
      // Validate input
      this.validateInput(input);

      // Generate slides using factory
      this.progressGateway?.emitProgress({
        jobId,
        stage: 'slides',
        progress: 20,
        message: 'Creating slide structure...',
        timestamp: new Date(),
      });

      const slides = this.slideFactory.generateDeck(input);

      // Enhance with AI if enabled and available
      let enhancedSlides = slides;
      if (options?.useAI && this.aiEnhancementService.isAvailable()) {
        this.logger.log('Enhancing slides with AI...');
        
        this.progressGateway?.emitProgress({
          jobId,
          stage: 'slides',
          progress: 30,
          message: 'Enhancing content with AI...',
          timestamp: new Date(),
        });

        enhancedSlides = await this.aiEnhancementService.enhanceDeck(
          slides,
          input,
        );
        this.logger.log('AI enhancement complete');
      } else if (options?.useAI) {
        this.logger.warn('AI enhancement requested but not available');
      }

      // Validate generated content
      if (!this.validateSlideContent(enhancedSlides)) {
        throw new Error('Generated slide content failed validation');
      }

      return enhancedSlides;
    } catch (error) {
      this.logger.error('Error generating slides:', error.stack);
      throw new Error(`Slide generation failed: ${error.message}`);
    }
  }

  /**
   * Validate wizard input
   */
  private validateInput(input: WizardInput): void {
    if (!input) {
      throw new Error('Input is required');
    }

    if (!input.companyName || input.companyName.trim().length === 0) {
      throw new Error('Company name is required');
    }

    if (!input.documentType) {
      throw new Error('Document type is required');
    }

    // Set defaults for optional fields
    input.slideCount = input.slideCount || 10;
    input.contentDepth = input.contentDepth || 'balanced';
    input.includeCharts = input.includeCharts !== undefined ? input.includeCharts : true;
    input.includeFinancials = input.includeFinancials !== undefined ? input.includeFinancials : false;
    input.includeExecutiveSummary = input.includeExecutiveSummary !== undefined ? input.includeExecutiveSummary : false;
  }

  /**
   * Validate generated slide content
   */
  validateSlideContent(slides: SlideContent[]): boolean {
    if (!Array.isArray(slides) || slides.length === 0) {
      return false;
    }

    for (const slide of slides) {
      // Check required fields
      if (!slide.type || !slide.title || !slide.content || slide.order === undefined) {
        this.logger.error('Slide missing required fields:', slide);
        return false;
      }

      // Check order is valid
      if (slide.order < 1 || slide.order > slides.length) {
        this.logger.error('Invalid slide order:', slide.order);
        return false;
      }

      // Check layout and theme keys if present
      if (slide.layoutKey && typeof slide.layoutKey !== 'string') {
        this.logger.error('Invalid layoutKey:', slide.layoutKey);
        return false;
      }

      if (slide.themeKey && typeof slide.themeKey !== 'string') {
        this.logger.error('Invalid themeKey:', slide.themeKey);
        return false;
      }

      // Check quality score if present
      if (slide.qualityScore !== undefined && (slide.qualityScore < 0 || slide.qualityScore > 100)) {
        this.logger.error('Invalid quality score:', slide.qualityScore);
        return false;
      }
    }

    return true;
  }

  /**
   * Get available slide types from factory
   */
  getAvailableSlideTypes(): string[] {
    return this.slideFactory.getAvailableSlideTypes();
  }
}
