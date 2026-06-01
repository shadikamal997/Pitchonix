import { Injectable, Logger } from '@nestjs/common';
import { VisualSlideContent } from '../visual/types';
import { ChartRenderingService } from './chart-rendering.service';
import { getFamilyTokens } from '../../components/smart/family-tokens';
import type { SmartFamilyId } from '../../components/smart/smart-types';
import type { SlideElementDTO, ElementStyle, GradientStyle } from '../../slides/element-types';

@Injectable()
export class HTMLPreviewService {
  private readonly logger = new Logger(HTMLPreviewService.name);

  constructor(private chartRenderingService: ChartRenderingService) {}

  // ---------------------------------------------------------------------------
  //  Public API
  // ---------------------------------------------------------------------------

  async generateHTML(
    slides: VisualSlideContent[],
    options?: { title?: string; forPrint?: boolean; includeControls?: boolean },
  ): Promise<string> {
    try {
      const title = options?.title || 'Presentation';
      const forPrint = options?.forPrint ?? false;
      const includeControls = options?.includeControls ?? true;

      const slidesWithCharts = await this.renderChartsForSlides(slides);

      const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${this.escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Lora:wght@400;600&display=swap" rel="stylesheet">
  <style>${this.getStyles(forPrint)}</style>
</head>
<body>
  <div class="presentation">
    ${slidesWithCharts.map((slide, i) => this.renderSlide(slide, i)).join('\n')}
  </div>
  ${includeControls && !forPrint ? this.renderControls() : ''}
  ${!forPrint ? this.getScripts() : ''}
</body>
</html>`;

      this.logger.log(`HTML generated for ${slides.length} slides`);
      return html;
    } catch (error) {
      this.logger.error(`HTML generation failed: ${error.message}`);
      throw new Error(`HTML generation failed: ${error.message}`);
    }
  }

  async generateToFile(
    slides: VisualSlideContent[],
    filePath: string,
    options?: { title?: string; includeControls?: boolean },
  ): Promise<void> {
    const fs = require('fs').promises;
    const html = await this.generateHTML(slides, options);
    await fs.writeFile(filePath, html, 'utf-8');
    this.logger.log(`HTML saved to: ${filePath}`);
  }

  // ---------------------------------------------------------------------------
  //  Slide rendering
  // ---------------------------------------------------------------------------

  private renderSlide(slide: VisualSlideContent, index: number): string {
    const smart = (slide as any).smartComponent as { family?: string; elementTree?: SlideElementDTO[] } | undefined;
    const bg = this.resolveBackground(slide, smart?.family);
    const backgroundStyle = bg.startsWith('linear-gradient') || bg.startsWith('radial-gradient')
      ? `background:${bg}`
      : `background-color:${bg}`;

    const inner = smart?.elementTree?.length
      ? this.renderElementTree(smart.elementTree)
      : this.renderFallback(slide);

    return `
<div class="slide" data-slide="${index}" style="${backgroundStyle};">
  <div class="slide-stage">${inner}</div>
  <div class="slide-number-badge">${index + 1}</div>
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  elementTree renderer — PRIMARY PATH
  // ---------------------------------------------------------------------------

  private renderElementTree(elements: SlideElementDTO[]): string {
    return elements
      .filter((el) => el.visible !== false)
      .sort((a, b) => (a.zIndex ?? a.order ?? 0) - (b.zIndex ?? b.order ?? 0))
      .map((el) => this.renderElement(el))
      .join('\n');
  }

  private renderElement(el: SlideElementDTO): string {
    const pos = `left:${el.x}%;top:${el.y}%;width:${el.width}%;height:${el.height}%;`;
    const styleStr = this.styleToCSS(el.style);
    const combined = `position:absolute;${pos}overflow:hidden;box-sizing:border-box;${styleStr}`;

    switch (el.type) {
      case 'heading':     return this.renderText(el, combined, 'h1', 'el-heading');
      case 'subheading':  return this.renderText(el, combined, 'h2', 'el-subheading');
      case 'paragraph':   return this.renderText(el, combined, 'p',  'el-paragraph');
      case 'caption':     return this.renderText(el, combined, 'p',  'el-caption');
      case 'label':       return this.renderText(el, combined, 'span','el-label');
      case 'footer':      return this.renderText(el, combined, 'p',  'el-footer');
      case 'quote':       return this.renderQuote(el, combined);
      case 'cta':         return this.renderCta(el, combined);
      case 'bulletList':  return this.renderBulletList(el, combined);
      case 'numberedList':return this.renderNumberedList(el, combined);
      case 'metric':      return this.renderMetric(el, combined);
      case 'kpi':         return this.renderKpi(el, combined);
      case 'teamCard':    return this.renderTeamCard(el, combined);
      case 'processSteps':return this.renderProcessSteps(el, combined);
      case 'featureGrid': return this.renderFeatureGrid(el, combined);
      case 'roadmap':     return this.renderRoadmap(el, combined);
      case 'comparison':  return this.renderComparison(el, combined);
      case 'pricingCard': return this.renderPricingCard(el, combined);
      case 'fundsAllocation': return this.renderFundsAllocation(el, combined);
      case 'shape':       return this.renderShape(el, combined);
      case 'divider':
      case 'line':        return this.renderDivider(el, combined);
      case 'chart':       return this.renderChartEl(el, combined);
      case 'table':       return this.renderTable(el, combined);
      case 'image':       return this.renderImage(el, combined);
      case 'icon':        return this.renderIcon(el, combined);
      default:            return `<div style="${combined}"></div>`;
    }
  }

  // ---------------------------------------------------------------------------
  //  Text elements
  // ---------------------------------------------------------------------------

  private renderText(el: SlideElementDTO, style: string, tag: string, cls: string): string {
    const c = (el.content as any) || {};
    const html = typeof c.html === 'string' ? c.html : null;
    const text = typeof c.text === 'string' ? c.text : (html ? this.stripHtml(html) : '');
    if (!text && !html) return `<${tag} class="${cls}" style="${style}"></${tag}>`;
    const inner = html || this.escapeHtml(text);
    return `<${tag} class="${cls}" style="${style}">${inner}</${tag}>`;
  }

  private renderQuote(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    return `<blockquote class="el-quote" style="${style}">
  <p>"${this.escapeHtml(c.text || '')}"</p>
  ${c.attribution ? `<cite>${this.escapeHtml(c.attribution)}${c.role ? `, ${this.escapeHtml(c.role)}` : ''}</cite>` : ''}
</blockquote>`;
  }

  private renderCta(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    return `<div class="el-cta" style="${style}">
  <span class="cta-text">${this.escapeHtml(c.text || '')}</span>
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  List elements
  // ---------------------------------------------------------------------------

  private renderBulletList(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const items: Array<{ text: string }> = Array.isArray(c.items) ? c.items : [];
    return `<ul class="el-bullets" style="${style}">
  ${items.map((it) => `<li>${this.escapeHtml(it.text || '')}</li>`).join('')}
</ul>`;
  }

  private renderNumberedList(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const items: Array<{ text: string }> = Array.isArray(c.items) ? c.items : [];
    const start = c.start || 1;
    return `<ol class="el-numbered" start="${start}" style="${style}">
  ${items.map((it) => `<li>${this.escapeHtml(it.text || '')}</li>`).join('')}
</ol>`;
  }

  // ---------------------------------------------------------------------------
  //  Metric / KPI elements
  // ---------------------------------------------------------------------------

  private renderMetric(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const delta = c.delta
      ? `<span class="metric-delta ${c.deltaDirection === 'up' ? 'delta-up' : c.deltaDirection === 'down' ? 'delta-down' : ''}">${this.escapeHtml(c.delta)}</span>`
      : '';
    return `<div class="el-metric" style="${style}">
  <div class="metric-value">${this.escapeHtml(c.value || '')}${c.unit ? `<span class="metric-unit">${this.escapeHtml(c.unit)}</span>` : ''}</div>
  <div class="metric-label">${this.escapeHtml(c.label || '')}</div>
  ${delta}
</div>`;
  }

  private renderKpi(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const trendIcon = c.trendDirection === 'up' ? '↑' : c.trendDirection === 'down' ? '↓' : '';
    const trendClass = c.trendDirection === 'up' ? 'delta-up' : c.trendDirection === 'down' ? 'delta-down' : '';
    return `<div class="el-kpi" style="${style}">
  <div class="kpi-value">${this.escapeHtml(c.value || '')}${trendIcon ? `<span class="kpi-trend ${trendClass}">${trendIcon}</span>` : ''}</div>
  <div class="kpi-label">${this.escapeHtml(c.label || '')}</div>
  ${c.sublabel ? `<div class="kpi-sublabel">${this.escapeHtml(c.sublabel)}</div>` : ''}
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Composite blocks
  // ---------------------------------------------------------------------------

  private renderTeamCard(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const members: Array<{ name: string; role?: string; bio?: string; photoUrl?: string }> = Array.isArray(c.members) ? c.members : [];
    const cols = Math.min(members.length, 4) || 1;
    return `<div class="el-team" style="${style};grid-template-columns:repeat(${cols},1fr);">
  ${members.map((m) => `<div class="team-member">
    <div class="team-avatar">${m.photoUrl ? `<img src="${m.photoUrl}" alt="${this.escapeHtml(m.name)}" />` : `<span>${this.initials(m.name)}</span>`}</div>
    <div class="team-name">${this.escapeHtml(m.name)}</div>
    ${m.role ? `<div class="team-role">${this.escapeHtml(m.role)}</div>` : ''}
    ${m.bio ? `<div class="team-bio">${this.escapeHtml(m.bio)}</div>` : ''}
  </div>`).join('')}
</div>`;
  }

  private renderProcessSteps(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const steps: Array<{ title: string; description?: string }> = Array.isArray(c.steps) ? c.steps : [];
    const horiz = c.orientation !== 'vertical';
    return `<div class="el-process ${horiz ? 'process-horiz' : 'process-vert'}" style="${style}">
  ${steps.map((s, i) => `<div class="process-step">
    <div class="step-num">${String(i + 1).padStart(2, '0')}</div>
    <div class="step-title">${this.escapeHtml(s.title)}</div>
    ${s.description ? `<div class="step-desc">${this.escapeHtml(s.description)}</div>` : ''}
  </div>${horiz && i < steps.length - 1 ? '<div class="step-arrow">→</div>' : ''}`).join('')}
</div>`;
  }

  private renderFeatureGrid(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const items: Array<{ title: string; description?: string; icon?: string }> = Array.isArray(c.items) ? c.items : [];
    const cols = c.columns || Math.min(items.length, 3) || 2;
    return `<div class="el-features" style="${style};grid-template-columns:repeat(${cols},1fr);">
  ${items.map((it) => `<div class="feature-item">
    ${it.icon ? `<div class="feature-icon">${this.escapeHtml(it.icon)}</div>` : '<div class="feature-dot"></div>'}
    <div class="feature-title">${this.escapeHtml(it.title)}</div>
    ${it.description ? `<div class="feature-desc">${this.escapeHtml(it.description)}</div>` : ''}
  </div>`).join('')}
</div>`;
  }

  private renderRoadmap(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const phases: Array<{ phase: string; period?: string; bullets?: string[] }> = Array.isArray(c.phases) ? c.phases : [];
    return `<div class="el-roadmap" style="${style}">
  ${phases.map((ph, i) => `<div class="roadmap-phase">
    <div class="phase-marker">${i + 1}</div>
    <div class="phase-label">${this.escapeHtml(ph.phase)}</div>
    ${ph.period ? `<div class="phase-period">${this.escapeHtml(ph.period)}</div>` : ''}
    ${ph.bullets?.length ? `<ul class="phase-bullets">${ph.bullets.map((b) => `<li>${this.escapeHtml(b)}</li>`).join('')}</ul>` : ''}
  </div>`).join('<div class="roadmap-connector"></div>')}
</div>`;
  }

  private renderComparison(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const columns: string[] = Array.isArray(c.columns) ? c.columns : [];
    const rows: Array<{ feature: string; values: string[] }> = Array.isArray(c.rows) ? c.rows : [];
    const hi = c.highlightColumn ?? -1;
    return `<div class="el-comparison" style="${style}">
  <table class="comparison-table">
    <thead><tr><th></th>${columns.map((col, i) => `<th class="${i === hi ? 'col-highlight' : ''}">${this.escapeHtml(col)}</th>`).join('')}</tr></thead>
    <tbody>${rows.map((row) => `<tr>
      <td class="feature-col">${this.escapeHtml(row.feature)}</td>
      ${row.values.map((v, i) => `<td class="${i === hi ? 'col-highlight' : ''}">${this.escapeHtml(v)}</td>`).join('')}
    </tr>`).join('')}</tbody>
  </table>
</div>`;
  }

  private renderPricingCard(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const tiers: Array<{ name: string; price: string; period?: string; features: string[]; highlight?: boolean }> = Array.isArray(c.tiers) ? c.tiers : [];
    return `<div class="el-pricing" style="${style}">
  ${tiers.map((t) => `<div class="pricing-tier ${t.highlight ? 'tier-highlight' : ''}">
    <div class="tier-name">${this.escapeHtml(t.name)}</div>
    <div class="tier-price">${this.escapeHtml(t.price)}<span class="tier-period">${t.period ? `/${this.escapeHtml(t.period)}` : ''}</span></div>
    <ul class="tier-features">${(t.features || []).map((f) => `<li>${this.escapeHtml(f)}</li>`).join('')}</ul>
  </div>`).join('')}
</div>`;
  }

  private renderFundsAllocation(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const items: any[] = Array.isArray(c.items) ? c.items : [];
    const maxPct = Math.max(...items.map((item) => Number(item.percentage) || 0), 1);
    return `<div class="el-funds" style="${style}">
  ${items.map((item, i) => {
    const pct = Number(item.percentage) || 0;
    const color = item.color || ['#dc2626', '#2563eb', '#16a34a', '#f59e0b'][i % 4];
    const width = Math.round((pct / maxPct) * 100);
    return `<div class="fund-row">
      <div class="fund-head"><span class="fund-dot" style="background:${color}"></span><span>${this.escapeHtml(item.category || 'Allocation')}</span><strong style="color:${color}">${pct}%</strong></div>
      <div class="fund-track"><div class="fund-fill" style="width:${width}%;background:${color}"></div></div>
    </div>`;
  }).join('')}
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Decorative / shape elements
  // ---------------------------------------------------------------------------

  private renderShape(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    let extraStyle = '';
    if (c.gradient) extraStyle += `background:${this.gradientToCss(c.gradient)};`;
    else if (c.fill) extraStyle += `background:${c.fill};`;
    if (c.stroke) extraStyle += `border:${c.strokeWidth || 1}px solid ${c.stroke};`;
    const kind = c.kind || 'rect';
    if (kind === 'circle' || kind === 'ellipse') extraStyle += 'border-radius:50%;';
    return `<div class="el-shape" style="${style}${extraStyle}"></div>`;
  }

  private renderDivider(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const stroke = c.stroke || el.style?.stroke || 'currentColor';
    const width = c.strokeWidth || el.style?.strokeWidth || 1;
    return `<div class="el-divider" style="${style}">
  <hr style="border:none;border-top:${width}px solid ${stroke};margin:0;width:100%;">
  ${c.label ? `<span class="divider-label">${this.escapeHtml(c.label)}</span>` : ''}
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Chart element (inline in elementTree)
  // ---------------------------------------------------------------------------

  private renderChartEl(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const type = c.type || 'bar';
    const title = c.title || '';
    const cats: string[] = Array.isArray(c.categories) ? c.categories : [];
    const series: Array<{ name: string; values: number[]; color?: string }> = Array.isArray(c.series) ? c.series : [];

    // Render as inline SVG bar chart (simple but accurate for export)
    if ((type === 'bar' || type === 'stackedBar') && cats.length && series.length) {
      return this.renderBarChartSvg(el, style, title, cats, series);
    }
    if (type === 'funnel' && cats.length && series.length) {
      return this.renderFunnelSvg(el, style, title, cats, series[0]?.values || []);
    }
    // Fallback: placeholder
    return `<div class="el-chart-placeholder" style="${style}">
  <div class="chart-type-label">${this.escapeHtml(title || type.toUpperCase())}</div>
  ${cats.length ? `<div class="chart-cats">${cats.slice(0, 5).map((c) => this.escapeHtml(c)).join(' · ')}</div>` : ''}
</div>`;
  }

  private renderBarChartSvg(
    _el: SlideElementDTO, style: string,
    title: string, cats: string[], series: Array<{ name: string; values: number[]; color?: string }>,
  ): string {
    const W = 400; const H = 200; const PAD = 30; const BAR_GAP = 4;
    const allVals = series.flatMap((s) => s.values).filter(Number.isFinite);
    const maxVal = Math.max(...allVals, 1);
    const groupW = (W - PAD * 2) / cats.length;
    const barW = Math.max(4, (groupW - BAR_GAP * (series.length + 1)) / series.length);
    const COLORS = ['#ea580c', '#f59e0b', '#16a34a', '#2563eb', '#a855f7'];

    let bars = '';
    cats.forEach((cat, ci) => {
      series.forEach((s, si) => {
        const val = s.values[ci] ?? 0;
        const bh = ((val / maxVal) * (H - PAD - 20)) || 0;
        const bx = PAD + ci * groupW + si * (barW + BAR_GAP) + BAR_GAP;
        const by = H - PAD - bh;
        const color = s.color || COLORS[si % COLORS.length];
        bars += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${barW.toFixed(1)}" height="${bh.toFixed(1)}" fill="${color}" rx="2"/>`;
        if (val > 0) bars += `<text x="${(bx + barW / 2).toFixed(1)}" y="${(by - 3).toFixed(1)}" text-anchor="middle" font-size="9" fill="currentColor">${this.formatVal(val)}</text>`;
      });
      const cx = PAD + ci * groupW + groupW / 2;
      bars += `<text x="${cx.toFixed(1)}" y="${(H - 6).toFixed(1)}" text-anchor="middle" font-size="9" fill="currentColor">${this.escapeHtml(cat.slice(0, 10))}</text>`;
    });

    return `<div class="el-chart" style="${style}">
  ${title ? `<div class="chart-title">${this.escapeHtml(title)}</div>` : ''}
  <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:calc(100% - ${title ? 20 : 0}px);">${bars}</svg>
</div>`;
  }

  private renderFunnelSvg(_el: SlideElementDTO, style: string, title: string, cats: string[], vals: number[]): string {
    const W = 300; const H = 200;
    const maxVal = Math.max(...vals, 1);
    const rowH = (H - 10) / Math.max(cats.length, 1);
    const COLORS = ['#ea580c', '#f59e0b', '#16a34a', '#2563eb'];
    let rows = '';
    cats.forEach((cat, i) => {
      const ratio = (vals[i] ?? 0) / maxVal;
      const bw = ratio * (W * 0.8);
      const bx = (W - bw) / 2;
      const by = 5 + i * rowH;
      const color = COLORS[i % COLORS.length];
      rows += `<rect x="${bx.toFixed(1)}" y="${by.toFixed(1)}" width="${bw.toFixed(1)}" height="${(rowH - 4).toFixed(1)}" fill="${color}" rx="3"/>`;
      rows += `<text x="${(W / 2).toFixed(1)}" y="${(by + rowH / 2 + 3).toFixed(1)}" text-anchor="middle" font-size="10" fill="#fff" font-weight="600">${this.escapeHtml(cat)}</text>`;
    });
    return `<div class="el-chart" style="${style}">
  ${title ? `<div class="chart-title">${this.escapeHtml(title)}</div>` : ''}
  <svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:calc(100% - ${title ? 20 : 0}px);">${rows}</svg>
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Table element
  // ---------------------------------------------------------------------------

  private renderTable(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    const headers: Array<{ text: string }> = Array.isArray(c.headers) ? c.headers : [];
    const rows: Array<Array<{ text: string }>> = Array.isArray(c.rows) ? c.rows : [];
    return `<div class="el-table" style="${style}">
  <table>
    ${headers.length ? `<thead><tr>${headers.map((h) => `<th>${this.escapeHtml(h.text)}</th>`).join('')}</tr></thead>` : ''}
    <tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${this.escapeHtml(cell.text)}</td>`).join('')}</tr>`).join('')}</tbody>
  </table>
</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Media elements
  // ---------------------------------------------------------------------------

  private renderImage(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    if (c.src) {
      return `<img class="el-image" src="${c.src}" alt="${this.escapeHtml(c.alt || '')}" style="${style}object-fit:${c.fit || 'cover'};" />`;
    }
    return `<div class="el-image-placeholder" style="${style}"><span>${this.escapeHtml(c.alt || 'Image')}</span></div>`;
  }

  private renderIcon(el: SlideElementDTO, style: string): string {
    const c = (el.content as any) || {};
    return `<div class="el-icon" style="${style}color:${c.color || 'currentColor'};">${this.escapeHtml(c.name || '')}</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Fallback path (no elementTree)
  // ---------------------------------------------------------------------------

  private renderFallback(slide: VisualSlideContent): string {
    const primary = slide.theme?.colors?.primary || '#ea580c';
    const text = slide.theme?.colors?.text || '#1c1917';
    const secondary = slide.theme?.colors?.textSecondary || '#78716c';
    const headingFont = slide.theme?.fonts?.heading || 'Inter, sans-serif';
    const bodyFont = slide.theme?.fonts?.body || 'Inter, sans-serif';

    const parts: string[] = [];

    if (slide.title) {
      parts.push(`<h1 style="font-family:${headingFont};font-size:${slide.theme?.fontSize?.h1 || 48}px;color:${primary};font-weight:700;margin:0 0 16px;line-height:1.15;">${this.escapeHtml(slide.title)}</h1>`);
    }
    if (slide.subtitle) {
      parts.push(`<h2 style="font-family:${bodyFont};font-size:${slide.theme?.fontSize?.h3 || 24}px;color:${secondary};font-weight:400;margin:0 0 32px;line-height:1.4;">${this.escapeHtml(slide.subtitle)}</h2>`);
    }

    const content = slide.content;
    if (content) {
      if (typeof content === 'string') {
        parts.push(`<p style="font-family:${bodyFont};font-size:24px;color:${text};line-height:1.6;">${this.escapeHtml(content)}</p>`);
      } else if (Array.isArray(content)) {
        const items = content.map((it) => `<li>${this.escapeHtml(String(it))}</li>`).join('');
        parts.push(`<ul style="padding-left:0;list-style:none;color:${text};font-family:${bodyFont};font-size:22px;">${items}</ul>`);
      } else if (typeof content === 'object') {
        if (content.description) {
          parts.push(`<p style="font-family:${bodyFont};font-size:22px;color:${text};line-height:1.6;margin-bottom:20px;">${this.escapeHtml(content.description)}</p>`);
        }
        const bullets = content.painPoints || content.features || content.keyBenefits || [];
        if (bullets.length) {
          const lis = bullets.slice(0, 6).map((b: string) => `<li style="margin-bottom:12px;">• ${this.escapeHtml(b)}</li>`).join('');
          parts.push(`<ul style="padding-left:0;list-style:none;color:${text};font-family:${bodyFont};font-size:20px;">${lis}</ul>`);
        }
      }
    }

    if (slide.charts?.length) {
      const chart = (slide.charts[0] as any);
      if (chart.renderedImage) {
        parts.push(`<img src="${chart.renderedImage}" alt="Chart" style="max-width:100%;max-height:300px;object-fit:contain;border-radius:8px;" />`);
      }
    }

    return `<div style="position:absolute;top:0;left:0;width:100%;height:100%;padding:6% 7%;box-sizing:border-box;display:flex;flex-direction:column;justify-content:center;">${parts.join('\n')}</div>`;
  }

  // ---------------------------------------------------------------------------
  //  Background resolution
  // ---------------------------------------------------------------------------

  private resolveBackground(slide: VisualSlideContent, family?: string): string {
    if (family) {
      try {
        const tokens = getFamilyTokens(family as SmartFamilyId);
        if (tokens?.bg) return tokens.bg;
      } catch { /* unknown family */ }
    }
    return slide.theme?.colors?.background || '#FAFAF9';
  }

  // ---------------------------------------------------------------------------
  //  Chart rendering for legacy slide.charts[]
  // ---------------------------------------------------------------------------

  private async renderChartsForSlides(slides: VisualSlideContent[]): Promise<VisualSlideContent[]> {
    const result: VisualSlideContent[] = [];
    for (const slide of slides) {
      if (slide.charts?.length) {
        try {
          const rendered = await this.chartRenderingService.renderCharts(slide.charts);
          result.push({
            ...slide,
            charts: slide.charts.map((c, i) => ({ ...c, renderedImage: rendered[i] })),
          } as any);
        } catch {
          result.push(slide);
        }
      } else {
        result.push(slide);
      }
    }
    return result;
  }

  // ---------------------------------------------------------------------------
  //  Style helpers
  // ---------------------------------------------------------------------------

  private styleToCSS(style: ElementStyle | null | undefined): string {
    if (!style) return '';
    const p: string[] = [];
    if (style.fill && style.fill !== 'transparent') p.push(`background:${style.fill}`);
    if (style.gradient) p.push(`background:${this.gradientToCss(style.gradient)}`);
    if (style.opacity !== undefined) p.push(`opacity:${style.opacity}`);
    if (style.borderRadius !== undefined) p.push(`border-radius:${style.borderRadius}px`);
    if (style.shadow) p.push(`box-shadow:${style.shadow}`);
    if (style.stroke) p.push(`border:${style.strokeWidth ?? 1}px solid ${style.stroke}`);
    if (style.paddingTop !== undefined)    p.push(`padding-top:${style.paddingTop}px`);
    if (style.paddingRight !== undefined)  p.push(`padding-right:${style.paddingRight}px`);
    if (style.paddingBottom !== undefined) p.push(`padding-bottom:${style.paddingBottom}px`);
    if (style.paddingLeft !== undefined)   p.push(`padding-left:${style.paddingLeft}px`);
    if (style.fontFamily)    p.push(`font-family:${style.fontFamily}`);
    if (style.fontSize !== undefined)  p.push(`font-size:${style.fontSize}px`);
    if (style.fontWeight !== undefined) p.push(`font-weight:${style.fontWeight}`);
    if (style.fontStyle)     p.push(`font-style:${style.fontStyle}`);
    if (style.textDecoration)p.push(`text-decoration:${style.textDecoration}`);
    if (style.textTransform) p.push(`text-transform:${style.textTransform}`);
    if (style.color)         p.push(`color:${style.color}`);
    if (style.lineHeight !== undefined)   p.push(`line-height:${style.lineHeight}`);
    if (style.letterSpacing !== undefined) p.push(`letter-spacing:${style.letterSpacing}px`);
    if (style.textAlign)     p.push(`text-align:${style.textAlign}`);
    if (style.textShadow)    p.push(`text-shadow:${style.textShadow}`);
    return p.join(';') + (p.length ? ';' : '');
  }

  private gradientToCss(g: GradientStyle): string {
    const stops = g.stops.map((s) => `${s.color} ${(s.offset * 100).toFixed(0)}%`).join(', ');
    return g.kind === 'linear'
      ? `linear-gradient(${g.angle ?? 135}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`;
  }

  private initials(name: string): string {
    return (name || '?').split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  }

  private formatVal(v: number): string {
    if (Math.abs(v) >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`;
    if (Math.abs(v) >= 1_000)     return `${(v / 1_000).toFixed(1)}K`;
    return v % 1 === 0 ? String(v) : v.toFixed(1);
  }

  private stripHtml(s: string): string {
    return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private escapeHtml(text: string): string {
    if (typeof text !== 'string') return '';
    return text.replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' })[m]!);
  }

  // ---------------------------------------------------------------------------
  //  CSS
  // ---------------------------------------------------------------------------

  private getStyles(forPrint: boolean): string {
    return `
*{margin:0;padding:0;box-sizing:border-box;}
body{font-family:'Inter',system-ui,sans-serif;${forPrint ? '' : 'overflow:hidden;'}}
.presentation{${forPrint ? '' : 'display:flex;transition:transform 0.3s ease;'}}

/* Slide container — always 16:9 */
.slide{
  ${forPrint ? 'page-break-after:always;' : 'min-width:100vw;'}
  position:relative;
  aspect-ratio:16/9;
  width:${forPrint ? '100%' : '100vw'};
  overflow:hidden;
}
.slide-stage{
  position:absolute;top:0;left:0;width:100%;height:100%;
}
.slide-number-badge{
  position:absolute;bottom:1.5%;right:2.5%;
  font-size:1vw;opacity:0.4;
  font-family:'Inter',sans-serif;
}

/* ── Text elements ──────────────────────────────────── */
.el-heading{
  display:flex;align-items:flex-start;
  overflow:hidden;word-break:break-word;
  line-height:1.15;
}
.el-subheading{
  display:flex;align-items:flex-start;
  overflow:hidden;word-break:break-word;
  line-height:1.3;
}
.el-paragraph,.el-caption,.el-label,.el-footer{
  overflow:hidden;word-break:break-word;
  line-height:1.6;
}
.el-label{display:block;}
.el-quote{overflow:hidden;padding:4% 5%;}
.el-quote p{font-size:inherit;line-height:1.5;font-style:italic;margin-bottom:8px;}
.el-quote cite{font-size:0.75em;opacity:0.7;}
.el-cta{display:flex;align-items:center;justify-content:center;}
.cta-text{padding:2% 5%;border-radius:4px;font-weight:600;font-size:inherit;}

/* ── Lists ──────────────────────────────────────────── */
.el-bullets,.el-numbered{
  padding-left:0;list-style:none;
  overflow:hidden;
  display:flex;flex-direction:column;gap:0.5em;
}
.el-bullets li{padding-left:1.2em;position:relative;line-height:1.5;}
.el-bullets li::before{content:'';position:absolute;left:0;top:0.6em;
  width:0.4em;height:0.4em;border-radius:50%;background:currentColor;opacity:0.7;}
.el-numbered{list-style:decimal inside;}
.el-numbered li{line-height:1.5;}

/* ── Metric / KPI ───────────────────────────────────── */
.el-metric,.el-kpi{
  display:flex;flex-direction:column;justify-content:center;
  overflow:hidden;padding:4% 5%;
}
.metric-value,.kpi-value{font-size:2.8em;font-weight:700;line-height:1;letter-spacing:-0.04em;}
.metric-unit{font-size:0.5em;font-weight:400;margin-left:3px;opacity:0.8;}
.metric-label,.kpi-label{font-size:0.72em;font-weight:500;margin-top:0.4em;text-transform:uppercase;letter-spacing:0.06em;opacity:0.75;}
.kpi-sublabel{font-size:0.65em;opacity:0.55;margin-top:2px;}
.metric-delta,.kpi-trend{font-size:0.6em;font-weight:600;margin-top:4px;}
.delta-up{color:#16a34a;}
.delta-down{color:#dc2626;}

/* ── Team ───────────────────────────────────────────── */
.el-team{display:grid;gap:2%;padding:2%;overflow:hidden;align-content:start;}
.team-member{display:flex;flex-direction:column;align-items:center;text-align:center;padding:3%;overflow:hidden;}
.team-avatar{width:3.5em;height:3.5em;border-radius:50%;overflow:hidden;background:currentColor;display:flex;align-items:center;justify-content:center;margin-bottom:0.6em;flex-shrink:0;opacity:0.85;}
.team-avatar img{width:100%;height:100%;object-fit:cover;}
.team-avatar span{font-size:1.1em;font-weight:700;color:#fff;mix-blend-mode:normal;}
.team-name{font-weight:700;font-size:0.9em;line-height:1.3;}
.team-role{font-size:0.72em;opacity:0.7;margin-top:2px;}
.team-bio{font-size:0.65em;opacity:0.6;margin-top:4px;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}

/* ── Process steps ──────────────────────────────────── */
.el-process{display:flex;align-items:flex-start;overflow:hidden;padding:2%;}
.process-horiz{flex-direction:row;gap:0;}
.process-vert{flex-direction:column;gap:4%;}
.process-step{display:flex;flex-direction:column;flex:1;padding:3%;overflow:hidden;}
.step-num{font-size:1.8em;font-weight:800;opacity:0.15;line-height:1;margin-bottom:4px;}
.step-title{font-size:0.85em;font-weight:600;line-height:1.3;}
.step-desc{font-size:0.72em;opacity:0.7;margin-top:4px;line-height:1.4;}
.step-arrow{font-size:1.2em;opacity:0.3;align-self:center;padding:0 4px;flex-shrink:0;}

/* ── Feature grid ───────────────────────────────────── */
.el-features{display:grid;gap:2%;padding:2%;overflow:hidden;align-content:start;}
.feature-item{padding:3%;overflow:hidden;}
.feature-dot{width:0.5em;height:0.5em;border-radius:50%;background:currentColor;margin-bottom:0.4em;opacity:0.6;}
.feature-icon{font-size:1.2em;margin-bottom:4px;}
.feature-title{font-size:0.85em;font-weight:600;line-height:1.3;}
.feature-desc{font-size:0.72em;opacity:0.65;margin-top:3px;line-height:1.4;}

/* ── Roadmap ────────────────────────────────────────── */
.el-roadmap{display:flex;align-items:flex-start;padding:2%;overflow:hidden;gap:0;}
.roadmap-phase{flex:1;padding:3%;overflow:hidden;}
.roadmap-connector{width:20px;flex-shrink:0;align-self:center;text-align:center;opacity:0.3;font-size:0.7em;}
.roadmap-connector::before{content:'→';display:block;}
.phase-marker{width:1.8em;height:1.8em;border-radius:50%;background:currentColor;display:flex;align-items:center;justify-content:center;font-size:0.8em;font-weight:700;color:#fff;opacity:0.7;margin-bottom:0.4em;}
.phase-label{font-weight:700;font-size:0.85em;line-height:1.3;}
.phase-period{font-size:0.72em;opacity:0.6;margin-top:2px;}
.phase-bullets{margin-top:4px;padding-left:0;list-style:none;}
.phase-bullets li{font-size:0.65em;opacity:0.7;line-height:1.4;padding-left:0.8em;position:relative;}
.phase-bullets li::before{content:'·';position:absolute;left:0;}

/* ── Comparison ─────────────────────────────────────── */
.el-comparison{overflow:hidden;padding:1%;}
.comparison-table{width:100%;border-collapse:collapse;font-size:0.75em;}
.comparison-table th,.comparison-table td{padding:4px 8px;border-bottom:1px solid rgba(0,0,0,0.08);text-align:left;}
.comparison-table th{font-weight:700;font-size:0.85em;text-transform:uppercase;letter-spacing:0.05em;}
.comparison-table .col-highlight{background:rgba(0,0,0,0.04);font-weight:600;}
.feature-col{font-weight:500;}

/* ── Pricing ────────────────────────────────────────── */
.el-pricing{display:flex;gap:2%;padding:2%;overflow:hidden;}
.pricing-tier{flex:1;padding:4%;overflow:hidden;border-radius:4px;border:1px solid rgba(0,0,0,0.08);}
.tier-highlight{border-width:2px;border-color:currentColor;}
.tier-name{font-size:0.8em;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;opacity:0.75;margin-bottom:4px;}
.tier-price{font-size:1.8em;font-weight:700;line-height:1;}
.tier-period{font-size:0.45em;font-weight:400;opacity:0.6;}
.tier-features{list-style:none;padding:0;margin-top:8px;}
.tier-features li{font-size:0.65em;line-height:1.6;padding-left:0.9em;position:relative;}
.tier-features li::before{content:'✓';position:absolute;left:0;opacity:0.7;}

/* ── Funds allocation ───────────────────────────────── */
.el-funds{display:flex;flex-direction:column;justify-content:center;gap:10px;padding:2%;overflow:hidden;}
.fund-row{display:flex;flex-direction:column;gap:4px;}
.fund-head{display:flex;align-items:center;justify-content:space-between;gap:8px;font-size:0.72em;font-weight:700;}
.fund-head span:nth-child(2){overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.fund-dot{width:10px;height:10px;border-radius:50%;flex:0 0 auto;}
.fund-track{height:6px;background:rgba(148,163,184,0.22);border-radius:999px;overflow:hidden;}
.fund-fill{height:100%;border-radius:999px;}

/* ── Shape / divider ────────────────────────────────── */
.el-shape{pointer-events:none;}
.el-divider{display:flex;align-items:center;gap:8px;}
.divider-label{font-size:0.7em;opacity:0.6;white-space:nowrap;}

/* ── Charts ─────────────────────────────────────────── */
.el-chart{overflow:hidden;display:flex;flex-direction:column;}
.chart-title{font-size:0.75em;font-weight:600;margin-bottom:4px;opacity:0.8;}
.el-chart-placeholder{display:flex;flex-direction:column;align-items:center;justify-content:center;background:rgba(0,0,0,0.04);border-radius:4px;}
.chart-type-label{font-size:0.8em;font-weight:600;opacity:0.5;text-transform:uppercase;letter-spacing:0.05em;}
.chart-cats{font-size:0.65em;opacity:0.4;margin-top:4px;}

/* ── Media ──────────────────────────────────────────── */
.el-image{display:block;}
.el-image-placeholder{display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.06);border-radius:4px;font-size:0.75em;opacity:0.6;}
.el-icon{display:flex;align-items:center;justify-content:center;font-size:inherit;}

/* ── Table ──────────────────────────────────────────── */
.el-table{overflow:auto;}
.el-table table{width:100%;border-collapse:collapse;font-size:0.75em;}
.el-table th,.el-table td{padding:4px 8px;border-bottom:1px solid rgba(0,0,0,0.08);}
.el-table th{font-weight:700;}

${forPrint ? `
@page{size:landscape;}
@media print{
  .slide{page-break-after:always;width:100%;height:auto;}
  .slide-number-badge{display:none;}
}` : `
.controls{
  position:fixed;bottom:30px;left:50%;transform:translateX(-50%);
  display:flex;gap:20px;align-items:center;
  background:rgba(0,0,0,0.85);padding:12px 28px;border-radius:50px;
  color:white;z-index:1000;
}
.control-btn{
  background:white;color:black;border:none;padding:8px 18px;
  border-radius:25px;cursor:pointer;font-size:14px;font-weight:500;
  transition:background 0.2s;
}
.control-btn:hover{background:#f3f4f6;}
.control-btn:disabled{opacity:0.4;cursor:not-allowed;}
#slideCounter{font-size:14px;min-width:70px;text-align:center;}
`}

@media print{.controls{display:none;}}
`;
  }

  // ---------------------------------------------------------------------------
  //  Navigation controls + JS
  // ---------------------------------------------------------------------------

  private renderControls(): string {
    return `<div class="controls">
  <button id="prevBtn" class="control-btn">← Prev</button>
  <span id="slideCounter">1 / 1</span>
  <button id="nextBtn" class="control-btn">Next →</button>
</div>`;
  }

  private getScripts(): string {
    return `<script>
let cur=0;
const slides=document.querySelectorAll('.slide');
const total=slides.length;
const prev=document.getElementById('prevBtn');
const next=document.getElementById('nextBtn');
const ctr=document.getElementById('slideCounter');
const pres=document.querySelector('.presentation');
function go(){pres.style.transform='translateX(-'+(cur*100)+'vw)';ctr.textContent=(cur+1)+' / '+total;prev.disabled=cur===0;next.disabled=cur===total-1;}
prev.addEventListener('click',()=>{if(cur>0){cur--;go();}});
next.addEventListener('click',()=>{if(cur<total-1){cur++;go();}});
document.addEventListener('keydown',(e)=>{if(e.key==='ArrowLeft'&&cur>0){cur--;go();}else if(e.key==='ArrowRight'&&cur<total-1){cur++;go();}});
go();
</script>`;
  }
}
