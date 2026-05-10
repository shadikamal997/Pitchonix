import { Injectable, Logger } from '@nestjs/common';
import { PageComposition } from './document-composition.service';

/**
 * Semantic Continuation System
 * 
 * Makes continuation pages feel intentional and elegant:
 * - Inherit semantic context from parent
 * - Visually connect to parent section
 * - Subtle and elegant labels
 * - TOC only shows parent sections
 * - Avoid "Executive Summary continued continued continued"
 */

export interface SemanticSection {
  id: string;
  title: string;
  parentSectionId?: string;
  sectionType: 'primary' | 'continuation';
  pageRange: { start: number; end: number };
  contextHint?: string;
  visualTheme?: {
    accentColor?: string;
    icon?: string;
  };
}

export interface ContinuationMetadata {
  isContinuation: boolean;
  parentSectionTitle: string;
  parentSectionId: string;
  continuationIndex: number; // 1, 2, 3...
  contextPreview: string; // Brief preview of what continues
  totalPagesInSection: number;
  currentPageInSection: number;
}

export interface TOCEntry {
  title: string;
  sectionId: string;
  pageRange: string; // "4-7"
  level: number;
  children?: TOCEntry[];
}

@Injectable()
export class SemanticContinuationService {
  private readonly logger = new Logger(SemanticContinuationService.name);

  /**
   * Identify semantic sections across pages
   */
  identifySemanticSections(pages: PageComposition[]): SemanticSection[] {
    const sections: SemanticSection[] = [];
    let currentSection: SemanticSection | null = null;
    let continuationCount = 0;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNumber = i + 1;

      // Safety check: ensure page has sections array
      if (!page || !page.sections || !Array.isArray(page.sections)) {
        this.logger.warn(`Page ${pageNumber} has no sections array, skipping`);
        continue;
      }

      // Look for primary heading (H1 or H2)
      const primaryHeading = page.sections.find(
        s => s.type === 'heading' && (s.level === 1 || s.level === 2),
      );

      if (primaryHeading) {
        // New primary section starts
        if (currentSection) {
          // Close previous section
          currentSection.pageRange.end = pageNumber - 1;
          sections.push(currentSection);
        }

        // Start new section
        currentSection = {
          id: `section-${sections.length + 1}`,
          title: primaryHeading.content,
          sectionType: 'primary',
          pageRange: { start: pageNumber, end: pageNumber },
        };

        continuationCount = 0;
      } else if (currentSection) {
        // Continuation of current section
        currentSection.pageRange.end = pageNumber;
        continuationCount++;
      } else {
        // Orphan page (no section context)
        sections.push({
          id: `section-orphan-${pageNumber}`,
          title: 'Content',
          sectionType: 'primary',
          pageRange: { start: pageNumber, end: pageNumber },
        });
      }
    }

    // Close final section
    if (currentSection) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Generate continuation metadata for a page
   */
  generateContinuationMetadata(
    pageNumber: number,
    sections: SemanticSection[],
    page: PageComposition,
  ): ContinuationMetadata | null {
    // Find which section this page belongs to
    const section = sections.find(
      s => pageNumber >= s.pageRange.start && pageNumber <= s.pageRange.end,
    );

    if (!section) return null;

    // Is this the first page of the section?
    const isFirstPage = pageNumber === section.pageRange.start;
    if (isFirstPage) return null; // Not a continuation

    // This is a continuation page
    const totalPagesInSection = section.pageRange.end - section.pageRange.start + 1;
    const currentPageInSection = pageNumber - section.pageRange.start + 1;
    const continuationIndex = currentPageInSection - 1;

    // Generate context preview (first 50 chars of first paragraph)
    const firstParagraph = page.sections.find(s => s.type === 'paragraph');
    const contextPreview = firstParagraph
      ? firstParagraph.content.substring(0, 50) + '...'
      : 'Continued content';

    return {
      isContinuation: true,
      parentSectionTitle: section.title,
      parentSectionId: section.id,
      continuationIndex,
      contextPreview,
      totalPagesInSection,
      currentPageInSection,
    };
  }

  /**
   * Generate elegant continuation label
   */
  generateContinuationLabel(metadata: ContinuationMetadata): string {
    // Instead of "Executive Summary continued continued"
    // Use: "Executive Summary (cont.)" or just "cont."

    if (metadata.continuationIndex === 1) {
      return `${metadata.parentSectionTitle} (cont.)`;
    }

    // For subsequent continuations, just use page number in section
    return `${metadata.parentSectionTitle} (${metadata.currentPageInSection}/${metadata.totalPagesInSection})`;
  }

  /**
   * Generate minimal continuation indicator (for subtle header)
   */
  generateMinimalIndicator(metadata: ContinuationMetadata): string {
    return `Page ${metadata.currentPageInSection} of ${metadata.totalPagesInSection}`;
  }

