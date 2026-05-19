import { Injectable, Logger } from '@nestjs/common';

export interface CompositionLayout {
  type: string;
  columns: number;
  gap: number;
  alignment: 'left' | 'center' | 'justify';
  padding: { top: number; right: number; bottom: number; left: number };
}

@Injectable()
export class LayoutCompositionService {
  private readonly logger = new Logger(LayoutCompositionService.name);

  composeSingleColumn(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'single-column',
      columns: 1,
      gap: 0,
      alignment: 'left',
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      ...config,
    };
  }

  composeTwoColumn(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'two-column',
      columns: 2,
      gap: 24,
      alignment: 'left',
      padding: { top: 40, right: 32, bottom: 40, left: 32 },
      ...config,
    };
  }

  composeThreeColumn(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'three-column',
      columns: 3,
      gap: 20,
      alignment: 'left',
      padding: { top: 40, right: 28, bottom: 40, left: 28 },
      ...config,
    };
  }

  composeSidebar(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'sidebar',
      columns: 2,
      gap: 32,
      alignment: 'left',
      padding: { top: 40, right: 40, bottom: 40, left: 40 },
      ...config,
    };
  }

  composeMetricGrid(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'metric-grid',
      columns: 3,
      gap: 24,
      alignment: 'center',
      padding: { top: 48, right: 40, bottom: 48, left: 40 },
      ...config,
    };
  }

  composeEditorialSpread(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'editorial-spread',
      columns: 2,
      gap: 28,
      alignment: 'left',
      padding: { top: 48, right: 36, bottom: 48, left: 36 },
      ...config,
    };
  }

  composeFeatureGrid(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'feature-grid',
      columns: 2,
      gap: 32,
      alignment: 'center',
      padding: { top: 48, right: 40, bottom: 48, left: 40 },
      ...config,
    };
  }

  composeTimeline(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'timeline-layout',
      columns: 1,
      gap: 0,
      alignment: 'left',
      padding: { top: 48, right: 48, bottom: 48, left: 48 },
      ...config,
    };
  }

  composeQuotePage(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'quote-page',
      columns: 1,
      gap: 0,
      alignment: 'center',
      padding: { top: 80, right: 60, bottom: 80, left: 60 },
      ...config,
    };
  }

  composeClosingPage(config?: Partial<CompositionLayout>): CompositionLayout {
    return {
      type: 'closing-page',
      columns: 1,
      gap: 0,
      alignment: 'center',
      padding: { top: 100, right: 60, bottom: 100, left: 60 },
      ...config,
    };
  }

  getLayoutForType(layoutType: string): CompositionLayout {
    const layoutMap: Record<string, () => CompositionLayout> = {
      'single-column': () => this.composeSingleColumn(),
      'two-column': () => this.composeTwoColumn(),
      'three-column': () => this.composeThreeColumn(),
      'sidebar': () => this.composeSidebar(),
      'metric-grid': () => this.composeMetricGrid(),
      'editorial-spread': () => this.composeEditorialSpread(),
      'feature-grid': () => this.composeFeatureGrid(),
      'timeline-layout': () => this.composeTimeline(),
      'quote-page': () => this.composeQuotePage(),
      'closing-page': () => this.composeClosingPage(),
    };

    return (layoutMap[layoutType] || (() => this.composeSingleColumn()))();
  }

  combineLayouts(...layouts: CompositionLayout[]): CompositionLayout {
    if (layouts.length === 0) return this.composeSingleColumn();
    if (layouts.length === 1) return layouts[0];

    return {
      type: 'combined',
      columns: Math.max(...layouts.map(l => l.columns)),
      gap: Math.max(...layouts.map(l => l.gap)),
      alignment: 'left',
      padding: layouts[0].padding,
    };
  }
}
