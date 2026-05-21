import { Injectable, Logger } from '@nestjs/common';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';
import { ChartConfiguration } from 'chart.js';
import sharp from 'sharp';
import { ChartConfig, ChartType } from '../visual/types';
import { buildChartSvg } from './svg-chart-builder';
import type { ChartContent } from './chart-types';

/**
 * Chart Rendering Service
 * Converts ChartConfig objects to base64 image strings
 */
@Injectable()
export class ChartRenderingService {
  private readonly logger = new Logger(ChartRenderingService.name);
  private chartRenderer: ChartJSNodeCanvas;

  constructor() {
    // Initialize Chart.js canvas renderer
    this.chartRenderer = new ChartJSNodeCanvas({
      width: 800,
      height: 600,
      backgroundColour: 'white',
    });
  }

  /**
   * Phase 33.5 — Render any ChartContent (the Phase 33 frontend shape) to
   * a PNG buffer via the shared SVG builder + sharp. Preferred over
   * `renderChart()` for editor-edited charts; guarantees pixel parity with
   * the frontend SVG renderer because both produce the same SVG.
   *
   * Returns a Buffer (raw PNG bytes). Use `renderChartContentToDataUrl()`
   * for an inline base64 string.
   */
  async renderChartContent(
    content: ChartContent,
    opts?: { width?: number; height?: number },
  ): Promise<Buffer> {
    const width  = opts?.width  ?? 1200;
    const height = opts?.height ?? 720;
    const svg = buildChartSvg(content, { width, height });
    try {
      return await sharp(Buffer.from(svg))
        .resize(width, height, { fit: 'contain', background: { r: 255, g: 255, b: 255, alpha: 0 } })
        .png()
        .toBuffer();
    } catch (error: any) {
      this.logger.error(`SVG→PNG conversion failed: ${error.message}`, error.stack);
      throw new Error(`Chart rendering failed: ${error.message}`);
    }
  }

  /**
   * Convenience: same as renderChartContent but returns a data URL ready
   * to embed in HTML / PPTX / PDF.
   */
  async renderChartContentToDataUrl(
    content: ChartContent,
    opts?: { width?: number; height?: number },
  ): Promise<string> {
    const buffer = await this.renderChartContent(content, opts);
    return `data:image/png;base64,${buffer.toString('base64')}`;
  }

  /**
   * Render multiple ChartContents in parallel.
   */
  async renderChartContents(
    contents: ChartContent[],
    opts?: { width?: number; height?: number },
  ): Promise<Buffer[]> {
    return Promise.all(contents.map((c) => this.renderChartContent(c, opts)));
  }

  /**
   * Render chart to base64 image
   */
  async renderChart(chartConfig: ChartConfig): Promise<string> {
    try {
      const configuration = this.convertToChartJSConfig(chartConfig);
      const buffer = await this.chartRenderer.renderToBuffer(configuration);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.error(
        `Failed to render chart: ${error.message}`,
        error.stack,
      );
      throw new Error(`Chart rendering failed: ${error.message}`);
    }
  }

  /**
   * Render multiple charts
   */
  async renderCharts(charts: ChartConfig[]): Promise<string[]> {
    const promises = charts.map((chart) => this.renderChart(chart));
    return Promise.all(promises);
  }

  /**
   * Convert ChartConfig to Chart.js configuration
   */
  private convertToChartJSConfig(
    chartConfig: ChartConfig,
  ): ChartConfiguration<any, any[], any> {
    const type = this.mapChartType(chartConfig.type);
    const datasets = this.createDatasets(chartConfig);
    const labels = this.extractLabels(chartConfig);

    return {
      type: type as any,
      data: {
        labels,
        datasets,
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: chartConfig.options?.showLegend ?? true,
            position: 'bottom',
          },
          title: {
            display: !!chartConfig.title,
            text: chartConfig.title || '',
            font: {
              size: 18,
              weight: 'bold',
            },
          },
        },
        scales: this.createScales(chartConfig),
      },
    } as any;
  }

  /**
   * Map our ChartType enum to Chart.js type
   */
  private mapChartType(type: ChartType): string {
    const mapping: Record<ChartType, string> = {
      [ChartType.LINE]: 'line',
      [ChartType.BAR]: 'bar',
      [ChartType.COLUMN]: 'bar',
      [ChartType.PIE]: 'pie',
      [ChartType.DONUT]: 'doughnut',
      [ChartType.AREA]: 'line',
      [ChartType.SCATTER]: 'scatter',
      [ChartType.FUNNEL]: 'bar', // Funnel charts rendered as horizontal bars
      [ChartType.GAUGE]: 'doughnut', // Gauge rendered as partial doughnut
    };
    return mapping[type] || 'bar';
  }

  /**
   * Create Chart.js datasets from our data series
   */
  private createDatasets(chartConfig: ChartConfig): any[] {
    return chartConfig.data.map((series) => ({
      label: series.name,
      data: series.values,
      backgroundColor:
        series.color ||
        chartConfig.options?.colorScheme?.[0] ||
        '#4F46E5',
      borderColor:
        series.color ||
        chartConfig.options?.colorScheme?.[0] ||
        '#4F46E5',
      borderWidth: 2,
      fill: chartConfig.type === ChartType.AREA,
      // Horizontal bars for funnel charts
      indexAxis:
        chartConfig.type === ChartType.FUNNEL ? 'y' : undefined,
    }));
  }

  /**
   * Extract labels from data series
   */
  private extractLabels(chartConfig: ChartConfig): string[] {
    if (chartConfig.data.length === 0) {
      return [];
    }

    // Use labels from first series if available
    if (chartConfig.data[0].labels) {
      return chartConfig.data[0].labels;
    }

    // Generate default labels based on data length
    return chartConfig.data[0].values.map((_, i) => `Item ${i + 1}`);
  }

  /**
   * Create scales configuration
   */
  private createScales(chartConfig: ChartConfig): any {
    // Pie, donut, and gauge charts don't have scales
    if (
      [ChartType.PIE, ChartType.DONUT, ChartType.GAUGE].includes(
        chartConfig.type,
      )
    ) {
      return {};
    }

    return {
      x: {
        grid: {
          display: chartConfig.options?.showGrid ?? true,
        },
      },
      y: {
        grid: {
          display: chartConfig.options?.showGrid ?? true,
        },
        beginAtZero: true,
      },
    };
  }

  /**
   * Create custom sized renderer for specific dimensions
   */
  async renderChartWithSize(
    chartConfig: ChartConfig,
    width: number,
    height: number,
  ): Promise<string> {
    const customRenderer = new ChartJSNodeCanvas({
      width,
      height,
      backgroundColour: chartConfig.options?.backgroundColor || 'white',
    });

    try {
      const configuration = this.convertToChartJSConfig(chartConfig);
      const buffer = await customRenderer.renderToBuffer(configuration);
      return `data:image/png;base64,${buffer.toString('base64')}`;
    } catch (error) {
      this.logger.error(
        `Failed to render chart with custom size: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Render chart to file
   */
  async renderChartToFile(
    chartConfig: ChartConfig,
    filePath: string,
  ): Promise<void> {
    const fs = require('fs').promises;
    const configuration = this.convertToChartJSConfig(chartConfig);
    const buffer = await this.chartRenderer.renderToBuffer(configuration);
    await fs.writeFile(filePath, buffer);
    this.logger.log(`Chart rendered to file: ${filePath}`);
  }
}
