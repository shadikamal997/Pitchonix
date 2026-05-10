import { Injectable, Logger } from '@nestjs/common';
import { PageComposition, CompositionMetrics, ComposedSection } from './document-composition.service';

/**
 * Page Density Balancer Service
 * 
 * Ensures optimal page density and visual balance:
 * - No pages under 25% filled (except cover)
 * - No pages above 90% filled
 * - Avoids single tiny paragraph pages
 * - Avoids giant text walls
 * - Makes continuation pages feel intentional
 */

export interface DensityAnalysis {
  fillPercentage: number; // 0-100
  isUnderfilled: boolean; // <25%
  isOverfilled: boolean; // >90%
  isTinyPage: boolean; // <10%
  isTextWall: boolean; // >95% with no breaks
  needsRebalancing: boolean;
  recommendation: string;
}

export interface PageGroup {
  pages: PageComposition[];
  totalContent: number;
  avgDensity: number;
  needsRedistribution: boolean;
}

@Injectable()
export class PageDensityBalancerService {
  private readonly logger = new Logger(PageDensityBalancerService.name);

  // Page capacity constants (based on A4 @ 16px base font)
  private readonly PAGE_HEIGHT_PX = 1123; // A4 height
  private readonly PAGE_CONTENT_HEIGHT = 1000; // Minus margins
  private readonly MIN_FILL_PERCENTAGE = 25;
  private readonly MAX_FILL_PERCENTAGE = 90;
  private readonly IDEAL_FILL_PERCENTAGE = 70;

  /**
   * Analyze page density
   */
  analyzeDensity(composition: PageComposition): DensityAnalysis {
    const fillPercentage = this.calculateFillPercentage(composition);

    const isUnderfilled = fillPercentage < this.MIN_FILL_PERCENTAGE;
    const isOverfilled = fillPercentage > this.MAX_FILL_PERCENTAGE;
    const isTinyPage = fillPercentage < 10;
    const isTextWall = this.isTextWall(composition);

    const needsRebalancing = isUnderfilled || isOverfilled || isTinyPage || isTextWall;

    let recommendation = 'Page density is optimal';
    if (isTinyPage) {
      recommendation = 'Merge with adjacent page - too little content';
    } else if (isUnderfilled) {
      recommendation = 'Consider merging with previous/next page';
    } else if (isOverfilled) {
      recommendation = 'Split content across multiple pages';
    } else if (isTextWall) {
      recommendation = 'Add visual breaks, headings, or spacing';
    }

    return {
      fillPercentage,
      isUnderfilled,
      isOverfilled,
      isTinyPage,
      isTextWall,
      needsRebalancing,
      recommendation,
    };
  }

  /**
   * Calculate actual fill percentage of a page
   */
  private calculateFillPercentage(composition: PageComposition): number {
    let totalHeight = 0;

    for (const section of composition.sections) {
      // Space before
      totalHeight += section.spaceBefore;

      // Content height
      const charCount = section.content.length;
      const fontSize = section.fontSize * 16; // Convert rem to px
      const lineHeight = section.lineHeight;
      const charsPerLine = section.maxWidth ? section.maxWidth / (fontSize * 0.6) : 80;
      const lines = Math.ceil(charCount / charsPerLine);
      const contentHeight = lines * fontSize * lineHeight;

      totalHeight += contentHeight;

      // Space after
      totalHeight += section.spaceAfter;
    }

    return Math.min(100, (totalHeight / this.PAGE_CONTENT_HEIGHT) * 100);
  }

  /**
   * Detect text wall (dense paragraph with no breaks)
   */
  private isTextWall(composition: PageComposition): boolean {
    const fillPercentage = this.calculateFillPercentage(composition);

    if (fillPercentage < 90) return false;

    // Check if page is mostly paragraphs with no headings
    const paragraphs = composition.sections.filter(s => s.type === 'paragraph');
    const headings = composition.sections.filter(s => s.type === 'heading');

    if (paragraphs.length > 5 && headings.length === 0) {
      return true;
    }

    // Check if any single section is very long
    const hasLongSection = composition.sections.some(s => s.content.length > 1000);

    return hasLongSection;
  }

