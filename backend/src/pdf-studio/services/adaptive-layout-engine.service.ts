import { Injectable, Logger } from '@nestjs/common';
import { ContentBlock } from './content-block-extractor.service';
import { PlannedPage } from './rule-based-page-planner.service';

export interface AdaptiveLayoutConfig {
  pageWidth: number;  // mm (A4 = 210mm)
  pageHeight: number; // mm (A4 = 297mm)
  margins: { top: number; right: number; bottom: number; left: number };
  colorScheme: string;
  templateType: string;
}

export interface TypographyScale {
  h1: number; // Heading 1
  h2: number; // Heading 2
  h3: number; // Heading 3
  body: number; // Body text
  caption: number; // Small text
  lineHeight: number; // Multiplier
  paragraphSpacing: number; // mm
}

export interface LayoutDensity {
  contentLevel: 'low' | 'medium' | 'high' | 'very_high';
  wordCount: number;
  blockCount: number;
  hasHeadings: boolean;
  hasLists: boolean;
  recommendedColumns: 1 | 2;
  recommendedTypographyScale: TypographyScale;
  verticalDistribution: 'top' | 'balanced' | 'full';
  whitespaceStrategy: 'generous' | 'moderate' | 'compact';
}

export interface ComposedSection {
  type: 'text' | 'heading' | 'list' | 'quote' | 'visual_break';
  content: string;
  fontSize: number;
  fontWeight: number;
  lineHeight: number;
  marginTop: number;
  marginBottom: number;
  color: string;
  alignment?: 'left' | 'center' | 'right' | 'justify';
  maxWidth?: number;
}

export interface AdaptivePageComposition {
  pageId: string;
  pageNumber: number;
  pageType: string;
  density: LayoutDensity;
  sections: ComposedSection[];
  layout: {
    columns: 1 | 2;
    verticalAlignment: 'top' | 'center' | 'distributed';
    backgroundStyle?: any;
  };
  estimatedFillPercentage: number; // 0-100
  qualityScore: number; // 0-100
  issues: string[];
}

/**
 * AdaptiveLayoutEngineService
 * 
 * Intelligently composes page layouts based on content density.
 * Dynamically adjusts typography, spacing, and layout to:
 * - Utilize full vertical canvas
 * - Maintain visual balance
 * - Adapt to content amount
 * - Ensure professional appearance
 */
@Injectable()
export class AdaptiveLayoutEngineService {
  private readonly logger = new Logger(AdaptiveLayoutEngineService.name);

  // Typography presets by density level
  private readonly TYPOGRAPHY_PRESETS: Record<string, TypographyScale> = {
    low: {
      h1: 32, h2: 24, h3: 18, body: 14, caption: 11,
      lineHeight: 1.7,
      paragraphSpacing: 8,
    },
    medium: {
      h1: 28, h2: 20, h3: 16, body: 12, caption: 10,
      lineHeight: 1.6,
      paragraphSpacing: 6,
    },
    high: {
      h1: 24, h2: 18, h3: 14, body: 11, caption: 9,
      lineHeight: 1.5,
      paragraphSpacing: 5,
    },
    very_high: {
      h1: 22, h2: 16, h3: 13, body: 10, caption: 8,
      lineHeight: 1.4,
      paragraphSpacing: 4,
    },
  };

  /**
   * Compose a page with adaptive layout based on content density
   */
  composeAdaptivePage(
    page: PlannedPage,
    config: AdaptiveLayoutConfig,
  ): AdaptivePageComposition {
    this.logger.debug(`Composing adaptive layout for page ${page.globalOrder} (${page.sectionType})`);

    // 1. Analyze content density
    const density = this.analyzeDensity(page, config);

    // 2. Generate sections with adaptive typography
    const sections = this.generateAdaptiveSections(page.blocks, density, config);

    // 3. Determine layout strategy
    const layout = this.determineLayoutStrategy(density, sections, config);

    // 4. Estimate page fill
    const estimatedFillPercentage = this.estimatePageFill(sections, layout, config);

    // 5. Quality check
    const { qualityScore, issues } = this.validateComposition(
      sections,
      layout,
      density,
      estimatedFillPercentage,
    );

    return {
      pageId: page.sectionId,
      pageNumber: page.globalOrder + 1,
      pageType: page.sectionType,
      density,
      sections,
      layout,
      estimatedFillPercentage,
      qualityScore,
      issues,
    };
  }

