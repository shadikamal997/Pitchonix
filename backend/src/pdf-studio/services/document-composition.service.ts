import { Injectable, Logger } from '@nestjs/common';

/**
 * Advanced Document Composition Engine
 * 
 * Handles intelligent document composition with:
 * - Visual hierarchy
 * - Vertical rhythm
 * - Density balance
 * - Readability optimization
 * - Section pacing
 */

export interface CompositionMetrics {
  densityScore: number; // 0-100
  readabilityScore: number; // 0-100
  whitespaceScore: number; // 0-100
  visualBalanceScore: number; // 0-100
  overallQuality: number; // 0-100
}

export interface PageComposition {
  pageNumber: number;
  sections: ComposedSection[];
  metrics: CompositionMetrics;
  layout: 'single-column' | 'two-column' | 'hero' | 'cover';
  density: 'sparse' | 'balanced' | 'dense';
}

export interface ComposedSection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'metric' | 'image' | 'chart';
  content: string;
  level?: number; // For headings: 1-6
  visualWeight: number; // 0-100
  spaceBefore: number; // pixels
  spaceAfter: number; // pixels
  fontSize: number; // rem
  lineHeight: number;
  maxWidth?: number; // For line length control
}

@Injectable()
export class DocumentCompositionService {
  private readonly logger = new Logger(DocumentCompositionService.name);

  // Typography scale (Major Third: 1.25 ratio)
  private readonly FONT_SCALE = {
    h1: 2.441, // 39px at 16px base
    h2: 1.953, // 31px
    h3: 1.563, // 25px
    h4: 1.25,  // 20px
    h5: 1.0,   // 16px
    body: 1.0, // 16px
    small: 0.8, // 13px
  };

  // Line height scale
  private readonly LINE_HEIGHT = {
    heading: 1.2,
    body: 1.6,
    dense: 1.4,
  };

  // Spacing scale (based on 8px grid)
  private readonly SPACING = {
    xs: 8,
    sm: 16,
    md: 24,
    lg: 32,
    xl: 48,
    xxl: 64,
  };

  /**
   * Compose a page with intelligent visual hierarchy
   */
  composePage(
    content: string,
    pageType: 'cover' | 'content' | 'toc' | 'summary' | 'conclusion',
    options: {
      targetDensity?: 'sparse' | 'balanced' | 'dense';
      maxLineLength?: number;
      emphasizeReadability?: boolean;
    } = {},
  ): PageComposition {
    const {
      targetDensity = 'balanced',
      maxLineLength = 65, // Optimal: 45-75 characters per line
      emphasizeReadability = true,
    } = options;

    // Parse content into semantic blocks
    const blocks = this.parseContentBlocks(content);

    // Apply visual hierarchy
    const composedSections = blocks.map((block, index) =>
      this.composeSection(block, index, blocks.length, targetDensity, emphasizeReadability),
    );

    // Calculate metrics
    const metrics = this.calculatePageMetrics(composedSections, targetDensity);

    // Determine layout based on content and density
    const layout = this.selectOptimalLayout(pageType, composedSections, metrics);

    return {
      pageNumber: 1, // Will be set by caller
      sections: composedSections,
      metrics,
      layout,
      density: targetDensity,
    };
  }

  /**
   * Parse raw content into semantic blocks
   */
  private parseContentBlocks(content: string): Array<{ type: string; content: string; level?: number }> {
    const blocks: Array<{ type: string; content: string; level?: number }> = [];
    const lines = content.split('\n');

    let currentParagraph: string[] = [];

    for (const line of lines) {
      const trimmed = line.trim();

      if (!trimmed) {
        // Empty line - end current paragraph
        if (currentParagraph.length > 0) {
          blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
          currentParagraph = [];
        }
        continue;
      }

      // Detect markdown headings
      const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headingMatch) {
        if (currentParagraph.length > 0) {
          blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
          currentParagraph = [];
        }
        blocks.push({
          type: 'heading',
          content: headingMatch[2],
          level: headingMatch[1].length,
        });
        continue;
      }

      // Detect bullet lists
      if (trimmed.match(/^[-*•]\s+/)) {
        if (currentParagraph.length > 0) {
          blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
          currentParagraph = [];
        }
        blocks.push({ type: 'list', content: trimmed.replace(/^[-*•]\s+/, '') });
        continue;
      }

      // Detect numbered lists
      if (trimmed.match(/^\d+\.\s+/)) {
        if (currentParagraph.length > 0) {
          blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
          currentParagraph = [];
        }
        blocks.push({ type: 'list', content: trimmed.replace(/^\d+\.\s+/, '') });
        continue;
      }

      // Detect quotes
      if (trimmed.startsWith('>')) {
        if (currentParagraph.length > 0) {
          blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
          currentParagraph = [];
        }
        blocks.push({ type: 'quote', content: trimmed.replace(/^>\s*/, '') });
        continue;
      }

      // Regular paragraph line
      currentParagraph.push(line);
    }

