'use client';

import React from 'react';
import type { SlideElementDTO, ElementType, ElementStyle } from '@/types/slide-element';
import {
  Type, AlignLeft, Quote, Tag, Hash, Image as ImgIcon, Triangle, Minus,
  Star, MessageSquare, BarChart3, Table as TableIcon, Sparkles,
} from 'lucide-react';

// =============================================================================
//  Element renderers
//
//  Each renderer receives a single element and renders its presentational form
//  (no selection box, no drag handles — those are added by the canvas at a
//  higher layer). The renderer must be PURE: it does not mutate the element.
//
//  Style is applied as inline CSS so the canvas can be exported to a screenshot
//  via the existing PNG/JPEG export services.
// =============================================================================

function styleToCSS(s?: ElementStyle | null): React.CSSProperties {
  if (!s) return {};
  const css: React.CSSProperties = {};
  if (s.fill && s.fill !== 'transparent') css.background = s.fill;
  if (s.gradient) {
    const stops = s.gradient.stops.map((stop) => `${stop.color} ${(stop.offset * 100).toFixed(1)}%`).join(', ');
    css.background = s.gradient.kind === 'linear'
      ? `linear-gradient(${s.gradient.angle ?? 180}deg, ${stops})`
      : `radial-gradient(circle, ${stops})`;
  }
  if (s.opacity !== undefined)      css.opacity = s.opacity;
  if (s.stroke)                     css.border = `${s.strokeWidth ?? 1}px solid ${s.stroke}`;
  if (s.borderRadius !== undefined) css.borderRadius = s.borderRadius;
  if (s.shadow)                     css.boxShadow = s.shadow;
  if (s.paddingTop    !== undefined) css.paddingTop    = s.paddingTop;
  if (s.paddingRight  !== undefined) css.paddingRight  = s.paddingRight;
  if (s.paddingBottom !== undefined) css.paddingBottom = s.paddingBottom;
  if (s.paddingLeft   !== undefined) css.paddingLeft   = s.paddingLeft;
  if (s.fontFamily)                 css.fontFamily = s.fontFamily;
  if (s.fontSize !== undefined)     css.fontSize = s.fontSize;
  if (s.fontWeight !== undefined)   css.fontWeight = s.fontWeight as any;
  if (s.fontStyle)                  css.fontStyle = s.fontStyle;
  if (s.textDecoration)             css.textDecoration = s.textDecoration;
  if (s.textTransform)              css.textTransform = s.textTransform;
  if (s.color)                      css.color = s.color;
  if (s.highlightColor)             (css as any).WebkitTextFillColor = undefined;
  if (s.lineHeight !== undefined)   css.lineHeight = s.lineHeight;
  if (s.letterSpacing !== undefined) css.letterSpacing = s.letterSpacing;
  if (s.textAlign)                  css.textAlign = s.textAlign;
  if (s.textShadow)                 css.textShadow = s.textShadow;
  return css;
}

// =============================================================================
//  Text renderers
// =============================================================================

const TextRenderer: React.FC<{ el: SlideElementDTO; defaultSize: number; defaultWeight?: number }> = ({ el, defaultSize, defaultWeight }) => {
  const c = (el.content as any) || {};
  const html: string | undefined = c.html;
  const text: string = c.text || '';
  const css: React.CSSProperties = {
    width: '100%',
    height: '100%',
    fontSize: defaultSize,
    fontWeight: defaultWeight,
    color: '#111827',
    display: 'block',
    overflow: 'hidden',
    wordBreak: 'break-word',
    ...styleToCSS(el.style),
  };
  if (html && html.trim()) {
    return <div className="slide-rt" style={css} dangerouslySetInnerHTML={{ __html: html }} />;
  }
  return (
    <div className="slide-rt" style={{ ...css, whiteSpace: 'pre-wrap' }}>
      {text || <span style={{ color: '#9ca3af' }}>Empty</span>}
    </div>
  );
};

const HeadingRenderer:    React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} defaultSize={32} defaultWeight={700} />;
const SubheadingRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} defaultSize={18} defaultWeight={500} />;
const ParagraphRenderer:  React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} defaultSize={14} defaultWeight={400} />;
const CaptionRenderer:    React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} defaultSize={11} defaultWeight={400} />;
const LabelRenderer:      React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} defaultSize={11} defaultWeight={600} />;
const FooterRenderer:     React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} defaultSize={10} defaultWeight={400} />;

const PageNumberRenderer: React.FC<{ el: SlideElementDTO; pageNumber?: number; total?: number }> = ({ el, pageNumber, total }) => {
  const fmt = (el.content as any)?.format || 'numeric';
  const text = fmt === 'pageOfTotal' && total ? `${pageNumber ?? '#'} / ${total}` : `${pageNumber ?? '#'}`;
  return <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', fontSize: 10, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{text}</div>;
};

const QuoteRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  return (
    <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
      <Quote className="w-5 h-5 text-green-600 mb-1.5 opacity-60" />
      <div style={{ fontSize: 16, fontStyle: 'italic', color: '#1f2937', lineHeight: 1.5 }}>{c?.text || 'Quote text'}</div>
      {c?.attribution && (
        <div style={{ fontSize: 12, fontWeight: 600, color: '#6b7280', marginTop: 8 }}>— {c.attribution}{c.role ? `, ${c.role}` : ''}</div>
      )}
    </div>
  );
};

const CTARenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  const variant = c?.variant || 'primary';
  const base: React.CSSProperties = {
    height: '100%', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 14, fontWeight: 600, borderRadius: 8, padding: '0 16px',
    background: variant === 'primary' ? '#16a34a' : variant === 'outline' ? 'transparent' : '#f3f4f6',
    color: variant === 'primary' ? 'white' : '#111827',
    border: variant === 'outline' ? '2px solid #16a34a' : 'none',
  };
  return <div style={{ ...base, ...styleToCSS(el.style) }}>{c?.text || 'Call to action'}</div>;
};

// =============================================================================
//  List renderers
// =============================================================================

type ListItemShape = { id: string; text: string; html?: string };
function renderItemBody(it: ListItemShape) {
  if (it.html && it.html.trim()) return <span dangerouslySetInnerHTML={{ __html: it.html }} />;
  return <span>{it.text}</span>;
}

const BulletListRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const items: ListItemShape[] = (el.content as any)?.items || [];
  return (
    <ul style={{ ...styleToCSS(el.style), width: '100%', height: '100%', overflow: 'hidden', listStyle: 'none', margin: 0, padding: 0, fontSize: 14, color: '#1f2937', lineHeight: 1.55 }}>
      {items.length === 0 && <li style={{ color: '#9ca3af' }}>(empty list)</li>}
      {items.map((it) => (
        <li key={it.id} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ flex: '0 0 4px', width: 4, height: 4, borderRadius: '50%', background: '#16a34a', marginTop: 8 }} />
          {renderItemBody(it)}
        </li>
      ))}
    </ul>
  );
};

const NumberedListRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const items: ListItemShape[] = (el.content as any)?.items || [];
  const start = (el.content as any)?.start ?? 1;
  return (
    <ol style={{ ...styleToCSS(el.style), width: '100%', height: '100%', overflow: 'hidden', listStyle: 'none', margin: 0, padding: 0, fontSize: 14, color: '#1f2937', lineHeight: 1.55, counterReset: `n ${start - 1}` }}>
      {items.length === 0 && <li style={{ color: '#9ca3af' }}>(empty list)</li>}
      {items.map((it, i) => (
        <li key={it.id} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ flex: '0 0 22px', fontWeight: 700, color: '#16a34a' }}>{start + i}.</span>
          {renderItemBody(it)}
        </li>
      ))}
    </ol>
  );
};

// =============================================================================
//  Numeric + KPI renderers
// =============================================================================

const MetricRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  return (
    <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 8 }}>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#16a34a', lineHeight: 1 }}>
        {c?.value || '0'}
        {c?.unit && <span style={{ fontSize: 16, fontWeight: 600, marginLeft: 4 }}>{c.unit}</span>}
      </div>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, marginTop: 4 }}>{c?.label || ''}</div>
      {c?.delta && (
        <div style={{ fontSize: 11, color: c.deltaDirection === 'up' ? '#16a34a' : c.deltaDirection === 'down' ? '#dc2626' : '#6b7280', marginTop: 2 }}>
          {c.deltaDirection === 'up' ? '↑' : c.deltaDirection === 'down' ? '↓' : '•'} {c.delta}
        </div>
      )}
    </div>
  );
};

const KpiRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => <MetricRenderer el={el} />;

// =============================================================================
//  Media renderers
// =============================================================================

const ImageRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  if (!c?.src) {
    return (
      <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', color: '#9ca3af', flexDirection: 'column' }}>
        <ImgIcon className="w-8 h-8 mb-1.5" />
        <span style={{ fontSize: 11 }}>No image</span>
      </div>
    );
  }
  return (
    <img
      src={c.src}
      alt={c.alt || ''}
      draggable={false}
      style={{
        width: '100%', height: '100%', display: 'block',
        objectFit: c.fit || 'cover',
        borderRadius: c.borderRadius ?? (el.style as any)?.borderRadius ?? 0,
        ...styleToCSS(el.style),
      }}
    />
  );
};

const IconRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  return (
    <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: c?.color || '#16a34a' }}>
      <Star style={{ width: '60%', height: '60%' }} />
      <span style={{ position: 'absolute', bottom: -16, fontSize: 9, color: '#9ca3af' }}>{c?.name || 'icon'}</span>
    </div>
  );
};

const LogoRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  if (c?.src) return <img src={c.src} alt={c.name || 'logo'} draggable={false} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />;
  return (
    <div style={{ width: '100%', height: '100%', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
      {c?.name || 'LOGO'}
    </div>
  );
};

// =============================================================================
//  Shape renderers
// =============================================================================

const ShapeRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  const kind = c?.kind || 'rect';
  const fill = c?.fill || '#16a34a';
  const stroke = c?.stroke;
  const strokeWidth = c?.strokeWidth ?? 0;
  const borderRadius =
    kind === 'circle' || kind === 'ellipse' ? '50%' :
    kind === 'roundedRect' ? 12 : 0;
  return (
    <div style={{
      width: '100%', height: '100%', background: fill, borderRadius,
      border: stroke ? `${strokeWidth}px solid ${stroke}` : 'none',
      ...styleToCSS(el.style),
    }} />
  );
};

const LineRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  return <div style={{ width: '100%', height: c?.strokeWidth || 2, background: c?.stroke || '#94a3b8', marginTop: '50%', transform: 'translateY(-50%)' }} />;
};

const DividerRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ flex: 1, height: c?.strokeWidth || 1, background: c?.stroke || '#e5e7eb' }} />
      {c?.label && <span style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' }}>{c.label}</span>}
      <div style={{ flex: 1, height: c?.strokeWidth || 1, background: c?.stroke || '#e5e7eb' }} />
    </div>
  );
};

// =============================================================================
//  Placeholder renderer (for types whose dedicated editors land in later
//  phases — chart, table, timeline, roadmap, team, pricing, swot, etc.)
//  Shows a real preview of what's in the element so the user can still see
//  their data, even though detailed inline editing is Phase 6+.
// =============================================================================

const ICONS: Partial<Record<ElementType, React.ComponentType<any>>> = {
  chart:        BarChart3,
  table:        TableIcon,
  timeline:     AlignLeft,
  roadmap:      AlignLeft,
  teamCard:     MessageSquare,
  pricingCard:  Tag,
  comparison:   TableIcon,
  swot:         Sparkles,
  featureGrid:  Sparkles,
  processSteps: AlignLeft,
  testimonial:  Quote,
  videoPlaceholder:         Triangle,
  embeddedMediaPlaceholder: Triangle,
};

const PlaceholderRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const Icon = ICONS[el.type] || Hash;
  return (
    <div style={{
      width: '100%', height: '100%', background: '#f8fafc', border: '1px dashed #cbd5e1',
      borderRadius: 8, padding: 10, display: 'flex', gap: 10, alignItems: 'flex-start',
      ...styleToCSS(el.style),
    }}>
      <Icon className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 10, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: 0.5 }}>
          {el.type}{el.name ? ` · ${el.name}` : ''}
        </div>
        <div style={{ fontSize: 11, color: '#475569', marginTop: 4, whiteSpace: 'pre-wrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {summarize(el)}
        </div>
      </div>
    </div>
  );
};

function summarize(el: SlideElementDTO): string {
  const c: any = el.content || {};
  if (Array.isArray(c.items))    return `${c.items.length} items`;
  if (Array.isArray(c.tiers))    return `${c.tiers.length} pricing tiers`;
  if (Array.isArray(c.members))  return `${c.members.length} members`;
  if (Array.isArray(c.steps))    return `${c.steps.length} steps`;
  if (Array.isArray(c.phases))   return `${c.phases.length} phases`;
  if (Array.isArray(c.series))   return `${c.series.length} series · ${c.categories?.length || 0} categories`;
  if (Array.isArray(c.rows))     return `${c.rows.length} rows`;
  if (c.strengths || c.weaknesses) return 'SWOT (4 quadrants)';
  if (typeof c.text === 'string') return c.text.slice(0, 80);
  return '(no preview)';
}

// =============================================================================
//  Registry
// =============================================================================

export const ELEMENT_RENDERERS: Record<ElementType, React.FC<{ el: SlideElementDTO; pageNumber?: number; total?: number }>> = {
  heading:    HeadingRenderer,
  subheading: SubheadingRenderer,
  paragraph:  ParagraphRenderer,
  quote:      QuoteRenderer,
  caption:    CaptionRenderer,
  label:      LabelRenderer,
  cta:        CTARenderer,
  footer:     FooterRenderer,
  pageNumber: PageNumberRenderer,

  bulletList:    BulletListRenderer,
  numberedList:  NumberedListRenderer,

  metric: MetricRenderer,
  kpi:    KpiRenderer,
  chart:  PlaceholderRenderer,
  table:  PlaceholderRenderer,

  image:                    ImageRenderer,
  icon:                     IconRenderer,
  logo:                     LogoRenderer,
  videoPlaceholder:         PlaceholderRenderer,
  embeddedMediaPlaceholder: PlaceholderRenderer,

  testimonial:  PlaceholderRenderer,
  teamCard:     PlaceholderRenderer,
  pricingCard:  PlaceholderRenderer,
  comparison:   PlaceholderRenderer,
  swot:         PlaceholderRenderer,
  featureGrid:  PlaceholderRenderer,
  processSteps: PlaceholderRenderer,
  timeline:     PlaceholderRenderer,
  roadmap:      PlaceholderRenderer,

  shape:   ShapeRenderer,
  line:    LineRenderer,
  divider: DividerRenderer,
};

export function renderElement(el: SlideElementDTO, ctx: { pageNumber?: number; total?: number } = {}) {
  const Renderer = ELEMENT_RENDERERS[el.type] || PlaceholderRenderer;
  return <Renderer el={el} pageNumber={ctx.pageNumber} total={ctx.total} />;
}
