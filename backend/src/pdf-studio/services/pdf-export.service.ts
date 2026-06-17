import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  TemplateType,
  getTemplateConfig,
  LayoutComponentType,
} from '../templates/template-configs';
import { LAYOUT_RENDERERS } from '../templates/layout-components';
import { VisualCompositionService } from './visual-composition.service';
import { ChartRenderingService } from './chart-rendering.service';
import { BrowserPoolService } from './browser-pool.service';
import { ProTemplateRendererService } from '../pro-templates/renderers/pro-template-renderer.service';
import { BrandKitService } from './brand-kit.service';

export interface PdfExportOptions {
  paperSize?: 'A4' | 'Letter' | 'A3' | 'Legal';
  quality?: 'standard' | 'high' | 'compressed';
  watermark?: {
    text: string;
    opacity?: number; // 0-1, default 0.12
    position?: 'center' | 'diagonal';
  };
  pageRange?: { from: number; to: number } | null;
}

@Injectable()
export class PdfExportService {
  private readonly logger = new Logger(PdfExportService.name);

  constructor(
    private prisma: PrismaService,
    private visualCompositionService: VisualCompositionService,
    private chartRenderingService: ChartRenderingService,
    private browserPoolService: BrowserPoolService,
    private proTemplateRendererService: ProTemplateRendererService,
    private brandKitService: BrandKitService,
  ) {}

  /**
   * Export PDF document
   */
  async exportDocument(
    documentId: string,
    templateType: TemplateType,
    colorScheme?: string,
    proTemplateId?: string | null,
    exportOptions?: PdfExportOptions,
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

    // Phase Ω.2 (P1#8) — apply the document's brand kit so its colors/fonts/logo
    // actually reach the renderer (previously metadata-only). An explicit
    // colorScheme query param still wins over the kit.
    if ((document as any).brandKitId && !colorScheme) {
      try {
        const kit = await this.brandKitService.getBrandKit(undefined, (document as any).brandKitId);
        templateConfig.style = this.brandKitService.applyBrandKitToStyle(templateConfig.style, kit);
      } catch (e: any) {
        this.logger.warn(
          `Brand kit ${(document as any).brandKitId} could not be applied: ${e?.message}`,
        );
      }
    }

    // Apply page range filter if specified
    if (exportOptions?.pageRange) {
      const { from, to } = exportOptions.pageRange;
      document.pages = document.pages.filter((_: any, i: number) => {
        const n = i + 1;
        return n >= from && n <= to;
      });
    }

    // Generate HTML
    const html = await this.generateHTML(document, templateConfig, proTemplateId, exportOptions);

    // Convert to PDF using Puppeteer
    const pdfBuffer = await this.htmlToPDF(
      html,
      exportOptions?.paperSize || 'A4',
      exportOptions?.quality || 'standard',
    );

    const filename = `${document.title.replace(/[^a-z0-9]/gi, '_')}.pdf`;

    this.logger.log(`PDF export complete: ${filename}`);

    return { pdfBuffer, filename };
  }