    // Add final paragraph if any
    if (currentParagraph.length > 0) {
      blocks.push({ type: 'paragraph', content: currentParagraph.join(' ') });
    }

    return blocks;
  }

  /**
   * Compose a single section with proper spacing and typography
   */
  private composeSection(
    block: { type: string; content: string; level?: number },
    index: number,
    totalBlocks: number,
    density: 'sparse' | 'balanced' | 'dense',
    emphasizeReadability: boolean,
  ): ComposedSection {
    const isFirst = index === 0;
    const isLast = index === totalBlocks - 1;

    let section: ComposedSection = {
      id: `section-${index}`,
      type: block.type as any,
      content: block.content,
      visualWeight: 50,
      spaceBefore: this.SPACING.md,
      spaceAfter: this.SPACING.md,
      fontSize: this.FONT_SCALE.body,
      lineHeight: this.LINE_HEIGHT.body,
    };

    // Apply type-specific styling
    switch (block.type) {
      case 'heading':
        section = this.styleHeading(section, block.level || 1, isFirst, density);
        break;

      case 'paragraph':
        section = this.styleParagraph(section, emphasizeReadability, density);
        break;

      case 'list':
        section = this.styleList(section, density);
        break;

      case 'quote':
        section = this.styleQuote(section, density);
        break;

      case 'metric':
        section = this.styleMetric(section, density);
        break;
    }

    // Adjust first and last section spacing
    if (isFirst) {
      section.spaceBefore = 0;
    }

    if (isLast) {
      section.spaceAfter = this.SPACING.lg;
    }

    return section;
  }

  /**
   * Style heading with proper hierarchy
   */
  private styleHeading(
    section: ComposedSection,
    level: number,
    isFirst: boolean,
    density: 'sparse' | 'balanced' | 'dense',
  ): ComposedSection {
    const scale = [
      this.FONT_SCALE.h1,
      this.FONT_SCALE.h2,
      this.FONT_SCALE.h3,
      this.FONT_SCALE.h4,
      this.FONT_SCALE.h5,
      this.FONT_SCALE.body,
    ];

    section.level = level;
    section.fontSize = scale[level - 1] || this.FONT_SCALE.body;
    section.lineHeight = this.LINE_HEIGHT.heading;
    section.visualWeight = 100 - (level - 1) * 15; // H1=100, H2=85, etc.

    // Spacing based on level and density
    const spacingMap = {
      sparse: { before: this.SPACING.xl, after: this.SPACING.lg },
      balanced: { before: this.SPACING.lg, after: this.SPACING.md },
      dense: { before: this.SPACING.md, after: this.SPACING.sm },
    };

    section.spaceBefore = isFirst ? 0 : spacingMap[density].before;
    section.spaceAfter = spacingMap[density].after;

    // Larger headings get more space
    if (level <= 2) {
      section.spaceBefore = isFirst ? 0 : section.spaceBefore * 1.5;
      section.spaceAfter *= 1.5;
    }

    return section;
  }

  /**
   * Style paragraph with optimal readability
   */
  private styleParagraph(
    section: ComposedSection,
    emphasizeReadability: boolean,
    density: 'sparse' | 'balanced' | 'dense',
  ): ComposedSection {
    section.fontSize = this.FONT_SCALE.body;
    section.lineHeight = emphasizeReadability ? this.LINE_HEIGHT.body : this.LINE_HEIGHT.dense;
    section.visualWeight = 30;

    // Optimal line length for readability: 45-75 characters
    section.maxWidth = emphasizeReadability ? 700 : 800; // px

    const spacingMap = {
      sparse: this.SPACING.lg,
      balanced: this.SPACING.md,
      dense: this.SPACING.sm,
    };

    section.spaceAfter = spacingMap[density];

    return section;
  }

  /**
   * Style list items
   */
  private styleList(section: ComposedSection, density: 'sparse' | 'balanced' | 'dense'): ComposedSection {
    section.fontSize = this.FONT_SCALE.body;
    section.lineHeight = this.LINE_HEIGHT.body;
    section.visualWeight = 40;

    const spacingMap = {
      sparse: this.SPACING.sm,
      balanced: this.SPACING.xs,
      dense: this.SPACING.xs / 2,
    };

    section.spaceAfter = spacingMap[density];

    return section;
  }

  /**
   * Style quote blocks
   */
  private styleQuote(section: ComposedSection, density: 'sparse' | 'balanced' | 'dense'): ComposedSection {
    section.fontSize = this.FONT_SCALE.h4;
    section.lineHeight = this.LINE_HEIGHT.body;
    section.visualWeight = 60;

    section.spaceBefore = density === 'sparse' ? this.SPACING.xl : this.SPACING.lg;
    section.spaceAfter = density === 'sparse' ? this.SPACING.xl : this.SPACING.lg;

    return section;
  }

  /**
   * Style metric/data displays
   */
  private styleMetric(section: ComposedSection, density: 'sparse' | 'balanced' | 'dense'): ComposedSection {
    section.fontSize = this.FONT_SCALE.h2;
    section.lineHeight = 1.0;
    section.visualWeight = 80;

    section.spaceBefore = this.SPACING.lg;
    section.spaceAfter = this.SPACING.md;

    return section;
  }

  /**
   * Calculate page composition metrics
   */
  private calculatePageMetrics(
    sections: ComposedSection[],
    targetDensity: 'sparse' | 'balanced' | 'dense',
  ): CompositionMetrics {
    // Calculate total visual weight
    const totalWeight = sections.reduce((sum, s) => sum + s.visualWeight, 0);
    const avgWeight = totalWeight / sections.length;

    // Calculate whitespace ratio
    const totalSpacing = sections.reduce((sum, s) => sum + s.spaceBefore + s.spaceAfter, 0);
    const contentLines = sections.reduce((sum, s) => {
      const charCount = s.content.length;
      const charsPerLine = 80; // Approximate
      return sum + Math.ceil(charCount / charsPerLine) * s.lineHeight * 16; // 16px base
    }, 0);

    const whitespaceRatio = totalSpacing / (totalSpacing + contentLines);

    // Density score (0-100)
    const densityTargets = { sparse: 0.4, balanced: 0.6, dense: 0.8 };
    const targetRatio = densityTargets[targetDensity];
    const densityScore = Math.max(0, 100 - Math.abs((1 - whitespaceRatio) - targetRatio) * 200);

    // Readability score
    const hasProperHeadings = sections.some(s => s.type === 'heading');
    const avgFontSize = sections.reduce((sum, s) => sum + s.fontSize, 0) / sections.length;
    const avgLineHeight = sections.reduce((sum, s) => sum + s.lineHeight, 0) / sections.length;
    const readabilityScore = 
      (hasProperHeadings ? 30 : 0) +
      (avgFontSize >= 1.0 ? 30 : 0) +
      (avgLineHeight >= 1.5 ? 40 : avgLineHeight >= 1.4 ? 20 : 0);

    // Whitespace score
    const whitespaceScore = whitespaceRatio * 200; // 0-100 scale (optimal around 0.5)

    // Visual balance score
    const weightVariance = sections.reduce((sum, s) => sum + Math.pow(s.visualWeight - avgWeight, 2), 0) / sections.length;
    const visualBalanceScore = Math.max(0, 100 - weightVariance / 10);

    // Overall quality
    const overallQuality = (densityScore + readabilityScore + Math.min(whitespaceScore, 100) + visualBalanceScore) / 4;

    return {
      densityScore,
      readabilityScore,
      whitespaceScore: Math.min(whitespaceScore, 100),
      visualBalanceScore,
      overallQuality,
    };
  }

  /**
   * Select optimal layout based on content
   */
  private selectOptimalLayout(
    pageType: string,
    sections: ComposedSection[],
    metrics: CompositionMetrics,
  ): 'single-column' | 'two-column' | 'hero' | 'cover' {
    if (pageType === 'cover') return 'cover';

    const hasLargeHeading = sections.some(s => s.type === 'heading' && (s.level || 0) <= 2);
    const totalContent = sections.reduce((sum, s) => sum + s.content.length, 0);

    if (hasLargeHeading && sections.length <= 3) {
      return 'hero';
    }

    if (totalContent < 500) {
      return 'single-column';
    }

    // Default to single column for readability
    return 'single-column';
  }

  /**
   * Rebalance page to meet target density
   */
  rebalancePage(composition: PageComposition, targetQuality: number = 80): PageComposition {
    if (composition.metrics.overallQuality >= targetQuality) {
      return composition; // Already good
    }

    // Adjust spacing to improve metrics
    const sections = composition.sections.map(s => {
      if (composition.metrics.densityScore < 60) {
        // Too sparse - reduce spacing
        return {
          ...s,
          spaceBefore: Math.max(this.SPACING.xs, s.spaceBefore * 0.75),
          spaceAfter: Math.max(this.SPACING.xs, s.spaceAfter * 0.75),
        };
      } else if (composition.metrics.densityScore > 90) {
        // Too dense - increase spacing
        return {
          ...s,
          spaceBefore: s.spaceBefore * 1.25,
          spaceAfter: s.spaceAfter * 1.25,
        };
      }
      return s;
    });

    // Recalculate metrics
    const newMetrics = this.calculatePageMetrics(sections, composition.density);

    return {
      ...composition,
      sections,
      metrics: newMetrics,
    };
  }
}