  /**
   * Analyze content density to determine layout strategy
   */
  private analyzeDensity(page: PlannedPage, config: AdaptiveLayoutConfig): LayoutDensity {
    const wordCount = page.wordCount;
    const blockCount = page.blocks.length;
    const hasHeadings = page.blocks.some(b => ['heading', 'subheading', 'title'].includes(b.type));
    const hasLists = page.blocks.some(b => ['bullet_list', 'numbered_list'].includes(b.type));

    // Determine content level based on word count
    let contentLevel: 'low' | 'medium' | 'high' | 'very_high';
    if (wordCount < 150) {
      contentLevel = 'low';
    } else if (wordCount < 300) {
      contentLevel = 'medium';
    } else if (wordCount < 450) {
      contentLevel = 'high';
    } else {
      contentLevel = 'very_high';
    }

    // Recommended columns: Use 2 columns for high-density content
    const recommendedColumns = (contentLevel === 'high' || contentLevel === 'very_high') ? 2 : 1;

    // Typography scale based on density
    const recommendedTypographyScale = this.TYPOGRAPHY_PRESETS[contentLevel];

    // Vertical distribution strategy
    let verticalDistribution: 'top' | 'balanced' | 'full';
    if (contentLevel === 'low') {
      verticalDistribution = 'balanced'; // Center/balance low content
    } else if (contentLevel === 'medium') {
      verticalDistribution = 'balanced'; // Distribute evenly
    } else {
      verticalDistribution = 'full'; // Use full height for high content
    }

    // Whitespace strategy
    let whitespaceStrategy: 'generous' | 'moderate' | 'compact';
    if (contentLevel === 'low') {
      whitespaceStrategy = 'generous';
    } else if (contentLevel === 'medium' || contentLevel === 'high') {
      whitespaceStrategy = 'moderate';
    } else {
      whitespaceStrategy = 'compact';
    }

    return {
      contentLevel,
      wordCount,
      blockCount,
      hasHeadings,
      hasLists,
      recommendedColumns,
      recommendedTypographyScale,
      verticalDistribution,
      whitespaceStrategy,
    };
  }

  /**
   * Generate composed sections with adaptive typography
   */
  private generateAdaptiveSections(
    blocks: ContentBlock[],
    density: LayoutDensity,
    config: AdaptiveLayoutConfig,
  ): ComposedSection[] {
    const sections: ComposedSection[] = [];
    const typo = density.recommendedTypographyScale;
    const spacing = this.getSpacingForStrategy(density.whitespaceStrategy);

    for (const block of blocks) {
      switch (block.type) {
        case 'title':
        case 'heading':
          sections.push({
            type: 'heading',
            content: block.cleanText,
            fontSize: typo.h1,
            fontWeight: 700,
            lineHeight: 1.2,
            marginTop: spacing.headingTop,
            marginBottom: spacing.headingBottom,
            color: this.getColorForScheme(config.colorScheme, 'primary'),
            alignment: 'left',
          });
          break;

        case 'subheading':
          sections.push({
            type: 'heading',
            content: block.cleanText,
            fontSize: typo.h2,
            fontWeight: 600,
            lineHeight: 1.3,
            marginTop: spacing.subheadingTop,
            marginBottom: spacing.subheadingBottom,
            color: this.getColorForScheme(config.colorScheme, 'secondary'),
            alignment: 'left',
          });
          break;

        case 'paragraph':
          sections.push({
            type: 'text',
            content: block.cleanText,
            fontSize: typo.body,
            fontWeight: 400,
            lineHeight: typo.lineHeight,
            marginTop: 0,
            marginBottom: typo.paragraphSpacing,
            color: '#1F2937',
            alignment: 'justify',
          });
          break;

        case 'bullet_list':
        case 'numbered_list':
          sections.push({
            type: 'list',
            content: block.cleanText,
            fontSize: typo.body,
            fontWeight: 400,
            lineHeight: 1.6,
            marginTop: spacing.listTop,
            marginBottom: spacing.listBottom,
            color: '#374151',
            alignment: 'left',
          });
          break;

        case 'quote':
          sections.push({
            type: 'quote',
            content: block.cleanText,
            fontSize: typo.h3,
            fontWeight: 500,
            lineHeight: 1.5,
            marginTop: spacing.quoteTop,
            marginBottom: spacing.quoteBottom,
            color: this.getColorForScheme(config.colorScheme, 'accent'),
            alignment: 'center',
            maxWidth: 80, // Percentage
          });
          break;

        case 'separator':
          sections.push({
            type: 'visual_break',
            content: '',
            fontSize: 0,
            fontWeight: 400,
            lineHeight: 1,
            marginTop: spacing.separatorTop,
            marginBottom: spacing.separatorBottom,
            color: '#E5E7EB',
          });
          break;

        default:
          // Treat unknown types as paragraphs
          if (block.cleanText.trim()) {
            sections.push({
              type: 'text',
              content: block.cleanText,
              fontSize: typo.body,
              fontWeight: 400,
              lineHeight: typo.lineHeight,
              marginTop: 0,
              marginBottom: typo.paragraphSpacing,
              color: '#1F2937',
              alignment: 'justify',
            });
          }
      }
    }

    return sections;
  }

