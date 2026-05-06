import { Injectable, Logger } from '@nestjs/common';
import { SlideContent, WizardInput } from '../slide-types/types';
import { ChartConfig, ChartType, ChartDataSeries } from './types';

/**
 * Chart Generation Service
 * Automatically generates chart configurations from slide data
 */
@Injectable()
export class ChartGenerationService {
  private readonly logger = new Logger(ChartGenerationService.name);

  /**
   * Generate charts for a slide based on its content
   */
  generateChartsForSlide(
    slide: SlideContent,
    input: WizardInput,
  ): ChartConfig[] {
    if (!input.includeCharts) {
      return [];
    }

    const charts: ChartConfig[] = [];

    try {
      switch (slide.type) {
        case 'market_opportunity':
          charts.push(...this.generateMarketCharts(slide));
          break;
        case 'traction':
          charts.push(...this.generateTractionCharts(slide));
          break;
        case 'business_model':
          charts.push(...this.generateBusinessModelCharts(slide));
          break;
        case 'financials':
          charts.push(...this.generateFinancialCharts(slide));
          break;
        case 'competition':
          charts.push(...this.generateCompetitionCharts(slide));
          break;
        case 'roadmap':
          charts.push(...this.generateRoadmapCharts(slide));
          break;
        default:
          // No charts for other slide types
          break;
      }
    } catch (error) {
      this.logger.warn(
        `Failed to generate charts for slide ${slide.type}: ${error.message}`,
      );
    }

    return charts;
  }

  /**
   * Generate market opportunity charts (TAM/SAM/SOM)
   */
  private generateMarketCharts(slide: SlideContent): ChartConfig[] {
    const content = slide.content;
    if (!content.tam || !content.sam || !content.som) {
      return [];
    }

    // Extract values
    const tamValue = this.extractNumericValue(content.tam.value);
    const samValue = this.extractNumericValue(content.sam.value);
    const somValue = this.extractNumericValue(content.som.value);

    if (!tamValue || !samValue || !somValue) {
      return [];
    }

    // Funnel chart for TAM/SAM/SOM
    const funnelChart: ChartConfig = {
      type: ChartType.FUNNEL,
      title: 'Market Opportunity',
      data: [
        {
          name: 'TAM',
          values: [tamValue],
          labels: [content.tam.label || 'Total Addressable Market'],
          color: '#4F46E5',
        },
        {
          name: 'SAM',
          values: [samValue],
          labels: [content.sam.label || 'Serviceable Available Market'],
          color: '#7C3AED',
        },
        {
          name: 'SOM',
          values: [somValue],
          labels: [content.som.label || 'Serviceable Obtainable Market'],
          color: '#A78BFA',
        },
      ],
      options: {
        showLegend: true,
        showDataLabels: true,
        backgroundColor: '#FFFFFF',
      },
      width: 600,
      height: 400,
    };

    return [funnelChart];
  }

  /**
   * Generate traction/metrics charts
   */
  private generateTractionCharts(slide: SlideContent): ChartConfig[] {
    const content = slide.content;
    const charts: ChartConfig[] = [];

    // Metrics bar chart
    if (content.metrics && Array.isArray(content.metrics)) {
      const metricsChart: ChartConfig = {
        type: ChartType.BAR,
        title: 'Key Metrics',
        data: [
          {
            name: 'Metrics',
            values: content.metrics.map((m: any) =>
              this.extractNumericValue(m.value) || 0,
            ),
            labels: content.metrics.map((m: any) => m.label),
            color: '#10B981',
          },
        ],
        options: {
          showLegend: false,
          showDataLabels: true,
          showGrid: true,
        },
        width: 600,
        height: 350,
      };
      charts.push(metricsChart);
    }

    // Growth trend line chart
    if (content.milestones && Array.isArray(content.milestones)) {
      const growthChart: ChartConfig = {
        type: ChartType.LINE,
        title: 'Growth Timeline',
        data: [
          {
            name: 'Progress',
            values: content.milestones.map((_: any, i: number) => (i + 1) * 25),
            labels: content.milestones.map((m: any, i: number) => m.date || `Q${i + 1}`),
            color: '#3B82F6',
          },
        ],
        options: {
          showLegend: false,
          showDataLabels: true,
          showGrid: true,
        },
        width: 600,
        height: 300,
      };
      charts.push(growthChart);
    }

    return charts;
  }

  /**
   * Generate business model charts (pricing tiers)
   */
  private generateBusinessModelCharts(slide: SlideContent): ChartConfig[] {
    const content = slide.content;
    if (!content.pricing || !Array.isArray(content.pricing)) {
      return [];
    }

    const pricingChart: ChartConfig = {
      type: ChartType.COLUMN,
      title: 'Pricing Structure',
      data: [
        {
          name: 'Price',
          values: content.pricing.map((p: any) =>
            this.extractNumericValue(p.price) || 0,
          ),
          labels: content.pricing.map((p: any) => p.tier || p.name),
          color: '#8B5CF6',
        },
      ],
      options: {
        showLegend: false,
        showDataLabels: true,
        showGrid: false,
      },
      width: 500,
      height: 350,
    };

    return [pricingChart];
  }

