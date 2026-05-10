'use client';

import React from 'react';

/**
 * Typography Scale (Major Third - 1.25 ratio)
 * Matches backend DocumentCompositionService
 */
const FONT_SCALE = {
  h1: 2.441,    // 39px at 16px base
  h2: 1.953,    // 31px
  h3: 1.563,    // 25px
  h4: 1.25,     // 20px
  body: 1.0,    // 16px
  small: 0.8,   // 13px
};

/**
 * Spacing System (8px grid)
 * Matches backend spacing constants
 */
const SPACING = {
  xs: 8,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
  xxl: 64,
};

interface CompositionSection {
  id: string;
  type: 'heading' | 'paragraph' | 'list' | 'quote' | 'metric';
  level?: number;
  content: string;
  fontSize: number;
  lineHeight: number;
  spaceBefore: number;
  spaceAfter: number;
  visualWeight: number;
  items?: string[];
  label?: string;
  value?: string;
  unit?: string;
}

interface CompositionMetrics {
  densityScore: number;
  readabilityScore: number;
  whitespaceScore: number;
  visualBalanceScore: number;
  overallQuality: number;
}

interface PageComposition {
  density: 'sparse' | 'balanced' | 'dense';
  layout: string;
  sections: CompositionSection[];
  metrics: CompositionMetrics;
  pageNumber?: number;
}

interface CompositionRendererProps {
  composition: PageComposition;
  pageType: string;
  pageTitle?: string;
  showMetrics?: boolean;
  className?: string;
}

/**
 * CompositionRenderer
 * 
 * Renders a page using its composition data with professional typography,
 * spacing, and visual hierarchy. Matches the backend composition system.
 */
export function CompositionRenderer({
  composition,
  pageType,
  pageTitle,
  showMetrics = false,
  className = '',
}: CompositionRendererProps) {
  if (!composition || !composition.sections) {
    return (
      <div className={`p-16 ${className}`}>
        <p className="text-gray-400 text-sm">No composition data available</p>
      </div>
    );
  }

  const renderSection = (section: CompositionSection) => {
    const baseStyle: React.CSSProperties = {
      fontSize: `${section.fontSize}rem`,
      lineHeight: section.lineHeight,
      marginTop: `${section.spaceBefore}px`,
      marginBottom: `${section.spaceAfter}px`,
    };

    switch (section.type) {
      case 'heading':
        const HeadingTag = `h${section.level || 1}` as keyof JSX.IntrinsicElements;
        const headingColor = section.level === 1 ? '#1E293B' : 
                            section.level === 2 ? '#334155' : '#475569';
        return (
          <HeadingTag
            key={section.id}
            style={{
              ...baseStyle,
              fontWeight: section.level === 1 ? 700 : section.level === 2 ? 600 : 500,
              color: headingColor,
              letterSpacing: section.level === 1 ? '-0.02em' : '0',
            }}
          >
            {section.content}
          </HeadingTag>
        );

      case 'paragraph':
        return (
          <p
            key={section.id}
            style={{
              ...baseStyle,
              color: '#475569',
              maxWidth: '65ch',
            }}
          >
            {section.content}
          </p>
        );

      case 'list':
        // The backend may produce either an `items` array (multi-item list block)
        // or a single-item section with only `content` (one bullet per section).
        // Handle both cases so list text is never invisible.
        const listItems: string[] = section.items && section.items.length > 0
          ? section.items
          : [section.content];
        return (
          <ul
            key={section.id}
            style={{
              ...baseStyle,
              listStyleType: 'disc',
              paddingLeft: '24px',
              color: '#475569',
            }}
          >
            {listItems.map((item, idx) => (
              <li
                key={`${section.id}-item-${idx}`}
                style={{ marginBottom: idx < listItems.length - 1 ? '8px' : '0' }}
              >
                {item}
              </li>
            ))}
          </ul>
        );

      case 'quote':
        return (
          <blockquote
            key={section.id}
            style={{
              ...baseStyle,
              borderLeft: '4px solid #3B82F6',
              paddingLeft: '24px',
              fontStyle: 'italic',
              color: '#64748B',
            }}
          >
            {section.content}
          </blockquote>
        );

      case 'metric':
        return (
          <div
            key={section.id}
            style={{
              ...baseStyle,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
            }}
          >
            {section.label && (
              <span style={{ fontSize: '0.875rem', color: '#64748B', fontWeight: 500 }}>
                {section.label}
              </span>
            )}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
              <span style={{ fontSize: '2rem', fontWeight: 700, color: '#1E293B' }}>
                {section.value}
              </span>
              {section.unit && (
                <span style={{ fontSize: '1rem', color: '#64748B' }}>
                  {section.unit}
                </span>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div key={section.id} style={baseStyle}>
            {section.content}
          </div>
        );
    }
  };

  const getQualityColor = (score: number): string => {
    if (score >= 85) return '#10B981'; // green
    if (score >= 70) return '#3B82F6'; // blue
    if (score >= 50) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };

  return (
    <div className={`relative ${className}`}>
      {/* Page Content */}
      <div className="p-16">
        {composition.sections.map(renderSection)}
      </div>

      {/* Quality Metrics Overlay (optional) */}
      {showMetrics && composition.metrics && (
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 border border-gray-200 w-64">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-gray-700">Composition Quality</span>
            <span
              className="text-2xl font-bold"
              style={{ color: getQualityColor(composition.metrics.overallQuality) }}
            >
              {composition.metrics.overallQuality.toFixed(0)}
            </span>
          </div>
          
          <div className="space-y-2">
            <MetricBar
              label="Density"
              value={composition.metrics.densityScore}
              color={getQualityColor(composition.metrics.densityScore)}
            />
            <MetricBar
              label="Readability"
              value={composition.metrics.readabilityScore}
              color={getQualityColor(composition.metrics.readabilityScore)}
            />
            <MetricBar
              label="Whitespace"
              value={composition.metrics.whitespaceScore}
              color={getQualityColor(composition.metrics.whitespaceScore)}
            />
            <MetricBar
              label="Balance"
              value={composition.metrics.visualBalanceScore}
              color={getQualityColor(composition.metrics.visualBalanceScore)}
            />
          </div>

          <div className="mt-3 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-500">Density Mode</span>
              <span className="font-medium text-gray-700 capitalize">{composition.density}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricBarProps {
  label: string;
  value: number;
  color: string;
}

function MetricBar({ label, value, color }: MetricBarProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-semibold text-gray-700">{value.toFixed(0)}</span>
      </div>
      <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{
            width: `${Math.min(100, Math.max(0, value))}%`,
            backgroundColor: color,
          }}
        />
      </div>
    </div>
  );
}

export default CompositionRenderer;