  /**
   * Determine optimal layout strategy based on density
   */
  private determineLayoutStrategy(
    density: LayoutDensity,
    sections: ComposedSection[],
    config: AdaptiveLayoutConfig,
  ): {
    columns: 1 | 2;
    verticalAlignment: 'top' | 'center' | 'distributed';
    backgroundStyle?: any;
  } {
    // Use recommended columns from density analysis
    const columns = density.recommendedColumns;

    // Determine vertical alignment based on distribution strategy
    let verticalAlignment: 'top' | 'center' | 'distributed';
    switch (density.verticalDistribution) {
      case 'top':
        verticalAlignment = 'top';
        break;
      case 'balanced':
        verticalAlignment = 'center';
        break;
      case 'full':
        verticalAlignment = 'distributed';
        break;
    }

    // Background styling for low-content pages
    let backgroundStyle;
    if (density.contentLevel === 'low') {
      backgroundStyle = {
        accent: true,
        gradient: true,
        colorScheme: config.colorScheme,
      };
    }

    return {
      columns,
      verticalAlignment,
      backgroundStyle,
    };
  }

  /**
   * Estimate how much of the page will be filled (0-100%)
   */
  private estimatePageFill(
    sections: ComposedSection[],
    layout: any,
    config: AdaptiveLayoutConfig,
  ): number {
    const availableHeight = config.pageHeight - config.margins.top - config.margins.bottom;
    
    let estimatedHeight = 0;
    for (const section of sections) {
      // Estimate text height based on font size and line height
      const lines = Math.ceil(section.content.length / (layout.columns === 2 ? 50 : 80));
      const sectionHeight = (section.fontSize * section.lineHeight * lines) / 3.7795; // pt to mm
      estimatedHeight += sectionHeight + section.marginTop + section.marginBottom;
    }

    const fillPercentage = Math.min(100, (estimatedHeight / availableHeight) * 100);
    return Math.round(fillPercentage);
  }

  /**
   * Validate composition quality and identify issues
   */
  private validateComposition(
    sections: ComposedSection[],
    layout: any,
    density: LayoutDensity,
    fillPercentage: number,
  ): { qualityScore: number; issues: string[] } {
    const issues: string[] = [];
    let qualityScore = 100;

    // Check for under-utilization (< 40% fill)
    if (fillPercentage < 40) {
      issues.push('Low page utilization - consider enlarging typography or adding visual elements');
      qualityScore -= 20;
    }

    // Check for over-crowding (> 90% fill)
    if (fillPercentage > 90) {
      issues.push('Page overcrowded - consider splitting content or reducing font size');
      qualityScore -= 15;
    }

    // Check for orphan headings (heading with no following content)
    for (let i = 0; i < sections.length - 1; i++) {
      if (sections[i].type === 'heading' && sections[i + 1]?.type === 'heading') {
        issues.push('Orphan heading detected - heading without body content');
        qualityScore -= 10;
      }
    }

    // Check for weak typography hierarchy
    const hasHeadings = sections.some(s => s.type === 'heading');
    const hasBody = sections.some(s => s.type === 'text');
    if (hasBody && !hasHeadings) {
      issues.push('Weak visual hierarchy - missing section headings');
      qualityScore -= 5;
    }

    // Check vertical distribution
    if (density.contentLevel === 'medium' && fillPercentage < 50) {
      issues.push('Poor vertical distribution - content concentrated at top');
      qualityScore -= 10;
    }

    return {
      qualityScore: Math.max(0, qualityScore),
      issues,
    };
  }

