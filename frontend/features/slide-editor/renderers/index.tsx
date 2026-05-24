'use client';

import React from 'react';
import type { SlideElementDTO, ElementType, ElementStyle } from '@/types/slide-element';
import {
  Type, AlignLeft, Quote, Tag, Hash, Image as ImgIcon, Triangle, Minus,
  Star, MessageSquare, BarChart3, Table as TableIcon, Sparkles,
} from 'lucide-react';
import { ChartRenderer } from '../charts/ChartRenderer';
import { TableRenderer } from '../tables/TableRenderer';
import { getLucideIcon } from '../icons/IconPicker';
import { AutoFitText } from '../design-system/AutoFitText';
import { DENSITY, ELEVATION, LINE_HEIGHT, RADIUS, SPACING, TYPE_STYLES, TYPOGRAPHY, WEIGHT } from '../design-system/tokens';

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

type TextRole = 'heading' | 'subheading' | 'paragraph' | 'caption' | 'label' | 'footer';

const TEXT_ROLE_CONFIG: Record<TextRole, {
  typeStyle: keyof typeof TYPE_STYLES;
  minSize: number;
  maxLines?: number;
  fallbackAlign?: React.CSSProperties['textAlign'];
}> = {
  heading:    { typeStyle: 'heading',    minSize: TYPOGRAPHY.xl,   maxLines: 3 },
  subheading: { typeStyle: 'subheading', minSize: TYPOGRAPHY.sm,   maxLines: 3 },
  paragraph:  { typeStyle: 'paragraph',  minSize: TYPOGRAPHY.xs,   maxLines: 8 },
  caption:    { typeStyle: 'caption',    minSize: TYPOGRAPHY.xs,   maxLines: 3 },
  label:      { typeStyle: 'eyebrow',    minSize: TYPOGRAPHY.xs,   maxLines: 2 },
  footer:     { typeStyle: 'caption',    minSize: TYPOGRAPHY.xs,   maxLines: 2, fallbackAlign: 'right' },
};

function stripHtml(s?: string): string {
  if (!s) return '';
  return s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function textContent(el: SlideElementDTO): { text: string; html?: string } {
  const c = (el.content as any) || {};
  const html = typeof c.html === 'string' ? c.html : undefined;
  const text = typeof c.text === 'string' ? c.text : stripHtml(html);
  return { text, html };
}

function mergedTextStyle(el: SlideElementDTO, role: keyof typeof TYPE_STYLES): React.CSSProperties {
  const token = TYPE_STYLES[role];
  return {
    fontSize: token.size,
    fontWeight: token.weight,
    lineHeight: token.lineHeight,
    letterSpacing: token.letterSpacing,
    color: '#111827',
    ...styleToCSS(el.style),
  };
}

const TextRenderer: React.FC<{ el: SlideElementDTO; role: TextRole }> = ({ el, role }) => {
  const cfg = TEXT_ROLE_CONFIG[role];
  const { text, html } = textContent(el);
  const css = mergedTextStyle(el, cfg.typeStyle);
  const maxSize = Number(css.fontSize || TYPE_STYLES[cfg.typeStyle].size);
  const fontWeight = css.fontWeight ?? TYPE_STYLES[cfg.typeStyle].weight;
  const lineHeight = Number(css.lineHeight || TYPE_STYLES[cfg.typeStyle].lineHeight);

  const outer: React.CSSProperties = {
    width: '100%',
    height: '100%',
    color: '#111827',
    display: 'block',
    overflow: 'hidden',
    wordBreak: 'break-word',
    overflowWrap: 'anywhere',
    boxSizing: 'border-box',
    ...css,
  };

  delete outer.fontSize;
  delete outer.fontWeight;
  delete outer.lineHeight;
  delete outer.letterSpacing;
  delete outer.textTransform;
  delete outer.color;
  delete outer.textAlign;

  return (
    <div className="slide-rt" style={outer}>
      <AutoFitText
        text={text || 'Empty'}
        asInnerHTML={!!html?.trim()}
        innerHTML={html}
        minSize={cfg.minSize}
        maxSize={maxSize}
        maxLines={cfg.maxLines}
        fontWeight={fontWeight as any}
        fontFamily={css.fontFamily as string | undefined}
        lineHeight={lineHeight}
        letterSpacing={typeof css.letterSpacing === 'number' ? css.letterSpacing : undefined}
        textTransform={css.textTransform as React.CSSProperties['textTransform']}
        color={(text ? css.color : '#9ca3af') as string}
        textAlign={(css.textAlign || cfg.fallbackAlign) as React.CSSProperties['textAlign']}
      />
    </div>
  );
};

const HeadingRenderer:    React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} role="heading" />;
const SubheadingRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} role="subheading" />;
const ParagraphRenderer:  React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} role="paragraph" />;
const CaptionRenderer:    React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} role="caption" />;
const LabelRenderer:      React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} role="label" />;
const FooterRenderer:     React.FC<{ el: SlideElementDTO }> = ({ el }) => <TextRenderer el={el} role="footer" />;

