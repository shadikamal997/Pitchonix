import { Injectable, Logger } from '@nestjs/common';
import { PageComposition, ComposedSection } from './document-composition.service';

/**
 * Dynamic Cover Composer
 * 
 * Creates professional, adaptive cover pages with:
 * - Adaptive title scaling
 * - Subtitle hierarchy
 * - Metadata positioning
 * - Decorative balance
 * - Visual weight balancing
 * - Responsive spacing
 * - Multiple design styles
 */

export type CoverStyle =
  | 'modern'      // Clean, minimal, bold typography
  | 'executive'   // Corporate, professional, formal
  | 'minimal'     // Ultra-minimal, maximal whitespace
  | 'magazine'    // Editorial, dynamic, asymmetric
  | 'startup'     // Energetic, friendly, modern
  | 'corporate';  // Traditional, conservative, structured

export interface CoverContent {
  title: string;
  subtitle?: string;
  author?: string;
  date?: string;
  company?: string;
  metadata?: Record<string, string>;
  description?: string;
  accentColor?: string;
}

export interface CoverLayout {
  style: CoverStyle;
  titlePosition: 'top' | 'center' | 'bottom';
  titleSize: number; // rem
  subtitleSize: number; // rem
  alignment: 'left' | 'center' | 'right';
  whitespace: 'minimal' | 'balanced' | 'generous';
  decorative: boolean;
}

@Injectable()
export class DynamicCoverComposerService {
  private readonly logger = new Logger(DynamicCoverComposerService.name);

  // Cover dimension constants
  private readonly PAGE_WIDTH = 794; // A4 width in px
  private readonly PAGE_HEIGHT = 1123; // A4 height in px

  /**
   * Compose a professional cover page
   */
  composeCover(content: CoverContent, style: CoverStyle = 'modern'): PageComposition {
    const layout = this.selectCoverLayout(content, style);
    
    // Add auto-generated description if missing
    if (!content.description && content.subtitle) {
      content.description = `A comprehensive document exploring ${content.subtitle.toLowerCase()}`;
    }
    
    const sections = this.buildCoverSections(content, layout);

    return {
      pageNumber: 1,
      sections,
      metrics: {
        densityScore: 35, // Covers should be intentionally sparse
        readabilityScore: 100,
        whitespaceScore: 85,
        visualBalanceScore: 90,
        overallQuality: 88,
      },
      layout: 'cover',
      density: 'sparse',
    };
  }

  /**
   * Select optimal cover layout based on content and style
   */
  private selectCoverLayout(content: CoverContent, style: CoverStyle): CoverLayout {
    const titleLength = content.title.length;

    switch (style) {
      case 'modern':
        return {
          style: 'modern',
          titlePosition: 'center',
          titleSize: this.calculateTitleSize(titleLength, 'large'),
          subtitleSize: 1.563, // h3
          alignment: 'center',
          whitespace: 'generous',
          decorative: false,
        };

      case 'executive':
        return {
          style: 'executive',
          titlePosition: 'top',
          titleSize: this.calculateTitleSize(titleLength, 'medium'),
          subtitleSize: 1.25, // h4
          alignment: 'left',
          whitespace: 'balanced',
          decorative: true,
        };

      case 'minimal':
        return {
          style: 'minimal',
          titlePosition: 'center',
          titleSize: this.calculateTitleSize(titleLength, 'medium'),
          subtitleSize: 1.0, // body
          alignment: 'center',
          whitespace: 'generous',
          decorative: false,
        };

      case 'magazine':
        return {
          style: 'magazine',
          titlePosition: 'bottom',
          titleSize: this.calculateTitleSize(titleLength, 'xlarge'),
          subtitleSize: 1.953, // h2
          alignment: 'left',
          whitespace: 'minimal',
          decorative: true,
        };

      case 'startup':
        return {
          style: 'startup',
          titlePosition: 'center',
          titleSize: this.calculateTitleSize(titleLength, 'large'),
          subtitleSize: 1.563, // h3
          alignment: 'center',
          whitespace: 'balanced',
          decorative: true,
        };

      case 'corporate':
        return {
          style: 'corporate',
          titlePosition: 'center',
          titleSize: this.calculateTitleSize(titleLength, 'medium'),
          subtitleSize: 1.25, // h4
          alignment: 'center',
          whitespace: 'balanced',
          decorative: true,
        };

      default:
        return this.selectCoverLayout(content, 'modern');
    }
  }

