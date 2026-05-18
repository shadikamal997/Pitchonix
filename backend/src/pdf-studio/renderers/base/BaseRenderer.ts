import { Injectable, Logger } from '@nestjs/common';
import {
  BlockDocument,
  Block,
  BlockType,
  BlockRenderContext,
} from '../../types/block-document.types';

/**
 * Base Renderer Abstract Class
 *
 * Foundation for all format-specific renderers (PDF, DOCX, PPTX, HTML).
 * Implements shared rendering logic and brand kit integration.
 */
@Injectable()
export abstract class BaseRenderer {
  protected readonly logger = new Logger(this.constructor.name);
  protected context: BlockRenderContext;

  constructor(context?: BlockRenderContext) {
    this.context = context || {
      exportFormat: 'preview',
      brandKit: undefined,
      templateId: undefined,
      pageSize: { width: 8.5, height: 11 }, // Letter size in inches
      documentMetadata: undefined,
    };
  }

  /**
   * Main render method - must be implemented by subclasses
   */
  abstract render(document: BlockDocument): Promise<any>;

  /**
   * Render a single block - delegates to block-specific renderers
   */
  protected async renderBlock(block: Block): Promise<string> {
    try {
      const renderer = this.getBlockRenderer(block.type);
      if (!renderer) {
        this.logger.warn(`No renderer found for block type: ${block.type}`);
        return this.renderFallbackBlock(block);
      }
      return await renderer(block);
    } catch (error) {
      this.logger.error(`Error rendering block ${block.id}: ${error.message}`);
      return this.renderFallbackBlock(block);
    }
  }

  /**
   * Get block-specific renderer function
   */
  protected getBlockRenderer(blockType: BlockType): ((block: Block) => Promise<string>) | null {
    const renderers: Partial<Record<BlockType, (block: Block) => Promise<string>>> = {
      'heading-1': this.renderHeading1.bind(this),
      'heading-2': this.renderHeading2.bind(this),
      'heading-3': this.renderHeading3.bind(this),
      'heading-4': this.renderHeading4.bind(this),
      'heading-5': this.renderHeading5.bind(this),
      'heading-6': this.renderHeading6.bind(this),
      'paragraph': this.renderParagraph.bind(this),
      'blockquote': this.renderBlockquote.bind(this),
      'code-block': this.renderCodeBlock.bind(this),
      'bullet-list': this.renderBulletList.bind(this),
      'numbered-list': this.renderNumberedList.bind(this),
      'checklist': this.renderChecklist.bind(this),
      'image': this.renderImage.bind(this),
      'video': this.renderVideo.bind(this),
      'divider': this.renderDivider.bind(this),
      'kpi-cards': this.renderKpiCards.bind(this),
      'timeline': this.renderTimeline.bind(this),
      'swot': this.renderSwot.bind(this),
      'team-members': this.renderTeamMembers.bind(this),
      'testimonial': this.renderTestimonial.bind(this),
      'feature-grid': this.renderFeatureGrid.bind(this),
      'comparison-table': this.renderComparisonTable.bind(this),
      'chart-bar': this.renderChart.bind(this),
      'chart-line': this.renderChart.bind(this),
      'chart-pie': this.renderChart.bind(this),
      'table': this.renderTable.bind(this),
      'callout': this.renderCallout.bind(this),
    };

    return renderers[blockType] || null;
  }

  /**
   * Fallback renderer for unsupported blocks
   */
  protected renderFallbackBlock(block: Block): string {
    return `<!-- Block type "${block.type}" not yet implemented -->`;
  }

  /**
   * Apply brand kit styles to a style object
   */
  protected applyBrandKit(styles: any): any {
    if (!this.context.brandKit || !styles) return styles;

    const brandKit = this.context.brandKit;
    const result = { ...styles };

    // Apply brand colors
    if (styles.useBrandKit) {
      if (styles.brandKitColors?.primary && brandKit.primaryColor) {
        result.color = brandKit.primaryColor;
      }
      if (styles.brandKitColors?.secondary && brandKit.secondaryColor) {
        result.backgroundColor = brandKit.secondaryColor;
      }
      if (brandKit.fontFamily) {
        result.fontFamily = brandKit.fontFamily;
      }
    }

    return result;
  }

