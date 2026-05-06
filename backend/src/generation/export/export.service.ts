import { Injectable, Logger } from '@nestjs/common';
import { VisualSlideContent } from '../visual/types';
import { PowerPointExportService } from './powerpoint-export.service';
import { PDFExportService } from './pdf-export.service';
import { HTMLPreviewService } from './html-preview.service';

/**
 * Export formats
 */
export enum ExportFormat {
  PPTX = 'pptx',
  PDF = 'pdf',
  HTML = 'html',
}

/**
 * Export options
 */
export interface ExportOptions {
  format: ExportFormat;
  title?: string;
  author?: string;
  company?: string;
  fileName?: string;
  // PDF-specific
  pageSize?: 'A4' | 'Letter' | 'Legal';
  landscape?: boolean;
  // HTML-specific
  includeControls?: boolean;
}

/**
 * Export result
 */
export interface ExportResult {
  format: ExportFormat;
  buffer: Buffer;
  fileName: string;
  size: number;
  slideCount: number;
}

/**
 * Main Export Service
 * Orchestrates all export formats
 */
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private powerPointExportService: PowerPointExportService,
    private pdfExportService: PDFExportService,
    private htmlPreviewService: HTMLPreviewService,
  ) {}

  /**
   * Export presentation in specified format
   */
  async export(
    slides: VisualSlideContent[],
    options: ExportOptions,
  ): Promise<ExportResult> {
    this.logger.log(
      `Exporting ${slides.length} slides to ${options.format}`,
    );

    try {
      let buffer: Buffer;
      let fileName: string;

      switch (options.format) {
        case ExportFormat.PPTX:
          buffer = await this.exportPowerPoint(slides, options);
          fileName = options.fileName || 'presentation.pptx';
          break;

        case ExportFormat.PDF:
          buffer = await this.exportPDF(slides, options);
          fileName = options.fileName || 'presentation.pdf';
          break;

        case ExportFormat.HTML:
          buffer = await this.exportHTML(slides, options);
          fileName = options.fileName || 'presentation.html';
          break;

        default:
          throw new Error(`Unsupported export format: ${options.format}`);
      }

      const result: ExportResult = {
        format: options.format,
        buffer,
        fileName,
        size: buffer.length,
        slideCount: slides.length,
      };

      this.logger.log(
        `Export complete: ${fileName} (${this.formatBytes(result.size)})`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Export failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`Export failed: ${error.message}`);
    }
  }

  /**
   * Export to PowerPoint
   */
  private async exportPowerPoint(
    slides: VisualSlideContent[],
    options: ExportOptions,
  ): Promise<Buffer> {
    return this.powerPointExportService.exportToPowerPoint(slides, {
      title: options.title,
      author: options.author,
      company: options.company,
    });
  }

  /**
   * Export to PDF
   */
  private async exportPDF(
    slides: VisualSlideContent[],
    options: ExportOptions,
  ): Promise<Buffer> {
    return this.pdfExportService.exportToPDF(slides, {
      title: options.title,
      pageSize: options.pageSize,
      landscape: options.landscape,
    });
  }

  /**
   * Export to HTML
   */
  private async exportHTML(
    slides: VisualSlideContent[],
    options: ExportOptions,
  ): Promise<Buffer> {
    const html = await this.htmlPreviewService.generateHTML(slides, {
      title: options.title,
      includeControls: options.includeControls ?? true,
    });
    return Buffer.from(html, 'utf-8');
  }

  /**
   * Export to multiple formats
   */
  async exportMultiple(
    slides: VisualSlideContent[],
    formats: ExportFormat[],
    baseOptions?: Partial<ExportOptions>,
  ): Promise<ExportResult[]> {
    const results: ExportResult[] = [];

    for (const format of formats) {
      const options: ExportOptions = {
        ...baseOptions,
        format,
      };
      const result = await this.export(slides, options);
      results.push(result);
    }

    return results;
  }

  /**
   * Export to file system
   */
  async exportToFile(
    slides: VisualSlideContent[],
    filePath: string,
    options: Omit<ExportOptions, 'fileName'>,
  ): Promise<void> {
    const fs = require('fs').promises;

    switch (options.format) {
      case ExportFormat.PPTX:
        await this.powerPointExportService.exportToFile(
          slides,
          filePath,
          {
            title: options.title,
            author: options.author,
            company: options.company,
          },
        );
        break;

      case ExportFormat.PDF:
        await this.pdfExportService.exportToFile(slides, filePath, {
          title: options.title,
          pageSize: options.pageSize,
          landscape: options.landscape,
        });
        break;

      case ExportFormat.HTML:
        await this.htmlPreviewService.generateToFile(slides, filePath, {
          title: options.title,
          includeControls: options.includeControls,
        });
        break;

      default:
        throw new Error(`Unsupported export format: ${options.format}`);
    }

    this.logger.log(`Exported to file: ${filePath}`);
  }

  /**
   * Get export info without generating
   */
  getExportInfo(slides: VisualSlideContent[]): {
    slideCount: number;
    chartsCount: number;
    imagesCount: number;
    estimatedSizes: Record<ExportFormat, string>;
  } {
    const chartsCount = slides.reduce(
      (sum, s) => sum + (s.charts?.length || 0),
      0,
    );
    const imagesCount = slides.reduce(
      (sum, s) => sum + (s.images?.length || 0),
      0,
    );

    // Rough estimates
    const baseSize = slides.length * 50 * 1024; // 50KB per slide
    const chartSize = chartsCount * 200 * 1024; // 200KB per chart
    const imageSize = imagesCount * 100 * 1024; // 100KB per image

    return {
      slideCount: slides.length,
      chartsCount,
      imagesCount,
      estimatedSizes: {
        [ExportFormat.PPTX]: this.formatBytes(
          baseSize + chartSize + imageSize,
        ),
        [ExportFormat.PDF]: this.formatBytes(
          baseSize * 0.8 + chartSize * 0.6 + imageSize * 0.5,
        ),
        [ExportFormat.HTML]: this.formatBytes(
          baseSize * 0.3 + chartSize * 0.8 + imageSize * 0.2,
        ),
      },
    };
  }

  /**
   * Format bytes to human-readable string
   */
  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Cleanup resources (close browser, etc.)
   */
  async cleanup(): Promise<void> {
    await this.pdfExportService.cleanup();
    this.logger.log('Export service cleanup complete');
  }
}