  /**
   * Calculate adaptive title size based on length
   */
  private calculateTitleSize(titleLength: number, baseSize: 'xlarge' | 'large' | 'medium'): number {
    const baseSizes = {
      xlarge: 3.052, // ~49px (Perfect Fourth scale)
      large: 2.441,  // ~39px (Major Third scale)
      medium: 1.953, // ~31px
    };

    let size = baseSizes[baseSize];

    // Scale down for long titles
    if (titleLength > 50) {
      size *= 0.7;
    } else if (titleLength > 30) {
      size *= 0.85;
    }

    return size;
  }

  /**
   * Build cover sections
   */
  private buildCoverSections(content: CoverContent, layout: CoverLayout): ComposedSection[] {
    const sections: ComposedSection[] = [];

    // Calculate spacing based on layout position
    const spacingMap = {
      top: { titleBefore: 64, titleAfter: 32 },
      center: { titleBefore: 300, titleAfter: 24 },
      bottom: { titleBefore: 600, titleAfter: 24 },
    };

    const spacing = spacingMap[layout.titlePosition];

    // Title section
    sections.push({
      id: 'cover-title',
      type: 'heading',
      content: content.title,
      level: 1,
      visualWeight: 100,
      spaceBefore: spacing.titleBefore,
      spaceAfter: spacing.titleAfter,
      fontSize: layout.titleSize,
      lineHeight: 1.1,
    });

    // Subtitle section (if provided)
    if (content.subtitle) {
      sections.push({
        id: 'cover-subtitle',
        type: 'heading',
        content: content.subtitle,
        level: 2,
        visualWeight: 60,
        spaceBefore: 0,
        spaceAfter: 48,
        fontSize: layout.subtitleSize,
        lineHeight: 1.3,
      });
    }

    // Description (if provided)
    if (content.description) {
      sections.push({
        id: 'cover-description',
        type: 'paragraph',
        content: content.description,
        visualWeight: 30,
        spaceBefore: 0,
        spaceAfter: 64,
        fontSize: 1.0,
        lineHeight: 1.6,
        maxWidth: 500,
      });
    }

    // Metadata section (author, date, company)
    const metadataItems: string[] = [];
    if (content.author) metadataItems.push(content.author);
    if (content.company) metadataItems.push(content.company);
    if (content.date) metadataItems.push(this.formatDate(content.date));

    if (metadataItems.length > 0) {
      sections.push({
        id: 'cover-metadata',
        type: 'paragraph',
        content: metadataItems.join(' • '),
        visualWeight: 20,
        spaceBefore: layout.titlePosition === 'bottom' ? 48 : 0,
        spaceAfter: 0,
        fontSize: 0.875, // small
        lineHeight: 1.4,
      });
    }

    return sections;
  }

  /**
   * Format date for cover page
   */
  private formatDate(dateString: string): string {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  }

  /**
   * Generate cover CSS styling
   */
  generateCoverStyles(layout: CoverLayout, content: CoverContent): string {
    const accentColor = content.accentColor || this.getDefaultAccent(layout.style);

    const baseStyles = `
      .cover-page {
        width: ${this.PAGE_WIDTH}px;
        height: ${this.PAGE_HEIGHT}px;
        display: flex;
        flex-direction: column;
        justify-content: ${this.getJustifyContent(layout.titlePosition)};
        align-items: ${this.getAlignItems(layout.alignment)};
        text-align: ${layout.alignment};
        padding: 64px;
        background: ${this.getBackground(layout.style, accentColor)};
        position: relative;
        overflow: hidden;
      }

      .cover-title {
        font-size: ${layout.titleSize}rem;
        font-weight: 700;
        line-height: 1.1;
        margin-bottom: ${layout.subtitleSize > 0 ? '0.5em' : '0'};
        color: ${this.getTitleColor(layout.style)};
        ${this.getTitleEffects(layout.style)}
      }

      .cover-subtitle {
        font-size: ${layout.subtitleSize}rem;
        font-weight: 400;
        line-height: 1.3;
        opacity: 0.8;
        margin-bottom: 2em;
      }

      .cover-metadata {
        font-size: 0.875rem;
        opacity: 0.6;
        margin-top: auto;
        ${layout.titlePosition === 'bottom' ? 'margin-top: 2em;' : ''}
      }
    `;

    const decorativeStyles = layout.decorative
      ? this.getDecorativeStyles(layout.style, accentColor)
      : '';

    return baseStyles + decorativeStyles;
  }

  /**
   * Get flex justification based on position
   */
  private getJustifyContent(position: 'top' | 'center' | 'bottom'): string {
    const map = {
      top: 'flex-start',
      center: 'center',
      bottom: 'flex-end',
    };
    return map[position];
  }