  /**
   * Generate HTML from document and template
   */
  private async generateHTML(
    document: any,
    templateConfig: any,
    proTemplateId?: string | null,
    exportOptions?: PdfExportOptions,
  ): Promise<string> {
    const { pages } = document;
    const { style } = templateConfig;

    // Load the sanitizer lazily. jsdom is ESM-heavy and breaks Jest when it is
    // pulled into the Nest module graph before any PDF export actually runs.
    const purify = await createPurifier();

    // Sanitize document title
    const safeTitle = purify.sanitize(document.title || 'Untitled Document');

    // Determine if this is a visual document (flyer, one-pager, marketing)
    const isVisualDocument = this.isVisualDocumentType(document.documentType);

    // Detect Arabic / RTL content to enable proper bidirectional rendering
    const isRtlDocument = this.hasRtlContent(pages);

    let pageContent = '';

    const useProTemplate = this.proTemplateRendererService.canRender(proTemplateId);

    if (useProTemplate) {
      pageContent = this.proTemplateRendererService.renderDocument(
        document,
        proTemplateId!,
        'export',
      );
    } else if (isVisualDocument) {
      // Use visual composition for visual documents
      pageContent = await this.generateVisualPages(pages, style, purify);
    } else {
      // Use traditional layout for structured documents — body composition is
      // now driven by the template's declared `layouts` (Phase Ω.2 P0#10).
      pageContent = this.generateStructuredPages(pages, style, purify, document, templateConfig, isRtlDocument);
    }

    // Complete HTML document with modern, print-optimized styling
    const rtlFontImport = isRtlDocument
      ? `<link rel="preconnect" href="https://fonts.googleapis.com">
         <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
         <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700;800&display=swap" rel="stylesheet">`
      : '';
    const html = `
      <!DOCTYPE html>
      <html lang="${isRtlDocument ? 'ar' : 'en'}" dir="${isRtlDocument ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${safeTitle}</title>
        ${rtlFontImport}
        <style>
          * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
          }

          body {
            font-family: ${isRtlDocument ? "'Cairo', 'Noto Sans Arabic', 'Tahoma', 'Arial Unicode MS', Arial, sans-serif" : "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"};
            font-size: 16px;
            line-height: ${isRtlDocument ? '1.8' : '1.6'};
            color: #1F2937;
            background: ${isVisualDocument || useProTemplate ? 'white' : '#F9FAFB'};
            direction: ${isRtlDocument ? 'rtl' : 'ltr'};
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
          
          /* RTL overrides */
          ${isRtlDocument ? `
          h1, h2, h3, h4, h5, h6, p, li, td, th, div {
            text-align: right;
          }
          ul, ol {
            padding-right: 24px;
            padding-left: 0;
          }
          .section-card {
            border-right: 4px solid;
            border-left: none !important;
          }
          .footer-block {
            flex-direction: row-reverse;
          }
          ` : ''}

          /* Signature blocks — keep all parties together */
          .signature-block {
            page-break-inside: avoid;
            break-inside: avoid;
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
        ${exportOptions?.watermark ? this.buildWatermarkHtml(exportOptions.watermark) : ''}
      </body>
      </html>
    `;

    return html;
  }

