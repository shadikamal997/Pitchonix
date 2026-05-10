import { LayoutComponentType, LayoutComponent } from './template-types';

// Re-export types for convenience
export { LayoutComponentType, LayoutComponent } from './template-types';

/**
 * Modular Layout Components
 * Internal building blocks for template composition
 */

export interface LayoutRenderer {
  type: LayoutComponentType;
  render: (data: any, style: any) => string;
}

/**
 * Cover Page Component
 * Full-page cover with title, subtitle, and branding
 */
export const CoverPageLayout: LayoutRenderer = {
  type: LayoutComponentType.COVER_PAGE,
  render: (data, style) => {
    const { title, subtitle, author, date, logo, description, overview = [] } = data;
    const colorScheme = getColorScheme(style.colorScheme);

    return `
      <div class="cover-page" style="
        min-height: 297mm;
        background: white;
        display: flex;
        flex-direction: column;
        position: relative;
        overflow: hidden;
      ">
        <!-- Colored top header band (~40% of page) -->
        <div style="
          background: ${colorScheme.primary};
          padding: 56px 64px 72px;
          position: relative;
          overflow: hidden;
        ">
          <!-- Decorative background circles -->
          <div style="position:absolute;right:-50px;top:-50px;width:240px;height:240px;border-radius:50%;background:rgba(255,255,255,0.07);"></div>
          <div style="position:absolute;right:80px;bottom:-80px;width:320px;height:320px;border-radius:50%;background:rgba(255,255,255,0.04);"></div>
          <div style="position:absolute;left:-30px;bottom:-30px;width:160px;height:160px;border-radius:50%;background:rgba(255,255,255,0.05);"></div>

          ${logo ? `<img src="${logo}" alt="Logo" style="max-width:80px;margin-bottom:32px;position:relative;z-index:1;" />` : ''}

          ${subtitle ? `<div style="
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 3px;
            text-transform: uppercase;
            color: rgba(255,255,255,0.7);
            margin-bottom: 20px;
            position: relative;
            z-index: 1;
          ">${subtitle}</div>` : ''}

          <h1 style="
            font-size: 44px;
            font-weight: 800;
            color: white;
            line-height: 1.18;
            margin: 0;
            max-width: 78%;
            position: relative;
            z-index: 1;
          ">${title}</h1>
        </div>

        <!-- White lower section -->
        <div style="flex:1;padding:48px 64px;display:flex;flex-direction:column;justify-content:space-between;background:white;">
          <div>
            <!-- Accent divider -->
            <div style="width:52px;height:4px;background:${colorScheme.accent};border-radius:2px;margin-bottom:28px;"></div>

            ${author ? `<p style="font-size:16px;font-weight:600;color:#111827;margin:0 0 6px 0;">${author}</p>` : ''}
            ${date ? `<p style="font-size:14px;color:#6B7280;margin:0;">${date}</p>` : ''}

            ${description ? `<p style="
              font-size: 15px;
              color: #374151;
              line-height: 1.65;
              max-width: 600px;
              margin: 28px 0 0;
            ">${description}</p>` : ''}

            ${Array.isArray(overview) && overview.length > 0 ? `<div style="
              display: flex;
              flex-wrap: wrap;
              gap: 8px;
              margin-top: 24px;
            ">
              ${overview.slice(0, 6).map((item: string) => `<span style="
                border: 1px solid #E5E7EB;
                border-radius: 999px;
                padding: 7px 11px;
                font-size: 11px;
                font-weight: 700;
                letter-spacing: 0.5px;
                text-transform: uppercase;
                color: ${colorScheme.primary};
                background: #F9FAFB;
              ">${item}</span>`).join('')}
            </div>` : ''}
          </div>

          <!-- Footer row -->
          <div style="
            display:flex;
            align-items:center;
            justify-content:space-between;
            border-top:1px solid #E5E7EB;
            padding-top:20px;
          ">
            <span style="font-size:11px;color:#9CA3AF;letter-spacing:1px;text-transform:uppercase;">Confidential</span>
            <div style="width:28px;height:28px;border-radius:6px;background:${colorScheme.primary};"></div>
          </div>
        </div>
      </div>
    `;
  },
};

/**
 * Hero Header Component
 * Large header with title and optional description
 */
export const HeroHeaderLayout: LayoutRenderer = {
  type: LayoutComponentType.HERO_HEADER,
  render: (data, style) => {
    const { title, description } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    const radius = style.cardStyle === 'rounded' ? '12px' : style.cardStyle === 'soft' ? '8px' : '4px';

    return `
      <div class="hero-header" style="
        background: white;
        padding: 36px 40px 32px;
        margin-bottom: 28px;
        border-radius: ${radius};
        border-top: 5px solid ${colorScheme.primary};
        border-left: 1px solid #E5E7EB;
        border-right: 1px solid #E5E7EB;
        border-bottom: 1px solid #E5E7EB;
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
      ">
        <h1 style="font-size: 32px; font-weight: 800; margin: 0 0 10px 0; color: #111827; line-height: 1.2;">${title}</h1>
        ${description ? `<p style="font-size: 16px; margin: 0; color: ${colorScheme.primary}; font-weight: 500;">${description}</p>` : ''}
        <div style="width: 40px; height: 3px; background: ${colorScheme.accent}; border-radius: 2px; margin-top: 16px;"></div>
      </div>
    `;
  },
};

/**
 * Metrics Strip Component
 * Horizontal strip showing key metrics/KPIs
 */
export const MetricsStripLayout: LayoutRenderer = {
  type: LayoutComponentType.METRICS_STRIP,
  render: (data, style) => {
    const { metrics } = data; // [{label, value, change}]
    const colorScheme = getColorScheme(style.colorScheme);
    
    if (!metrics || metrics.length === 0) return '';
    
    const metricCards = metrics.map((metric: any) => `
      <div style="
        flex: 1;
        padding: 24px;
        background: white;
        border-radius: ${style.cardStyle === 'rounded' ? '12px' : style.cardStyle === 'soft' ? '8px' : '4px'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        text-align: center;
      ">
        <div style="font-size: 32px; font-weight: 700; color: ${colorScheme.primary}; margin-bottom: 8px;">
          ${metric.value}
        </div>
        <div style="font-size: 14px; color: #6B7280; margin-bottom: 4px;">${metric.label}</div>
        ${metric.change ? `<div style="font-size: 12px; color: ${metric.change > 0 ? '#10B981' : '#EF4444'};">
          ${metric.change > 0 ? '↑' : '↓'} ${Math.abs(metric.change)}%
        </div>` : ''}
      </div>
    `).join('');
    
    return `
      <div class="metrics-strip" style="
        display: flex;
        gap: 16px;
        margin-bottom: 32px;
      ">
        ${metricCards}
      </div>
    `;
  },
};

/**
 * Section Card Component
 * Card with title and content
 */
export const SectionCardLayout: LayoutRenderer = {
  type: LayoutComponentType.SECTION_CARD,
  render: (data, style) => {
    const { title, content } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    
    return `
      <div class="section-card" style="
        background: white;
        padding: 32px;
        margin-bottom: 24px;
        border-radius: ${style.cardStyle === 'rounded' ? '12px' : style.cardStyle === 'soft' ? '8px' : '4px'};
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        border-left: 4px solid ${colorScheme.primary};
      ">
        <h2 style="font-size: 24px; font-weight: 600; color: #1F2937; margin: 0 0 16px 0;">${title}</h2>
        <div style="font-size: 16px; line-height: 1.6; color: #4B5563;">${content}</div>
      </div>
    `;
  },
};

/**
 * Two Column Layout Component
 * Side-by-side content layout
 */
export const TwoColumnLayout: LayoutRenderer = {
  type: LayoutComponentType.TWO_COLUMN_LAYOUT,
  render: (data, style) => {
    const { left, right } = data;
    
    return `
      <div class="two-column" style="
        display: flex;
        gap: 24px;
        margin-bottom: 32px;
      ">
        <div style="flex: 1;">${left}</div>
        <div style="flex: 1;">${right}</div>
      </div>
    `;
  },
};

/**
 * Text Block Component
 * Simple text content block
 */
export const TextBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.TEXT_BLOCK,
  render: (data, style) => {
    const { content } = data;
    
    return `
      <div class="text-block" style="
        font-size: 16px;
        line-height: 1.6;
        color: #4B5563;
        margin-bottom: 24px;
      ">
        ${content}
      </div>
    `;
  },
};

