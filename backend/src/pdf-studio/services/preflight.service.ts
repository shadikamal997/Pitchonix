import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface PreflightResult {
  errors: PreflightIssue[];
  warnings: PreflightIssue[];
  suggestions: PreflightIssue[];
  exportReady: boolean;
  qualityScore: number;
  pageCount: number;
  wordCount: number;
}

export interface PreflightIssue {
  code: string;
  message: string;
  severity?: 'info' | 'warning' | 'error' | 'blocking';
  pageIndex?: number;
  pageTitle?: string;
  autoFix?: string;
}

const MIN_WORDS_PER_PAGE = 30;
const MAX_WORDS_PER_PAGE = 900;
const IDEAL_MIN = 120;
const IDEAL_MAX = 600;

@Injectable()
export class PreflightService {
  private readonly logger = new Logger(PreflightService.name);

  constructor(private prisma: PrismaService) {}

  async runPreflight(documentId: string): Promise<PreflightResult> {
    this.logger.log(`Running preflight for document ${documentId}`);

    const document = await this.prisma.pdfDocument.findUnique({
      where: { id: documentId },
      include: { pages: { orderBy: { order: 'asc' } } },
    });

    if (!document) {
      return {
        errors: [{ code: 'DOC_NOT_FOUND', severity: 'blocking', message: 'Document not found' }],
        warnings: [],
        suggestions: [],
        exportReady: false,
        qualityScore: 0,
        pageCount: 0,
        wordCount: 0,
      };
    }

    const errors: PreflightIssue[] = [];
    const warnings: PreflightIssue[] = [];
    const suggestions: PreflightIssue[] = [];

    const pages = document.pages as any[];
    let totalWords = 0;

    if (pages.length === 0) {
      errors.push({ code: 'NO_PAGES', severity: 'blocking', message: 'Document has no pages. Add content before exporting.' });
    }

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageType: string = page.pageType || 'content';
      const title: string = page.title || '';
      const rawText: string = String(page.content?.text || '');
      const words = rawText.split(/\s+/).filter(Boolean).length;
      totalWords += words;

      const hasChart = Array.isArray(page.content?.charts) && page.content.charts.length > 0;
      const hasImage = !!(page.content?.heroImage || page.content?.image || (Array.isArray(page.content?.placedImages) && page.content.placedImages.length > 0));
      const context = { pageIndex: i, pageTitle: title || `Page ${i + 1}` };

      if (pageType !== 'cover' && pageType !== 'toc') {
        if (words < MIN_WORDS_PER_PAGE && !hasChart && !hasImage) {
          warnings.push({
            ...context,
            code: 'PAGE_UNDERFILLED',
            severity: 'warning',
            message: `Page "${context.pageTitle}" has very little content (${words} words).`,
            autoFix: 'Merge with adjacent related content or add supporting detail.',
          });
        }

        if (words > MAX_WORDS_PER_PAGE) {
          warnings.push({
            ...context,
            code: 'PAGE_OVERCROWDED',
            severity: 'warning',
            message: `Page "${context.pageTitle}" has too much content (${words} words).`,
            autoFix: 'Run Smart Auto-Flow or split at a section boundary.',
          });
        }

        if (words >= MIN_WORDS_PER_PAGE && words < IDEAL_MIN && !hasChart && !hasImage) {
          suggestions.push({
            ...context,
            code: 'PAGE_SPARSE',
            severity: 'info',
            message: `Page "${context.pageTitle}" could use more content (currently ${words} words; aim for ${IDEAL_MIN}-${IDEAL_MAX}).`,
            autoFix: 'Add a supporting paragraph, metric, image, or merge with nearby content.',
          });
        }

        if (!title.trim() && pageType === 'content') {
          suggestions.push({
            ...context,
            code: 'MISSING_TITLE',
            severity: 'info',
            message: `Page ${i + 1} has no title. Adding a title improves navigation and structure.`,
            autoFix: 'Infer title from the strongest heading or section topic.',
          });
        }
      }

      this.checkPublishingIntelligence(page, context, words, pageType, errors, warnings);
      this.checkAssetsAndData(page, context, rawText, errors, warnings, suggestions);
    }

    if (pages.length > 0 && totalWords < 50) {
      errors.push({ code: 'DOCUMENT_EMPTY', severity: 'blocking', message: 'Document appears nearly empty. Add substantial content before exporting.' });
    }

    if (!document.title?.trim()) {
      errors.push({ code: 'MISSING_DOCUMENT_TITLE', severity: 'error', message: 'Document has no title.' });
    }

    if (pages.length > 50) {
      warnings.push({ code: 'MANY_PAGES', severity: 'warning', message: `Document has ${pages.length} pages, which may result in a large file. Consider splitting into multiple documents.` });
    }

    let score = 100;
    score -= errors.length * 20;
    score -= warnings.length * 8;
    score -= suggestions.length * 3;
    score = Math.max(0, Math.min(100, score));

    const exportReady = errors.length === 0;
    this.logger.log(`Preflight complete: ${errors.length} errors, ${warnings.length} warnings, score=${score}`);