const PageNumberRenderer: React.FC<{ el: SlideElementDTO; pageNumber?: number; total?: number }> = ({ el, pageNumber, total }) => {
  const fmt = (el.content as any)?.format || 'numeric';
  const text = fmt === 'pageOfTotal' && total ? `${pageNumber ?? '#'} / ${total}` : `${pageNumber ?? '#'}`;
  return <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', fontSize: TYPOGRAPHY.xs, color: '#6b7280', display: 'flex', alignItems: 'center', justifyContent: 'flex-end' }}>{text}</div>;
};

const QuoteRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  const css = mergedTextStyle(el, 'quote');
  const outer: React.CSSProperties = {
    width: '100%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    gap: SPACING[2],
    padding: DENSITY.comfortable.pad,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    boxSizing: 'border-box',
    ...styleToCSS(el.style),
  };
  const maxSize = Number(css.fontSize || TYPE_STYLES.quote.size);
  return (
    <div style={outer}>
      <Quote style={{ width: SPACING[5], height: SPACING[5], color: '#16a34a', opacity: 0.6, flexShrink: 0 }} />
      <div style={{ flex: '1 1 auto', minHeight: 0 }}>
        <AutoFitText
          text={c?.text || 'Quote text'}
          minSize={TYPOGRAPHY.sm}
          maxSize={maxSize}
          maxLines={4}
          fontWeight={css.fontWeight as any}
          fontFamily={css.fontFamily as string | undefined}
          lineHeight={Number(css.lineHeight || LINE_HEIGHT.normal)}
          letterSpacing={typeof css.letterSpacing === 'number' ? css.letterSpacing : undefined}
          color={(css.color || '#1f2937') as string}
          style={{ fontStyle: 'italic' }}
        />
      </div>
      {c?.attribution && (
        <div style={{ fontSize: TYPOGRAPHY.sm, fontWeight: WEIGHT.semibold, color: '#6b7280', flexShrink: 0 }}>
          - {c.attribution}{c.role ? `, ${c.role}` : ''}
        </div>
      )}
    </div>
  );
};

const CTARenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  const variant = c?.variant || 'primary';
  const css = mergedTextStyle(el, 'cta');
  const base: React.CSSProperties = {
    height: '100%',
    width: '100%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    padding: `0 ${SPACING[4]}px`,
    background: variant === 'primary' ? '#16a34a' : variant === 'outline' ? 'transparent' : '#f3f4f6',
    color: variant === 'primary' ? 'white' : '#111827',
    border: variant === 'outline' ? '2px solid #16a34a' : 'none',
    boxShadow: variant === 'primary' ? ELEVATION.sm : ELEVATION.none,
    boxSizing: 'border-box',
    overflow: 'hidden',
  };
  return (
    <div style={{ ...base, ...styleToCSS(el.style) }}>
      <AutoFitText
        text={c?.text || 'Call to action'}
        minSize={TYPOGRAPHY.xs}
        maxSize={Number(css.fontSize || TYPE_STYLES.cta.size)}
        maxLines={1}
        fontWeight={css.fontWeight as any}
        fontFamily={css.fontFamily as string | undefined}
        lineHeight={Number(css.lineHeight || TYPE_STYLES.cta.lineHeight)}
        letterSpacing={typeof css.letterSpacing === 'number' ? css.letterSpacing : TYPE_STYLES.cta.letterSpacing}
        textTransform={(css.textTransform || 'uppercase') as React.CSSProperties['textTransform']}
        color={(base.color || css.color) as string}
        textAlign="center"
      />
    </div>
  );
};

// =============================================================================
//  List renderers
// =============================================================================

