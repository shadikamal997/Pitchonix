import { Injectable, Logger } from '@nestjs/common';
import { SlideContent, WizardInput } from '../slide-types/types';
import {
  VisualSlideContent,
  VisualGenerationOptions,
  ImagePlaceholder,
} from './types';
import { ChartGenerationService } from './chart-generation.service';
import { LayoutService } from './layout.service';
import { ThemeService } from './theme.service';

/**
 * Visual Generation Service
 * Orchestrates the complete visual generation pipeline
 */
@Injectable()
export class VisualGenerationService {
  private readonly logger = new Logger(VisualGenerationService.name);

  constructor(
    private readonly chartService: ChartGenerationService,
    private readonly layoutService: LayoutService,
    private readonly themeService: ThemeService,
  ) {}

  /**
   * Generate visual content for all slides
   */
  async generateVisualContent(
    slides: SlideContent[],
    input: WizardInput,
    options: Partial<VisualGenerationOptions> = {},
  ): Promise<VisualSlideContent[]> {
    const defaultOptions: VisualGenerationOptions = {
      generateCharts: input.includeCharts ?? true,
      generateImages: true,
      applyTheme: true,
      optimizeForExport: false,
      ...options,
    };

    this.logger.log(
      `Generating visual content for ${slides.length} slides with options: ${JSON.stringify(defaultOptions)}`,
    );

    const theme = this.themeService.getThemeForPresentation(input);
    const visualSlides: VisualSlideContent[] = [];

    for (const slide of slides) {
      try {
        const visualSlide = await this.generateVisualSlide(
          slide,
          input,
          theme,
          defaultOptions,
        );
        visualSlides.push(visualSlide);
      } catch (error) {
        this.logger.error(
          `Failed to generate visual content for slide ${slide.order}: ${error.message}`,
        );
        // Fallback: return slide with minimal visual enhancement
        visualSlides.push(this.createFallbackVisualSlide(slide, theme));
      }
    }

    this.logger.log(
      `Successfully generated visual content for ${visualSlides.length} slides`,
    );
    return visualSlides;
  }

  /**
   * Generate visual content for a single slide
   */
  private async generateVisualSlide(
    slide: SlideContent,
    input: WizardInput,
    theme: any,
    options: VisualGenerationOptions,
  ): Promise<VisualSlideContent> {
    // Get layout
    const layout = this.layoutService.getLayoutForSlide(slide);

    // Generate charts if applicable
    const charts = options.generateCharts
      ? this.chartService.generateChartsForSlide(slide, input)
      : [];

    // Generate image placeholders if applicable
    const images = options.generateImages
      ? this.generateImagePlaceholders(slide)
      : [];

    // Build visual slide content
    const visualSlide: VisualSlideContent = {
      ...slide,
      layout,
      theme,
      charts,
      images,
      renderStatus: 'complete',
      renderedAt: new Date(),
    };

    return visualSlide;
  }

  /**
   * Generate image placeholders based on slide content
   */
  private generateImagePlaceholders(slide: SlideContent): ImagePlaceholder[] {
    const images: ImagePlaceholder[] = [];

    switch (slide.type) {
      case 'cover':
        // Background image for cover slide
        images.push({
          id: 'cover-bg',
          type: 'illustration',
          width: 1920,
          height: 1080,
          altText: 'Presentation background',
        });
        break;

      case 'team':
        // Team member photos
        const content = slide.content;
        if (content.members && Array.isArray(content.members)) {
          content.members.forEach((member: any, index: number) => {
            images.push({
              id: `team-${index}`,
              type: 'photo',
              width: 300,
              height: 300,
              altText: member.name || `Team member ${index + 1}`,
              caption: member.role,
            });
          });
        }
        break;

      case 'product_features':
        // Product screenshots/mockups
        images.push({
          id: 'product-demo',
          type: 'photo',
          width: 800,
          height: 600,
          altText: 'Product demonstration',
        });
        break;

      case 'company_overview':
        // Company logo
        images.push({
          id: 'company-logo',
          type: 'logo',
          width: 200,
          height: 200,
          altText: 'Company logo',
        });
        break;

      case 'case_study':
        // Customer logo/photo
        images.push({
          id: 'customer-logo',
          type: 'logo',
          width: 150,
          height: 150,
          altText: 'Customer logo',
        });
        break;

      default:
        // No images for other slide types by default
        break;
    }

    return images;
  }

  /**
   * Create fallback visual slide when generation fails
   */
  private createFallbackVisualSlide(
    slide: SlideContent,
    theme: any,
  ): VisualSlideContent {
    const defaultLayout = this.layoutService.getLayout('title_content' as any);

    return {
      ...slide,
      layout: defaultLayout!,
      theme,
      charts: [],
      images: [],
      renderStatus: 'error',
    };
  }

  /**
   * Optimize visual content for export (reduce file size, etc.)
   */
  optimizeForExport(slides: VisualSlideContent[]): VisualSlideContent[] {
    return slides.map((slide) => ({
      ...slide,
      charts: slide.charts?.map((chart) => ({
        ...chart,
        options: {
          ...chart.options,
          animationEnabled: false, // Disable animations for export
        },
      })),
      images: slide.images?.map((image) => ({
        ...image,
        width: Math.min(image.width, 1200), // Limit image size
        height: Math.min(image.height, 1200),
      })),
    }));
  }

  /**
   * Get generation statistics
   */
  getGenerationStats(slides: VisualSlideContent[]): {
    totalSlides: number;
    totalCharts: number;
    totalImages: number;
    layoutTypes: Record<string, number>;
    renderStatus: Record<string, number>;
  } {
    const stats = {
      totalSlides: slides.length,
      totalCharts: 0,
      totalImages: 0,
      layoutTypes: {} as Record<string, number>,
      renderStatus: {} as Record<string, number>,
    };

    slides.forEach((slide) => {
      // Count charts
      stats.totalCharts += slide.charts?.length || 0;

      // Count images
      stats.totalImages += slide.images?.length || 0;

      // Count layout types
      const layoutType = slide.layout.type;
      stats.layoutTypes[layoutType] = (stats.layoutTypes[layoutType] || 0) + 1;

      // Count render status
      const status = slide.renderStatus || 'unknown';
      stats.renderStatus[status] = (stats.renderStatus[status] || 0) + 1;
    });

    return stats;
  }

  /**
   * Validate visual content
   */
  validateVisualContent(slides: VisualSlideContent[]): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    slides.forEach((slide, index) => {
      // Check layout
      if (!slide.layout) {
        errors.push(`Slide ${index + 1}: Missing layout`);
      }

      // Check theme
      if (!slide.theme) {
        errors.push(`Slide ${index + 1}: Missing theme`);
      }

      // Check render status
      if (slide.renderStatus === 'error') {
        errors.push(`Slide ${index + 1}: Render error`);
      }

      // Check charts have data
      slide.charts?.forEach((chart, chartIndex) => {
        if (!chart.data || chart.data.length === 0) {
          errors.push(
            `Slide ${index + 1}, Chart ${chartIndex + 1}: No data`,
          );
        }
      });
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