    return {
      errors,
      warnings,
      suggestions,
      exportReady,
      qualityScore: score,
      pageCount: pages.length,
      wordCount: totalWords,
    };
  }

  private checkPublishingIntelligence(
    page: any,
    context: { pageIndex: number; pageTitle: string },
    words: number,
    pageType: string,
    errors: PreflightIssue[],
    warnings: PreflightIssue[],
  ) {
    const intelligence = page.content?.composition?.intelligence;
    const visualEstimate = intelligence?.visualEstimate;
    const currentOccupancy = this.estimateCurrentOccupancy(page, words, pageType);

    if (visualEstimate?.hasOverflow || currentOccupancy > 0.98) {
      const staleOrMinorOverflow = currentOccupancy <= 0.98;
      const issue = {
        ...context,
        code: staleOrMinorOverflow ? 'STALE_OVERFLOW_ESTIMATE' : 'VISUAL_OVERFLOW',
        severity: staleOrMinorOverflow ? 'warning' as const : 'blocking' as const,
        message: staleOrMinorOverflow
          ? `Page "${context.pageTitle}" has an old overflow flag, but current content fits export limits.`
          : `Page "${context.pageTitle}" may visually overflow in preview/export.`,
        autoFix: staleOrMinorOverflow
          ? 'Regenerate page intelligence on the next edit.'
          : 'Split content using Pagination Intelligence before export.',
      };
      if (staleOrMinorOverflow) warnings.push(issue);
      else errors.push(issue);
    }

    if (visualEstimate?.hasOrphanHeading) {
      errors.push({
        ...context,
        code: 'ORPHAN_HEADING',
        severity: 'error',
        message: `Page "${context.pageTitle}" ends with an isolated heading.`,
        autoFix: 'Move the heading with its following paragraph.',
      });
    }

    if (visualEstimate?.occupancy != null && visualEstimate.occupancy < 0.25) {
      warnings.push({
        ...context,
        code: 'LOW_VISUAL_OCCUPANCY',
        severity: 'warning',
        message: `Page "${context.pageTitle}" is visually underfilled (${Math.round(visualEstimate.occupancy * 100)}% occupied).`,
        autoFix: 'Merge with an adjacent semantic page or add supporting content.',
      });
    }

    const grid = intelligence?.grid;
    if (grid?.rhythmScore != null && grid.rhythmScore < 70) {
      warnings.push({
        ...context,
        code: 'GRID_RHYTHM_WEAK',
        severity: 'warning',
        message: `Page "${context.pageTitle}" has inconsistent editorial spacing rhythm.`,
        autoFix: 'Snap spacing to the baseline grid.',
      });
    }
  }

  private estimateCurrentOccupancy(page: any, words: number, pageType: string): number {
    if (pageType === 'cover' || pageType === 'toc') return 0.55;
    const blocks = Array.isArray(page.content?.blocks) ? page.content.blocks : [];
    const blockWeight = blocks.reduce((sum: number, block: any) => {
      const type = String(block?.type || 'paragraph');
      if (type === 'heading') return sum + 42;
      if (type === 'chart') return sum + 240;
      if (type === 'image') return sum + 220;
      if (type === 'metric') return sum + 120;
      if (type === 'quote') return sum + 100;
      if (type === 'list') return sum + Math.max(36, String(block?.content || '').split(/\s+/).filter(Boolean).length * 5.5);
      return sum + Math.max(32, String(block?.content || '').length / 68 * 24);
    }, 0);
    const textWeight = words * 4.1;
    const placedImageWeight = Array.isArray(page.content?.placedImages)
      ? page.content.placedImages.reduce((sum: number, img: any) => {
        const widthPct = Math.max(1, Math.min(100, Number(img.width || 0)));
        const heightPct = Math.max(1, Math.min(100, Number(img.height || 0)));
        return sum + Math.min(620, Math.max(90, (widthPct * heightPct) / 7));
      }, 0)
      : 0;
    return Math.max(blockWeight, textWeight) / 930 + placedImageWeight / 930;
  }

  private checkAssetsAndData(
    page: any,
    context: { pageIndex: number; pageTitle: string },
    rawText: string,
    errors: PreflightIssue[],
    warnings: PreflightIssue[],
    suggestions: PreflightIssue[],
  ) {
    const placedImages: any[] = page.content?.placedImages || [];
    const imagesWithoutAlt = placedImages.filter((img: any) => !img.alt?.trim());
    if (imagesWithoutAlt.length > 0) {
      suggestions.push({
        ...context,
        code: 'MISSING_ALT_TEXT',
        severity: 'info',
        message: `Page "${context.pageTitle}" has ${imagesWithoutAlt.length} image(s) without alt text.`,
        autoFix: 'Add descriptive alt text to every placed image.',
      });
    }

    const lowResolutionImages = placedImages.filter((img: any) => {
      const pixelWidth = Number(img.pixelWidth || img.naturalWidth || 0);
      return pixelWidth > 0 && pixelWidth < 800;
    });
    if (lowResolutionImages.length > 0) {
      warnings.push({
        ...context,
        code: 'LOW_RES_IMAGE',
        severity: 'warning',
        message: `Page "${context.pageTitle}" has ${lowResolutionImages.length} low-resolution image(s).`,
        autoFix: 'Replace with export-quality images.',
      });
    }

    const charts: any[] = page.content?.charts || [];
    const brokenCharts = charts.filter((chart: any) => !Array.isArray(chart.data) || chart.data.length === 0);
    if (brokenCharts.length > 0) {
      errors.push({
        ...context,
        code: 'BROKEN_CHART',
        severity: 'error',
        message: `Page "${context.pageTitle}" has ${brokenCharts.length} chart(s) with no data.`,
        autoFix: 'Add chart data or remove the empty chart block.',
      });
    }

    const links = rawText.match(/https?:\/\/[^\s)]+/g) || [];
    const invalidLinks = links.filter(link => !/^https?:\/\/[^\s]+\.[^\s]+/.test(link));
    if (invalidLinks.length > 0) {
      warnings.push({
        ...context,
        code: 'INVALID_LINK',
        severity: 'warning',
        message: `Page "${context.pageTitle}" has ${invalidLinks.length} invalid-looking link(s).`,
        autoFix: 'Review and correct malformed URLs.',
      });
    }
  }
}
