import { Injectable, Logger } from '@nestjs/common';

export interface VisualElement {
  type: 'text' | 'image' | 'shape' | 'chart';
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex: number;
  content?: any;
  style?: any;
}

export interface VisualLayout {
  type: 'hero' | 'split' | 'grid' | 'asymmetric' | 'overlay' | 'editorial';
  elements: VisualElement[];
  background?: {
    type: 'solid' | 'gradient' | 'image';
    value: string | { from: string; to: string; direction: string };
  };
}

export interface CompositionConfig {
  layoutType: 'hero' | 'split' | 'grid' | 'asymmetric' | 'overlay' | 'editorial';
  hasImages: boolean;
  hasCharts: boolean;
  colorScheme: string;
  visualStyle: 'modern' | 'minimal' | 'bold' | 'elegant' | 'creative';
}

@Injectable()
export class VisualCompositionService {
  private readonly logger = new Logger(VisualCompositionService.name);

  /**
   * Generate visual layout from content and configuration
   */
  generateVisualLayout(
    content: any,
    config: CompositionConfig,
  ): VisualLayout {
    this.logger.log(`Generating ${config.layoutType} layout with ${config.visualStyle} style`);

    switch (config.layoutType) {
      case 'hero':
        return this.generateHeroLayout(content, config);
      case 'split':
        return this.generateSplitLayout(content, config);
      case 'grid':
        return this.generateGridLayout(content, config);
      case 'asymmetric':
        return this.generateAsymmetricLayout(content, config);
      case 'overlay':
        return this.generateOverlayLayout(content, config);
      case 'editorial':
        return this.generateEditorialLayout(content, config);
      default:
        return this.generateHeroLayout(content, config);
    }
  }

  /**
   * Hero layout: Large image with text overlay
   */
  private generateHeroLayout(content: any, config: CompositionConfig): VisualLayout {
    const elements: VisualElement[] = [];

    // Hero image background
    if (config.hasImages) {
      elements.push({
        type: 'image',
        x: 0,
        y: 0,
        width: 210, // A4 width in mm
        height: 140,
        zIndex: 0,
        content: { url: content.heroImage || '', objectFit: 'cover' },
        style: { opacity: 0.9 },
      });

      // Gradient overlay
      elements.push({
        type: 'shape',
        x: 0,
        y: 0,
        width: 210,
        height: 140,
        zIndex: 1,
        style: {
          background: `linear-gradient(135deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.3) 100%)`,
        },
      });
    }

    // Hero text
    elements.push({
      type: 'text',
      x: 30,
      y: 50,
      width: 150,
      height: 60,
      zIndex: 2,
      content: {
        title: content.title || '',
        subtitle: content.subtitle || '',
      },
      style: {
        color: config.hasImages ? '#FFFFFF' : '#1F2937',
        fontSize: 48,
        fontWeight: 700,
      },
    });

    return {
      type: 'hero',
      elements,
      background: config.hasImages
        ? undefined
        : {
            type: 'gradient',
            value: {
              from: this.getColorForScheme(config.colorScheme, 'primary'),
              to: this.getColorForScheme(config.colorScheme, 'secondary'),
              direction: '135deg',
            },
          },
    };
  }

  /**
   * Split layout: 50/50 content and visual
   */
  private generateSplitLayout(content: any, config: CompositionConfig): VisualLayout {
    const elements: VisualElement[] = [];

    // Left: Image
    if (config.hasImages) {
      elements.push({
        type: 'image',
        x: 0,
        y: 0,
        width: 105,
        height: 297, // Full A4 height
        zIndex: 0,
        content: { url: content.image || '', objectFit: 'cover' },
      });
    }

    // Right: Content
    elements.push({
      type: 'text',
      x: config.hasImages ? 115 : 10,
      y: 40,
      width: config.hasImages ? 85 : 190,
      height: 220,
      zIndex: 1,
      content: {
        title: content.title,
        body: content.body,
        bullets: content.bullets,
      },
      style: {
        padding: 20,
        backgroundColor: '#FFFFFF',
      },
    });

    return {
      type: 'split',
      elements,
      background: { type: 'solid', value: '#F9FAFB' },
    };
  }

  /**
   * Grid layout: Cards and sections
   */
  private generateGridLayout(content: any, config: CompositionConfig): VisualLayout {
    const elements: VisualElement[] = [];
    const sections = content.sections || [];

    // Header
    elements.push({
      type: 'text',
      x: 20,
      y: 20,
      width: 170,
      height: 40,
      zIndex: 1,
      content: { title: content.title },
      style: { fontSize: 36, fontWeight: 700 },
    });

    // Grid items (3 per row)
    sections.forEach((section: any, index: number) => {
      const col = index % 3;
      const row = Math.floor(index / 3);

      elements.push({
        type: 'text',
        x: 15 + col * 60,
        y: 70 + row * 70,
        width: 55,
        height: 60,
        zIndex: 1,
        content: section,
        style: {
          backgroundColor: '#FFFFFF',
          borderRadius: 8,
          padding: 15,
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        },
      });
    });

    return {
      type: 'grid',
      elements,
      background: { type: 'solid', value: '#F9FAFB' },
    };
  }

