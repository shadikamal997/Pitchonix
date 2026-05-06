import { Injectable, Logger } from '@nestjs/common';
import { VisualSlideContent } from '../visual/types';
import { ChartRenderingService } from './chart-rendering.service';

/**
 * HTML Preview Service
 * Generates HTML preview of presentations
 */
@Injectable()
export class HTMLPreviewService {
  private readonly logger = new Logger(HTMLPreviewService.name);

  constructor(private chartRenderingService: ChartRenderingService) {}

  /**
   * Generate HTML preview
   */
  async generateHTML(
    slides: VisualSlideContent[],
    options?: {
      title?: string;
      forPrint?: boolean;
      includeControls?: boolean;
    },
  ): Promise<string> {
    try {
      const title = options?.title || 'Presentation';
      const forPrint = options?.forPrint ?? false;
      const includeControls = options?.includeControls ?? true;

      // Render all charts to base64 images
      const slidesWithCharts = await this.renderChartsForSlides(slides);

      const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <style>
    ${this.getStyles(forPrint)}
  </style>
</head>
<body>
  <div class="presentation">
    ${slidesWithCharts.map((slide, index) => this.renderSlide(slide, index)).join('\n')}
  </div>
  ${includeControls && !forPrint ? this.renderControls() : ''}
  ${!forPrint ? this.getScripts() : ''}
</body>
</html>
      `;

      this.logger.log(`HTML generated for ${slides.length} slides`);
      return html;
    } catch (error) {
      this.logger.error(`HTML generation failed: ${error.message}`);
      throw new Error(`HTML generation failed: ${error.message}`);
    }
  }

  /**
   * Render charts for all slides
   */
  private async renderChartsForSlides(
    slides: VisualSlideContent[],
  ): Promise<VisualSlideContent[]> {
    const slidesWithRenderedCharts: VisualSlideContent[] = [];

    for (const slide of slides) {
      if (slide.charts && slide.charts.length > 0) {
        const renderedCharts = await this.chartRenderingService.renderCharts(
          slide.charts,
        );
        slidesWithRenderedCharts.push({
          ...slide,
          charts: slide.charts.map((chart, i) => ({
            ...chart,
            renderedImage: renderedCharts[i],
          })),
        } as any);
      } else {
        slidesWithRenderedCharts.push(slide);
      }
    }

    return slidesWithRenderedCharts;
  }

  /**
   * Render a single slide
   */
  private renderSlide(slide: VisualSlideContent, index: number): string {
    const bgColor = slide.theme.colors.background;
    const textColor = slide.theme.colors.text;
    const primaryColor = slide.theme.colors.primary;

    return `
    <div class="slide" data-slide="${index}" style="background-color: ${bgColor}; color: ${textColor};">
      <div class="slide-content">
        ${this.renderTitle(slide, primaryColor)}
        ${this.renderSubtitle(slide)}
        ${this.renderContent(slide)}
        ${this.renderCharts(slide)}
        ${this.renderImages(slide)}
      </div>
      <div class="slide-footer">
        <span class="slide-number">${index + 1}</span>
      </div>
    </div>
    `;
  }

  /**
   * Render slide title
   */
  private renderTitle(slide: VisualSlideContent, primaryColor: string): string {
    if (!slide.title) return '';
    
    const titleRegion = slide.layout.regions.find((r) => r.type === 'title');
    const align = titleRegion?.textAlign || 'left';
    
    return `
      <h1 class="slide-title" style="
        text-align: ${align};
        color: ${primaryColor};
        font-family: ${slide.theme.fonts.heading};
        font-size: ${slide.theme.fontSize.h1}px;
      ">
        ${this.escapeHtml(slide.title)}
      </h1>
    `;
  }

  /**
   * Render slide subtitle
   */
  private renderSubtitle(slide: VisualSlideContent): string {
    if (!slide.subtitle) return '';
    
    const subtitleRegion = slide.layout.regions.find(
      (r) => r.type === 'subtitle',
    );
    const align = subtitleRegion?.textAlign || 'left';
    
    return `
      <h2 class="slide-subtitle" style="
        text-align: ${align};
        color: ${slide.theme.colors.textSecondary};
        font-family: ${slide.theme.fonts.body};
        font-size: ${slide.theme.fontSize.h3}px;
      ">
        ${this.escapeHtml(slide.subtitle)}
      </h2>
    `;
  }

  /**
   * Render slide content
   */
  private renderContent(slide: VisualSlideContent): string {
    const content = slide.content;
    
    if (!content) return '';
    
    if (typeof content === 'string') {
      return `<div class="slide-text">${this.escapeHtml(content)}</div>`;
    }
    
    if (Array.isArray(content)) {
      return `
        <ul class="slide-bullets">
          ${content.map((item) => `<li>${this.escapeHtml(String(item))}</li>`).join('')}
        </ul>
      `;
    }
    
    if (typeof content === 'object') {
      return this.renderStructuredContent(content);
    }
    
    return '';
  }

  /**
   * Render structured content
   */
  private renderStructuredContent(content: any): string {
    const parts: string[] = [];
    
    if (content.description) {
      parts.push(`<p class="content-description">${this.escapeHtml(content.description)}</p>`);
    }
    
    if (content.painPoints && Array.isArray(content.painPoints)) {
      parts.push(`
        <ul class="slide-bullets">
          ${content.painPoints.map((p: string) => `<li>${this.escapeHtml(p)}</li>`).join('')}
        </ul>
      `);
    }
    
    if (content.features && Array.isArray(content.features)) {
      parts.push(`
        <ul class="slide-bullets">
          ${content.features.map((f: string) => `<li>${this.escapeHtml(f)}</li>`).join('')}
        </ul>
      `);
    }
    
    return parts.join('\n');
  }

  /**
   * Render charts
   */
  private renderCharts(slide: VisualSlideContent): string {
    if (!slide.charts || slide.charts.length === 0) return '';
    
    return `
      <div class="slide-charts">
        ${slide.charts
          .map(
            (chart: any) => `
          <div class="chart-container">
            ${chart.renderedImage ? `<img src="${chart.renderedImage}" alt="${this.escapeHtml(chart.title || 'Chart')}" class="chart-image" />` : ''}
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render images
   */
  private renderImages(slide: VisualSlideContent): string {
    if (!slide.images || slide.images.length === 0) return '';
    
    return `
      <div class="slide-images">
        ${slide.images
          .map(
            (image) => `
          <div class="image-placeholder" style="width: ${image.width}px; height: ${image.height}px;">
            <span class="image-label">${this.escapeHtml(image.altText || 'Image')}</span>
          </div>
        `,
          )
          .join('')}
      </div>
    `;
  }

  /**
   * Render navigation controls
   */
  private renderControls(): string {
    return `
      <div class="controls">
        <button id="prevBtn" class="control-btn">← Previous</button>
        <span id="slideCounter">1 / 1</span>
        <button id="nextBtn" class="control-btn">Next →</button>
      </div>
    `;
  }

  /**
   * Get CSS styles
   */
  private getStyles(forPrint: boolean): string {
    return `
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }
      
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
        ${forPrint ? '' : 'overflow: hidden;'}
      }
      
      .presentation {
        ${forPrint ? '' : 'display: flex; transition: transform 0.3s ease;'}
      }
      
      .slide {
        ${forPrint ? 'page-break-after: always; min-height: 100vh;' : 'min-width: 100vw; min-height: 100vh;'}
        display: flex;
        flex-direction: column;
        justify-content: center;
        padding: 60px;
        position: relative;
      }
      
      .slide-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 30px;
      }
      
      .slide-title {
        margin-bottom: 10px;
        font-weight: bold;
        line-height: 1.2;
      }
      
      .slide-subtitle {
        margin-bottom: 30px;
        opacity: 0.8;
        font-weight: normal;
        line-height: 1.4;
      }
      
      .slide-text {
        font-size: 24px;
        line-height: 1.6;
      }
      
      .slide-bullets {
        list-style: none;
        padding-left: 0;
      }
      
      .slide-bullets li {
        font-size: 24px;
        line-height: 1.8;
        padding-left: 40px;
        position: relative;
        margin-bottom: 15px;
      }
      
      .slide-bullets li::before {
        content: '●';
        position: absolute;
        left: 0;
        color: inherit;
        opacity: 0.6;
      }
      
      .content-description {
        font-size: 24px;
        line-height: 1.6;
        margin-bottom: 20px;
      }
      
      .slide-charts {
        display: flex;
        justify-content: center;
        align-items: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      
      .chart-container {
        flex: 1;
        min-width: 400px;
        max-width: 800px;
      }
      
      .chart-image {
        width: 100%;
        height: auto;
        border-radius: 8px;
      }
      
      .slide-images {
        display: flex;
        justify-content: center;
        gap: 20px;
        flex-wrap: wrap;
      }
      
      .image-placeholder {
        background: #f3f4f6;
        border: 2px dashed #d1d5db;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .image-label {
        color: #6b7280;
        font-size: 18px;
      }
      
      .slide-footer {
        position: absolute;
        bottom: 20px;
        right: 40px;
        font-size: 18px;
        opacity: 0.5;
      }
      
      ${forPrint ? '' : `
      .controls {
        position: fixed;
        bottom: 30px;
        left: 50%;
        transform: translateX(-50%);
        display: flex;
        gap: 20px;
        align-items: center;
        background: rgba(0, 0, 0, 0.8);
        padding: 15px 30px;
        border-radius: 50px;
        color: white;
        z-index: 1000;
      }
      
      .control-btn {
        background: white;
        color: black;
        border: none;
        padding: 10px 20px;
        border-radius: 25px;
        cursor: pointer;
        font-size: 16px;
        font-weight: 500;
        transition: background 0.2s;
      }
      
      .control-btn:hover {
        background: #f3f4f6;
      }
      
      .control-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }
      
      #slideCounter {
        font-size: 16px;
        min-width: 80px;
        text-align: center;
      }
      `}
      
      @media print {
        .controls {
          display: none;
        }
        .slide {
          page-break-after: always;
        }
      }
    `;
  }

  /**
   * Get JavaScript for navigation
   */
  private getScripts(): string {
    return `
      <script>
        let currentSlide = 0;
        const slides = document.querySelectorAll('.slide');
        const totalSlides = slides.length;
        const prevBtn = document.getElementById('prevBtn');
        const nextBtn = document.getElementById('nextBtn');
        const slideCounter = document.getElementById('slideCounter');
        const presentation = document.querySelector('.presentation');
        
        function updateSlide() {
          presentation.style.transform = \`translateX(-\${currentSlide * 100}vw)\`;
          slideCounter.textContent = \`\${currentSlide + 1} / \${totalSlides}\`;
          prevBtn.disabled = currentSlide === 0;
          nextBtn.disabled = currentSlide === totalSlides - 1;
        }
        
        prevBtn.addEventListener('click', () => {
          if (currentSlide > 0) {
            currentSlide--;
            updateSlide();
          }
        });
        
        nextBtn.addEventListener('click', () => {
          if (currentSlide < totalSlides - 1) {
            currentSlide++;
            updateSlide();
          }
        });
        
        document.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowLeft' && currentSlide > 0) {
            currentSlide--;
            updateSlide();
          } else if (e.key === 'ArrowRight' && currentSlide < totalSlides - 1) {
            currentSlide++;
            updateSlide();
          }
        });
        
        updateSlide();
      </script>
    `;
  }

  /**
   * Escape HTML special characters
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;',
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }

  /**
   * Generate and save HTML to file
   */
  async generateToFile(
    slides: VisualSlideContent[],
    filePath: string,
    options?: {
      title?: string;
      includeControls?: boolean;
    },
  ): Promise<void> {
    const fs = require('fs').promises;
    const html = await this.generateHTML(slides, options);
    await fs.writeFile(filePath, html, 'utf-8');
    this.logger.log(`HTML saved to: ${filePath}`);
  }
}
