import { Injectable, Logger } from '@nestjs/common';

export interface ContentDensity {
  pageIndex: number;
  wordCount: number;
  density: 'empty' | 'sparse' | 'light' | 'balanced' | 'dense';
  height: number; // Estimated height in lines
}

/**
 * PageConsolidationService
 * Optimizes page distribution by consolidating sparse content
 * and preventing unnecessary page creation for short content
 */
@Injectable()
export class PageConsolidationService {
  private readonly logger = new Logger(PageConsolidationService.name);

  /**
   * Analyze and consolidate pages to prevent empty/sparse pages
   * Moves content from sparse pages to previous pages when possible
   */
  consolidatePages(pages: any[]): any[] {
    if (pages.length <= 2) return pages; // Don't consolidate cover/toc pages

    // Skip consolidation markers (cover, toc)
    const startIndex = pages.findIndex(p => p.type && !['cover', 'COVER', 'toc', 'TABLE_OF_CONTENTS'].includes(p.type));
    if (startIndex < 0 || startIndex >= pages.length - 1) return pages;

    const result = [...pages];
    const densities = this.analyzePageDensities(pages);

    // Find sparse pages and consolidate
    let i = startIndex + 1;
    while (i < result.length) {
      const currentDensity = this.calculateDensity(result[i]);

      // If current page is sparse and previous is not full, consolidate
      if (currentDensity.density === 'sparse' || currentDensity.density === 'empty') {
        const prevDensity = this.calculateDensity(result[i - 1]);

        // Can we fit this content on the previous page?
        if (prevDensity.height < 60 && currentDensity.height < 40) {
          // Merge content
          result[i - 1] = this.mergePageContent(result[i - 1], result[i]);
          result.splice(i, 1);
          continue;
        }
      }

      i++;
    }

    // Recalculate page titles/numbers if needed
    return this.reorderPages(result);
  }

  /**
   * Calculate page density metrics
   */
  private calculateDensity(page: any): ContentDensity {
    const text = this.extractPageText(page);
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;

    let density: 'empty' | 'sparse' | 'light' | 'balanced' | 'dense';
    if (wordCount < 20) density = 'empty';
    else if (wordCount < 100) density = 'sparse';
    else if (wordCount < 250) density = 'light';
    else if (wordCount < 450) density = 'balanced';
    else density = 'dense';

    // Estimate visual height (roughly 1 line per 10 words on standard A4)
    const estimatedHeight = Math.ceil(wordCount / 10);

    return {
      pageIndex: 0,
      wordCount,
      density,
      height: estimatedHeight,
    };
  }

  /**
   * Analyze densities for all pages
   */
  private analyzePageDensities(pages: any[]): ContentDensity[] {
    return pages.map((page, index) => ({
      ...this.calculateDensity(page),
      pageIndex: index,
    }));
  }

  /**
   * Extract readable text from page content
   */
  private extractPageText(page: any): string {
    const content = page.content || {};

    // Already has text field
    if (content.text && typeof content.text === 'string') {
      return content.text;
    }

    const parts: string[] = [];

    // Handle different content structures
    if (content.overview) parts.push(String(content.overview));
    if (content.keyPoints) {
      const keyPoints = Array.isArray(content.keyPoints) ? content.keyPoints : [content.keyPoints];
      parts.push(...keyPoints.filter((kp: any) => kp));
    }
    if (content.highlights) {
      const highlights = Array.isArray(content.highlights) ? content.highlights : [content.highlights];
      parts.push(...highlights.filter((h: any) => h));
    }
    if (content.sections && Array.isArray(content.sections)) {
      for (const section of content.sections) {
        if (section.content) parts.push(String(section.content));
        if (section.heading) parts.push(String(section.heading));
        if (Array.isArray(section.bullets)) parts.push(...section.bullets.map((b: any) => String(b)));
      }
    }
    if (content.title) parts.push(String(content.title));
    if (content.subtitle) parts.push(String(content.subtitle));
    if (content.description) parts.push(String(content.description));
    if (content.body) parts.push(String(content.body));

    return parts.filter(p => p && p.trim()).join(' ');
  }

  /**
   * Merge content from two pages
   */
  private mergePageContent(targetPage: any, sourcePage: any): any {
    const targetContent = targetPage.content || {};
    const sourceContent = sourcePage.content || {};

    // If target has sections, append source content to last section
    if (Array.isArray(targetContent.sections)) {
      const lastSection = targetContent.sections[targetContent.sections.length - 1];
      if (lastSection) {
        // Append source content
        if (sourceContent.text) {
          lastSection.content = (lastSection.content || '') + '\n\n' + sourceContent.text;
        }
        if (Array.isArray(sourceContent.bullets)) {
          lastSection.bullets = [...(lastSection.bullets || []), ...sourceContent.bullets];
        }
      }
    } else if (targetContent.text) {
      // Simple text merge
      const sourceText = sourceContent.text || this.extractPageText(sourcePage);
      targetContent.text = targetContent.text + '\n\n' + sourceText;
    }

    // Update title if source has more specific info
    if (sourcePage.title && !targetPage.title) {
      targetPage.title = sourcePage.title;
    }

    return targetPage;
  }

  /**
   * Reorder and clean up pages after consolidation
   */
  private reorderPages(pages: any[]): any[] {
    return pages.map((page, index) => ({
      ...page,
      order: index + 1,
      pageNumber: index + 1,
    }));
  }
}