  /**
   * Asymmetric layout: Dynamic positioning
   */
  private generateAsymmetricLayout(content: any, config: CompositionConfig): VisualLayout {
    const elements: VisualElement[] = [];

    // Large title area
    elements.push({
      type: 'text',
      x: 20,
      y: 20,
      width: 120,
      height: 80,
      zIndex: 2,
      content: { title: content.title, subtitle: content.subtitle },
      style: {
        fontSize: 42,
        fontWeight: 700,
        color: this.getColorForScheme(config.colorScheme, 'primary'),
      },
    });

    // Accent shape
    elements.push({
      type: 'shape',
      x: 140,
      y: 30,
      width: 60,
      height: 60,
      zIndex: 1,
      style: {
        backgroundColor: this.getColorForScheme(config.colorScheme, 'accent'),
        borderRadius: '50%',
        opacity: 0.1,
      },
    });

    // Content blocks
    if (content.sections) {
      content.sections.forEach((section: any, index: number) => {
        const isEven = index % 2 === 0;

        elements.push({
          type: 'text',
          x: isEven ? 20 : 110,
          y: 120 + index * 45,
          width: 80,
          height: 40,
          zIndex: 1,
          content: section,
          style: {
            backgroundColor: '#FFFFFF',
            padding: 15,
            borderRadius: 8,
          },
        });
      });
    }

    return {
      type: 'asymmetric',
      elements,
      background: { type: 'solid', value: '#FFFFFF' },
    };
  }

  /**
   * Overlay layout: Image with content overlay
   */
  private generateOverlayLayout(content: any, config: CompositionConfig): VisualLayout {
    const elements: VisualElement[] = [];

    // Background image
    if (config.hasImages) {
      elements.push({
        type: 'image',
        x: 0,
        y: 0,
        width: 210,
        height: 297,
        zIndex: 0,
        content: { url: content.backgroundImage || '', objectFit: 'cover' },
        style: { opacity: 0.4 },
      });
    }

    // Content card overlay
    elements.push({
      type: 'text',
      x: 30,
      y: 60,
      width: 150,
      height: 180,
      zIndex: 2,
      content: {
        title: content.title,
        body: content.body,
        cta: content.cta,
      },
      style: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        padding: 30,
        borderRadius: 16,
        boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
      },
    });

