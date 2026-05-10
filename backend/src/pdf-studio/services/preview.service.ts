import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VisualCompositionService } from './visual-composition.service';
import { LAYOUT_RENDERERS, LayoutComponentType } from '../templates/layout-components';
import { getTemplateConfig } from '../templates/template-configs';
import { ProTemplateRendererService } from '../pro-templates/renderers/pro-template-renderer.service';
import * as DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { marked } from 'marked';

interface PreviewCache {
  html: string;
  timestamp: number;
  documentId: string;
}

@Injectable()
export class PreviewService {
  private readonly logger = new Logger(PreviewService.name);
  private cache = new Map<string, PreviewCache>();
  private readonly CACHE_TTL = 30000; // 30 seconds

  constructor(
    private prisma: PrismaService,
    private visualCompositionService: VisualCompositionService,
    private proTemplateRendererService: ProTemplateRendererService,
  ) {
    // Clean cache every minute
    setInterval(() => this.cleanCache(), 60000);
  }

  /**
   * Generate live preview HTML for a document (no Puppeteer)
   */
  async generatePreview(documentId: string, useCache = true, colorScheme?: string, templateTypeOverride?: string, proTemplateId?: string | null): Promise<string> {
    try {
      const cacheKey = [
        documentId,
        colorScheme || 'default-color',
        templateTypeOverride || 'stored-template',
        proTemplateId || 'basic-template',
      ].join(':');

      // Check cache first
      if (useCache) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          this.logger.log(`Preview cache hit for document ${documentId}`);
          return cached;
        }
      }

      this.logger.log(`Generating preview for document ${documentId}`);

      // Fetch document with pages
      const document = await this.prisma.pdfDocument.findUnique({
        where: { id: documentId },
        include: {
          pages: {
            orderBy: { order: 'asc' },
          },
        },
      });

      if (!document) {
        throw new NotFoundException('Document not found');
      }

      // Generate HTML (same as export but without Puppeteer)
      const html = await this.generatePreviewHTML(document, colorScheme, templateTypeOverride, proTemplateId);

      // Store in cache
      this.setCache(cacheKey, html);

