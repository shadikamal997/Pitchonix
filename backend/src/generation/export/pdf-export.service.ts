import { Injectable, Logger } from '@nestjs/common';
import puppeteer, { Browser, Page } from 'puppeteer';
import { VisualSlideContent } from '../visual/types';
import { HTMLPreviewService } from './html-preview.service';

/**
 * PDF Export Service
 * Exports presentations to PDF format using Puppeteer
 */
@Injectable()
export class PDFExportService {
  private readonly logger = new Logger(PDFExportService.name);
  private browser: Browser | null = null;

  constructor(private htmlPreviewService: HTMLPreviewService) {}

  /**
   * Initialize browser instance
   */
  private async getBrowser(): Promise<Browser> {
    if (!this.browser) {
      this.browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    }
    return this.browser;
  }

  /**
   * Export slides to PDF
   */
  async exportToPDF(
    slides: VisualSlideContent[],
    options?: {
      title?: string;
      pageSize?: 'A4' | 'Letter' | 'Legal';
      landscape?: boolean;
    },
  ): Promise<Buffer> {
    let page: Page | null = null;

    try {
      // Generate HTML content
      const html = await this.htmlPreviewService.generateHTML(slides, {
        title: options?.title,
        forPrint: true,
      });

      // Launch browser and create page
      const browser = await this.getBrowser();
      page = await browser.newPage();

      // Set viewport
      await page.setViewport({
        width: 1920,
        height: 1080,
      });

      // Load HTML content
      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      // Generate PDF
      const pdfBuffer = await page.pdf({
        format: options?.pageSize || 'A4',
        landscape: options?.landscape ?? true,
        printBackground: true,
        margin: {
          top: '0.5in',
          right: '0.5in',
          bottom: '0.5in',
          left: '0.5in',
        },
        preferCSSPageSize: true,
      });

      this.logger.log(
        `PDF generated: ${slides.length} slides, ${pdfBuffer.length} bytes`,
      );

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `PDF export failed: ${error.message}`,
        error.stack,
      );
      throw new Error(`PDF export failed: ${error.message}`);
    } finally {
      if (page) {
        await page.close();
      }
    }
  }

  /**
   * Export to file
   */
  async exportToFile(
    slides: VisualSlideContent[],
    filePath: string,
    options?: {
      title?: string;
      pageSize?: 'A4' | 'Letter' | 'Legal';
      landscape?: boolean;
    },
  ): Promise<void> {
    const fs = require('fs').promises;
    const buffer = await this.exportToPDF(slides, options);
    await fs.writeFile(filePath, buffer);
    this.logger.log(`PDF saved to: ${filePath}`);
  }

  /**
   * Close browser instance
   */
  async cleanup(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.logger.log('Browser instance closed');
    }
  }

  /**
   * Generate PDF with custom options
   */
  async exportToPDFAdvanced(
    slides: VisualSlideContent[],
    options: {
      title?: string;
      width?: number;
      height?: number;
      scale?: number;
      displayHeaderFooter?: boolean;
      headerTemplate?: string;
      footerTemplate?: string;
    },
  ): Promise<Buffer> {
    let page: Page | null = null;

    try {
      const html = await this.htmlPreviewService.generateHTML(slides, {
        title: options.title,
        forPrint: true,
      });

      const browser = await this.getBrowser();
      page = await browser.newPage();

      await page.setViewport({
        width: options.width || 1920,
        height: options.height || 1080,
      });

      await page.setContent(html, {
        waitUntil: 'networkidle0',
      });

      const pdfBuffer = await page.pdf({
        width: options.width || 1920,
        height: options.height || 1080,
        printBackground: true,
        scale: options.scale || 1,
        displayHeaderFooter: options.displayHeaderFooter || false,
        headerTemplate: options.headerTemplate || '',
        footerTemplate: options.footerTemplate || '',
      });

      return Buffer.from(pdfBuffer);
    } catch (error) {
      this.logger.error(
        `Advanced PDF export failed: ${error.message}`,
      );
      throw error;
    } finally {
      if (page) {
        await page.close();
      }
    }
  }
}
