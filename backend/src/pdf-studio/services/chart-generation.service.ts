import { Injectable, Logger } from '@nestjs/common';
import { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

/**
 * Chart Generation Service
 * Creates charts and visualizations for PDF documents
 */
@Injectable()
export class ChartGenerationService {
  private readonly logger = new Logger(ChartGenerationService.name);
  private readonly chartJSNodeCanvas: ChartJSNodeCanvas;

  constructor() {
    // Initialize Chart.js canvas
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 800,
      height: 600,
      backgroundColour: 'white',
    });
  }

  /**
   * Generate bar chart
   */
  async generateBarChart(
    data: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        backgroundColor?: string;
        borderColor?: string;
      }>;
    },
    options?: any,
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'bar',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: options?.title || 'Bar Chart',
          },
        },
        ...options,
      },
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  /**
   * Generate line chart
   */
  async generateLineChart(
    data: {
      labels: string[];
      datasets: Array<{
        label: string;
        data: number[];
        borderColor?: string;
        backgroundColor?: string;
        fill?: boolean;
      }>;
    },
    options?: any,
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'line',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'top',
          },
          title: {
            display: true,
            text: options?.title || 'Line Chart',
          },
        },
        ...options,
      },
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  /**
   * Generate pie chart
   */
  async generatePieChart(
    data: {
      labels: string[];
      datasets: Array<{
        data: number[];
        backgroundColor?: string[];
      }>;
    },
    options?: any,
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'pie',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: options?.title || 'Pie Chart',
          },
        },
        ...options,
      },
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  /**
   * Generate doughnut chart
   */
  async generateDoughnutChart(
    data: {
      labels: string[];
      datasets: Array<{
        data: number[];
        backgroundColor?: string[];
      }>;
    },
    options?: any,
  ): Promise<Buffer> {
    const configuration: ChartConfiguration = {
      type: 'doughnut',
      data,
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'right',
          },
          title: {
            display: true,
            text: options?.title || 'Doughnut Chart',
          },
        },
        ...options,
      },
    };

    return this.chartJSNodeCanvas.renderToBuffer(configuration);
  }

  /**
   * Auto-detect chart type from data and generate
   */
  async autoGenerateChart(
    data: any,
    chartType?: 'bar' | 'line' | 'pie' | 'doughnut',
  ): Promise<Buffer> {
    const type = chartType || this.detectBestChartType(data);

    switch (type) {
      case 'bar':
        return this.generateBarChart(data);
      case 'line':
        return this.generateLineChart(data);
      case 'pie':
        return this.generatePieChart(data);
      case 'doughnut':
        return this.generateDoughnutChart(data);
      default:
        return this.generateBarChart(data);
    }
  }

  /**
   * Detect best chart type based on data structure
   */
  private detectBestChartType(data: any): 'bar' | 'line' | 'pie' | 'doughnut' {
    // If single dataset with few items, use pie
    if (data.datasets.length === 1 && data.labels.length <= 6) {
      return 'pie';
    }

    // If time series data (dates in labels), use line
    const hasTimeSeries = data.labels.some((label: string) =>
      /\d{4}|\d{2}\/\d{2}/.test(label),
    );
    if (hasTimeSeries) {
      return 'line';
    }

    // Default to bar chart
    return 'bar';
  }

  /**
   * Generate chart from text data (parse and create chart)
   */
  async generateChartFromText(text: string): Promise<Buffer | null> {
    // Try to extract data from text
    const data = this.extractDataFromText(text);

    if (!data) {
      this.logger.warn('Could not extract chart data from text');
      return null;
    }

    return this.autoGenerateChart(data);
  }

  /**
   * Extract chart data from text
   */
  private extractDataFromText(text: string): any | null {
    // Simple extraction - look for patterns like:
    // "Sales: Jan: 100, Feb: 150, Mar: 200"
    // or "2024: 1000, 2025: 1500"

    const patterns = [
      // "Label: value, Label: value"
      /(\w+):\s*(\d+(?:\.\d+)?)/g,
    ];

    for (const pattern of patterns) {
      const matches = Array.from(text.matchAll(pattern));

      if (matches.length >= 2) {
        const labels = matches.map((m) => m[1]);
        const values = matches.map((m) => parseFloat(m[2]));

        return {
          labels,
          datasets: [
            {
              label: 'Data',
              data: values,
              backgroundColor: 'rgba(59, 130, 246, 0.5)',
              borderColor: 'rgb(59, 130, 246)',
            },
          ],
        };
      }
    }

    return null;
  }
}
