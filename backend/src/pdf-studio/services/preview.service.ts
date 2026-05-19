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

// ─────────────────────────────────────────────────────────────────────────────
//  Template layout-mode allowlist
//  Multi-column / editorial flow is ONLY permitted for templates designed for
//  publishing-style content. All other (normal/business/clean) templates MUST
//  render in a single, vertically-stacked column regardless of word density.
// ─────────────────────────────────────────────────────────────────────────────

/** Standard built-in templates that allow editorial multi-column flow */
const EDITORIAL_STANDARD_TEMPLATES = new Set<string>([
  'whitepaper',                 // long-form research / journal style
  'market_research_report',     // research publication
]);

/** Pro templates that allow editorial multi-column flow */
const EDITORIAL_PRO_TEMPLATES = new Set<string>([
  'editorial-whitepaper',       // magazine-inspired long-form publishing
  'premium-whitepaper-system',  // long-form research / technical publishing
]);

function isEditorialTemplate(
  templateType?: string,
  proTemplateId?: string | null,
): boolean {
  if (proTemplateId && EDITORIAL_PRO_TEMPLATES.has(proTemplateId)) return true;
  if (templateType && EDITORIAL_STANDARD_TEMPLATES.has(templateType))  return true;
  return false;
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
      const allowEditorial = isEditorialTemplate(templateType, proTemplateId);
      pagesHTML = this.generateStructuredPages(pages, style, purify, document, allowEditorial);
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

          /* Multi-column layout */
          .layout-two-col {
            column-count: 2;
            column-gap: 22px;
            column-rule: 1px solid #E5E7EB;
            orphans: 3;
            widows: 3;
          }
          .layout-two-col h1,.layout-two-col h2,.layout-two-col h3,.layout-two-col h4 {
            column-span: all;
            break-after: avoid;
          }
          .layout-two-col table { column-span: all; }
          .layout-two-col .chart-block { column-span: all; }
          .layout-two-col img { max-width: 100%; }

          /* Metric grid */
          .layout-metric-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
            gap: 12px;
            margin: 12px 0;
          }
          .metric-card {
            background: #F8FAFF;
            border: 1px solid #DBEAFE;
            border-radius: 10px;
            padding: 14px 10px;
            text-align: center;
          }
          .metric-card .metric-val {
            font-size: 26px;
            font-weight: 800;
            color: #1D4ED8;
            line-height: 1;
          }
          .metric-card .metric-lbl {
            font-size: 10px;
            color: #6B7280;
            margin-top: 4px;
          }

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
   * Generate structured pages.
   *
   * Key behaviour: content pages are accumulated into display buckets targeting
   * ~420 words each. Near-empty pages (<40 words) are silently skipped.
   * This guarantees every rendered A4 page is properly filled regardless of
   * how many small pages the planner stored in the database.
   *
   * @param allowEditorial When true (only for explicitly editorial templates),
   *                       dense prose buckets may flow into a two-column layout.
   *                       For ALL other templates this is forced false → every
   *                       bucket renders as a single vertically-stacked column.
   */
  private generateStructuredPages(pages: any[], style: any, purify: any, document?: any, allowEditorial: boolean = false): string {
    const hasCoverPage = pages.some((p: any) => p.pageType === 'cover');
    const parts: string[] = [];
    let firstContentPage = true;

    const TARGET_WORDS = 420; // desired words per A4 content page
    const MIN_WORDS    = 40;  // pages below this are skipped (blank-page guard)
    const primary      = style?.primaryColor || '#2563EB';

    // ── Step 1: bin pages into display buckets ──────────────────────────────
    // Cover / TOC → one special bucket each (order preserved).
    // Content pages → accumulated into content buckets until TARGET_WORDS.

    interface SpecialBucket { kind: 'special'; page: any }
    interface ContentBucket { kind: 'content'; pages: any[]; words: number }
    type Bucket = SpecialBucket | ContentBucket;

    const buckets: Bucket[] = [];
    let current: ContentBucket | null = null;

    const flushCurrent = () => {
      if (current && current.pages.length > 0) {
        buckets.push(current);
        current = null;
      }
    };

    for (const page of pages) {
      const pageType: string = page.pageType || 'content';

      if (pageType === 'cover' || pageType === 'toc') {
        flushCurrent();
        buckets.push({ kind: 'special', page });
        continue;
      }

      const rawText: string = String(page.content?.text || '');
      const wordCount = rawText.split(/\s+/).filter(Boolean).length;
      const hasVisual = !!(page.content?.charts?.length || page.content?.heroImage || page.content?.image);

      if (wordCount < MIN_WORDS && !hasVisual) continue; // skip near-empty pages

      if (!current) current = { kind: 'content', pages: [], words: 0 };

      // Flush when adding this page would push us well past target
      if (current.words + wordCount > TARGET_WORDS * 1.25 && current.words >= MIN_WORDS * 2) {
        flushCurrent();
        current = { kind: 'content', pages: [], words: 0 };
      }

      current.pages.push(page);
      current.words += wordCount;

      if (current.words >= TARGET_WORDS) flushCurrent();
    }
    flushCurrent();

    // ── Step 2: count total display pages for footer ────────────────────────
    const totalDisplayPages = buckets.filter(
      b => b.kind !== 'special' || (b as SpecialBucket).page.pageType !== 'toc',
    ).length;
    let displayIndex = 0;

    // ── Step 3: render each bucket as one A4 page ───────────────────────────
    for (const bucket of buckets) {

      // ── Special pages (cover / TOC) ───────────────────────────────────────
      if (bucket.kind === 'special') {
        const page = (bucket as SpecialBucket).page;

        if (page.pageType === 'toc') {
          const tocContent: string = String(page.content?.text || '');
          if (!tocContent.trim()) continue;

          const tocHtml = tocContent
            .split('\n')
            .filter((l: string) => l.trim())
            .map((l: string) => `<div style="padding:6px 0;border-bottom:1px dotted #E5E7EB;font-size:14px;color:#374151;">${purify.sanitize(l)}</div>`)
            .join('');

          const footerHTML = document
            ? LAYOUT_RENDERERS[LayoutComponentType.FOOTER_BLOCK].render(
                { companyName: document.metadata?.companyName || '', contact: document.metadata?.contact || '', pageNumber: displayIndex + 1, totalPages: totalDisplayPages },
                style,
              )
            : '';

          parts.push(`<div class="a4-page">
            <div style="margin-bottom:24px;"><h2 style="font-size:24px;font-weight:700;color:#111827;border-bottom:3px solid ${primary};padding-bottom:8px;">Table of Contents</h2></div>
            <div>${tocHtml}</div>
            ${footerHTML}
          </div>`);
          displayIndex++;
          continue;
        }

        if (page.pageType === 'cover') {
          let coverData: any = {};
          try { coverData = JSON.parse(String(page.content?.text || '{}')); } catch (_) {
            coverData = { title: page.title || document?.title || '' };
          }
          const coverHtml = LAYOUT_RENDERERS[LayoutComponentType.COVER_PAGE].render(
            {
              title:       purify.sanitize(document?.title || coverData.title || page.title || ''),
              subtitle:    purify.sanitize(coverData.subtitle || document?.outline?.detectedType || ''),
              description: purify.sanitize(coverData.description || coverData.summary || ''),
              overview:    Array.isArray(coverData.overview)
                ? coverData.overview.map((item: string) => purify.sanitize(item))
                : [],
              date: purify.sanitize(coverData.date || new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })),
            },
            style,
          );
          const coverPlacedImgs = ((page.content?.placedImages as any[] | undefined) || [])
            .filter((img: any) => img?.url)
            .map((img: any) => {
              const x  = Math.max(0, Math.min(100, Number(img.x)  || 0));
              const y  = Math.max(0, Math.min(100, Number(img.y)  || 0));
              const w  = Math.max(5, Math.min(100, Number(img.width)  || 50));
              const h  = Math.max(5, Math.min(100, Number(img.height) || 30));
              const z  = Math.max(1, Math.min(50,  Number(img.zIndex) || 2));
              const op = Math.max(0.05, Math.min(1, Number(img.opacity) || 1));
              const fit = ['cover', 'contain', 'fill'].includes(img.fit) ? img.fit : 'cover';
              const safeUrl = purify.sanitize(String(img.url));
              return `<div style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${z};pointer-events:none;overflow:hidden;border-radius:3px;">
                <img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:${fit};opacity:${op};display:block;" />
              </div>`;
            }).join('');
          parts.push(`<div class="a4-page" style="padding:0;position:relative;">${coverHtml}${coverPlacedImgs}</div>`);
          displayIndex++;
          continue;
        }
      }

      // ── Content bucket — combine all accumulated pages into one A4 page ────
      const cb = bucket as ContentBucket;
      let combinedContent = '';

      for (let i = 0; i < cb.pages.length; i++) {
        const pg = cb.pages[i];
        const htmlContent = pg.content?.html || this.convertMarkdownToHtml(String(pg.content?.text || ''));
        const safeContent = purify.sanitize(htmlContent);
        const pgTitle     = purify.sanitize(pg.title || '');
        const textStyles  = this.buildTextStyle(pg.content?.styles || {});
        const imageUrl    = pg.content?.heroImage || pg.content?.image || '';
        const imageHtml   = imageUrl
          ? `<div style="margin:12px 0;border-radius:8px;overflow:hidden;max-height:180px;"><img src="${purify.sanitize(imageUrl)}" alt="" style="width:100%;height:180px;object-fit:cover;display:block;" /></div>`
          : '';
        const chartsHtml  = this.renderChartsHtml(pg.content?.charts || [], style);

        // When multiple DB pages are merged into one A4, show each page's title
        // as a section sub-header (except the first page, whose title becomes the card title)
        if (i > 0 && pgTitle) {
          combinedContent += `<h3 style="font-size:17px;font-weight:600;color:${primary};margin:22px 0 8px 0;padding-top:14px;border-top:1px solid #E5E7EB;">${pgTitle}</h3>`;
        }

        combinedContent += `<div style="${textStyles}">${safeContent}</div>${imageHtml}${chartsHtml}`;
      }

      const primaryTitle = purify.sanitize(cb.pages[0]?.title || '');

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
              contact:     document.metadata?.contact || '',
              pageNumber:  displayIndex + 1,
              totalPages:  totalDisplayPages,
            },
            style,
          )
        : '';

      // Layout-mode gate:
      //   Multi-column / editorial flow is ONLY active for editorial templates.
      //   Standard templates ALWAYS render single-column regardless of density.
      const bucketLayout = allowEditorial
        ? this.detectBucketLayout(combinedContent, cb.words)
        : 'single';
      const layoutContent = bucketLayout === 'two-column'
        ? `<div class="layout-two-col">${combinedContent}</div>`
        : combinedContent;

      const sectionCard = LAYOUT_RENDERERS[LayoutComponentType.SECTION_CARD].render(
        { title: primaryTitle, content: layoutContent },
        style,
      );

      // Render placed images from all pages in this content bucket as absolute overlays
      const placedImagesHtml = cb.pages
        .flatMap((pg: any) => (pg.content?.placedImages as any[] | undefined) || [])
        .filter((img: any) => img?.url)
        .map((img: any) => {
          const x  = Math.max(0, Math.min(100, Number(img.x)      || 0));
          const y  = Math.max(0, Math.min(100, Number(img.y)      || 0));
          const w  = Math.max(5, Math.min(100, Number(img.width)  || 50));
          const h  = Math.max(5, Math.min(100, Number(img.height) || 30));
          const z  = Math.max(1, Math.min(50,  Number(img.zIndex) || 2));
          const op = Math.max(0.05, Math.min(1, Number(img.opacity) || 1));
          const fit = ['cover', 'contain', 'fill'].includes(img.fit) ? img.fit : 'cover';
          const safeUrl = purify.sanitize(String(img.url));
          return `<div style="position:absolute;left:${x}%;top:${y}%;width:${w}%;height:${h}%;z-index:${z};pointer-events:none;overflow:hidden;border-radius:3px;">
            <img src="${safeUrl}" alt="" style="width:100%;height:100%;object-fit:${fit};opacity:${op};display:block;" />
          </div>`;
        })
        .join('');

      parts.push(`<div class="a4-page" style="position:relative;">${headerHTML}${sectionCard}${footerHTML}${placedImagesHtml}</div>`);
      displayIndex++;
      firstContentPage = false;
    }

    return parts.join('');
  }

  /**
   * Detect optimal layout for a content bucket based on its HTML and word count.
   */
  private detectBucketLayout(html: string, wordCount: number): 'single' | 'two-column' {
    const liCount       = (html.match(/<li\b/gi)  || []).length;
    const paraCount     = (html.match(/<p\b/gi)   || []).length;
    const headingCount  = (html.match(/<h[2-4]\b/gi) || []).length;
    const hasTable      = /<table\b/i.test(html);
    const hasChart      = /chart-block|<svg\b/i.test(html);

    // Don't split pages that contain tables or charts across columns — they render badly
    if (hasTable || hasChart) return 'single';

    // Two-column for dense text pages: many words + multiple paragraphs, not too listy
    if (wordCount >= 280 && paraCount >= 3 && liCount < 12) return 'two-column';

    // Also two-column for pages with many headings + paragraphs (section-heavy docs)
    if (wordCount >= 220 && headingCount >= 3 && paraCount >= 3) return 'two-column';

    return 'single';
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
