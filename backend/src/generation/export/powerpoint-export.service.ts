import { Injectable, Logger } from '@nestjs/common';
const PptxGenJS = require('pptxgenjs');
import { VisualSlideContent } from '../visual/types';
import { ChartRenderingService } from './chart-rendering.service';

/**
 * PowerPoint Export Service
 * Exports presentations to .pptx format
 */
@Injectable()
export class PowerPointExportService {
  private readonly logger = new Logger(PowerPointExportService.name);

  constructor(private chartRenderingService: ChartRenderingService) {}

  /**
   * Export slides to PowerPoint
   */
  async exportToPowerPoint(
    slides: VisualSlideContent[],
    options?: {
      title?: string;
      author?: string;
      company?: string;
    },
  ): Promise<Buffer> {
    try {
      const pptx = new PptxGenJS();

      // Set presentation properties
      pptx.layout = 'LAYOUT_16x9';
      pptx.author = options?.author || 'Pitchonix';
      pptx.company = options?.company || 'Pitchonix';
      pptx.title = options?.title || 'Presentation';
      pptx.subject = 'Generated Presentation';

      // Process each slide
      for (const slideContent of slides) {
        await this.addSlide(pptx, slideContent);
      }

      // Generate buffer
      const buffer = await pptx.write({ outputType: 'nodebuffer' });
      this.logger.log(
        `PowerPoint generated: ${slides.length} slides`,
      );
      return buffer as Buffer;
    } catch (error) {
      this.logger.error(
        `PowerPoint export failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`PowerPoint export failed: ${error.message}`);
    }
  }

  /**
   * Add a single slide to presentation
   */
  private async addSlide(
    pptx: any,
    slideContent: VisualSlideContent,
  ): Promise<void> {
    const slide = pptx.addSlide();

    // Apply background color from theme
    if (slideContent.theme.colors.background !== '#FFFFFF') {
      slide.background = {
        color: slideContent.theme.colors.background.replace('#', ''),
      };
    }

    // Add content based on layout type
    const layout = slideContent.layout;

    // Add title
    const titleRegion = layout.regions.find((r) => r.type === 'title');
    if (titleRegion && slideContent.title) {
      slide.addText(slideContent.title, {
        x: `${titleRegion.x}%`,
        y: `${titleRegion.y}%`,
        w: `${titleRegion.width}%`,
        h: `${titleRegion.height}%`,
        fontSize: slideContent.theme.fontSize.h1,
        bold: true,
        color: slideContent.theme.colors.text.replace('#', ''),
        align: titleRegion.textAlign || 'left',
        valign: this.mapVerticalAlign(titleRegion.verticalAlign),
        fontFace: slideContent.theme.fonts.heading.split(',')[0],
      });
    }

    // Add subtitle
    const subtitleRegion = layout.regions.find(
      (r) => r.type === 'subtitle',
    );
    if (subtitleRegion && slideContent.subtitle) {
      slide.addText(slideContent.subtitle, {
        x: `${subtitleRegion.x}%`,
        y: `${subtitleRegion.y}%`,
        w: `${subtitleRegion.width}%`,
        h: `${subtitleRegion.height}%`,
        fontSize: slideContent.theme.fontSize.h3,
        color: slideContent.theme.colors.textSecondary.replace('#', ''),
        align: subtitleRegion.textAlign || 'left',
        fontFace: slideContent.theme.fonts.body.split(',')[0],
      });
    }

    // Add content
    const contentRegion = layout.regions.find(
      (r) => r.type === 'content',
    );
    if (contentRegion && slideContent.content) {
      await this.addContent(slide, slideContent, contentRegion);
    }

    // Add charts
    const chartRegion = layout.regions.find((r) => r.type === 'chart');
    if (chartRegion && slideContent.charts && slideContent.charts.length > 0) {
      await this.addCharts(slide, slideContent.charts, chartRegion);
    }

    // Add speaker notes
    if (slideContent.speakerNotes) {
      slide.addNotes(slideContent.speakerNotes);
    }
  }

  /**
   * Add content to slide
   */
  private async addContent(
    slide: any,
    slideContent: VisualSlideContent,
    region: any,
  ): Promise<void> {
    const content = slideContent.content;

    // Handle different content types
    if (typeof content === 'string') {
      // Simple text content
      slide.addText(content, {
        x: `${region.x}%`,
        y: `${region.y}%`,
        w: `${region.width}%`,
        h: `${region.height}%`,
        fontSize: slideContent.theme.fontSize.body,
        color: slideContent.theme.colors.text.replace('#', ''),
        fontFace: slideContent.theme.fonts.body.split(',')[0],
      });
    } else if (Array.isArray(content)) {
      // Bullet points
      this.addBulletPoints(slide, content, region, slideContent.theme);
    } else if (typeof content === 'object') {
      // Structured content
      this.addStructuredContent(
        slide,
        content,
        region,
        slideContent.theme,
      );
    }
  }

  /**
   * Add bullet points
   */
  private addBulletPoints(
    slide: any,
    bullets: string[],
    region: any,
    theme: any,
  ): void {
    const bulletText = bullets
      .filter((b) => b && b.length > 0)
      .map((bullet) => ({
        text: bullet,
        options: {
          bullet: true,
          fontSize: theme.fontSize.body,
          color: theme.colors.text.replace('#', ''),
        },
      }));

    if (bulletText.length > 0) {
      slide.addText(bulletText, {
        x: `${region.x}%`,
        y: `${region.y}%`,
        w: `${region.width}%`,
        h: `${region.height}%`,
        fontFace: theme.fonts.body.split(',')[0],
      });
    }
  }

  /**
   * Add structured content (objects)
   */
  private addStructuredContent(
    slide: any,
    content: any,
    region: any,
    theme: any,
  ): void {
    // Extract key fields and format as bullet points
    const bullets: string[] = [];

    if (content.description) {
      bullets.push(content.description);
    }

    if (content.painPoints && Array.isArray(content.painPoints)) {
      bullets.push(...content.painPoints.slice(0, 5));
    }

    if (content.features && Array.isArray(content.features)) {
      bullets.push(...content.features.slice(0, 5));
    }

    if (content.keyBenefits && Array.isArray(content.keyBenefits)) {
      bullets.push(...content.keyBenefits.slice(0, 5));
    }

    if (bullets.length > 0) {
      this.addBulletPoints(slide, bullets, region, theme);
    }
  }

  /**
   * Add charts to slide
   */
  private async addCharts(
    slide: any,
    charts: any[],
    region: any,
  ): Promise<void> {
    // Render first chart only (multiple charts would require layout adjustment)
    if (charts.length > 0) {
      const chart = charts[0];
      try {
        // Render chart to base64 image
        const imageData =
          await this.chartRenderingService.renderChart(chart);

        // Add image to slide
        slide.addImage({
          data: imageData,
          x: `${region.x}%`,
          y: `${region.y}%`,
          w: `${region.width}%`,
          h: `${region.height}%`,
        });
      } catch (error) {
        this.logger.warn(
          `Failed to add chart to slide: ${error.message}`,
        );
      }
    }
  }

  /**
   * Map vertical alignment
   */
  private mapVerticalAlign(
    align?: 'top' | 'middle' | 'bottom',
  ): 'top' | 'middle' | 'bottom' {
    return align || 'top';
  }

  /**
   * Export to file
   */
  async exportToFile(
    slides: VisualSlideContent[],
    filePath: string,
    options?: {
      title?: string;
      author?: string;
      company?: string;
    },
  ): Promise<void> {
    const fs = require('fs').promises;
    const buffer = await this.exportToPowerPoint(slides, options);
    await fs.writeFile(filePath, buffer);
    this.logger.log(`PowerPoint saved to: ${filePath}`);
  }
}