  /**
   * Build Table of Contents with proper hierarchy
   */
  buildTableOfContents(sections: SemanticSection[]): TOCEntry[] {
    const entries: TOCEntry[] = [];

    for (const section of sections) {
      if (section.sectionType === 'continuation') {
        continue; // Skip continuations in TOC
      }

      const { start, end } = section.pageRange;
      const pageRange = start === end ? `${start}` : `${start}–${end}`;

      entries.push({
        title: section.title,
        sectionId: section.id,
        pageRange,
        level: 1,
        children: [], // Can be extended for nested sections
      });
    }

    return entries;
  }

  /**
   * Build TOC with nested hierarchy (for complex documents)
   */
  buildHierarchicalTOC(pages: PageComposition[], sections: SemanticSection[]): TOCEntry[] {
    const entries: TOCEntry[] = [];
    let currentH1: TOCEntry | null = null;

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const pageNumber = i + 1;

      for (const contentSection of page.sections) {
        if (contentSection.type !== 'heading') continue;

        const level = contentSection.level || 1;

        if (level === 1) {
          // New top-level section
          if (currentH1) {
            entries.push(currentH1);
          }

          currentH1 = {
            title: contentSection.content,
            sectionId: `h1-${pageNumber}`,
            pageRange: `${pageNumber}`,
            level: 1,
            children: [],
          };
        } else if (level === 2 && currentH1) {
          // Subsection
          currentH1.children = currentH1.children || [];
          currentH1.children.push({
            title: contentSection.content,
            sectionId: `h2-${pageNumber}`,
            pageRange: `${pageNumber}`,
            level: 2,
          });
        }
      }
    }

    // Add final section
    if (currentH1) {
      entries.push(currentH1);
    }

    return entries;
  }

  /**
   * Add visual continuity indicators to page
   */
  addVisualContinuity(
    page: PageComposition,
    metadata: ContinuationMetadata,
  ): PageComposition {
    // Add subtle header with context
    const headerSection = {
      id: 'continuation-header',
      type: 'continuation-indicator' as any,
      content: this.generateMinimalIndicator(metadata),
      visualWeight: 10,
      spaceBefore: 0,
      spaceAfter: 16,
      fontSize: 0.875, // 14px
      lineHeight: 1.2,
    };

    return {
      ...page,
      sections: [headerSection, ...page.sections],
    };
  }

  /**
   * Detect if continuation is necessary
   */
  shouldContinue(
    currentPage: PageComposition,
    nextContent: string,
  ): boolean {
    // Check if next content semantically belongs to current section
    const mainHeading = currentPage.sections.find(
      s => s.type === 'heading' && (s.level === 1 || s.level === 2),
    );

    if (!mainHeading) return false;

    // If next content starts with a new H1/H2, don't continue
    const startsWithHeading = nextContent.trim().match(/^#{1,2}\s+/);
    if (startsWithHeading) return false;

    return true;
  }

  /**
   * Optimize page breaks for continuations
   */
  optimizePageBreaks(pages: PageComposition[]): PageComposition[] {
    const optimized: PageComposition[] = [];

    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const isLast = i === pages.length - 1;

      // Check if page ends mid-paragraph
      const lastSection = page.sections[page.sections.length - 1];

      if (!isLast && lastSection.type === 'paragraph') {
        // Check if next page starts with paragraph continuation
        const nextPage = pages[i + 1];
        const firstSection = nextPage.sections[0];

        if (firstSection.type === 'paragraph') {
          // Potential awkward break - could merge or split better
          // For now, add continuation marker
          const nextContent = firstSection.content;
          if (nextContent.length > 0) {
            // Add "..." to end of current page
            const modifiedPage = {
              ...page,
              sections: [
                ...page.sections.slice(0, -1),
                {
                  ...lastSection,
                  content: lastSection.content + '...',
                },
              ],
            };
            optimized.push(modifiedPage);
            continue;
          }
        }
      }

      optimized.push(page);
    }

    return optimized;
  }

  /**
   * Generate section navigation hints
   */
  generateNavigationHints(
    pageNumber: number,
    sections: SemanticSection[],
  ): {
    previousSection?: string;
    currentSection: string;
    nextSection?: string;
  } {
    const currentSection = sections.find(
      s => pageNumber >= s.pageRange.start && pageNumber <= s.pageRange.end,
    );

    if (!currentSection) {
      return { currentSection: 'Unknown' };
    }

    const currentIndex = sections.indexOf(currentSection);
    const previousSection = currentIndex > 0 ? sections[currentIndex - 1].title : undefined;
    const nextSection =
      currentIndex < sections.length - 1 ? sections[currentIndex + 1].title : undefined;

    return {
      previousSection,
      currentSection: currentSection.title,
      nextSection,
    };
  }
}