/**
 * Table Block Component
 * Data table with styling
 */
export const TableBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.TABLE_BLOCK,
  render: (data, style) => {
    const { headers, rows } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    
    if (!headers || !rows) return '';
    
    const headerRow = `
      <tr style="background: ${colorScheme.primary}; color: white;">
        ${headers.map((h: string) => `<th style="padding: 12px; text-align: left; font-weight: 600;">${h}</th>`).join('')}
      </tr>
    `;
    
    const dataRows = rows.map((row: any[], i: number) => `
      <tr style="background: ${i % 2 === 0 ? '#F9FAFB' : 'white'};">
        ${row.map((cell) => `<td style="padding: 12px; border-bottom: 1px solid #E5E7EB;">${cell}</td>`).join('')}
      </tr>
    `).join('');
    
    return `
      <div class="table-block" style="margin-bottom: 32px; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.06);">
          ${headerRow}
          ${dataRows}
        </table>
      </div>
    `;
  },
};

/**
 * Process Steps Block Component
 * Numbered steps or process flow
 */
export const ProcessStepsBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.PROCESS_STEPS_BLOCK,
  render: (data, style) => {
    const { steps } = data; // [{title, description}]
    const colorScheme = getColorScheme(style.colorScheme);
    
    if (!steps || steps.length === 0) return '';
    
    const stepsHTML = steps.map((step: any, i: number) => `
      <div style="
        display: flex;
        gap: 20px;
        margin-bottom: 24px;
        align-items: flex-start;
      ">
        <div style="
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: ${colorScheme.primary};
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          flex-shrink: 0;
        ">
          ${i + 1}
        </div>
        <div style="flex: 1;">
          <h3 style="font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 8px 0;">${step.title}</h3>
          <p style="font-size: 14px; color: #6B7280; margin: 0; line-height: 1.5;">${step.description}</p>
        </div>
      </div>
    `).join('');
    
    return `
      <div class="process-steps" style="margin-bottom: 32px;">
        ${stepsHTML}
      </div>
    `;
  },
};