  /**
   * Get flex alignment based on text alignment
   */
  private getAlignItems(alignment: 'left' | 'center' | 'right'): string {
    const map = {
      left: 'flex-start',
      center: 'center',
      right: 'flex-end',
    };
    return map[alignment];
  }

  /**
   * Get default accent color for style
   */
  private getDefaultAccent(style: CoverStyle): string {
    const map: Record<CoverStyle, string> = {
      modern: '#2563eb',    // Blue
      executive: '#1e40af', // Dark blue
      minimal: '#000000',   // Black
      magazine: '#dc2626',  // Red
      startup: '#8b5cf6',   // Purple
      corporate: '#059669', // Green
    };
    return map[style];
  }

  /**
   * Get background styling for cover
   */
  private getBackground(style: CoverStyle, accentColor: string): string {
    switch (style) {
      case 'modern':
        return `linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)`;

      case 'executive':
        return `linear-gradient(180deg, ${accentColor}05 0%, #ffffff 50%)`;

      case 'minimal':
        return '#ffffff';

      case 'magazine':
        return `linear-gradient(45deg, ${accentColor}10 0%, #ffffff 100%)`;

      case 'startup':
        return `radial-gradient(circle at top right, ${accentColor}08 0%, #ffffff 70%)`;

      case 'corporate':
        return '#ffffff';

      default:
        return '#ffffff';
    }
  }

  /**
   * Get title color for style
   */
  private getTitleColor(style: CoverStyle): string {
    switch (style) {
      case 'minimal':
        return '#000000';
      default:
        return '#1e293b'; // Slate gray
    }
  }

  /**
   * Get title effects (shadows, gradients) for style
   */
  private getTitleEffects(style: CoverStyle): string {
    switch (style) {
      case 'modern':
        return 'letter-spacing: -0.02em;';

      case 'executive':
        return 'text-transform: uppercase; letter-spacing: 0.05em;';

      case 'magazine':
        return 'letter-spacing: -0.03em; font-weight: 900;';

      case 'startup':
        return 'letter-spacing: -0.01em;';

      default:
        return '';
    }
  }

  /**
   * Get decorative styles for cover
   */
  private getDecorativeStyles(style: CoverStyle, accentColor: string): string {
    switch (style) {
      case 'executive':
        return `
          .cover-page::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 4px;
            height: 100%;
            background: ${accentColor};
          }
        `;

      case 'magazine':
        return `
          .cover-page::after {
            content: '';
            position: absolute;
            bottom: -50px;
            right: -50px;
            width: 300px;
            height: 300px;
            background: ${accentColor};
            opacity: 0.05;
            border-radius: 50%;
          }
        `;

      case 'startup':
        return `
          .cover-page::before {
            content: '';
            position: absolute;
            top: 32px;
            left: 32px;
            width: 100px;
            height: 100px;
            background: linear-gradient(135deg, ${accentColor}20, transparent);
            border-radius: 20px;
          }
        `;

      case 'corporate':
        return `
          .cover-page::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            width: 100%;
            height: 2px;
            background: ${accentColor};
          }
        `;

      default:
        return '';
    }
  }

  /**
   * Validate cover content
   */
  validateCoverContent(content: CoverContent): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!content.title || content.title.trim().length === 0) {
      errors.push('Title is required');
    }

    if (content.title && content.title.length > 120) {
      errors.push('Title is too long (max 120 characters)');
    }

    if (content.subtitle && content.subtitle.length > 200) {
      errors.push('Subtitle is too long (max 200 characters)');
    }

    if (content.description && content.description.length > 500) {
      errors.push('Description is too long (max 500 characters)');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Auto-detect best cover style based on content
   */
  autoDetectCoverStyle(content: CoverContent): CoverStyle {
    const title = content.title.toLowerCase();
    const subtitle = (content.subtitle || '').toLowerCase();

    // Keywords for different styles
    const keywords = {
      executive: ['annual report', 'quarterly', 'financial', 'executive summary', 'board'],
      magazine: ['magazine', 'editorial', 'feature', 'story', 'article'],
      startup: ['pitch', 'startup', 'funding', 'innovation', 'launch', 'product'],
      corporate: ['corporate', 'company', 'business', 'enterprise'],
      minimal: ['minimal', 'simple', 'clean', 'basic'],
    };

    // Check for matches
    for (const [style, words] of Object.entries(keywords)) {
      if (words.some(word => title.includes(word) || subtitle.includes(word))) {
        return style as CoverStyle;
      }
    }

    // Default to modern
    return 'modern';
  }
}