  /**
   * Balance multiple pages intelligently
   */
  balancePages(pages: PageComposition[]): PageComposition[] {
    this.logger.log(`Balancing ${pages.length} pages...`);

    if (pages.length === 0) {
      return pages;
    }

    // Process pages one at a time to avoid index shifting issues
    const rebalanced: PageComposition[] = [];
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      
      // Skip balancing for special pages (cover, TOC)
      if (page.layout === 'cover' || page.density === 'sparse' && i === 0) {
        rebalanced.push(page);
        continue;
      }

      // Skip TOC pages (they should remain as single pages)
      if (page.sections.some(s => s.id.includes('toc') || s.content.includes('Table of Contents'))) {
        rebalanced.push(page);
        continue;
      }

      const analysis = this.analyzeDensity(page);

      // Check if page has only a heading (heading-only pages should be merged)
      const hasOnlyHeading = page.sections.length === 1 && page.sections[0].type === 'heading';

      if (hasOnlyHeading || analysis.isTinyPage || analysis.isUnderfilled) {
        // Try to merge with next page
        if (i < pages.length - 1 && rebalanced.length > 0) {
          // Merge with previous rebalanced page
          const lastPage = rebalanced[rebalanced.length - 1];
          
          // Don't merge into cover or TOC
          if (lastPage.layout !== 'cover' && !lastPage.sections.some(s => s.id.includes('toc'))) {
            rebalanced[rebalanced.length - 1] = this.mergePages(lastPage, page);
          } else {
            rebalanced.push(page);
          }
        } else if (i < pages.length - 1) {
          // Merge current with next
          const nextPage = pages[i + 1];
          
          // Don't merge into special pages
          if (nextPage.layout !== 'cover' && !nextPage.sections.some(s => s.id.includes('toc'))) {
            const merged = this.mergePages(page, nextPage);
            rebalanced.push(merged);
            i++; // Skip next page since we merged it
          } else {
            rebalanced.push(page);
          }
        } else {
          // Last page, can't merge
          rebalanced.push(page);
        }
      } else if (analysis.isOverfilled || analysis.isTextWall) {
        // Split into multiple pages
        const split = this.splitPage(page);
        rebalanced.push(...split);
      } else {
        // Page is well-balanced
        rebalanced.push(page);
      }
    }

    this.logger.log(`Rebalanced from ${pages.length} to ${rebalanced.length} pages`);