/**
 * Conclusion Block Component
 * Final summary/conclusion section
 */
export const ConclusionBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.CONCLUSION_BLOCK,
  render: (data, style) => {
    const { title, content, cta } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    const radius = style.cardStyle === 'rounded' ? '12px' : style.cardStyle === 'soft' ? '8px' : '4px';

    return `
      <div class="conclusion-block" style="
        background: white;
        padding: 36px 40px;
        border-radius: ${radius};
        border: 1px solid #E5E7EB;
        border-left: 5px solid ${colorScheme.primary};
        box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        margin-bottom: 32px;
      ">
        <h2 style="font-size: 24px; font-weight: 700; margin: 0 0 14px 0; color: ${colorScheme.primary};">${title || 'Conclusion'}</h2>
        <p style="font-size: 15px; line-height: 1.7; margin: 0 0 20px 0; color: #374151;">${content}</p>
        ${cta ? `<div style="
          display: inline-block;
          font-size: 15px;
          font-weight: 600;
          color: white;
          background: ${colorScheme.primary};
          padding: 10px 22px;
          border-radius: 6px;
        ">${cta}</div>` : ''}
      </div>
    `;
  },
};

/**
 * Footer Block Component
 * Page footer with contact info and page numbers
 */
export const FooterBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.FOOTER_BLOCK,
  render: (data, style) => {
    const { companyName, contact, pageNumber, totalPages } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    
    return `
      <div class="footer-block" style="
        border-top: 2px solid ${colorScheme.primary};
        padding: 20px 0;
        margin-top: 40px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 12px;
        color: #6B7280;
      ">
        <div>
          ${companyName ? `<div style="font-weight: 600; margin-bottom: 4px;">${companyName}</div>` : ''}
          ${contact ? `<div>${contact}</div>` : ''}
        </div>
        <div>
          ${pageNumber && totalPages ? `Page ${pageNumber} of ${totalPages}` : ''}
        </div>
      </div>
    `;
  },
};

/**
 * Get color scheme by name
 */
function getColorScheme(name: string) {
  const schemes: Record<string, any> = {
    blue: {
      primary: '#2563EB',
      secondary: '#1D4ED8',
      accent: '#60A5FA',
    },
    navy: {
      primary: '#1E40AF',
      secondary: '#1E3A8A',
      accent: '#3B82F6',
    },
    gray: {
      primary: '#4B5563',
      secondary: '#374151',
      accent: '#6B7280',
    },
    purple: {
      primary: '#7C3AED',
      secondary: '#6D28D9',
      accent: '#A78BFA',
    },
    green: {
      primary: '#059669',
      secondary: '#047857',
      accent: '#34D399',
    },
    red: {
      primary: '#DC2626',
      secondary: '#B91C1C',
      accent: '#F87171',
    },
    teal: {
      primary: '#0D9488',
      secondary: '#0F766E',
      accent: '#2DD4BF',
    },
    indigo: {
      primary: '#4F46E5',
      secondary: '#4338CA',
      accent: '#818CF8',
    },
    emerald: {
      primary: '#10B981',
      secondary: '#059669',
      accent: '#6EE7B7',
    },
    amber: {
      primary: '#D97706',
      secondary: '#B45309',
      accent: '#FBBF24',
    },
    orange: {
      primary: '#EA580C',
      secondary: '#C2410C',
      accent: '#FB923C',
    },
    rose: {
      primary: '#F43F5E',
      secondary: '#E11D48',
      accent: '#FB7185',
    },
    slate: {
      primary: '#475569',
      secondary: '#334155',
      accent: '#94A3B8',
    },
    dark: {
      primary: '#1F2937',
      secondary: '#111827',
      accent: '#6B7280',
    },
  };

  return schemes[name] || schemes.blue;
}

/**
 * Chart Block Component
 * Displays charts from base64 image data
 */
export const ChartBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.CHART_BLOCK,
  render: (data, style) => {
    const { title, chartType, chartImage, chartData } = data;
    
    // If chartImage is provided (base64), display it
    if (chartImage) {
      return `
        <div class="chart-block" style="
          background: white;
          padding: 24px;
          margin-bottom: 32px;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
          page-break-inside: avoid;
        ">
          ${title ? `<h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0; color: #1F2937;">${title}</h3>` : ''}
          <div style="text-align: center;">
            <img src="${chartImage}" alt="${title || 'Chart'}" style="max-width: 100%; height: auto; border-radius: 4px;" />
          </div>
        </div>
      `;
    }
    
    // Fallback placeholder if no image
    return `
      <div class="chart-block" style="
        background: white;
        padding: 24px;
        margin-bottom: 32px;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.06);
      ">
        <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">${title || 'Chart'}</h3>
        <div style="height: 300px; display: flex; align-items: center; justify-content: center; background: #F9FAFB; border-radius: 4px;">
          <p style="color: #9CA3AF;">Chart: ${chartType || 'bar'} (Data not available)</p>
        </div>
      </div>
    `;
  },
};

/**
 * Timeline Block Component
 */
export const TimelineBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.TIMELINE_BLOCK,
  render: (data, style) => {
    const { events } = data; // [{date, title, description}]
    const colorScheme = getColorScheme(style.colorScheme);
    
    if (!events || events.length === 0) return '';
    
    const timeline = events.map((event: any, i: number) => `
      <div style="display: flex; gap: 20px; margin-bottom: 24px;">
        <div style="width: 100px; flex-shrink: 0; text-align: right; padding-top: 4px;">
          <div style="font-weight: 600; color: ${colorScheme.primary};">${event.date}</div>
        </div>
        <div style="position: relative; padding-left: 30px; flex: 1; border-left: 2px solid ${colorScheme.primary};">
          <div style="
            position: absolute;
            left: -7px;
            top: 4px;
            width: 12px;
            height: 12px;
            border-radius: 50%;
            background: ${colorScheme.primary};
          "></div>
          <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">${event.title}</h3>
          <p style="font-size: 14px; color: #6B7280; margin: 0; line-height: 1.5;">${event.description}</p>
        </div>
      </div>
    `).join('');
    
    return `
      <div class="timeline-block" style="margin-bottom: 32px;">
        ${timeline}
      </div>
    `;
  },
};

/**
 * Case Study Block Component
 */
export const CaseStudyBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.CASE_STUDY_BLOCK,
  render: (data, style) => {
    const { client, challenge, solution, results } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    
    return `
      <div class="case-study-block" style="
        background: white;
        padding: 32px;
        margin-bottom: 32px;
        border-radius: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        border-top: 4px solid ${colorScheme.primary};
      ">
        <h2 style="font-size: 24px; font-weight: 700; color: ${colorScheme.primary}; margin: 0 0 24px 0;">${client}</h2>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 8px 0;">Challenge</h3>
          <p style="font-size: 14px; color: #6B7280; margin: 0; line-height: 1.6;">${challenge}</p>
        </div>
        
        <div style="margin-bottom: 20px;">
          <h3 style="font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 8px 0;">Solution</h3>
          <p style="font-size: 14px; color: #6B7280; margin: 0; line-height: 1.6;">${solution}</p>
        </div>
        
        <div>
          <h3 style="font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 8px 0;">Results</h3>
          <p style="font-size: 14px; color: #6B7280; margin: 0; line-height: 1.6;">${results}</p>
        </div>
      </div>
    `;
  },
};

/**
 * Quote Block Component
 */
export const QuoteBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.QUOTE_BLOCK,
  render: (data, style) => {
    const { quote, author, role } = data;
    const colorScheme = getColorScheme(style.colorScheme);
    
    return `
      <div class="quote-block" style="
        background: linear-gradient(135deg, ${colorScheme.primary}15 0%, ${colorScheme.secondary}15 100%);
        padding: 32px;
        margin-bottom: 32px;
        border-radius: 12px;
        border-left: 4px solid ${colorScheme.primary};
      ">
        <div style="font-size: 24px; color: ${colorScheme.primary}; margin-bottom: 16px;">"</div>
        <p style="font-size: 18px; font-style: italic; line-height: 1.6; color: #1F2937; margin: 0 0 16px 0;">
          ${quote}
        </p>
        <div style="font-size: 14px; color: #6B7280;">
          <div style="font-weight: 600;">${author}</div>
          ${role ? `<div>${role}</div>` : ''}
        </div>
      </div>
    `;
  },
};

/**
 * Image Block Component
 */
export const ImageBlockLayout: LayoutRenderer = {
  type: LayoutComponentType.IMAGE_BLOCK,
  render: (data, style) => {
    const { src, alt, caption } = data;
    
    return `
      <div class="image-block" style="margin-bottom: 32px;">
        <img src="${src}" alt="${alt || ''}" style="
          width: 100%;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
        " />
        ${caption ? `<p style="font-size: 14px; color: #6B7280; margin: 12px 0 0 0; text-align: center; font-style: italic;">${caption}</p>` : ''}
      </div>
    `;
  },
};

/**
 * Get all layout renderers
 */
export const LAYOUT_RENDERERS: Record<LayoutComponentType, LayoutRenderer> = {
  [LayoutComponentType.COVER_PAGE]: CoverPageLayout,
  [LayoutComponentType.HERO_HEADER]: HeroHeaderLayout,
  [LayoutComponentType.METRICS_STRIP]: MetricsStripLayout,
  [LayoutComponentType.SECTION_CARD]: SectionCardLayout,
  [LayoutComponentType.TWO_COLUMN_LAYOUT]: TwoColumnLayout,
  [LayoutComponentType.TEXT_BLOCK]: TextBlockLayout,
  [LayoutComponentType.TABLE_BLOCK]: TableBlockLayout,
  [LayoutComponentType.CHART_BLOCK]: ChartBlockLayout,
  [LayoutComponentType.TIMELINE_BLOCK]: TimelineBlockLayout,
  [LayoutComponentType.PROCESS_STEPS_BLOCK]: ProcessStepsBlockLayout,
  [LayoutComponentType.CASE_STUDY_BLOCK]: CaseStudyBlockLayout,
  [LayoutComponentType.IMAGE_BLOCK]: ImageBlockLayout,
  [LayoutComponentType.QUOTE_BLOCK]: QuoteBlockLayout,
  [LayoutComponentType.CONCLUSION_BLOCK]: ConclusionBlockLayout,
  [LayoutComponentType.FOOTER_BLOCK]: FooterBlockLayout,
};
