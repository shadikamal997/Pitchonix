import { Injectable } from '@nestjs/common';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';

export interface ChartData {
  type: 'bar' | 'line' | 'pie' | 'doughnut' | 'radar' | 'polarArea';
  title?: string;
  labels: string[];
  datasets: Array<{
    label: string;
    data: number[];
    backgroundColor?: string | string[];
    borderColor?: string | string[];
    borderWidth?: number;
  }>;
  options?: any;
}

@Injectable()
export class ChartRenderingService {
  private chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor() {
    // Initialize with default dimensions
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 400,
      backgroundColour: 'white',
    });
  }

  /**
   * Render chart to base64 image
   */
  async renderChartToBase64(chartData: ChartData): Promise<string> {
    const configuration = this.buildChartConfig(chartData);
    const imageBuffer = await this.chartJSNodeCanvas.renderToBuffer(configuration);
    return `data:image/png;base64,${imageBuffer.toString('base64')}`;
  }

  /**
   * Render chart to buffer
   */
  async renderChartToBuffer(chartData: ChartData): Promise<Buffer> {
    const configuration = this.buildChartConfig(chartData);
    return await this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  /**
   * Build Chart.js configuration from simplified data
   */
  private buildChartConfig(chartData: ChartData): ChartConfiguration {
    const { type, labels, datasets, options = {} } = chartData;

    // Apply default colors if not provided
    const enhancedDatasets = datasets.map((dataset, index) => ({
      ...dataset,
      backgroundColor: dataset.backgroundColor || this.getDefaultColors(type, index, datasets.length),
      borderColor: dataset.borderColor || this.getDefaultBorderColors(index),
      borderWidth: dataset.borderWidth || 2,
    }));

    return {
      type: type as any,
      data: {
        labels,
        datasets: enhancedDatasets as any,
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              font: {
                size: 12,
                family: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
              },
            },
          },
          title: {
            display: !!chartData.title,
            text: chartData.title,
            font: {
              size: 16,
              weight: 'bold',
            },
          },
        },
        scales: this.getScales(type),
        ...options,
      },
    };
  }

  /**
   * Get appropriate scales for chart type
   */
  private getScales(type: string) {
    if (type === 'bar' || type === 'line') {
      return {
        y: {
          beginAtZero: true,
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        x: {
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      };
    }
    return undefined;
  }

  /**
   * Get default color palette
   */
  private getDefaultColors(type: string, index: number, total: number): string | string[] {
    const colorPalette = [
      '#3B82F6', // blue
      '#10B981', // green
      '#F59E0B', // amber
      '#EF4444', // red
      '#8B5CF6', // purple
      '#EC4899', // pink
      '#06B6D4', // cyan
      '#F97316', // orange
    ];

    if (type === 'pie' || type === 'doughnut' || type === 'polarArea') {
      // Return array of colors for pie/doughnut charts
      return colorPalette.slice(0, total);
    }

    // Return single color for bar/line charts
    return colorPalette[index % colorPalette.length];
  }

  /**
   * Get default border colors
   */
  private getDefaultBorderColors(index: number): string {
    const borderColors = [
      '#2563EB', // blue
      '#059669', // green
      '#D97706', // amber
      '#DC2626', // red
      '#7C3AED', // purple
      '#DB2777', // pink
      '#0891B2', // cyan
      '#EA580C', // orange
    ];
    return borderColors[index % borderColors.length];
  }

  /**
   * Create sample financial chart
   */
  async createFinancialChart(data: { months: string[], revenue: number[], expenses: number[] }): Promise<string> {
    return this.renderChartToBase64({
      type: 'bar',
      title: 'Revenue vs Expenses',
      labels: data.months,
      datasets: [
        {
          label: 'Revenue',
          data: data.revenue,
          backgroundColor: '#10B981',
          borderColor: '#059669',
        },
        {
          label: 'Expenses',
          data: data.expenses,
          backgroundColor: '#EF4444',
          borderColor: '#DC2626',
        },
      ],
    });
  }

  /**
   * Create sample KPI chart
   */
  async createKPIChart(data: { labels: string[], values: number[] }): Promise<string> {
    return this.renderChartToBase64({
      type: 'line',
      title: 'Key Performance Indicators',
      labels: data.labels,
      datasets: [
        {
          label: 'Performance',
          data: data.values,
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          borderColor: '#3B82F6',
          borderWidth: 3,
        },
      ],
    });
  }

  /**
   * Create sample metric breakdown chart
   */
  async createMetricBreakdownChart(data: { labels: string[], values: number[] }): Promise<string> {
    return this.renderChartToBase64({
      type: 'doughnut',
      title: 'Metric Breakdown',
      labels: data.labels,
      datasets: [
        {
          label: 'Distribution',
          data: data.values,
        },
      ],
    });
  }
}