  /**
   * Generate financial projection charts
   */
  private generateFinancialCharts(slide: SlideContent): ChartConfig[] {
    const content = slide.content;
    const charts: ChartConfig[] = [];

    if (content.projections && Array.isArray(content.projections)) {
      // Revenue chart
      const revenueChart: ChartConfig = {
        type: ChartType.COLUMN,
        title: 'Revenue Projections',
        data: [
          {
            name: 'Revenue',
            values: content.projections.map((p: any) =>
              this.extractNumericValue(p.revenue) || 0,
            ),
            labels: content.projections.map((p: any) => p.year?.toString() || ''),
            color: '#059669',
          },
          {
            name: 'Expenses',
            values: content.projections.map((p: any) =>
              this.extractNumericValue(p.expenses) || 0,
            ),
            labels: content.projections.map((p: any) => p.year?.toString() || ''),
            color: '#DC2626',
          },
        ],
        options: {
          showLegend: true,
          showDataLabels: true,
          showGrid: true,
        },
        width: 650,
        height: 400,
      };
      charts.push(revenueChart);

      // EBITDA line chart
      const ebitdaChart: ChartConfig = {
        type: ChartType.LINE,
        title: 'EBITDA Trend',
        data: [
          {
            name: 'EBITDA',
            values: content.projections.map((p: any) =>
              this.extractNumericValue(p.ebitda) || 0,
            ),
            labels: content.projections.map((p: any) => p.year?.toString() || ''),
            color: '#F59E0B',
          },
        ],
        options: {
          showLegend: false,
          showDataLabels: true,
          showGrid: true,
        },
        width: 650,
        height: 300,
      };
      charts.push(ebitdaChart);
    }

    return charts;
  }

  /**
   * Generate competition comparison chart
   */
  private generateCompetitionCharts(slide: SlideContent): ChartConfig[] {
    const content = slide.content;
    if (!content.competitors || !Array.isArray(content.competitors)) {
      return [];
    }

    // Simplified feature comparison
    const comparisonChart: ChartConfig = {
      type: ChartType.BAR,
      title: 'Competitive Comparison',
      data: [
        {
          name: 'Features',
          values: content.competitors.map((_: any, i: number) => 
            i === 0 ? 95 : 60 + Math.random() * 20
          ),
          labels: content.competitors.map((c: any) => c.name),
          color: '#6366F1',
        },
      ],
      options: {
        showLegend: false,
        showDataLabels: true,
        showGrid: true,
      },
      width: 600,
      height: 350,
    };

    return [comparisonChart];
  }

  /**
   * Generate roadmap timeline chart
   */
  private generateRoadmapCharts(slide: SlideContent): ChartConfig[] {
    const content = slide.content;
    if (!content.phases || !Array.isArray(content.phases)) {
      return [];
    }

    // Timeline/Gantt-style representation
    const roadmapChart: ChartConfig = {
      type: ChartType.BAR,
      title: 'Product Roadmap',
      data: [
        {
          name: 'Features',
          values: content.phases.map((p: any) => p.items?.length || 1),
          labels: content.phases.map((p: any) => p.quarter),
          color: '#EC4899',
        },
      ],
      options: {
        showLegend: false,
        showDataLabels: true,
        showGrid: false,
      },
      width: 600,
      height: 300,
    };

    return [roadmapChart];
  }

  /**
   * Extract numeric value from string (e.g., "$50M" -> 50)
   */
  private extractNumericValue(value: string | number): number | null {
    if (typeof value === 'number') {
      return value;
    }

    if (typeof value !== 'string') {
      return null;
    }

    // Remove currency symbols and commas
    const cleaned = value.replace(/[$,]/g, '');

    // Handle M, B, K suffixes
    const match = cleaned.match(/([\d.]+)([MBK])?/i);
    if (!match) {
      return null;
    }

    let num = parseFloat(match[1]);
    const suffix = match[2]?.toUpperCase();

    if (suffix === 'B') {
      num *= 1000;
    } else if (suffix === 'M') {
      num *= 1;
    } else if (suffix === 'K') {
      num *= 0.001;
    }

    return num;
  }

  /**
   * Get chart color scheme based on theme
   */
  getColorScheme(themeName: string): string[] {
    const schemes: Record<string, string[]> = {
      default: ['#4F46E5', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
      professional: ['#1E40AF', '#059669', '#D97706', '#DC2626', '#7C3AED'],
      modern: ['#6366F1', '#14B8A6', '#F59E0B', '#EC4899', '#8B5CF6'],
      minimal: ['#374151', '#6B7280', '#9CA3AF', '#D1D5DB', '#E5E7EB'],
    };

    return schemes[themeName] || schemes.default;
  }
}
