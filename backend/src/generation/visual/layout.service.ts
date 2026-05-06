import { Injectable, Logger } from '@nestjs/common';
import { SlideContent } from '../slide-types/types';
import { LayoutConfig, LayoutType, LayoutRegion } from './types';

/**
 * Layout Service
 * Manages slide layouts and regions
 */
@Injectable()
export class LayoutService {
  private readonly logger = new Logger(LayoutService.name);
  private layouts: Map<LayoutType, LayoutConfig> = new Map();

  constructor() {
    this.initializeLayouts();
  }

  /**
   * Get layout for a slide based on its type and content
   */
  getLayoutForSlide(slide: SlideContent): LayoutConfig {
    const layoutType = this.determineLayoutType(slide);
    const layout = this.layouts.get(layoutType);

    if (!layout) {
      this.logger.warn(`Layout ${layoutType} not found, using default`);
      return this.layouts.get(LayoutType.TITLE_CONTENT)!;
    }

    return layout;
  }

  /**
   * Determine appropriate layout based on slide content
   */
  private determineLayoutType(slide: SlideContent): LayoutType {
    switch (slide.type) {
      case 'cover':
        return LayoutType.TITLE_SLIDE;

      case 'problem':
      case 'solution':
      case 'team':
        return LayoutType.TITLE_BULLETS;

      case 'market_opportunity':
      case 'traction':
      case 'financials':
        return LayoutType.TITLE_CHART;

      case 'business_model':
      case 'pricing':
        return LayoutType.TWO_COLUMN;

      case 'competition':
        return LayoutType.COMPARISON;

      case 'vision':
      case 'company_overview':
        return LayoutType.SECTION_HEADER;

      default:
        return LayoutType.TITLE_CONTENT;
    }
  }

  /**
   * Initialize predefined layouts
   */
  private initializeLayouts(): void {
    // Title Slide Layout (Cover)
    this.layouts.set(LayoutType.TITLE_SLIDE, {
      type: LayoutType.TITLE_SLIDE,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 10,
          y: 35,
          width: 80,
          height: 15,
          fontSize: 54,
          fontWeight: 'bold',
          textAlign: 'center',
          verticalAlign: 'middle',
        },
        {
          id: 'subtitle',
          type: 'subtitle',
          x: 10,
          y: 52,
          width: 80,
          height: 8,
          fontSize: 28,
          fontWeight: 'normal',
          textAlign: 'center',
          verticalAlign: 'middle',
        },
        {
          id: 'footer',
          type: 'footer',
          x: 5,
          y: 90,
          width: 90,
          height: 5,
          fontSize: 14,
          textAlign: 'center',
        },
      ],
      backgroundColor: '#FFFFFF',
    });

    // Title + Content Layout
    this.layouts.set(LayoutType.TITLE_CONTENT, {
      type: LayoutType.TITLE_CONTENT,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 5,
          y: 5,
          width: 90,
          height: 10,
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'left',
        },
        {
          id: 'content',
          type: 'content',
          x: 5,
          y: 20,
          width: 90,
          height: 70,
          fontSize: 18,
          textAlign: 'left',
          padding: 20,
        },
      ],
      backgroundColor: '#FFFFFF',
    });

    // Title + Bullets Layout
    this.layouts.set(LayoutType.TITLE_BULLETS, {
      type: LayoutType.TITLE_BULLETS,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 5,
          y: 5,
          width: 90,
          height: 10,
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'left',
        },
        {
          id: 'subtitle',
          type: 'subtitle',
          x: 5,
          y: 16,
          width: 90,
          height: 5,
          fontSize: 20,
          fontWeight: 'normal',
          textAlign: 'left',
        },
        {
          id: 'content',
          type: 'content',
          x: 8,
          y: 25,
          width: 84,
          height: 65,
          fontSize: 20,
          textAlign: 'left',
          padding: 10,
        },
      ],
      backgroundColor: '#FFFFFF',
    });

    // Title + Chart Layout
    this.layouts.set(LayoutType.TITLE_CHART, {
      type: LayoutType.TITLE_CHART,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 5,
          y: 5,
          width: 90,
          height: 10,
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'left',
        },
        {
          id: 'subtitle',
          type: 'subtitle',
          x: 5,
          y: 16,
          width: 90,
          height: 5,
          fontSize: 20,
          textAlign: 'left',
        },
        {
          id: 'chart',
          type: 'chart',
          x: 10,
          y: 25,
          width: 80,
          height: 60,
        },
      ],
      backgroundColor: '#FFFFFF',
    });

    // Two Column Layout
    this.layouts.set(LayoutType.TWO_COLUMN, {
      type: LayoutType.TWO_COLUMN,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 5,
          y: 5,
          width: 90,
          height: 10,
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'left',
        },
        {
          id: 'content-left',
          type: 'content',
          x: 5,
          y: 20,
          width: 42,
          height: 70,
          fontSize: 18,
          textAlign: 'left',
          padding: 15,
        },
        {
          id: 'content-right',
          type: 'content',
          x: 53,
          y: 20,
          width: 42,
          height: 70,
          fontSize: 18,
          textAlign: 'left',
          padding: 15,
        },
      ],
      backgroundColor: '#FFFFFF',
    });

    // Comparison Layout
    this.layouts.set(LayoutType.COMPARISON, {
      type: LayoutType.COMPARISON,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 5,
          y: 5,
          width: 90,
          height: 10,
          fontSize: 36,
          fontWeight: 'bold',
          textAlign: 'left',
        },
        {
          id: 'chart',
          type: 'chart',
          x: 5,
          y: 20,
          width: 90,
          height: 70,
        },
      ],
      backgroundColor: '#FFFFFF',
    });

    // Section Header Layout
    this.layouts.set(LayoutType.SECTION_HEADER, {
      type: LayoutType.SECTION_HEADER,
      regions: [
        {
          id: 'title',
          type: 'title',
          x: 10,
          y: 40,
          width: 80,
          height: 15,
          fontSize: 48,
          fontWeight: 'bold',
          textAlign: 'center',
          verticalAlign: 'middle',
        },
        {
          id: 'subtitle',
          type: 'subtitle',
          x: 10,
          y: 57,
          width: 80,
          height: 8,
          fontSize: 24,
          textAlign: 'center',
          verticalAlign: 'middle',
        },
      ],
      backgroundColor: '#F3F4F6',
    });

    // Blank Layout
    this.layouts.set(LayoutType.BLANK, {
      type: LayoutType.BLANK,
      regions: [],
      backgroundColor: '#FFFFFF',
    });

    // Full Image Layout
    this.layouts.set(LayoutType.FULL_IMAGE, {
      type: LayoutType.FULL_IMAGE,
      regions: [
        {
          id: 'image',
          type: 'image',
          x: 0,
          y: 0,
          width: 100,
          height: 100,
        },
      ],
      backgroundColor: '#000000',
    });

    this.logger.log(`Initialized ${this.layouts.size} layouts`);
  }

  /**
   * Get all available layouts
   */
  getAllLayouts(): LayoutConfig[] {
    return Array.from(this.layouts.values());
  }

  /**
   * Get layout by type
   */
  getLayout(type: LayoutType): LayoutConfig | undefined {
    return this.layouts.get(type);
  }

  /**
   * Add custom layout
   */
  addLayout(config: LayoutConfig): void {
    this.layouts.set(config.type, config);
    this.logger.log(`Added custom layout: ${config.type}`);
  }
}
