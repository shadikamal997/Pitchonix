import { Injectable, Logger } from '@nestjs/common';
import { ContentBlock } from './content-block-extractor.service';

export type LayoutType =
  | 'single-column'
  | 'two-column'
  | 'three-column'
  | 'sidebar'
  | 'editorial-spread'
  | 'metric-grid'
  | 'timeline-layout'
  | 'visual-feature';

export interface LayoutMetadata {
  layoutType: LayoutType;
  columnCount: number;
  columnGap: number;
  columnBalance: 'balanced' | 'first-column-heavy' | 'distributed';
  contentDensity: 'sparse' | 'moderate' | 'dense';
  autoLayoutReason: string;
}

/**
 * AutoLayoutEngineService
 *
 * Automatically selects appropriate layout types for pages based on:
 * - Content type and structure
 * - Word count and density
 * - Block composition
 * - Section type
 */
@Injectable()
export class AutoLayoutEngineService {
  private readonly logger = new Logger(AutoLayoutEngineService.name);

  selectLayout(
    blocks: ContentBlock[],
    wordCount: number,
    sectionType: string,
    pageIndex: number,
  ): LayoutMetadata {
    // Never column-layout special pages
    if (this.isSpecialPageType(sectionType)) {
      return this.createLayoutMetadata('single-column', 'single-column', 'Special page type');
    }

    const blockTypes = blocks.map(b => b.type);
    const hasLongText = this.hasLongTextContent(blocks);
    const hasMetrics = this.hasMetricsContent(blocks);
    const hasTimeline = this.hasTimelineContent(blocks);
    const hasImages = this.hasSignificantImages(blocks);
    const density = this.calculateDensity(wordCount, blocks.length);

    // Statistics/metrics-heavy → grid layout
    if (hasMetrics && wordCount > 300) {
      return this.createLayoutMetadata('metric-grid', 'metric-grid', 'Dense metrics detected');
    }

    // Timeline section → timeline layout
    if (hasTimeline) {
      return this.createLayoutMetadata('timeline-layout', 'timeline-layout', 'Timeline structure detected');
    }

    // Very dense text (450+ words) → two-column
    if (hasLongText && wordCount > 450) {
      return this.createLayoutMetadata('two-column', 'two-column', 'Long text section with high density');
    }

    // Dense content with mix → editorial spread
    if (density === 'dense' && wordCount > 400 && blockTypes.length > 3) {
      return this.createLayoutMetadata('editorial-spread', 'editorial-spread', 'Complex dense content mix');
    }

    // Image-heavy with moderate text → sidebar
    if (hasImages && wordCount > 150 && wordCount < 350) {
      return this.createLayoutMetadata('sidebar', 'sidebar', 'Image-heavy with supporting text');
    }

    // Short content (< 250 words) → single-column with stronger typography
    if (wordCount < 250) {
      return this.createLayoutMetadata('single-column', 'single-column', 'Short content, single column optimal');
    }

    // Moderate text (250-400 words) → single-column
    if (wordCount <= 400) {
      return this.createLayoutMetadata('single-column', 'single-column', 'Moderate content fits single column');
    }

    // Default: two-column for remaining cases
    return this.createLayoutMetadata('two-column', 'two-column', 'Default multi-column for content volume');
  }

  private isSpecialPageType(sectionType: string): boolean {
    return ['cover', 'toc', 'quote', 'closing', 'visual'].includes(sectionType);
  }

  private hasLongTextContent(blocks: ContentBlock[]): boolean {
    return blocks.some(b =>
      b.type === 'paragraph' && b.wordCount > 200
    );
  }

  private hasMetricsContent(blocks: ContentBlock[]): boolean {
    return blocks.some(b =>
      (['table', 'metric'] as ContentBlock['type'][]).includes(b.type) ||
      (b.type === 'paragraph' && (b.cleanText?.includes('$') || b.cleanText?.includes('%')))
    );
  }

  private hasTimelineContent(blocks: ContentBlock[]): boolean {
    return blocks.some(b => b.type === 'numbered_list');
  }

  private hasSignificantImages(_blocks: ContentBlock[]): boolean {
    // ContentBlock type does not include 'image' — images are tracked elsewhere
    return false;
  }

  private calculateDensity(wordCount: number, blockCount: number): 'sparse' | 'moderate' | 'dense' {
    const wordsPerBlock = wordCount / (blockCount || 1);

    if (wordsPerBlock > 150) return 'dense';
    if (wordsPerBlock > 80) return 'moderate';
    return 'sparse';
  }

  private createLayoutMetadata(
    layoutType: LayoutType,
    columnType: string,
    reason: string,
  ): LayoutMetadata {
    const columnMap: Record<string, number> = {
      'single-column': 1,
      'two-column': 2,
      'three-column': 3,
      'sidebar': 2,
      'editorial-spread': 2,
      'metric-grid': 3,
      'timeline-layout': 2,
      'visual-feature': 1,
    };

    return {
      layoutType,
      columnCount: columnMap[columnType] || 1,
      columnGap: columnMap[columnType] === 1 ? 0 : 24,
      columnBalance: 'balanced',
      contentDensity: this.getDensityFromReason(reason),
      autoLayoutReason: reason,
    };
  }

  private getDensityFromReason(reason: string): 'sparse' | 'moderate' | 'dense' {
    if (reason.includes('dense') || reason.includes('dense')) return 'dense';
    if (reason.includes('heavy')) return 'dense';
    if (reason.includes('moderate')) return 'moderate';
    return 'moderate';
  }
}
