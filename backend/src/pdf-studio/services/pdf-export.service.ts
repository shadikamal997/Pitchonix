import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as puppeteer from 'puppeteer';import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { TemplateType, getTemplateConfig, LayoutComponentType } from '../templates/template-configs';
import { LAYOUT_RENDERERS } from '../templates/layout-components';

const writeFile = promisify(fs.writeFile);
const unlink = promisify(fs.unlink);

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Export PDF document
   */
  async exportDocument(
    documentId: string,
    templateType: TemplateType,
  ): Promise<{ pdfBuffer: Buffer; filename: string }> {
    this.logger.log(`Exporting document ${documentId} with template ${templateType}`);

    // Get document and pages
    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: {
        pages: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!document) {
      throw new Error('Document not found');
    }

    // Get template configuration
    const templateConfig = getTemplateConfig(templateType);

    // Generate HTML
    const html = await this.generateHTML(document, templateConfig);

    // Convert to PDF using Puppeteer
    const pdfBuffer = await this.htmlToPDF(html);

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    this.logger.log(`PDF export complete: ${filename}`);

    return { pdfBuffer, filename };
  }

  /**
   * Generate HTML from document and template
   */
  private async generateHTML(document: any, templateConfig: any): Promise<string> {
    const { pages } = document;
    const { style } = templateConfig;

    // Initialize DOMPurify with jsdom
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);

    // Sanitize document title
    const safeTitle = purify.sanitize(document.title || 'Untitled Document');

    // Build page content
    const pageContent = pages
      .map((page: any, index: number) => {
        // Sanitize user-provided content to prevent XSS
        const rawContent = page.content?.text || '';
        const rawTitle = page.title || '';
        
        const content = purify.sanitize(rawContent);
        const title = purify.sanitize(rawTitle);

        return LAYOUT_RENDERERS[LayoutComponentType.SECTION_CARD].render(
          { title, content },
          style,
        );
      })
      .join('');

    // Add header
    const headerHTML = LAYOUT_RENDERERS[LayoutComponentType.HERO_HEADER].render(
      {
        title: document.title,
        description: document.outline?.detectedType || '',
      },
      style,
    );

    // Add footer
    const footerHTML = LAYOUT_RENDERERS[LayoutComponentType.FOOTER_BLOCK].render(
      {
        companyName: '',
        contact: '',
        pageNumber: 1,
        totalPages: pages.length,
      },
      style,
    );

    // Complete HTML document
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${document.title}</title>
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            font-size: 16px;
            line-height: 1.6;
            color: #1F2937;
            background: #F9FAFB;
          }
          
          .page-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: 20mm;
            background: white;
          }
          
          @media print {
            body {
              background: white;
            }
            .page-container {
              padding: 0;
            }
          }
          
          h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.2;
          }
          
          p {
            margin-bottom: 16px;
          }
          
          .hero-header,
          .section-card,
          .conclusion-block,
          .footer-block,
          .metrics-strip,
          .process-steps,
          .table-block,
          .chart-block,
          .timeline-block,
          .case-study-block,
          .quote-block,
          .image-block,
          .text-block {
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          ${headerHTML}
          ${pageContent}
          ${footerHTML}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Convert HTML to PDF using Puppeteer
   */
  private async htmlToPDF(html: string): Promise<Buffer> {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });

    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '15mm',
          bottom: '20mm',
          left: '15mm',
        },
      });

      return Buffer.from(pdfBuffer as Uint8Array);
    } finally {
      await browser.close();
    }
  }
}
