import { Injectable, Logger } from '@nestjs/common';
import { SemanticSection } from './section-inference.service';

/**
 * TOC entry with semantic context
 */
export interface SemanticTOCEntry {
  level: number; // 1 = top level, 2 = subsection, etc.
  title: string;
  pageNumber?: number;
  sectionId: number;
  paragraphRange: { start: number; end: number };
  keywords: string[];
  estimatedPages: number;
}

/**
 * Complete semantic TOC
 */
export interface SemanticTOC {
  entries: SemanticTOCEntry[];
  totalSections: number;
  maxDepth: number;
  hasContinuations: boolean;
}

/**
 * SemanticTOCBuilder
 * 
 * Builds intelligent Table of Contents from semantic sections.
 * 
 * Features:
 * - Avoids "continued" spam
 * - Merges multi-page sections intelligently
 * - Creates hierarchical structure
 * - Uses semantic section titles
 */
@Injectable()
export class SemanticTOCBuilder {
  private readonly logger = new Logger(SemanticTOCBuilder.name);

  /**
   * Build TOC from semantic sections
   */
  buildTOC(
    sections: SemanticSection[],
    pageAssignments?: Map<number, number>, // paragraphId -> pageNumber
  ): SemanticTOC {
    this.logger.log(`Building semantic TOC from ${sections.length} sections...`);

    const entries: SemanticTOCEntry[] = [];
    let currentLevel = 1;

    for (const section of sections) {
      // Determine hierarchy level
      const level = this.determineSectionLevel(section, sections);

      // Estimate pages for this section
      const estimatedPages = Math.ceil(section.paragraphCount / 3); // ~3 paragraphs per page

      // Get page number if available
      const pageNumber = pageAssignments?.get(section.startParagraphId);

      entries.push({
        level,
        title: section.title,
        pageNumber,
        sectionId: section.sectionId,
        paragraphRange: {
          start: section.startParagraphId,
          end: section.endParagraphId,
        },
        keywords: section.keywords,
        estimatedPages,
      });
    }

    const maxDepth = Math.max(...entries.map(e => e.level));
    const hasContinuations = entries.some(e => e.estimatedPages > 1);

    this.logger.log(`✓ TOC built with ${entries.length} entries (max depth: ${maxDepth})`);

    return {
      entries,
      totalSections: entries.length,
      maxDepth,
      hasContinuations,
    };
  }

  /**
   * Determine section hierarchy level
   */
  private determineSectionLevel(section: SemanticSection, allSections: SemanticSection[]): number {
    // Introduction and conclusion are always top-level
    if (section.sectionType === 'introduction' || section.sectionType === 'conclusion') {
      return 1;
    }

    // Methodology, analysis, discussion are level 1
    if (['methodology', 'analysis', 'discussion'].includes(section.sectionType)) {
      return 1;
    }

    // Body sections can be level 1 or 2 based on size
    if (section.paragraphCount >= 4) {
      return 1; // Major section
    } else {
      return 2; // Minor subsection
    }
  }

  /**
   * Format TOC as markdown
   */
  formatAsMarkdown(toc: SemanticTOC): string {
    const lines: string[] = ['# Table of Contents', ''];

    for (const entry of toc.entries) {
      const indent = '  '.repeat(entry.level - 1);
      const pageRef = entry.pageNumber ? ` ..... ${entry.pageNumber}` : '';
      const bullet = entry.level === 1 ? '-' : '•';
      
      lines.push(`${indent}${bullet} ${entry.title}${pageRef}`);
    }

    return lines.join('\n');
  }

  /**
   * Format TOC as plain text
   */
  formatAsPlainText(toc: SemanticTOC): string {
    const lines: string[] = [];

    for (const entry of toc.entries) {
      const indent = '  '.repeat(entry.level - 1);
      const pageRef = entry.pageNumber ? ` ........ ${entry.pageNumber}` : '';
      
      lines.push(`${indent}${entry.title}${pageRef}`);
    }

    return lines.join('\n');
  }

  /**
   * Generate TOC page content
   */
  generateTOCPageContent(toc: SemanticTOC): string {
    return [
      '# Table of Contents',
      '',
      ...toc.entries.map(entry => {
        const indent = '  '.repeat(entry.level - 1);
        const dots = '.'.repeat(Math.max(3, 40 - entry.title.length - indent.length));
        const pageRef = entry.pageNumber || '—';
        return `${indent}${entry.title} ${dots} ${pageRef}`;
      }),
    ].join('\n');
  }

  /**
   * Check if section should appear in TOC
   */
  shouldIncludeInTOC(section: SemanticSection, minParagraphs: number = 1): boolean {
    // Always include major sections
    if (['introduction', 'conclusion', 'methodology', 'analysis'].includes(section.sectionType)) {
      return true;
    }

    // Include if above minimum size
    return section.paragraphCount >= minParagraphs;
  }

  /**
   * Build compact TOC (fewer entries)
   */
  buildCompactTOC(sections: SemanticSection[]): SemanticTOC {
    const majorSections = sections.filter(s => this.shouldIncludeInTOC(s, 3));
    return this.buildTOC(majorSections);
  }

  /**
   * Build detailed TOC (all sections)
   */
  buildDetailedTOC(sections: SemanticSection[]): SemanticTOC {
    return this.buildTOC(sections);
  }

  /**
   * Merge continuation pages in TOC
   * (Avoid: "Section X continued", "Section X continued continued")
   */
  mergeContinuations(toc: SemanticTOC): SemanticTOC {
    const mergedEntries: SemanticTOCEntry[] = [];

    for (const entry of toc.entries) {
      // Check if this is a continuation of previous entry
      const previous = mergedEntries[mergedEntries.length - 1];

      if (previous && entry.title.toLowerCase().includes('continued')) {
        // Merge with previous entry
        previous.estimatedPages += entry.estimatedPages;
        previous.paragraphRange.end = entry.paragraphRange.end;
      } else {
        mergedEntries.push({ ...entry });
      }
    }

    return {
      ...toc,
      entries: mergedEntries,
      totalSections: mergedEntries.length,
    };
  }
}
