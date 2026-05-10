import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';
import { TemplateType, getTemplateConfig, LayoutComponentType } from '../templates/template-configs';
import { LAYOUT_RENDERERS } from '../templates/layout-components';
import { VisualCompositionService } from './visual-composition.service';
import { ChartRenderingService } from './chart-rendering.service';
import { BrowserPoolService } from './browser-pool.service';
import { ProTemplateRendererService } from '../pro-templates/renderers/pro-template-renderer.service';

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(
    private prisma: PrismaService,
    private visualCompositionService: VisualCompositionService,
    private chartRenderingService: ChartRenderingService,
    private browserPoolService: BrowserPoolService,
    private proTemplateRendererService: ProTemplateRendererService,
  ) {}

  /**
   * Export PDF document
   */
  async exportDocument(
    documentId: string,
    templateType: TemplateType,
    colorScheme?: string,
    proTemplateId?: string | null,
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
    const baseTemplateConfig = getTemplateConfig(templateType);
    const templateConfig = {
      ...baseTemplateConfig,
      style: {
        ...baseTemplateConfig.style,
        ...(colorScheme ? { colorScheme } : {}),
      },
    };

    // Generate HTML
    const html = await this.generateHTML(document, templateConfig, proTemplateId);

    // Convert to PDF using Puppeteer
    const pdfBuffer = await this.htmlToPDF(html);

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    this.logger.log(`PDF export complete: ${filename}`);

    return { pdfBuffer, filename };
  }

  /**
   * Generate HTML from document and template
   */
  private async generateHTML(document: any, templateConfig: any, proTemplateId?: string | null): Promise<string> {
    const { pages } = document;
    const { style } = templateConfig;

    // Initialize DOMPurify with jsdom
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);

    // Sanitize document title
    const safeTitle = purify.sanitize(document.title || 'Untitled Document');

    // Determine if this is a visual document (flyer, one-pager, marketing)
    const isVisualDocument = this.isVisualDocumentType(document.documentType);

    let pageContent = '';

    const useProTemplate = this.proTemplateRendererService.canRender(proTemplateId);

    if (useProTemplate) {
      pageContent = this.proTemplateRendererService.renderDocument(document, proTemplateId!, 'export');
    } else if (isVisualDocument) {
      // Use visual composition for visual documents
      pageContent = await this.generateVisualPages(pages, style, purify);
    } else {
      // Use traditional layout for structured documents
      pageContent = this.generateStructuredPages(pages, style, purify, document);
    }

    // Complete HTML document with modern, print-optimized styling
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
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
            background: ${isVisualDocument || useProTemplate ? 'white' : '#F9FAFB'};
          }
          ${useProTemplate ? this.proTemplateRendererService.getStyles(proTemplateId!) : ''}
          
          .page-container {
            max-width: 210mm;
            margin: 0 auto;
            padding: ${isVisualDocument || useProTemplate ? '0' : '20mm'};
            background: white;
          }
          
          @media print {
            body {
              background: white;
            }
            .page-container {
              padding: 0;
              max-width: none;
            }
            .page-break {
              page-break-before: always;
              break-before: page;
              height: 0;
              margin: 0;
              padding: 0;
            }
          }
          
          /* Typography */
          h1, h2, h3, h4, h5, h6 {
            font-weight: 600;
            line-height: 1.2;
            margin-bottom: 16px;
          }
          
          h1 { font-size: 36px; }
          h2 { font-size: 28px; }
          h3 { font-size: 22px; }
          
          p {
            margin-bottom: 16px;
            line-height: 1.6;
          }
          
          /* Prevent page breaks inside elements */
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
          .text-block,
          .visual-composition {
            page-break-inside: avoid;
          }
          
          /* Visual composition styles */
          .visual-composition {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            overflow: hidden;
          }
          
          /* Lists */
          ul, ol {
            margin: 16px 0;
            padding-left: 24px;
          }
          
          li {
            margin-bottom: 8px;
          }
          
          /* Images */
          img {
            max-width: 100%;
            height: auto;
            display: block;
          }
          
          /* Tables */
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          
          th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #E5E7EB;
          }
          
          th {
            background: #F3F4F6;
            font-weight: 600;
          }
        </style>
      </head>
      <body>
        <div class="page-container">
          ${pageContent}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Check if document type is visual (flyer, one-pager, etc.)
   */
  private isVisualDocumentType(documentType: string): boolean {
    const visualTypes = [
      'business_flyer',
      'modern_one_pager',
      'marketing_flyer',
      'startup_overview',
      'promotional_sheet',
      'visual_document',
    ];
    return visualTypes.includes(documentType);
  }

  /**
   * Generate visual pages using visual composition service
   */
  private async generateVisualPages(pages: any[], style: any, purify: any): Promise<string> {
    let html = '';

    for (const page of pages) {
      const content = page.content as any;
      
      // Determine composition config from page metadata
      const compositionConfig = {
        layoutType: content.layoutType || 'hero',
        hasImages: !!content.images || !!content.heroImage,
        hasCharts: !!content.charts,
        colorScheme: style.colorScheme || 'blue',
        visualStyle: style.visualStyle || 'modern',
      };

      // Generate visual layout
      const visualLayout = this.visualCompositionService.generateVisualLayout(
        {
          title: purify.sanitize(page.title || ''),
          subtitle: purify.sanitize(content.subtitle || ''),
          body: purify.sanitize(content.text || ''),
          bullets: content.bullets || [],
          sections: content.sections || [],
          heroImage: content.heroImage || '',
          image: content.image || '',
          images: content.images || [],
          cta: content.cta || '',
        },
        compositionConfig,
      );

      // Render to HTML
      html += this.visualCompositionService.renderToHTML(visualLayout);
      html += '<div class="page-break"></div>';
    }

    return html;
  }

  /**
   * Convert markdown (or JSON cover data) to HTML
   */
  private convertMarkdownToHtml(text: string): string {
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object') {
        let html = '';
        if (parsed.title) html += `<h1>${parsed.title}</h1>`;
        if (parsed.subtitle) html += `<h2 style="opacity:0.85;">${parsed.subtitle}</h2>`;
        if (parsed.date) html += `<p style="color:#6B7280;">${parsed.date}</p>`;
        return html || text;
      }
    } catch (_) { /* not JSON */ }
    try {
      return marked.parse(text, { breaks: true, gfm: true }) as string;
    } catch (_) {
      return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    }
  }

  /**
   * Generate structured pages using layout components.
   * Skips blank TOC pages, renders cover pages properly,
   * and converts markdown to HTML before sanitization.
   */
  private generateStructuredPages(pages: any[], style: any, purify: any, document?: any): string {
    let pageIndex = 0;
    let firstContentPage = true;
    const parts: string[] = [];
    const hasCoverPage = pages.some((p: any) => p.pageType === 'cover');
    const nonTocPages = pages.filter((p: any) => p.pageType !== 'toc');

    for (const page of pages) {
      const pageType = page.pageType || 'content';

      // Render TOC page with its populated content
      if (pageType === 'toc') {
        const tocContent = page.content?.text || '';
        if (!tocContent.trim()) continue;

        const tocHtml = tocContent
          .split('\n')
          .filter((line: string) => line.trim())
          .map((line: string) => `<div style="padding:6px 0;border-bottom:1px dotted #E5E7EB;font-size:14px;color:#374151;">${purify.sanitize(line)}</div>`)
          .join('');

        const footerHTML = document
          ? LAYOUT_RENDERERS[LayoutComponentType.FOOTER_BLOCK].render(
              { companyName: document.metadata?.companyName || '', contact: document.metadata?.contact || '', pageNumber: pageIndex + 1, totalPages: nonTocPages.length },
              style,
            )
          : '';

        const tocPageHtml = `<div style="margin-bottom:24px;"><h2 style="font-size:24px;font-weight:700;color:#111827;border-bottom:3px solid ${style.primaryColor || '#2563EB'};padding-bottom:8px;">Table of Contents</h2></div><div>${tocHtml}</div>${footerHTML}`;
        parts.push(pageIndex++ === 0 ? tocPageHtml : `<div class="page-break"></div>${tocPageHtml}`);
        continue;
      }

      if (pageType === 'cover') {
        let coverData: any = {};
        try {
          coverData = JSON.parse(page.content?.text || '{}');
        } catch (_) {
          coverData = { title: page.title || document?.title || '' };
        }
        const coverHtml = LAYOUT_RENDERERS[LayoutComponentType.COVER_PAGE].render(
          {
            title: purify.sanitize(document?.title || coverData.title || page.title || ''),
            subtitle: purify.sanitize(coverData.subtitle || document?.outline?.detectedType || ''),
            description: purify.sanitize(coverData.description || coverData.summary || ''),
            overview: Array.isArray(coverData.overview)
              ? coverData.overview.map((item: string) => purify.sanitize(item))
              : [],
            date: purify.sanitize(coverData.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
          },
          style,
        );
        parts.push(pageIndex++ === 0 ? coverHtml : `<div class="page-break"></div>${coverHtml}`);
        continue;
      }

      const htmlContent = page.content?.html || this.convertMarkdownToHtml(page.content?.text || '');
      const content = purify.sanitize(htmlContent);
      const title = purify.sanitize(page.title || '');
      const textStyles = this.buildTextStyle(page.content?.styles || {});

      // Header only on first content page when there is no cover page
      // (cover page already introduces the document title)
      const headerHTML = firstContentPage && document && !hasCoverPage
        ? LAYOUT_RENDERERS[LayoutComponentType.HERO_HEADER].render(
            { title: document.title, description: document.outline?.detectedType || '' },
            style,
          )
        : '';

      const footerHTML = document
        ? LAYOUT_RENDERERS[LayoutComponentType.FOOTER_BLOCK].render(
            {
              companyName: document.metadata?.companyName || '',
              contact: document.metadata?.contact || '',
              pageNumber: pageIndex + 1,
              totalPages: nonTocPages.length,
            },
            style,
          )
        : '';

      // Image block
      const imageUrl = page.content?.heroImage || page.content?.image || '';
      const imageHtml = imageUrl
        ? `<div style="margin:12px 0;border-radius:8px;overflow:hidden;max-height:200px;"><img src="${purify.sanitize(imageUrl)}" alt="page image" style="width:100%;height:200px;object-fit:cover;display:block;" /></div>`
        : '';

      // Charts as inline SVG
      const chartsHtml = this.renderChartsHtml(page.content?.charts || [], style);

      const card = LAYOUT_RENDERERS[LayoutComponentType.SECTION_CARD].render(
        { title, content: `<div style="${textStyles}">${content}</div>` + imageHtml + chartsHtml },
        style,
      );
      const pageHtml = `${headerHTML}${card}${footerHTML}`;

      parts.push(pageIndex++ === 0 ? pageHtml : `<div class="page-break"></div>${pageHtml}`);
      firstContentPage = false;
    }

    return parts.join('');
  }

  private buildTextStyle(styles: Record<string, any>): string {
    const rules: string[] = [];
    if (styles.fontFamily) rules.push(`font-family:${String(styles.fontFamily).replace(/[;"<>]/g, '')}`);
    if (styles.fontSize) rules.push(`font-size:${Math.max(10, Math.min(32, Number(styles.fontSize) || 16))}px`);
    if (styles.lineHeight) rules.push(`line-height:${Math.max(1.1, Math.min(2.2, Number(styles.lineHeight) || 1.6))}`);
    if (styles.color && /^#[0-9a-f]{6}$/i.test(styles.color)) rules.push(`color:${styles.color}`);
    if (['left', 'center', 'right', 'justify'].includes(styles.textAlign)) rules.push(`text-align:${styles.textAlign}`);
    if (['400', '500', '600', '700', 400, 500, 600, 700].includes(styles.fontWeight)) rules.push(`font-weight:${styles.fontWeight}`);
    if (styles.fontStyle === 'italic') rules.push('font-style:italic');
    if (styles.textDecoration === 'underline') rules.push('text-decoration:underline');
    return rules.join(';');
  }

  private renderChartsHtml(charts: any[], style: any): string {
    if (!charts || charts.length === 0) return '';
    const primary = style?.primaryColor || '#2563EB';
    const chartHtmlList = charts.map(chart => {
      if (!chart || !chart.data?.length) return '';
      const color = chart.color || primary;
      const data: { label: string; value: number }[] = chart.data;
      const max = Math.max(...data.map((d: any) => Number(d.value) || 0), 1);
      const title = chart.title || '';

      if (chart.type === 'kpi') {
        const cells = data.slice(0, 6).map(d =>
          `<div style="background:${color}15;border-radius:8px;padding:10px 14px;text-align:center;min-width:80px;">
            <div style="font-size:22px;font-weight:800;color:${color};">${d.value}</div>
            <div style="font-size:10px;color:#6B7280;margin-top:2px;">${d.label}</div>
          </div>`
        ).join('');
        return `<div style="margin:16px 0;">
          ${title ? `<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">${title}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:8px;">${cells}</div>
        </div>`;
      }

      if (chart.type === 'pie') {
        const COLORS = ['#2563EB','#7C3AED','#059669','#EA580C','#DB2777','#0D9488'];
        const total = data.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 1;
        let angle = 0;
        const slices = data.map((d: any, i: number) => {
          const slice = (Number(d.value) / total) * 360;
          const start = angle; angle += slice;
          const startR = (start * Math.PI) / 180;
          const endR = ((start + slice) * Math.PI) / 180;
          const x1 = 50 + 40 * Math.cos(startR); const y1 = 50 + 40 * Math.sin(startR);
          const x2 = 50 + 40 * Math.cos(endR);   const y2 = 50 + 40 * Math.sin(endR);
          const large = slice > 180 ? 1 : 0;
          return `<path d="M50 50 L${x1} ${y1} A40 40 0 ${large} 1 ${x2} ${y2} Z" fill="${COLORS[i % COLORS.length]}" opacity="0.85"/>`;
        }).join('');
        const legend = data.slice(0, 6).map((d: any, i: number) =>
          `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151;">
            <div style="width:8px;height:8px;border-radius:2px;background:${COLORS[i % COLORS.length]};flex-shrink:0;"></div>
            ${d.label} (${d.value})
          </div>`
        ).join('');
        return `<div style="margin:16px 0;">
          ${title ? `<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">${title}</div>` : ''}
          <div style="display:flex;align-items:center;gap:20px;">
            <svg viewBox="0 0 100 100" width="120" height="120">${slices}<circle cx="50" cy="50" r="18" fill="white"/></svg>
            <div style="display:flex;flex-direction:column;gap:4px;">${legend}</div>
          </div>
        </div>`;
      }

      const barW = Math.max(12, Math.floor(280 / data.length) - 4);
      const chartH = 80;
      const bars = data.map((d: any, i: number) => {
        const h = Math.round((Number(d.value) / max) * chartH);
        const x = i * (barW + 4);
        const y = chartH - h;
        return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${color}" opacity="0.82"/>
          <text x="${x + barW / 2}" y="${chartH + 12}" text-anchor="middle" font-size="8" fill="#6B7280">${d.label}</text>
          <text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="8" fill="${color}" font-weight="600">${d.value}</text>`;
      }).join('');
      const svgW = data.length * (barW + 4);
      return `<div style="margin:16px 0;">
        ${title ? `<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">${title}</div>` : ''}
        <svg viewBox="0 0 ${svgW} ${chartH + 20}" width="${Math.min(svgW, 380)}" height="${chartH + 20}" style="overflow:visible;">${bars}</svg>
      </div>`;
    });
    return chartHtmlList.join('');
  }

  /**
   * Convert HTML to PDF using Puppeteer with optimized settings
   */
  private async htmlToPDF(html: string): Promise<Buffer> {
    // Use browser pool for better performance
    return this.browserPoolService.executeWithBrowser(async (browser) => {
      const page = await browser.newPage();
      
      try {
        // Set viewport for consistent rendering
        await page.setViewport({
          width: 794, // A4 width in pixels at 96 DPI
          height: 1123, // A4 height in pixels at 96 DPI
          deviceScaleFactor: 2, // Higher quality rendering
        });
        
        await page.setContent(html, {
          waitUntil: ['domcontentloaded', 'load'],
          timeout: 60000,
        });

        // Wait for any images to load
        await page.evaluate(() => {
          return Promise.all(
            Array.from(document.images)
              .filter((img) => !img.complete)
              .map(
                (img) =>
                  new Promise((resolve, reject) => {
                    img.onload = resolve;
                    img.onerror = reject;
                    // Timeout after 5 seconds
                    setTimeout(resolve, 5000);
                  })
              )
          );
        });

        const pdfBuffer = await page.pdf({
          format: 'A4',
          printBackground: true,
          margin: {
            top: '15mm',
            right: '15mm',
            bottom: '15mm',
            left: '15mm',
          },
          preferCSSPageSize: false,
          displayHeaderFooter: false,
        });

        return Buffer.from(pdfBuffer as Uint8Array);
      } finally {
        await page.close();
      }
    });
  }
}
