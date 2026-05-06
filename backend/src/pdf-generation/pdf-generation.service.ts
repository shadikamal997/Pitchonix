import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as puppeteer from 'puppeteer';
import * as path from 'path';
import * as fs from 'fs/promises';

export interface GeneratePdfOptions {
  documentId: string;
  format?: 'A4' | 'Letter';
  orientation?: 'portrait' | 'landscape';
  margin?: {
    top?: string;
    right?: string;
    bottom?: string;
    left?: string;
  };
  printBackground?: boolean;
  displayHeaderFooter?: boolean;
}

@Injectable()
export class PdfGenerationService {
  private readonly logger = new Logger(PdfGenerationService.name);
  
  constructor(private prisma: PrismaService) {}

  async generatePdf(options: GeneratePdfOptions): Promise<string> {
    const { documentId } = options;

    this.logger.log(`Starting PDF generation for document ${documentId}`);

    // Create export record
    const exportRecord = await this.prisma.pdfExport.create({
      data: {
        documentId,
        status: 'processing',
        progress: 0,
      },
    });

    try {
      // Get document with all pages
      const document = await this.prisma.pdfDocument.findUnique({
        where: { id: documentId },
        include: {
          project: true,
          brandKit: true,
          pages: {
            orderBy: { order: 'asc' },
            include: {
              template: true,
            },
          },
        },
      });

      if (!document) {
        throw new Error(`Document ${documentId} not found`);
      }

      // Update progress
      await this.prisma.pdfExport.update({
        where: { id: exportRecord.id },
        data: { progress: 10 },
      });

      // Generate HTML content from pages
      const htmlContent = await this.generateHtmlFromPages(document);

      // Update progress
      await this.prisma.pdfExport.update({
        where: { id: exportRecord.id },
        data: { progress: 40 },
      });

      // Launch Puppeteer and generate PDF
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });

      const page = await browser.newPage();

      // Set HTML content
      await page.setContent(htmlContent, {
        waitUntil: 'networkidle0',
      });

      // Update progress
      await this.prisma.pdfExport.update({
        where: { id: exportRecord.id },
        data: { progress: 60 },
      });

      // Ensure output directory exists
      const outputDir = path.join(process.cwd(), 'exports', 'pdfs');
      await fs.mkdir(outputDir, { recursive: true });

      // Generate PDF file
      const fileName = `${documentId}-${Date.now()}.pdf`;
      const filePath = path.join(outputDir, fileName);

      await page.pdf({
        path: filePath,
        format: options.format || 'A4',
        printBackground: options.printBackground !== false,
        displayHeaderFooter: options.displayHeaderFooter || false,
        margin: options.margin || {
          top: '0mm',
          right: '0mm',
          bottom: '0mm',
          left: '0mm',
        },
      });

      await browser.close();

      // Update progress
      await this.prisma.pdfExport.update({
        where: { id: exportRecord.id },
        data: { progress: 90 },
      });

      // Get file stats
      const fileStats = await fs.stat(filePath);
      const fileSize = fileStats.size;

      // Update export record with success
      const finalExport = await this.prisma.pdfExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'completed',
          progress: 100,
          fileUrl: `/exports/pdfs/${fileName}`,
          fileSize,
          pageCount: document.pages.length,
          completedAt: new Date(),
        },
      });

      this.logger.log(`PDF generation completed for document ${documentId}`);

      return finalExport.fileUrl!;
    } catch (error) {
      this.logger.error(`PDF generation failed: ${error.message}`, error.stack);

      // Update export record with error
      await this.prisma.pdfExport.update({
        where: { id: exportRecord.id },
        data: {
          status: 'failed',
          error: error.message,
          completedAt: new Date(),
        },
      });

      throw error;
    }
  }

  private async generateHtmlFromPages(document: any): Promise<string> {
    const { pages, brandColor, accentColor, brandKit } = document;

    // Build CSS styles
    const styles = this.generateStyles(brandColor, accentColor, brandKit);

    // Build HTML for each page
    const pagesHtml = pages
      .map((page, index) => this.generatePageHtml(page, index, pages.length, document))
      .join('\n');

    // Complete HTML document
    return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${document.title}</title>
  <style>
    ${styles}
  </style>
</head>
<body>
  ${pagesHtml}
</body>
</html>
    `.trim();
  }

  private generateStyles(brandColor?: string, accentColor?: string, brandKit?: any): string {
    const primary = brandColor || brandKit?.primaryColor || '#8B5CF6';
    const accent = accentColor || brandKit?.secondaryColor || '#06B6D4';

    return `
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #1e293b;
  background: white;
}

.pdf-page {
  width: 210mm;
  height: 297mm;
  padding: 20mm;
  page-break-after: always;
  position: relative;
  background: white;
}

.pdf-page:last-child {
  page-break-after: auto;
}

.page-number {
  position: absolute;
  bottom: 15mm;
  right: 20mm;
  font-size: 10pt;
  color: #94a3b8;
}