    return rebalanced;
  }

  /**
   * Merge two pages
   */
  private mergePages(page1: PageComposition, page2: PageComposition): PageComposition {
    const combinedSections = [...page1.sections, ...page2.sections];
    
    // Regenerate unique IDs for all sections
    const uniqueSections = combinedSections.map((s, i) => ({
      ...s,
      id: `${page1.pageNumber}-section-${i}`,
    }));

    return {
      ...page1,
      sections: uniqueSections,
      metrics: {
        densityScore: (page1.metrics.densityScore + page2.metrics.densityScore) / 2,
        readabilityScore: (page1.metrics.readabilityScore + page2.metrics.readabilityScore) / 2,
        whitespaceScore: (page1.metrics.whitespaceScore + page2.metrics.whitespaceScore) / 2,
        visualBalanceScore: (page1.metrics.visualBalanceScore + page2.metrics.visualBalanceScore) / 2,
        overallQuality: (page1.metrics.overallQuality + page2.metrics.overallQuality) / 2,
      },
    };
  }

  /**
   * Split overfilled page into multiple pages
   */
  private splitPage(page: PageComposition): PageComposition[] {
    const sections = page.sections;
    const targetSectionsPerPage = Math.ceil(sections.length / 2);

    // Find optimal split point (prefer after headings)
    let splitIndex = targetSectionsPerPage;

    // Look for heading near split point
    for (let i = targetSectionsPerPage - 2; i <= targetSectionsPerPage + 2; i++) {
      if (i > 0 && i < sections.length && sections[i].type === 'heading') {
        splitIndex = i;
        break;
      }
    }

    const page1Sections = sections.slice(0, splitIndex);
    const page2Sections = sections.slice(splitIndex);

    // Regenerate unique IDs for all sections
    const uniquePage1Sections = page1Sections.map((s, i) => ({
      ...s,
      id: `${page.pageNumber}-section-${i}`,
    }));

    const uniquePage2Sections = page2Sections.map((s, i) => ({
      ...s,
      id: `${page.pageNumber + 1}-section-${i}`,
    }));

    return [
      {
        ...page,
        sections: uniquePage1Sections,
        metrics: this.estimateMetrics(uniquePage1Sections),
      },
      {
        ...page,
        pageNumber: page.pageNumber + 1,
        sections: uniquePage2Sections,
        metrics: this.estimateMetrics(uniquePage2Sections),
      },
    ];
  }

  /**
   * Estimate metrics for a set of sections
   */
  private estimateMetrics(sections: ComposedSection[]): CompositionMetrics {
    // Simple estimation (can be improved)
    return {
      densityScore: 70,
      readabilityScore: 75,
      whitespaceScore: 65,
      visualBalanceScore: 70,
      overallQuality: 70,
    };
  }

  /**
   * Group pages by semantic relationship
   */
  groupPagesBySemantic(pages: PageComposition[]): PageGroup[] {
    const groups: PageGroup[] = [];
    let currentGroup: PageComposition[] = [];
    let currentTopic = '';

    for (const page of pages) {
      // Find main topic (first heading)
      const mainHeading = page.sections.find(s => s.type === 'heading' && s.level === 1 || s.level === 2);
      const topic = mainHeading?.content || 'Untitled Section';

      if (topic !== currentTopic && currentGroup.length > 0) {
        // New topic - finish current group
        groups.push(this.createPageGroup(currentGroup));
        currentGroup = [page];
        currentTopic = topic;
      } else {
        currentGroup.push(page);
        if (!currentTopic) currentTopic = topic;
      }
    }

    // Add final group
    if (currentGroup.length > 0) {
      groups.push(this.createPageGroup(currentGroup));
    }

    return groups;
  }

  /**
   * Create page group with analysis
   */
  private createPageGroup(pages: PageComposition[]): PageGroup {
    const totalContent = pages.reduce(
      (sum, p) => sum + p.sections.reduce((s, sec) => s + sec.content.length, 0),
      0,
    );

    const avgDensity =
      pages.reduce((sum, p) => sum + this.calculateFillPercentage(p), 0) / pages.length;

    // Check if group needs redistribution
    const needsRedistribution = pages.some(p => {
      const fill = this.calculateFillPercentage(p);
      return fill < this.MIN_FILL_PERCENTAGE || fill > this.MAX_FILL_PERCENTAGE;
    });

    return {
      pages,
      totalContent,
      avgDensity,
      needsRedistribution,
    };
  }

  /**
   * Optimize entire document
   */
  optimizeDocument(pages: PageComposition[]): PageComposition[] {
    this.logger.log('Optimizing document density...');

    // Step 1: Balance individual pages
    let optimized = this.balancePages(pages);

    // Step 2: Group by semantic relationships
    const groups = this.groupPagesBySemantic(optimized);

    // Step 3: Rebalance groups that need it
    optimized = [];
    for (const group of groups) {
      if (group.needsRedistribution) {
        const rebalanced = this.balancePages(group.pages);
        optimized.push(...rebalanced);
      } else {
        optimized.push(...group.pages);
      }
    }

    // Step 4: Renumber pages
    optimized.forEach((page, index) => {
      page.pageNumber = index + 1;
    });

    this.logger.log(`Document optimized: ${pages.length} → ${optimized.length} pages`);

    return optimized;
  }
}