type ListItemShape = { id: string; text: string; html?: string };
// Phase Ω.1 — sanitise HTML from generator-supplied list items before
// inserting via dangerouslySetInnerHTML (defense-in-depth XSS).
const DOMPurify: any = typeof window !== 'undefined' ? require('dompurify') : null;
const sanitize = (html: string) => (DOMPurify && DOMPurify.sanitize ? DOMPurify.sanitize(html) : html);
function renderItemBody(it: ListItemShape) {
  if (it.html && it.html.trim()) return <span dangerouslySetInnerHTML={{ __html: sanitize(it.html) }} />;
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
  const css = mergedTextStyle(el, 'metricBig');
  return (
    <div style={{ ...styleToCSS(el.style), width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: SPACING[1], padding: DENSITY.compact.pad, boxSizing: 'border-box', overflow: 'hidden' }}>
      <div style={{ flex: '1 1 auto', minHeight: 0, color: '#16a34a' }}>
        <AutoFitText
          text={`${c?.value || '0'}${c?.unit ? ` ${c.unit}` : ''}`}
          minSize={TYPOGRAPHY.lg}
          maxSize={Number(css.fontSize || TYPE_STYLES.metricBig.size)}
          maxLines={1}
          fontWeight={css.fontWeight as any}
          fontFamily={css.fontFamily as string | undefined}
          lineHeight={Number(css.lineHeight || LINE_HEIGHT.tight)}
          letterSpacing={typeof css.letterSpacing === 'number' ? css.letterSpacing : TYPE_STYLES.metricBig.letterSpacing}
          color={(css.color || '#16a34a') as string}
        />
      </div>
      <div style={{ fontSize: TYPOGRAPHY.xs, fontWeight: WEIGHT.semibold, color: '#6b7280', textTransform: 'uppercase', letterSpacing: 0.5, flexShrink: 0 }}>{c?.label || ''}</div>
      {c?.delta && (
        <div style={{ fontSize: TYPOGRAPHY.xs, color: c.deltaDirection === 'up' ? '#16a34a' : c.deltaDirection === 'down' ? '#dc2626' : '#6b7280', flexShrink: 0 }}>
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
  // Build a CSS filter() chain from the element's filters object
  const f = c.filters || {};
  const parts: string[] = [];
  if (typeof f.brightness === 'number' && f.brightness !== 1) parts.push(`brightness(${f.brightness})`);
  if (typeof f.saturate   === 'number' && f.saturate   !== 1) parts.push(`saturate(${f.saturate})`);
  if (typeof f.blur       === 'number' && f.blur       !== 0) parts.push(`blur(${f.blur}px)`);
  if (typeof f.grayscale  === 'number' && f.grayscale  !== 0) parts.push(`grayscale(${f.grayscale})`);
  const filterStr = parts.length ? parts.join(' ') : undefined;

  const focalX = typeof c.focalX === 'number' ? c.focalX : 0.5;
  const focalY = typeof c.focalY === 'number' ? c.focalY : 0.5;

  return (
    <img
      src={c.src}
      alt={c.alt || ''}
      draggable={false}
      style={{
        width: '100%', height: '100%', display: 'block',
        objectFit: c.fit || 'cover',
        objectPosition: `${(focalX * 100).toFixed(0)}% ${(focalY * 100).toFixed(0)}%`,
        borderRadius: c.borderRadius ?? (el.style as any)?.borderRadius ?? 0,
        filter: filterStr,
        ...styleToCSS(el.style),
      }}
    />
  );
};

const IconRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = el.content as any;
  const IconCmp = getLucideIcon(c?.name) || Star;
  const color = c?.color || '#16a34a';
  const strokeWidth = typeof c?.strokeWidth === 'number' ? c.strokeWidth : 2;
  return (
    <div style={{
      ...styleToCSS(el.style),
      width: '100%', height: '100%',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      color,
    }}>
      <IconCmp style={{ width: '70%', height: '70%' }} strokeWidth={strokeWidth} />
    </div>
  );
};

const LogoRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = (el.content || {}) as any;
  const heightPx = typeof c.height === 'number' ? c.height : undefined;
  if (c.src) {
    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <img
          src={c.src} alt={c.name || 'logo'} draggable={false}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            height: heightPx ? `${heightPx}px` : 'auto',
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', background: '#f9fafb', border: '1px dashed #d1d5db', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>
      {c.name || 'LOGO'}
    </div>
  );
};

// =============================================================================
//  Shape renderers
// =============================================================================

const ShapeRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c = (el.content || {}) as any;
  const kind: string = c.kind || 'rect';
  const fill = c.fill || '#16a34a';
  const stroke = c.stroke;
  const strokeWidth = c.strokeWidth ?? 0;
  const gradient = c.gradient;
  const gradId = useFreshId('grad');

  // Build the actual SVG fill expression: gradient ref if set, else solid color.
  const fillRef = gradient ? `url(#${gradId})` : fill;

  // We use a viewBox of 100×100 so points stay simple; the SVG scales to fill.
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none"
         style={{ width: '100%', height: '100%', display: 'block', overflow: 'visible', ...styleToCSS(el.style) }}>
      {gradient && (
        <defs>
          {renderGradient(gradient, gradId)}
        </defs>
      )}
      {renderShape(kind, fillRef, stroke, strokeWidth)}
    </svg>
  );
};