h1 {
  font-size: 28pt;
  font-weight: bold;
  color: ${primary};
  margin-bottom: 12pt;
}

h2 {
  font-size: 18pt;
  font-weight: bold;
  color: #1e293b;
  margin-bottom: 8pt;
}

h3 {
  font-size: 14pt;
  font-weight: 600;
  color: #334155;
  margin-bottom: 6pt;
}

p {
  font-size: 11pt;
  line-height: 1.8;
  color: #475569;
  margin-bottom: 12pt;
}

.divider {
  width: 60pt;
  height: 3pt;
  background: linear-gradient(to right, ${primary}, ${accent});
  border-radius: 2pt;
  margin: 12pt 0;
}

.metric-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12pt;
  margin: 20pt 0;
}

.metric-card {
  padding: 16pt;
  border-radius: 8pt;
  background: linear-gradient(135deg, #f8fafc, #e2e8f0);
}

.metric-value {
  font-size: 32pt;
  font-weight: bold;
  color: ${primary};
}

.metric-label {
  font-size: 10pt;
  color: #64748b;
  margin-top: 4pt;
}

table {
  width: 100%;
  border-collapse: collapse;
  margin: 16pt 0;
}

th {
  background: ${primary};
  color: white;
  padding: 8pt 12pt;
  text-align: left;
  font-size: 10pt;
  font-weight: 600;
}

td {
  padding: 8pt 12pt;
  border-bottom: 1px solid #e2e8f0;
  font-size: 10pt;
  color: #475569;
}

tr:nth-child(even) td {
  background: #f8fafc;
}

.timeline-item {
  margin-bottom: 16pt;
  padding-left: 24pt;
  border-left: 2pt solid #e2e8f0;
  position: relative;
}

.timeline-dot {
  width: 12pt;
  height: 12pt;
  border-radius: 50%;
  background: ${primary};
  position: absolute;
  left: -7pt;
  top: 2pt;
}

.badge {
  display: inline-block;
  padding: 4pt 8pt;
  border-radius: 4pt;
  font-size: 9pt;
  font-weight: 600;
}

.badge-primary {
  background: ${primary}20;
  color: ${primary};
}
    `.trim();
  }

  private generatePageHtml(page: any, index: number, totalPages: number, document: any): string {
    const { pageType, title, content } = page;

    // Generate page-specific HTML based on type
    let pageContent = '';

    switch (pageType) {
      case 'cover':
        pageContent = this.generateCoverPageHtml(content, document);
        break;
      case 'toc':
        pageContent = this.generateTocPageHtml(content);
        break;
      case 'executive_summary':
        pageContent = this.generateExecutiveSummaryHtml(content);
        break;
      case 'section_divider':
        pageContent = this.generateSectionDividerHtml(content);
        break;
      case 'content':
      case 'two_column':
        pageContent = this.generateContentPageHtml(content, title);
        break;
      case 'metrics':
        pageContent = this.generateMetricsPageHtml(content, title);
        break;
      case 'chart':
        pageContent = this.generateChartPageHtml(content, title);
        break;
      case 'financial_table':
        pageContent = this.generateFinancialTableHtml(content, title);
        break;
      case 'timeline':
        pageContent = this.generateTimelineHtml(content, title);
        break;
      case 'case_study':
        pageContent = this.generateCaseStudyHtml(content);
        break;
      case 'conclusion':
        pageContent = this.generateConclusionHtml(content);
        break;
      default:
        pageContent = `<h1>${title || 'Page Content'}</h1><p>Content here</p>`;
    }

    return `
<div class="pdf-page">
  ${pageContent}
  ${index < totalPages - 1 ? `<div class="page-number">Page ${index + 1} of ${totalPages}</div>` : ''}
</div>
    `.trim();
  }

  private generateCoverPageHtml(content: any, document: any): string {
    return `
<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center;">
  <h1 style="font-size: 48pt; margin-bottom: 16pt;">${content.title || document.title}</h1>
  ${content.subtitle ? `<h2 style="font-size: 18pt; color: #64748b;">${content.subtitle}</h2>` : ''}
  ${content.date ? `<p style="margin-top: 24pt; font-size: 12pt; color: #94a3b8;">${content.date}</p>` : ''}
</div>
    `.trim();
  }

  private generateTocPageHtml(content: any): string {
    const items = content.items || [];
    return `
<h1>Table of Contents</h1>
<div class="divider"></div>
<div style="margin-top: 24pt;">
  ${items.map((item: any) => `
    <div style="display: flex; justify-content: space-between; margin-bottom: 12pt; padding-bottom: 8pt; border-bottom: 1px dotted #e2e8f0;">
      <span style="font-size: 12pt; ${item.level === 2 ? 'padding-left: 16pt;' : ''}">${item.title}</span>
      <span style="font-size: 12pt; color: #94a3b8;">${item.pageNumber}</span>
    </div>
  `).join('')}
</div>
    `.trim();
  }

  private generateExecutiveSummaryHtml(content: any): string {
    return `
<h1>${content.title || 'Executive Summary'}</h1>
<div class="divider"></div>
${content.content ? `<p>${content.content}</p>` : ''}
${content.highlights && content.highlights.length > 0 ? `
  <h3 style="margin-top: 24pt;">Key Highlights</h3>
  <ul style="margin-top: 12pt; padding-left: 20pt;">
    ${content.highlights.map((h: string) => `<li style="margin-bottom: 8pt; font-size: 11pt;">${h}</li>`).join('')}
  </ul>
` : ''}
    `.trim();
  }

  private generateSectionDividerHtml(content: any): string {
    return `
<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center;">
  ${content.sectionNumber ? `<div class="badge badge-primary" style="margin-bottom: 16pt; font-size: 14pt;">Section ${content.sectionNumber}</div>` : ''}
  <h1 style="font-size: 42pt;">${content.title}</h1>
  ${content.subtitle ? `<p style="margin-top: 12pt; font-size: 14pt; color: #64748b;">${content.subtitle}</p>` : ''}
</div>
    `.trim();
  }

  private generateContentPageHtml(content: any, title?: string): string {
    return `
${title ? `<h1>${title}</h1><div class="divider"></div>` : ''}
${content.content ? `<p>${content.content}</p>` : ''}
    `.trim();
  }

  private generateMetricsPageHtml(content: any, title?: string): string {
    const metrics = content.metrics || [];
    return `
${title ? `<h1>${title}</h1><div class="divider"></div>` : ''}
<div class="metric-grid">
  ${metrics.map((m: any) => `
    <div class="metric-card">
      <div class="metric-value">${m.value}</div>
      <div class="metric-label">${m.label}</div>
    </div>
  `).join('')}
</div>
    `.trim();
  }

  private generateChartPageHtml(content: any, title?: string): string {
    return `
${title ? `<h1>${title}</h1><div class="divider"></div>` : ''}
<div style="margin-top: 24pt; text-align: center;">
  ${content.chartImage ? `<img src="${content.chartImage}" style="max-width: 100%; height: auto;" />` : '<p>Chart placeholder</p>'}
</div>
    `.trim();
  }

  private generateFinancialTableHtml(content: any, title?: string): string {
    const headers = content.headers || [];
    const rows = content.rows || [];
    
    return `
${title ? `<h1>${title}</h1><div class="divider"></div>` : ''}
<table>
  <thead>
    <tr>
      ${headers.map((h: string) => `<th>${h}</th>`).join('')}
    </tr>
  </thead>
  <tbody>
    ${rows.map((row: any) => `
      <tr>
        <td style="${row.isBold ? 'font-weight: 600;' : ''}">${row.label}</td>
        ${row.values.map((v: any) => `<td style="text-align: right; ${row.isBold ? 'font-weight: 600;' : ''}">${v}</td>`).join('')}
      </tr>
    `).join('')}
  </tbody>
</table>
    `.trim();
  }

  private generateTimelineHtml(content: any, title?: string): string {
    const events = content.events || [];
    return `
${title ? `<h1>${title}</h1><div class="divider"></div>` : ''}
<div style="margin-top: 24pt;">
  ${events.map((event: any) => `
    <div class="timeline-item">
      <div class="timeline-dot"></div>
      <div class="badge badge-primary" style="margin-bottom: 8pt;">${event.date}</div>
      <h3>${event.title}</h3>
      <p style="font-size: 10pt;">${event.description}</p>
    </div>
  `).join('')}
</div>
    `.trim();
  }

  private generateCaseStudyHtml(content: any): string {
    return `
<h1>Case Study: ${content.customerName}</h1>
<div class="divider"></div>
<h2 style="color: #ef4444; margin-top: 24pt;">Challenge</h2>
<p>${content.challenge}</p>
<h2 style="margin-top: 20pt;">Solution</h2>
<p>${content.solution}</p>
<h2 style="color: #10b981; margin-top: 20pt;">Results</h2>
<div class="metric-grid">
  ${(content.results || []).map((r: string) => `
    <div class="metric-card">
      <p style="font-weight: 600; color: #059669;">${r}</p>
    </div>
  `).join('')}
</div>
    `.trim();
  }

  private generateConclusionHtml(content: any): string {
    return `
<div style="display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; text-align: center;">
  <h1 style="font-size: 48pt;">${content.title || 'Thank You'}</h1>
  ${content.message ? `<p style="margin-top: 16pt; font-size: 14pt; max-width: 600px;">${content.message}</p>` : ''}
  ${content.callToAction ? `<div class="badge badge-primary" style="margin-top: 24pt; padding: 12pt 24pt; font-size: 12pt;">${content.callToAction}</div>` : ''}
</div>
    `.trim();
  }

  async getExportStatus(exportId: string) {
    return this.prisma.pdfExport.findUnique({
      where: { id: exportId },
    });
  }

  async getDocumentExports(documentId: string) {
    return this.prisma.pdfExport.findMany({
      where: { documentId },
      orderBy: { createdAt: 'desc' },
    });
  }
}