    return {
      type: 'overlay',
      elements,
      background: config.hasImages
        ? undefined
        : {
            type: 'gradient',
            value: {
              from: this.getColorForScheme(config.colorScheme, 'primary'),
              to: this.getColorForScheme(config.colorScheme, 'secondary'),
              direction: '135deg',
            },
          },
    };
  }

  /**
   * Editorial layout: Magazine-style
   */
  private generateEditorialLayout(content: any, config: CompositionConfig): VisualLayout {
    const elements: VisualElement[] = [];

    // Large opening quote or stat
    elements.push({
      type: 'text',
      x: 20,
      y: 30,
      width: 170,
      height: 50,
      zIndex: 1,
      content: {
        text: content.openingQuote || content.stat,
        type: 'quote',
      },
      style: {
        fontSize: 32,
        fontWeight: 300,
        fontStyle: 'italic',
        color: this.getColorForScheme(config.colorScheme, 'primary'),
      },
    });

    // Image strip
    if (config.hasImages && content.images) {
      content.images.slice(0, 2).forEach((image: string, index: number) => {
        elements.push({
          type: 'image',
          x: 20 + index * 90,
          y: 100,
          width: 80,
          height: 60,
          zIndex: 1,
          content: { url: image, objectFit: 'cover' },
          style: { borderRadius: 4 },
        });
      });
    }

    // Editorial content
    elements.push({
      type: 'text',
      x: 20,
      y: 170,
      width: 170,
      height: 110,
      zIndex: 1,
      content: {
        body: content.body,
      },
      style: {
        fontSize: 14,
        lineHeight: 1.8,
        columnCount: 2,
        columnGap: 20,
      },
    });

    return {
      type: 'editorial',
      elements,
      background: { type: 'solid', value: '#FFFFFF' },
    };
  }

  /**
   * Render visual layout to HTML
   */
  renderToHTML(layout: VisualLayout, pageWidth: number = 210): string {
    let html = '<div class="visual-composition" style="';

    // Background
    if (layout.background) {
      if (layout.background.type === 'solid') {
        html += `background: ${layout.background.value};`;
      } else if (layout.background.type === 'gradient') {
        const grad = layout.background.value as { from: string; to: string; direction: string };
        html += `background: linear-gradient(${grad.direction}, ${grad.from}, ${grad.to});`;
      }
    }

    html += `width: ${pageWidth}mm; min-height: 297mm; position: relative; overflow: hidden;">`;

    // Sort elements by z-index
    const sortedElements = [...layout.elements].sort((a, b) => a.zIndex - b.zIndex);

    // Render elements
    for (const element of sortedElements) {
      html += this.renderElement(element);
    }

    html += '</div>';
    return html;
  }

  /**
   * Render individual element
   */
  private renderElement(element: VisualElement): string {
    const style = `
      position: absolute;
      left: ${element.x}mm;
      top: ${element.y}mm;
      width: ${element.width}mm;
      height: ${element.height}mm;
      z-index: ${element.zIndex};
      ${this.styleToCSS(element.style)}
    `;

    switch (element.type) {
      case 'image':
        return `<div style="${style}">
          <img src="${element.content.url}" alt="" style="width: 100%; height: 100%; object-fit: ${element.content.objectFit || 'cover'}; ${element.style?.opacity ? `opacity: ${element.style.opacity};` : ''}" />
        </div>`;

      case 'shape':
        return `<div style="${style}"></div>`;

      case 'text':
        return `<div style="${style}">
          ${this.renderTextContent(element.content, element.style)}
        </div>`;

      case 'chart':
        return `<div style="${style}">
          <canvas id="chart-${element.zIndex}"></canvas>
        </div>`;

      default:
        return '';
    }
  }

  /**
   * Render text content
   */
  private renderTextContent(content: any, style: any): string {
    let html = '';

    if (content.title) {
      html += `<h1 style="font-size: ${style?.fontSize || 36}px; font-weight: ${style?.fontWeight || 700}; color: ${style?.color || '#1F2937'}; margin: 0 0 12px 0; line-height: 1.2;">${content.title}</h1>`;
    }

    if (content.subtitle) {
      html += `<h2 style="font-size: 20px; font-weight: 400; color: ${style?.color || '#6B7280'}; margin: 0 0 20px 0; opacity: 0.9;">${content.subtitle}</h2>`;
    }

    if (content.body) {
      html += `<p style="font-size: 16px; line-height: 1.6; color: #4B5563; margin: 0;">${content.body}</p>`;
    }

    if (content.bullets && Array.isArray(content.bullets)) {
      html += '<ul style="margin: 20px 0; padding-left: 20px; list-style: disc;">';
      content.bullets.forEach((bullet: string) => {
        html += `<li style="font-size: 16px; line-height: 1.6; color: #4B5563; margin-bottom: 8px;">${bullet}</li>`;
      });
      html += '</ul>';
    }

    if (content.cta) {
      html += `<div style="margin-top: 30px;">
        <a href="#" style="display: inline-block; padding: 12px 32px; background: ${style?.ctaColor || '#3B82F6'}; color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">${content.cta}</a>
      </div>`;
    }

    return html;
  }

  /**
   * Convert style object to CSS string
   */
  private styleToCSS(style: any = {}): string {
    let css = '';

    if (style.backgroundColor) css += `background-color: ${style.backgroundColor};`;
    if (style.color) css += `color: ${style.color};`;
    if (style.padding) css += `padding: ${typeof style.padding === 'number' ? style.padding + 'px' : style.padding};`;
    if (style.borderRadius) css += `border-radius: ${typeof style.borderRadius === 'number' ? style.borderRadius + 'px' : style.borderRadius};`;
    if (style.boxShadow) css += `box-shadow: ${style.boxShadow};`;
    if (style.opacity) css += `opacity: ${style.opacity};`;
    if (style.fontSize) css += `font-size: ${style.fontSize}px;`;
    if (style.fontWeight) css += `font-weight: ${style.fontWeight};`;

    return css;
  }

  /**
   * Get color for scheme
   */
  private getColorForScheme(scheme: string, type: 'primary' | 'secondary' | 'accent'): string {
    const schemes: Record<string, Record<string, string>> = {
      blue: { primary: '#3B82F6', secondary: '#8B5CF6', accent: '#10B981' },
      purple: { primary: '#8B5CF6', secondary: '#EC4899', accent: '#F59E0B' },
      green: { primary: '#10B981', secondary: '#3B82F6', accent: '#F59E0B' },
      orange: { primary: '#F97316', secondary: '#EF4444', accent: '#8B5CF6' },
      navy: { primary: '#1E40AF', secondary: '#7C3AED', accent: '#059669' },
      teal: { primary: '#14B8A6', secondary: '#06B6D4', accent: '#8B5CF6' },
    };

    return schemes[scheme]?.[type] || schemes.blue[type];
  }
}