  private buildWatermarkHtml(wm: NonNullable<PdfExportOptions['watermark']>): string {
    const text = String(wm.text || 'DRAFT').replace(
      /[<>"'&]/g,
      (c) => ({ '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;', '&': '&amp;' })[c] || c,
    );
    const op = Math.max(0.03, Math.min(0.6, wm.opacity ?? 0.12));
    const isDiag = (wm.position || 'diagonal') === 'diagonal';
    return `<div style="position:fixed;inset:0;pointer-events:none;z-index:9999;display:flex;align-items:center;justify-content:center;overflow:hidden;">
      <span style="font-size:72px;font-weight:900;color:#111;opacity:${op};white-space:nowrap;${isDiag ? 'transform:rotate(-35deg);' : ''}letter-spacing:4px;user-select:none;">${text}</span>
    </div>`;
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
    } catch (_) {
      /* not JSON */
    }
    try {
      return basicMarkdownToHtml(text);
    } catch (_) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\n/g, '<br>');
    }
  }

  /**
   * Generate structured pages using layout components.
   * Skips blank TOC pages, renders cover pages properly,
   * and converts markdown to HTML before sanitization.
   */
  /**
   * Phase Ω.2 — choose the prose body component for content pages from the
   * template's declared `layouts`. This is what makes templates structurally
   * distinct (single card vs two-column vs flat text) while always preserving
   * the page's content (all three accept arbitrary prose).
   */
  private pickProseBody(templateConfig?: any): 'two_column' | 'text' | 'card' {
    const layouts: LayoutComponentType[] = templateConfig?.layouts || [];
    if (layouts.includes(LayoutComponentType.TWO_COLUMN_LAYOUT)) return 'two_column';
    // TEXT_BLOCK only when the template explicitly prefers flat text over cards.
    if (
      layouts.includes(LayoutComponentType.TEXT_BLOCK) &&
      !layouts.includes(LayoutComponentType.SECTION_CARD)
    )
      return 'text';
    return 'card';
  }

  /** Split HTML into two balanced halves on block boundaries (for two-column). */
  private splitHtmlForColumns(html: string): [string, string] {
    const blocks = html
      .split(/(?<=<\/(?:p|div|h[1-6]|ul|ol|table|blockquote)>)/i)
      .filter((b) => b.trim());
    if (blocks.length <= 1) return [html, ''];
    const mid = Math.ceil(blocks.length / 2);
    return [blocks.slice(0, mid).join(''), blocks.slice(mid).join('')];
  }

  /** Render a content page's body via the template-selected prose component. */
  private composeContentBody(
    proseBody: 'two_column' | 'text' | 'card',
    title: string,
    innerHtml: string,
    style: any,
  ): string {
    if (proseBody === 'two_column') {
      const [left, right] = this.splitHtmlForColumns(innerHtml);
      const heading = title
        ? `<h2 style="font-size:22px;font-weight:700;color:${style.primaryColor || '#111827'};margin:0 0 16px;">${title}</h2>`
        : '';
      const body = LAYOUT_RENDERERS[LayoutComponentType.TWO_COLUMN_LAYOUT].render(
        { left, right },
        style,
      );
      return heading + body;
    }
    if (proseBody === 'text') {
      const heading = title
        ? `<h2 style="font-size:22px;font-weight:700;color:${style.primaryColor || '#111827'};margin:0 0 16px;border-bottom:2px solid ${style.primaryColor || '#2563EB'};padding-bottom:8px;">${title}</h2>`
        : '';
      return (
        heading +
        LAYOUT_RENDERERS[LayoutComponentType.TEXT_BLOCK].render({ content: innerHtml }, style)
      );
    }
    return LAYOUT_RENDERERS[LayoutComponentType.SECTION_CARD].render(
      { title, content: innerHtml },
      style,
    );
  }

  private generateStructuredPages(
    pages: any[],
    style: any,
    purify: any,
    document?: any,
    templateConfig?: any,
    isRtl = false,
  ): string {
    let pageIndex = 0;
    let firstContentPage = true;
    const parts: string[] = [];
    const hasCoverPage = pages.some((p: any) => p.pageType === 'cover');

    // Drop near-empty content pages (CONFIDENTIAL watermark-only pages, import
    // artifacts, etc.) before computing page count so numbering stays accurate.
    const renderablePages = pages.filter((p: any) => {
      const pType = p.pageType || 'content';
      if (pType === 'cover' || pType === 'toc') return true;
      const text = (p.content?.text || '').trim();
      const html = (p.content?.html || '').trim();
      return text.length > 3 || html.length > 10;
    });
    const totalPageCount = renderablePages.length;
    const proseBody = this.pickProseBody(templateConfig);

    for (const page of renderablePages) {
      const pageType = page.pageType || 'content';

      // Render TOC page with its populated content
      if (pageType === 'toc') {
        const tocContent = page.content?.text || '';
        if (!tocContent.trim()) continue;

        const tocHtml = tocContent
          .split('\n')
          .filter((line: string) => line.trim())
          .map(
            (line: string) =>
              `<div style="padding:6px 0;border-bottom:1px dotted #E5E7EB;font-size:14px;color:#374151;">${purify.sanitize(line)}</div>`,
          )
          .join('');

        const footerHTML = document
          ? LAYOUT_RENDERERS[LayoutComponentType.FOOTER_BLOCK].render(
              {
                companyName: document.metadata?.companyName || '',
                contact: document.metadata?.contact || '',
                pageNumber: pageIndex + 1,
                totalPages: totalPageCount,
              },
              style,
            )
          : '';

        const tocPageHtml = `<div style="margin-bottom:24px;"><h2 style="font-size:24px;font-weight:700;color:#111827;border-bottom:3px solid ${style.primaryColor || '#2563EB'};padding-bottom:8px;">Table of Contents</h2></div><div>${tocHtml}</div>${footerHTML}`;
        parts.push(
          pageIndex++ === 0 ? tocPageHtml : `<div class="page-break"></div>${tocPageHtml}`,
        );
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
            date: purify.sanitize(
              coverData.date ||
                new Date().toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
            ),
          },
          style,
        );
        const placedImagesHtml = this.renderPlacedImages(page.content?.placedImages || [], purify);
        const coverPageHtml = `<div style="position:relative;">${coverHtml}${placedImagesHtml}</div>`;
        parts.push(
          pageIndex++ === 0 ? coverPageHtml : `<div class="page-break"></div>${coverPageHtml}`,
        );
        continue;
      }

      // Strip bare markdown hash lines ("# " with no following text) that can
      // survive import and render as literal "#" in the output.
      const cleanedText = (page.content?.text || '').replace(/^#{1,6}\s*$/gm, '');

      const htmlContent =
        page.content?.html || this.convertMarkdownToHtml(cleanedText);
      const content = purify.sanitize(htmlContent);

      // The page planner stores the SECTION title in page.title for all
      // continuation pages under that section. For long sections spanning many
      // PDF pages (e.g. section "أولاً" containing 9 sub-pages), this produces
      // stale headers like "أولاً: أطراف الاتفاقية" on pages that have moved on
      // to ثانياً, ثالثاً, etc. Fix: extract the first markdown heading from
      // the page's own content text and use that as the displayed card title.
      const contentFirstHeading =
        cleanedText.match(/^#{1,3}\s+(.+)$/m)?.[1]?.trim() || '';
      const storedTitle = page.title || '';
      // Prefer the content heading when it differs from the stored section title;
      // this replaces stale inherited section titles with the actual page topic.
      const rawTitle = purify.sanitize(
        contentFirstHeading && contentFirstHeading !== storedTitle
          ? contentFirstHeading
          : storedTitle,
      );

      const textStyles = this.buildTextStyle(page.content?.styles || {});

      // Suppress the card-level title when:
      // (a) the title is empty (cross-section merged page) or
      // (b) the HTML content already contains the same heading — prevents it
      //     appearing twice (once as card title, once as <h2> in body).
      const contentStartsWithHeading = /^\s*<h[123][^>]*>/i.test(content);
      const titleIsDuplicatedInContent =
        rawTitle.length > 0 &&
        contentStartsWithHeading &&
        content.toLowerCase().includes(rawTitle.toLowerCase().slice(0, 20));
      const title = titleIsDuplicatedInContent || !rawTitle ? '' : rawTitle;

      // Wrap signature sections to keep all parties on the same page.
      // Pattern: lines with multiple underscores (signature lines) or Arabic
      // party labels (الطرف الأول / الطرف الثاني / Party N / Signature).
      const hasSignaturePattern =
        /_{4,}|الطرف\s+(الأول|الثاني|الثالث)|party\s+\d|التوقيع|signature/i.test(
          page.content?.text || '',
        );
      const wrapSignature = (html: string) =>
        hasSignaturePattern
          ? `<div class="signature-block" style="page-break-inside:avoid;break-inside:avoid;">${html}</div>`
          : html;

      // Header only on first content page when there is no cover page
      // (cover page already introduces the document title)
      const headerHTML =
        firstContentPage && document && !hasCoverPage
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
              totalPages: totalPageCount,
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

      const innerHtml = `<div style="${textStyles}">${content}</div>` + imageHtml + chartsHtml;
      const card = wrapSignature(this.composeContentBody(proseBody, title, innerHtml, style));
      const placedImagesHtml = this.renderPlacedImages(page.content?.placedImages || [], purify);
      const pageHtml = `<div style="position:relative;">${headerHTML}${card}${footerHTML}${placedImagesHtml}</div>`;

      parts.push(pageIndex++ === 0 ? pageHtml : `<div class="page-break"></div>${pageHtml}`);
      firstContentPage = false;
    }

    return parts.join('');
  }

  private hasRtlContent(pages: any[]): boolean {
    const arabicRange = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]/;
    return pages.some((p: any) => {
      const text = [p.title, p.content?.text, p.content?.html].filter(Boolean).join(' ');
      return arabicRange.test(text);
    });
  }

  private renderPlacedImages(images: any[], purify: any): string {
    if (!Array.isArray(images) || images.length === 0) return '';
    return images
      .filter((img: any) => img?.url)
      .map((img: any) => {
        const x = Math.max(0, Math.min(100, Number(img.x) || 0));
        const y = Math.max(0, Math.min(100, Number(img.y) || 0));
        const w = Math.max(5, Math.min(100, Number(img.width) || 50));
        const h = Math.max(5, Math.min(100, Number(img.height) || 30));
        const z = Math.max(1, Math.min(50, Number(img.zIndex) || 2));
        const op = Math.max(0.05, Math.min(1, Number(img.opacity) || 1));
        const fit = ['cover', 'contain', 'fill'].includes(img.fit) ? img.fit : 'cover';
        const safeUrl = purify.sanitize(String(img.url));
        const alt = purify.sanitize(String(img.alt || ''));
        return `<div style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${z};pointer-events:none;overflow:hidden;border-radius:3px;">
          <img src="${safeUrl}" alt="${alt}" style="width:100%;height:100%;object-fit:${fit};opacity:${op};display:block;" />
        </div>`;
      })
      .join('');
  }

  private buildTextStyle(styles: Record<string, any>): string {
    const rules: string[] = [];
    if (styles.fontFamily)
      rules.push(`font-family:${String(styles.fontFamily).replace(/[;"<>]/g, '')}`);
    if (styles.fontSize)
      rules.push(`font-size:${Math.max(10, Math.min(32, Number(styles.fontSize) || 16))}px`);
    if (styles.lineHeight)
      rules.push(`line-height:${Math.max(1.1, Math.min(2.2, Number(styles.lineHeight) || 1.6))}`);
    if (styles.color && /^#[0-9a-f]{6}$/i.test(styles.color)) rules.push(`color:${styles.color}`);
    if (['left', 'center', 'right', 'justify'].includes(styles.textAlign))
      rules.push(`text-align:${styles.textAlign}`);
    if (['400', '500', '600', '700', 400, 500, 600, 700].includes(styles.fontWeight))
      rules.push(`font-weight:${styles.fontWeight}`);
    if (styles.fontStyle === 'italic') rules.push('font-style:italic');
    if (styles.textDecoration === 'underline') rules.push('text-decoration:underline');
    return rules.join(';');
  }

  private renderChartsHtml(charts: any[], style: any): string {
    if (!charts || charts.length === 0) return '';
    const primary = style?.primaryColor || '#2563EB';
    const chartHtmlList = charts.map((chart) => {
      if (!chart || !chart.data?.length) return '';
      const color = chart.color || primary;
      const data: { label: string; value: number }[] = chart.data;
      const max = Math.max(...data.map((d: any) => Number(d.value) || 0), 1);
      const title = chart.title || '';

      if (chart.type === 'kpi') {
        const cells = data
          .map(
            (d) =>
              `<div style="background:${color}15;border-radius:8px;padding:10px 14px;text-align:center;min-width:80px;">
            <div style="font-size:22px;font-weight:800;color:${color};">${d.value}</div>
            <div style="font-size:10px;color:#6B7280;margin-top:2px;">${d.label}</div>
          </div>`,
          )
          .join('');
        return `<div style="margin:16px 0;">
          ${title ? `<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">${title}</div>` : ''}
          <div style="display:flex;flex-wrap:wrap;gap:8px;">${cells}</div>
          ${this.renderChartDataAppendix(data, 'KPI data')}
        </div>`;
      }

      if (chart.type === 'pie') {
        const COLORS = ['#2563EB', '#7C3AED', '#059669', '#EA580C', '#DB2777', '#0D9488'];
        const total = data.reduce((s: number, d: any) => s + (Number(d.value) || 0), 0) || 1;
        let angle = 0;
        const slices = data
          .map((d: any, i: number) => {
            const slice = (Number(d.value) / total) * 360;
            const start = angle;
            angle += slice;
            const startR = (start * Math.PI) / 180;
            const endR = ((start + slice) * Math.PI) / 180;
            const x1 = 50 + 40 * Math.cos(startR);
            const y1 = 50 + 40 * Math.sin(startR);
            const x2 = 50 + 40 * Math.cos(endR);
            const y2 = 50 + 40 * Math.sin(endR);
            const large = slice > 180 ? 1 : 0;
            return `<path d="M50 50 L${x1} ${y1} A40 40 0 ${large} 1 ${x2} ${y2} Z" fill="${COLORS[i % COLORS.length]}" opacity="0.85"/>`;
          })
          .join('');
        const legend = data
          .map(
            (d: any, i: number) =>
              `<div style="display:flex;align-items:center;gap:4px;font-size:10px;color:#374151;">
            <div style="width:8px;height:8px;border-radius:2px;background:${COLORS[i % COLORS.length]};flex-shrink:0;"></div>
            ${d.label} (${d.value})
          </div>`,
          )
          .join('');
        return `<div style="margin:16px 0;">
          ${title ? `<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">${title}</div>` : ''}
          <div style="display:flex;align-items:center;gap:20px;">
            <svg viewBox="0 0 100 100" width="120" height="120">${slices}<circle cx="50" cy="50" r="18" fill="white"/></svg>
            <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:4px 10px;flex:1;">${legend}</div>
          </div>
          ${this.renderChartDataAppendix(data, 'Pie chart data')}
        </div>`;
      }

      const barW = Math.max(12, Math.floor(280 / data.length) - 4);
      const chartH = 80;
      const bars = data
        .map((d: any, i: number) => {
          const h = Math.round((Number(d.value) / max) * chartH);
          const x = i * (barW + 4);
          const y = chartH - h;
          return `<rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="3" fill="${color}" opacity="0.82"/>
          <text x="${x + barW / 2}" y="${chartH + 12}" text-anchor="middle" font-size="8" fill="#6B7280">${d.label}</text>
          <text x="${x + barW / 2}" y="${y - 3}" text-anchor="middle" font-size="8" fill="${color}" font-weight="600">${d.value}</text>`;
        })
        .join('');
      const svgW = data.length * (barW + 4);
      return `<div style="margin:16px 0;">
        ${title ? `<div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:8px;">${title}</div>` : ''}
        <svg viewBox="0 0 ${svgW} ${chartH + 20}" width="${Math.min(svgW, 380)}" height="${chartH + 20}" style="overflow:visible;">${bars}</svg>
        ${this.renderChartDataAppendix(data, 'Chart data')}
      </div>`;
    });
    return chartHtmlList.join('');
  }

  private renderChartDataAppendix(
    data: Array<{ label: string; value: number }>,
    heading: string,
  ): string {
    if (!Array.isArray(data) || data.length === 0) return '';
    const rows = data
      .map(
        (d, index) => `
      <tr>
        <td style="padding:4px 6px;border:1px solid #E5E7EB;font-size:9px;color:#374151;">${index + 1}</td>
        <td style="padding:4px 6px;border:1px solid #E5E7EB;font-size:9px;color:#374151;">${d.label}</td>
        <td style="padding:4px 6px;border:1px solid #E5E7EB;font-size:9px;color:#374151;">${d.value}</td>
      </tr>`,
      )
      .join('');
    return `<div class="chart-overflow-data" data-overflow-nodes="${data.length}" style="margin-top:10px;break-inside:avoid;">
      <div style="font-size:9px;font-weight:700;color:#6B7280;margin-bottom:4px;text-transform:uppercase;letter-spacing:.04em;">${heading}</div>
      <table style="width:100%;border-collapse:collapse;table-layout:auto;">
        <thead><tr>
          <th style="padding:4px 6px;border:1px solid #E5E7EB;font-size:9px;text-align:left;">#</th>
          <th style="padding:4px 6px;border:1px solid #E5E7EB;font-size:9px;text-align:left;">Label</th>
          <th style="padding:4px 6px;border:1px solid #E5E7EB;font-size:9px;text-align:left;">Value</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
  }

  /**
   * Convert HTML to PDF using Puppeteer with optimized settings
   */
  private async htmlToPDF(
    html: string,
    paperSize: string = 'A4',
    quality: string = 'standard',
  ): Promise<Buffer> {
    const scaleFactor = quality === 'high' ? 3 : quality === 'compressed' ? 1 : 2;

    // Map paper size to Puppeteer-accepted format string
    const formatMap: Record<string, string> = {
      A4: 'A4',
      Letter: 'Letter',
      A3: 'A3',
      Legal: 'Legal',
    };
    const puppeteerFormat = formatMap[paperSize] || 'A4';

    // Viewport dimensions per paper size at 96 DPI
    const viewportMap: Record<string, { w: number; h: number }> = {
      A4: { w: 794, h: 1123 },
      Letter: { w: 816, h: 1056 },
      A3: { w: 1123, h: 1587 },
      Legal: { w: 816, h: 1344 },
    };
    const vp = viewportMap[paperSize] || viewportMap.A4;

    // Use browser pool for better performance
    return this.browserPoolService.executeWithBrowser(async (browser) => {
      const page = await browser.newPage();

      try {
        // Set viewport for consistent rendering
        await page.setViewport({
          width: vp.w,
          height: vp.h,
          deviceScaleFactor: scaleFactor,
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
                  }),
              ),
          );
        });

        const pdfBuffer = await page.pdf({
          format: puppeteerFormat as any,
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

async function createPurifier(): Promise<{ sanitize: (value: any) => string }> {
  const nativeImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string,
  ) => Promise<any>;
  const [domPurifyModule, jsdomModule] = await Promise.all([
    nativeImport('dompurify'),
    nativeImport('jsdom'),
  ]);
  const createDOMPurify = domPurifyModule.default || domPurifyModule;
  const JSDOM = jsdomModule.JSDOM || jsdomModule.default?.JSDOM;
  const window = new JSDOM('').window;
  const purify = createDOMPurify(window as any);
  return {
    sanitize(value: any) {
      return purify.sanitize(String(value ?? ''));
    },
  };
}

function basicMarkdownToHtml(markdown: string): string {
  const escaped = String(markdown || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return escaped
    .split(/\n{2,}/)
    .map((block) => {
      const lines = block
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);
      if (!lines.length) return '';
      if (lines.every((line) => /^[-*]\s+/.test(line))) {
        return `<ul>${lines.map((line) => `<li>${line.replace(/^[-*]\s+/, '')}</li>`).join('')}</ul>`;
      }
      const first = lines[0];
      if (/^###\s+/.test(first)) return `<h3>${first.replace(/^###\s+/, '')}</h3>`;
      if (/^##\s+/.test(first)) return `<h2>${first.replace(/^##\s+/, '')}</h2>`;
      if (/^#\s+/.test(first)) return `<h1>${first.replace(/^#\s+/, '')}</h1>`;
      return `<p>${lines.join('<br>')}</p>`;
    })
    .filter(Boolean)
    .join('');
}