  // ==========================================================================
  // TEXT BLOCK RENDERERS (to be implemented by subclasses or used as-is)
  // ==========================================================================

  protected async renderHeading1(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<h1 style="${this.styleToString(styles)}">${text}</h1>`;
  }

  protected async renderHeading2(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<h2 style="${this.styleToString(styles)}">${text}</h2>`;
  }

  protected async renderHeading3(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<h3 style="${this.styleToString(styles)}">${text}</h3>`;
  }

  protected async renderHeading4(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<h4 style="${this.styleToString(styles)}">${text}</h4>`;
  }

  protected async renderHeading5(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<h5 style="${this.styleToString(styles)}">${text}</h5>`;
  }

  protected async renderHeading6(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<h6 style="${this.styleToString(styles)}">${text}</h6>`;
  }

  protected async renderParagraph(block: Block): Promise<string> {
    const html = block.content.html || `<p>${block.content.text || ''}</p>`;
    const styles = this.applyBrandKit(block.config || {});
    return `<p style="${this.styleToString(styles)}">${this.stripOuterTags(html)}</p>`;
  }

  protected async renderBlockquote(block: Block): Promise<string> {
    const text = block.content.text || block.content.html?.replace(/<[^>]*>/g, '') || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<blockquote style="${this.styleToString(styles)}">${text}</blockquote>`;
  }

  protected async renderCodeBlock(block: Block): Promise<string> {
    const text = block.content.text || '';
    const styles = this.applyBrandKit(block.config || {});
    return `<pre style="${this.styleToString(styles)}"><code>${text}</code></pre>`;
  }

  protected async renderBulletList(block: Block): Promise<string> {
    const items = block.content.items || [];
    const listItems = items.map((item: any) => `<li>${item.text}</li>`).join('');
    return `<ul>${listItems}</ul>`;
  }

  protected async renderNumberedList(block: Block): Promise<string> {
    const items = block.content.items || [];
    const listItems = items.map((item: any) => `<li>${item.text}</li>`).join('');
    return `<ol>${listItems}</ol>`;
  }

  protected async renderChecklist(block: Block): Promise<string> {
    const items = block.content.items || [];
    const listItems = items
      .map((item: any) => `<li><input type="checkbox" ${item.checked ? 'checked' : ''} /> ${item.text}</li>`)
      .join('');
    return `<ul style="list-style: none;">${listItems}</ul>`;
  }

  // ==========================================================================
  // MEDIA BLOCK RENDERERS
  // ==========================================================================

  protected async renderImage(block: Block): Promise<string> {
    const { url, alt, caption } = block.content;
    const styles = this.styleToString(block.config || {});
    let html = `<img src="${url}" alt="${alt || ''}" style="${styles}" />`;
    if (caption) {
      html += `<p style="text-align: center; font-size: 0.9em; color: #666;">${caption}</p>`;
    }
    return html;
  }

  protected async renderVideo(block: Block): Promise<string> {
    const { url, caption } = block.content;
    let html = `<video src="${url}" controls style="max-width: 100%;"></video>`;
    if (caption) {
      html += `<p style="text-align: center; font-size: 0.9em; color: #666;">${caption}</p>`;
    }
    return html;
  }

  protected async renderDivider(block: Block): Promise<string> {
    const styles = this.styleToString(block.config || {});
    return `<hr style="${styles}" />`;
  }

  // ==========================================================================
  // VISUAL BLOCK RENDERERS
  // ==========================================================================

  protected async renderKpiCards(block: Block): Promise<string> {
    const cards = block.content.cards || [];
    const cardHtml = cards
      .map(
        (card: any) => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
        <div style="font-size: 12px; color: #6b7280; margin-bottom: 8px;">${card.title}</div>
        <div style="font-size: 32px; font-weight: 700; margin-bottom: 4px;">${card.value}</div>
        ${card.change ? `<div style="font-size: 14px; color: ${card.trend === 'up' ? '#10b981' : card.trend === 'down' ? '#ef4444' : '#6b7280'};">${card.change}</div>` : ''}
      </div>
    `
      )
      .join('');
    return `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">${cardHtml}</div>`;
  }

  protected async renderTimeline(block: Block): Promise<string> {
    const events = block.content.events || [];
    const eventHtml = events
      .map(
        (event: any) => `
      <div style="margin-bottom: 24px; padding-left: 24px; border-left: 4px solid #8b5cf6;">
        <div style="font-weight: 600; color: #8b5cf6; margin-bottom: 4px;">${event.date}</div>
        <div style="font-size: 18px; font-weight: 600; margin-bottom: 8px;">${event.title}</div>
        <div style="color: #6b7280;">${event.description}</div>
      </div>
    `
      )
      .join('');
    return eventHtml;
  }

  protected async renderSwot(block: Block): Promise<string> {
    const { strengths, weaknesses, opportunities, threats } = block.content;
    return `
      <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
        <div style="border: 1px solid #10b981; border-radius: 8px; padding: 16px; background: #f0fdf4;">
          <h3 style="color: #10b981; margin-bottom: 12px;">Strengths</h3>
          <ul>${(strengths || []).map((s: string) => `<li>${s}</li>`).join('')}</ul>
        </div>
        <div style="border: 1px solid #ef4444; border-radius: 8px; padding: 16px; background: #fef2f2;">
          <h3 style="color: #ef4444; margin-bottom: 12px;">Weaknesses</h3>
          <ul>${(weaknesses || []).map((w: string) => `<li>${w}</li>`).join('')}</ul>
        </div>
        <div style="border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; background: #eff6ff;">
          <h3 style="color: #3b82f6; margin-bottom: 12px;">Opportunities</h3>
          <ul>${(opportunities || []).map((o: string) => `<li>${o}</li>`).join('')}</ul>
        </div>
        <div style="border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; background: #fffbeb;">
          <h3 style="color: #f59e0b; margin-bottom: 12px;">Threats</h3>
          <ul>${(threats || []).map((t: string) => `<li>${t}</li>`).join('')}</ul>
        </div>
      </div>
    `;
  }

  protected async renderTeamMembers(block: Block): Promise<string> {
    const members = block.content.members || [];
    const memberHtml = members
      .map(
        (member: any) => `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; text-align: center;">
        ${member.image ? `<img src="${member.image}" style="width: 80px; height: 80px; border-radius: 50%; margin-bottom: 12px;" />` : ''}
        <div style="font-weight: 600; margin-bottom: 4px;">${member.name}</div>
        <div style="color: #8b5cf6; margin-bottom: 8px;">${member.role}</div>
        ${member.bio ? `<div style="font-size: 14px; color: #6b7280;">${member.bio}</div>` : ''}
      </div>
    `
      )
      .join('');
    return `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">${memberHtml}</div>`;
  }

  protected async renderTestimonial(block: Block): Promise<string> {
    const { quote, author, role, company, avatar, rating } = block.content;
    return `
      <div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 24px; background: #f9fafb;">
        ${avatar ? `<img src="${avatar}" style="width: 60px; height: 60px; border-radius: 50%; margin-bottom: 16px;" />` : ''}
        <div style="font-size: 18px; font-style: italic; margin-bottom: 16px;">"${quote}"</div>
        ${rating ? `<div style="color: #f59e0b; margin-bottom: 8px;">${'⭐'.repeat(rating)}</div>` : ''}
        <div style="font-weight: 600;">${author}</div>
        ${role ? `<div style="color: #6b7280;">${role}${company ? ` at ${company}` : ''}</div>` : ''}
      </div>
    `;
  }

  protected async renderFeatureGrid(block: Block): Promise<string> {
    const features = block.content.features || [];
    const featureHtml = features
      .map(
        (feature: any) => `
      <div style="padding: 16px; text-align: center;">
        <div style="font-size: 20px; font-weight: 600; margin-bottom: 8px;">${feature.title}</div>
        <div style="color: #6b7280;">${feature.description}</div>
      </div>
    `
      )
      .join('');
    return `<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px;">${featureHtml}</div>`;
  }

  protected async renderComparisonTable(block: Block): Promise<string> {
    const { headers, rows } = block.content;
    const headerHtml = `<tr>${headers.map((h: string) => `<th style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb;">${h}</th>`).join('')}</tr>`;
    const rowHtml = rows
      .map((row: any) => {
        const cells = [`<td style="padding: 12px; border: 1px solid #e5e7eb; font-weight: 600;">${row.label}</td>`];
        row.values.forEach((value: any) => {
          if (typeof value === 'boolean') {
            cells.push(`<td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${value ? '✓' : '✗'}</td>`);
          } else {
            cells.push(`<td style="padding: 12px; border: 1px solid #e5e7eb; text-align: center;">${value}</td>`);
          }
        });
        return `<tr>${cells.join('')}</tr>`;
      })
      .join('');
    return `<table style="width: 100%; border-collapse: collapse;">${headerHtml}${rowHtml}</table>`;
  }

  protected async renderChart(block: Block): Promise<string> {
    // Placeholder - charts require special rendering (Chart.js, etc.)
    return `<div style="border: 1px solid #e5e7eb; border-radius: 8px; padding: 32px; text-align: center; color: #6b7280;">[Chart: ${block.content.type}]</div>`;
  }

  protected async renderTable(block: Block): Promise<string> {
    const { headers, rows } = block.content;
    const headerHtml = `<tr>${headers.map((h: string) => `<th style="padding: 12px; border: 1px solid #e5e7eb; background: #f9fafb;">${h}</th>`).join('')}</tr>`;
    const rowHtml = rows
      .map((row: any) => `<tr>${row.cells.map((cell: string) => `<td style="padding: 12px; border: 1px solid #e5e7eb;">${cell}</td>`).join('')}</tr>`)
      .join('');
    return `<table style="width: 100%; border-collapse: collapse;">${headerHtml}${rowHtml}</table>`;
  }

  protected async renderCallout(block: Block): Promise<string> {
    const { type, title, text } = block.content;
    const colors = {
      info: { bg: '#eff6ff', border: '#3b82f6', text: '#1e40af' },
      warning: { bg: '#fffbeb', border: '#f59e0b', text: '#92400e' },
      success: { bg: '#f0fdf4', border: '#10b981', text: '#065f46' },
      error: { bg: '#fef2f2', border: '#ef4444', text: '#991b1b' },
    };
    const color = colors[type] || colors.info;
    return `
      <div style="border: 2px solid ${color.border}; border-radius: 8px; padding: 16px; background: ${color.bg}; color: ${color.text};">
        ${title ? `<div style="font-weight: 600; margin-bottom: 8px;">${title}</div>` : ''}
        <div>${text}</div>
      </div>
    `;
  }

  // ==========================================================================
  // UTILITY METHODS
  // ==========================================================================

  /**
   * Convert style object to CSS string
   */
  protected styleToString(styles: any): string {
    if (!styles) return '';
    return Object.entries(styles)
      .map(([key, value]) => {
        const cssKey = key.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
        return `${cssKey}: ${value}`;
      })
      .join('; ');
  }

  /**
   * Strip outer HTML tags
   */
  protected stripOuterTags(html: string): string {
    return html.replace(/^<[^>]+>|<\/[^>]+>$/g, '');
  }

  /**
   * Set rendering context
   */
  setContext(context: Partial<BlockRenderContext>) {
    this.context = { ...this.context, ...context };
  }
}