  /**
   * Get spacing values based on whitespace strategy
   */
  private getSpacingForStrategy(strategy: 'generous' | 'moderate' | 'compact'): Record<string, number> {
    switch (strategy) {
      case 'generous':
        return {
          headingTop: 12,
          headingBottom: 8,
          subheadingTop: 10,
          subheadingBottom: 6,
          listTop: 6,
          listBottom: 8,
          quoteTop: 10,
          quoteBottom: 10,
          separatorTop: 8,
          separatorBottom: 8,
        };
      case 'moderate':
        return {
          headingTop: 8,
          headingBottom: 5,
          subheadingTop: 7,
          subheadingBottom: 4,
          listTop: 4,
          listBottom: 5,
          quoteTop: 7,
          quoteBottom: 7,
          separatorTop: 5,
          separatorBottom: 5,
        };
      case 'compact':
        return {
          headingTop: 6,
          headingBottom: 3,
          subheadingTop: 5,
          subheadingBottom: 3,
          listTop: 3,
          listBottom: 4,
          quoteTop: 5,
          quoteBottom: 5,
          separatorTop: 4,
          separatorBottom: 4,
        };
    }
  }

  /**
   * Get color for scheme
   */
  private getColorForScheme(scheme: string, role: 'primary' | 'secondary' | 'accent'): string {
    const colorMap: Record<string, Record<string, string>> = {
      blue: { primary: '#1E40AF', secondary: '#3B82F6', accent: '#60A5FA' },
      navy: { primary: '#1E3A8A', secondary: '#2563EB', accent: '#3B82F6' },
      purple: { primary: '#7C3AED', secondary: '#9333EA', accent: '#C084FC' },
      green: { primary: '#047857', secondary: '#10B981', accent: '#34D399' },
      gray: { primary: '#374151', secondary: '#6B7280', accent: '#9CA3AF' },
    };

    return colorMap[scheme]?.[role] || colorMap.blue[role];
  }

  /**
   * Auto-correct composition issues
   */
  autoCorrectComposition(composition: AdaptivePageComposition): AdaptivePageComposition {
    const corrected = { ...composition };

    // Fix under-utilization
    if (corrected.estimatedFillPercentage < 40 && corrected.density.contentLevel === 'low') {
      // Increase typography scale
      corrected.sections = corrected.sections.map(section => ({
        ...section,
        fontSize: section.fontSize * 1.2,
        marginTop: section.marginTop * 1.3,
        marginBottom: section.marginBottom * 1.3,
      }));
      corrected.layout.verticalAlignment = 'center';
      this.logger.log(`Auto-corrected page ${corrected.pageNumber}: Enlarged typography for low content`);
    }

    // Fix over-crowding
    if (corrected.estimatedFillPercentage > 90) {
      // Reduce typography scale
      corrected.sections = corrected.sections.map(section => ({
        ...section,
        fontSize: section.fontSize * 0.9,
        marginTop: section.marginTop * 0.8,
        marginBottom: section.marginBottom * 0.8,
      }));
      this.logger.log(`Auto-corrected page ${corrected.pageNumber}: Reduced typography for overcrowding`);
    }

    // Recalculate fill percentage after corrections
    corrected.estimatedFillPercentage = this.estimatePageFill(
      corrected.sections,
      corrected.layout,
      {
        pageWidth: 210,
        pageHeight: 297,
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        colorScheme: 'blue',
        templateType: '',
      },
    );

    return corrected;
  }
}