function useFreshId(prefix: string): string {
  // useId would be ideal but we want a stable ID per render that doesn't
  // collide if many shapes are on the same slide. Math.random is fine here
  // because the SVG is self-contained per element.
  const ref = React.useRef<string | null>(null);
  if (ref.current === null) {
    ref.current = `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
  }
  return ref.current;
}

function renderGradient(g: any, id: string): React.ReactNode {
  const stops = (g.stops || []).map((s: any, i: number) => (
    <stop key={i} offset={`${Math.round((s.offset ?? i / Math.max(1, (g.stops || []).length - 1)) * 100)}%`} stopColor={s.color || '#16a34a'} />
  ));
  if (g.kind === 'radial') {
    return <radialGradient id={id} cx="50%" cy="50%" r="50%">{stops}</radialGradient>;
  }
  const angle = ((g.angle ?? 180) - 90) * (Math.PI / 180); // CSS gradient angle → SVG vector
  const x1 = 50 - Math.cos(angle) * 50;
  const y1 = 50 - Math.sin(angle) * 50;
  const x2 = 50 + Math.cos(angle) * 50;
  const y2 = 50 + Math.sin(angle) * 50;
  return <linearGradient id={id} x1={`${x1}%`} y1={`${y1}%`} x2={`${x2}%`} y2={`${y2}%`}>{stops}</linearGradient>;
}

function renderShape(kind: string, fill: string, stroke: string | undefined, sw: number): React.ReactNode {
  const strokeProps = stroke
    ? { stroke, strokeWidth: sw, vectorEffect: 'non-scaling-stroke' as const }
    : {};
  switch (kind) {
    case 'circle':
      return <circle cx={50} cy={50} r={50 - (sw / 2 || 0)} fill={fill} {...strokeProps} />;
    case 'ellipse':
      return <ellipse cx={50} cy={50} rx={50 - (sw / 2 || 0)} ry={32} fill={fill} {...strokeProps} />;
    case 'roundedRect':
      return <rect x={0} y={0} width={100} height={100} rx={12} ry={12} fill={fill} {...strokeProps} />;
    case 'triangle':
      return <polygon points="50,2 98,98 2,98" fill={fill} {...strokeProps} />;
    case 'arrow':
      return <polygon points="0,40 60,40 60,20 100,50 60,80 60,60 0,60" fill={fill} {...strokeProps} />;
    case 'star':
      return <polygon points={STAR_POINTS} fill={fill} {...strokeProps} />;
    /* rect */
    default:
      return <rect x={0} y={0} width={100} height={100} fill={fill} {...strokeProps} />;
  }
}

// 5-point star, centered in 100×100 viewBox
const STAR_POINTS = (() => {
  const pts: string[] = [];
  const cx = 50, cy = 50, rOuter = 50, rInner = 22;
  for (let i = 0; i < 10; i++) {
    const ang = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 === 0 ? rOuter : rInner;
    pts.push(`${cx + r * Math.cos(ang)},${cy + r * Math.sin(ang)}`);
  }
  return pts.join(' ');
})();

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
//  Composite renderers — full visual rendering on the canvas. These match the
//  server-side HTML renderer in spirit so the editor looks identical to the
//  exported deck.
// =============================================================================

const TestimonialRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c: any = el.content || {};
  return (
    <div style={{ width: '100%', height: '100%', padding: 18, borderRadius: 10, background: '#f8fafc', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', ...styleToCSS(el.style) }}>
      <Quote className="w-5 h-5 text-green-600 mb-2 opacity-60" />
      <div style={{ fontSize: 14, fontStyle: 'italic', color: '#1f2937', lineHeight: 1.5, flex: 1, overflow: 'hidden' }}>
        {c.quote || <span style={{ color: '#94a3b8' }}>Testimonial quote…</span>}
      </div>
      {(c.author || c.role || c.company) && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{c.author || 'Author'}</div>
          {(c.role || c.company) && (
            <div style={{ fontSize: 11, color: '#6b7280' }}>{[c.role, c.company].filter(Boolean).join(' · ')}</div>
          )}
        </div>
      )}
    </div>
  );
};

const TeamCardRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const members: any[] = (el.content as any)?.members || [];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, flexWrap: 'wrap', overflow: 'hidden', ...styleToCSS(el.style) }}>
      {members.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
          No team members yet — open inspector to add
        </div>
      )}
      {members.map((m: any) => (
        <div key={m.id || m.name} style={{ flex: '1 1 calc(33% - 8px)', minWidth: 110, padding: 10, background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          {m.photoUrl
            ? <img src={m.photoUrl} alt={m.name} style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover' }} />
            : <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontWeight: 700 }}>{(m.name || '?').slice(0, 1)}</div>
          }
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827', textAlign: 'center' }}>{m.name || 'Name'}</div>
          {m.role && <div style={{ fontSize: 11, color: '#16a34a' }}>{m.role}</div>}
        </div>
      ))}
    </div>
  );
};

const PricingCardRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const tiers: any[] = (el.content as any)?.tiers || [];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, ...styleToCSS(el.style) }}>
      {tiers.length === 0 && (
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 12, border: '1px dashed #cbd5e1', borderRadius: 8 }}>
          No pricing tiers — open inspector to add
        </div>
      )}
      {tiers.map((t: any) => (
        <div key={t.id || t.name} style={{ flex: 1, padding: 14, borderRadius: 10, background: '#fff', border: t.highlight ? '2px solid #16a34a' : '1px solid #e2e8f0', boxShadow: t.highlight ? '0 4px 12px rgba(22,163,74,0.12)' : 'none', display: 'flex', flexDirection: 'column', gap: 6, overflow: 'hidden' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{t.name || 'Tier'}</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>
            {t.price || '—'}{t.period && <span style={{ fontSize: 12, fontWeight: 500, color: '#6b7280' }}>/{t.period}</span>}
          </div>
          {Array.isArray(t.features) && (
            <ul style={{ listStyle: 'disc', paddingLeft: 16, marginTop: 4, fontSize: 11, color: '#475569' }}>
              {t.features.slice(0, 6).map((f: string, i: number) => <li key={i}>{f}</li>)}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
};

const ComparisonRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c: any = el.content || {};
  const cols: string[] = c.columns || [];
  const rows: any[]    = c.rows || [];
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'auto', ...styleToCSS(el.style) }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
        <thead>
          <tr>
            <th style={{ background: '#f1f5f9', padding: '6px 8px', border: '1px solid #e2e8f0', textAlign: 'left' }} />
            {cols.map((col, i) => (
              <th key={i} style={{ background: c.highlightColumn === i ? '#dcfce7' : '#f1f5f9', color: c.highlightColumn === i ? '#14532d' : '#0f172a', padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 700 }}>
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              <td style={{ padding: '6px 8px', border: '1px solid #e2e8f0', fontWeight: 600, background: '#ffffff' }}>{r.feature || ''}</td>
              {(r.values || []).map((v: string, i: number) => (
                <td key={i} style={{ padding: '6px 8px', border: '1px solid #e2e8f0', background: c.highlightColumn === i ? '#f0fdf4' : '#ffffff' }}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const SwotRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c: any = el.content || {};
  const cell = (label: string, items: string[] | undefined, bg: string, fg: string) => (
    <div style={{ background: bg, color: fg, padding: 10, borderRadius: 8, overflow: 'hidden' }}>
      <div style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: 0.05, marginBottom: 4 }}>{label}</div>
      <ul style={{ listStyle: 'disc', paddingLeft: 14, fontSize: 11 }}>
        {(items || []).slice(0, 4).map((it, i) => <li key={i}>{it}</li>)}
      </ul>
    </div>
  );
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: '1fr 1fr', gridTemplateRows: '1fr 1fr', gap: 8, ...styleToCSS(el.style) }}>
      {cell('Strengths',     c.strengths,    '#f0fdf4', '#14532d')}
      {cell('Weaknesses',    c.weaknesses,   '#fef2f2', '#7f1d1d')}
      {cell('Opportunities', c.opportunities,'#eff6ff', '#1e3a8a')}
      {cell('Threats',       c.threats,      '#fefce8', '#713f12')}
    </div>
  );
};

const FeatureGridRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c: any = el.content || {};
  const items: any[] = c.items || [];
  const cols = c.columns || 3;
  return (
    <div style={{ width: '100%', height: '100%', display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: 10, ...styleToCSS(el.style) }}>
      {items.map((it: any) => (
        <div key={it.id || it.title} style={{ padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#111827' }}>{it.title || 'Feature'}</div>
          {it.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 4 }}>{it.description}</div>}
        </div>
      ))}
    </div>
  );
};

const TimelineRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const items: any[] = (el.content as any)?.items || [];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, ...styleToCSS(el.style) }}>
      {items.map((it: any) => (
        <div key={it.id || it.title} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {it.date && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>{it.date}</div>}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>{it.title || 'Title'}</div>
          {it.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{it.description}</div>}
        </div>
      ))}
    </div>
  );
};

const RoadmapRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const phases: any[] = (el.content as any)?.phases || [];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, ...styleToCSS(el.style) }}>
      {phases.map((p: any) => (
        <div key={p.id || p.phase} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {p.period && <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>{p.period}</div>}
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 2 }}>{p.phase || 'Phase'}</div>
          <ul style={{ listStyle: 'disc', paddingLeft: 14, marginTop: 4, fontSize: 11, color: '#475569' }}>
            {(p.bullets || []).slice(0, 5).map((b: string, i: number) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      ))}
    </div>
  );
};

const ProcessStepsRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const steps: any[] = (el.content as any)?.steps || [];
  return (
    <div style={{ width: '100%', height: '100%', display: 'flex', gap: 10, ...styleToCSS(el.style) }}>
      {steps.map((s: any, i: number) => (
        <div key={s.id || s.title} style={{ flex: 1, padding: 10, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#16a34a' }}>{i + 1}</div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginTop: 4 }}>{s.title || 'Step'}</div>
          {s.description && <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{s.description}</div>}
        </div>
      ))}
    </div>
  );
};

const VideoPlaceholderRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c: any = el.content || {};
  if (c.posterUrl) {
    return (
      <div style={{ width: '100%', height: '100%', position: 'relative', borderRadius: 8, overflow: 'hidden', ...styleToCSS(el.style) }}>
        <img src={c.posterUrl} alt="video poster" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'rgba(0,0,0,0.6)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>▶</div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ width: '100%', height: '100%', background: '#0f172a', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8, fontSize: 13, gap: 8, ...styleToCSS(el.style) }}>
      <span style={{ fontSize: 20 }}>▶</span>
      <span>{c.caption || 'Video placeholder'}</span>
    </div>
  );
};

const EmbedPlaceholderRenderer: React.FC<{ el: SlideElementDTO }> = ({ el }) => {
  const c: any = el.content || {};
  return (
    <div style={{ width: '100%', height: '100%', background: '#f1f5f9', border: '2px dashed #cbd5e1', borderRadius: 8, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#64748b', gap: 4, ...styleToCSS(el.style) }}>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{c.providerLabel || 'Embedded media'}</div>
      {c.caption && <div style={{ fontSize: 11 }}>{c.caption}</div>}
    </div>
  );
};

// =============================================================================
//  Registry
// =============================================================================

export const ELEMENT_RENDERERS: Record<ElementType, React.FC<{ el: SlideElementDTO; pageNumber?: number; total?: number; familyId?: string }>> = {
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
  chart:  ChartRenderer,
  table:  TableRenderer,

  image:                    ImageRenderer,
  icon:                     IconRenderer,
  logo:                     LogoRenderer,
  videoPlaceholder:         VideoPlaceholderRenderer,
  embeddedMediaPlaceholder: EmbedPlaceholderRenderer,

  testimonial:  TestimonialRenderer,
  teamCard:     TeamCardRenderer,
  pricingCard:  PricingCardRenderer,
  comparison:   ComparisonRenderer,
  swot:         SwotRenderer,
  featureGrid:  FeatureGridRenderer,
  processSteps: ProcessStepsRenderer,
  timeline:     TimelineRenderer,
  roadmap:      RoadmapRenderer,

  shape:   ShapeRenderer,
  line:    LineRenderer,
  divider: DividerRenderer,
};

export function renderElement(el: SlideElementDTO, ctx: { pageNumber?: number; total?: number; familyId?: string } = {}) {
  const Renderer = ELEMENT_RENDERERS[el.type] || PlaceholderRenderer;
  return <Renderer el={el} pageNumber={ctx.pageNumber} total={ctx.total} familyId={ctx.familyId} />;
}