      return html;
    } catch (error) {
      this.logger.error(`Preview generation failed for ${documentId}`, error);
      throw error;
    }
  }

  /**
   * Generate preview HTML (similar to PDF export but optimized for browser)
   */
  private async generatePreviewHTML(document: any, colorScheme?: string, templateTypeOverride?: string, proTemplateId?: string | null): Promise<string> {
    const { pages } = document;

    // Initialize DOMPurify
    const window = new JSDOM('').window;
    const purify = DOMPurify(window as any);

    const safeTitle = purify.sanitize(document.title || 'Untitled Document');

    // Determine template and style
    const templateType = templateTypeOverride || document.metadata?.templateType || 'modern_one_pager';
    const templateConfig = getTemplateConfig(templateType as any);
    const style = {
      ...templateConfig.style,
      ...(colorScheme ? { colorScheme } : {}),
    };

    // Check if visual document
    const isVisualDocument = this.isVisualDocumentType(document.documentType);

    let pagesHTML = '';

    const useProTemplate = this.proTemplateRendererService.canRender(proTemplateId);

    if (useProTemplate) {
      pagesHTML = this.proTemplateRendererService.renderDocument(document, proTemplateId!, 'preview');
    } else if (isVisualDocument) {
      pagesHTML = await this.generateVisualPages(pages, style, purify, document.metadata);
    } else {
      pagesHTML = this.generateStructuredPages(pages, style, purify, document);
    }

    // Complete HTML with preview-optimized styles — each page is its own A4 container
    const html = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle} - Preview</title>
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
            background: #525659;
          }

          .preview-container {
            padding: 20px 0 40px;
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 16px;
          }

          /* Each page is a distinct A4 sheet */
          .a4-page {
            width: 210mm;
            min-height: 297mm;
            padding: 20mm;
            background: white;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
            position: relative;
          }
          ${useProTemplate ? this.proTemplateRendererService.getStyles(proTemplateId!) : ''}

          /* Visual composition already sized at 210mm × 297mm */
          .visual-composition {
            position: relative;
            width: 210mm;
            min-height: 297mm;
            overflow: hidden;
            box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
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

          /* Preview badge */
          .preview-badge {
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            letter-spacing: 0.5px;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
            z-index: 9999;
            pointer-events: none;
          }
        </style>
      </head>
      <body>
        <div class="preview-badge">LIVE PREVIEW</div>
        <div class="preview-container">
          ${pagesHTML}
        </div>
      </body>
      </html>
    `;

    return html;
  }

  /**
   * Check if document type is visual
   */
  private isVisualDocumentType(documentType: string): boolean {
    const visualTypes = [
      'business_flyer',
      'modern_one_pager',
      'marketing_flyer',
      'startup_overview',
      'promotional_sheet',
      'visual_document',
      'case_study_sheet',
      'corporate_brochure',
      'executive_handout',
      'product_flyer',
      'brand_overview',
    ];
    return visualTypes.includes(documentType);
  }

  /**
   * Generate visual pages using visual composition service
   */
  private async generateVisualPages(pages: any[], style: any, purify: any, metadata: any): Promise<string> {
    let html = '';

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const content = page.content as any;
      
      // Determine composition config
      const compositionConfig = {
        layoutType: content.layoutType || metadata?.layoutType || 'hero',
        hasImages: !!content.images?.length || !!content.heroImage,
        hasCharts: !!content.charts?.length,
        colorScheme: style.colorScheme || 'blue',
        visualStyle: content.visualStyle || metadata?.visualStyle || 'modern',
      };

      // Convert markdown to HTML and sanitize
      const bodyHtml = this.convertMarkdownToHtml(content.text || '');
      
      // Generate visual layout
      const visualLayout = this.visualCompositionService.generateVisualLayout(
        {
          title: purify.sanitize(page.title || ''),
          subtitle: purify.sanitize(content.subtitle || ''),
          body: purify.sanitize(bodyHtml),
          bullets: content.bullets || [],
          sections: content.sections || [],
          heroImage: content.heroImage || '',
          image: content.image || '',
          images: content.images || [],
          cta: content.cta || '',
        },
        compositionConfig,
      );

      // Render to HTML — visual-composition already has 210mm × 297mm sizing
      html += this.visualCompositionService.renderToHTML(visualLayout);
    }

    return html;
  }

  /**
   * Generate structured pages — each page gets its own A4-sized div.
   * Skips empty TOC pages and renders cover pages with CoverPageLayout.
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
        if (!tocContent.trim()) continue; // skip if still empty

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

        parts.push(`<div class="a4-page">
          <div style="margin-bottom:24px;"><h2 style="font-size:24px;font-weight:700;color:#111827;border-bottom:3px solid ${style.primaryColor || '#2563EB'};padding-bottom:8px;">Table of Contents</h2></div>
          <div>${tocHtml}</div>
          ${footerHTML}
        </div>`);
        pageIndex++;
        continue;
      }

      if (pageType === 'cover') {
        let coverData: any = {};
        try { coverData = JSON.parse(page.content?.text || '{}'); } catch (_) {
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
        parts.push(`<div class="a4-page" style="padding:0;">${coverHtml}</div>`);
        pageIndex++;
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

      // Charts rendered as inline SVG bar charts
      const chartsHtml = this.renderChartsHtml(page.content?.charts || [], style);

      const sectionCard = LAYOUT_RENDERERS[LayoutComponentType.SECTION_CARD].render(
        { title, content: `<div style="${textStyles}">${content}</div>` + imageHtml + chartsHtml },
        style,
      );

      parts.push(`<div class="a4-page">${headerHTML}${sectionCard}${footerHTML}</div>`);
      pageIndex++;
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

  /**
   * Render chart configs as inline SVG HTML (no external deps — works in Puppeteer).
   */
  private renderChartsHtml(charts: any[], style: any): string {
    if (!charts || charts.length === 0) return '';
    const primary = style?.primaryColor || '#2563EB';
    const chartHtmlList = charts.map(chart => {
      if (!chart || !chart.data?.length) return '';
      const title = chart.title || '';
      const color = chart.color || primary;
      const data: { label: string; value: number }[] = chart.data;
      const max = Math.max(...data.map((d: any) => Number(d.value) || 0), 1);

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
            <svg viewBox="0 0 100 100" width="120" height="120">
              ${slices}
              <circle cx="50" cy="50" r="18" fill="white"/>
            </svg>
            <div style="display:flex;flex-direction:column;gap:4px;">${legend}</div>
          </div>
        </div>`;
      }

      // Bar or Line — render as bar chart SVG
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
   * Convert markdown to HTML
   */
  private convertMarkdownToHtml(markdown: string): string {
    try {
      // Try to parse as JSON first (for cover pages)
      const parsed = JSON.parse(markdown);
      if (parsed && typeof parsed === 'object') {
        // Format JSON as HTML
        let html = '';
        if (parsed.title) html += `<h1>${parsed.title}</h1>`;
        if (parsed.subtitle) html += `<h2>${parsed.subtitle}</h2>`;
        if (parsed.date) html += `<p class="text-gray-600">${parsed.date}</p>`;
        return html || markdown;
      }
    } catch (e) {
      // Not JSON, treat as markdown
    }

    // Convert markdown to HTML using marked
    try {
      return marked.parse(markdown, { breaks: true, gfm: true }) as string;
    } catch (e) {
      this.logger.warn('Failed to parse markdown, returning raw text', e);
      // Fallback: basic HTML escaping and line breaks
      return markdown
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
  }

  /**
   * Cache management
   */
  private getFromCache(documentId: string): string | null {
    const cached = this.cache.get(documentId);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    if (age > this.CACHE_TTL) {
      this.cache.delete(documentId);
      return null;
    }

    return cached.html;
  }

  private setCache(documentId: string, html: string): void {
    this.cache.set(documentId, {
      html,
      timestamp: Date.now(),
      documentId,
    });
  }

  private cleanCache(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate cache for a document (call when document is updated)
   */
  invalidateCache(documentId: string): void {
    // Remove base key and all colorScheme variants
    for (const key of this.cache.keys()) {
      if (key === documentId || key.startsWith(`${documentId}:`)) {
        this.cache.delete(key);
      }
    }
    this.logger.log(`Cache invalidated for document ${documentId}`);
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}
