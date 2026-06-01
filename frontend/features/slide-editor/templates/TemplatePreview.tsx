'use client';

import React from 'react';
import type { TemplateSpec } from './registry';

// =============================================================================
//  TemplatePreview — rich multi-panel preview of a template's visual identity.
//
//  Three rendering tiers by width:
//    < 80px   → compact color-swatch thumbnail (sidebar list item)
//    80-239px → single cover-slide with decorative shapes
//   >= 240px  → large cover + 3 content mini-slides (gallery detail view)
// =============================================================================

// ── Background helper ────────────────────────────────────────────────────────

function bgStyle(bg: any): React.CSSProperties {
  if (!bg) return { background: '#fff' };
  if (bg.type === 'solid') return { background: bg.color || '#fff' };
  if (bg.type === 'gradient' && bg.gradient) {
    const stops = (bg.gradient.stops || [])
      .map((s: any) => `${s.color} ${Math.round((s.offset ?? 0) * 100)}%`)
      .join(', ');
    if (bg.gradient.kind === 'radial')
      return { background: `radial-gradient(circle, ${stops})` };
    return { background: `linear-gradient(${bg.gradient.angle ?? 180}deg, ${stops})` };
  }
  if (bg.type === 'image' && bg.image?.src)
    return { background: `url(${bg.image.src}) center/cover` };
  return { background: '#fff' };
}

// ── Visual motif ─────────────────────────────────────────────────────────────

type Motif = 'angular' | 'gradient' | 'editorial' | 'minimal' | 'luxury' | 'structured';

function getMotif(t: TemplateSpec): Motif {
  switch (t.category) {
    case 'Dark':
    case 'Tech':
      return 'angular';
    case 'Vibrant':
    case 'Education':      // courses are energetic → bold circles
      return 'gradient';
    case 'Editorial':
    case 'Investor':       // warm editorial layouts suit investor decks
      return 'editorial';
    case 'Minimal':
    case 'Healthcare':     // clinical cleanliness maps to minimal
      return 'minimal';
    case 'Luxury':
      return 'luxury';
    default:               // Business, Sustainability
      return 'structured';
  }
}

// ── Decorative overlays (pure CSS — no images) ───────────────────────────────

const AngularDecor: React.FC<{ c: TemplateSpec['theme']; w: number; h: number }> = ({ c, w, h }) => (
  <>
    {/* Large triangle top-right */}
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: h * 1.15, height: h * 1.15,
      background: c.primary, opacity: 0.18,
      clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
    }} />
    {/* Inner triangle top-right */}
    <div style={{
      position: 'absolute', top: 0, right: 0,
      width: h * 0.6, height: h * 0.6,
      background: c.accent, opacity: 0.14,
      clipPath: 'polygon(100% 0, 100% 100%, 0 0)',
    }} />
    {/* Bottom-left accent bar */}
    <div style={{
      position: 'absolute', bottom: 0, left: 0,
      width: w * 0.36, height: 5,
      background: c.accent,
    }} />
  </>
);

const GradientDecor: React.FC<{ c: TemplateSpec['theme']; w: number; h: number }> = ({ c, w, h }) => (
  <>
    {/* Large circle top-right */}
    <div style={{
      position: 'absolute', top: -h * 0.38, right: -w * 0.12,
      width: h * 1.65, height: h * 1.65,
      borderRadius: '50%',
      background: c.secondary || c.primary, opacity: 0.14,
    }} />
    {/* Small accent circle bottom-left */}
    <div style={{
      position: 'absolute', bottom: -h * 0.22, left: w * 0.03,
      width: h * 0.6, height: h * 0.6,
      borderRadius: '50%',
      background: c.accent, opacity: 0.22,
    }} />
    {/* Medium circle mid-right */}
    <div style={{
      position: 'absolute', top: h * 0.3, right: w * 0.1,
      width: h * 0.45, height: h * 0.45,
      borderRadius: '50%',
      background: c.primary, opacity: 0.1,
    }} />
  </>
);

const EditorialDecor: React.FC<{ c: TemplateSpec['theme']; w: number; h: number }> = ({ c, w, h }) => (
  <>
    {/* Photo placeholder — right column */}
    <div style={{
      position: 'absolute', top: h * 0.09, right: w * 0.06,
      width: w * 0.35, height: h * 0.82,
      background: 'linear-gradient(140deg, #3a3a3a 0%, #6a6a6a 100%)',
      borderRadius: 3, opacity: 0.32,
    }} />
    {/* Thin accent bar bottom */}
    <div style={{
      position: 'absolute', bottom: 0, left: 0,
      width: w * 0.52, height: 4,
      background: c.primary,
    }} />
    {/* Horizontal rule mid-left */}
    <div style={{
      position: 'absolute', top: h * 0.62, left: w * 0.07,
      width: w * 0.42, height: 1,
      background: c.muted, opacity: 0.5,
    }} />
  </>
);

const MinimalDecor: React.FC<{ c: TemplateSpec['theme']; w: number; h: number }> = ({ c, w, h }) => (
  <>
    {/* Top accent strip */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 6,
      background: c.accent,
    }} />
    {/* Thin vertical rule */}
    <div style={{
      position: 'absolute', top: h * 0.2, bottom: h * 0.2, left: w * 0.48,
      width: 1,
      background: c.primary, opacity: 0.18,
    }} />
    {/* Small square accent */}
    <div style={{
      position: 'absolute', bottom: h * 0.14, right: w * 0.07,
      width: h * 0.12, height: h * 0.12,
      background: c.primary, opacity: 0.22,
    }} />
  </>
);

const LuxuryDecor: React.FC<{ c: TemplateSpec['theme']; w: number; h: number }> = ({ c, w, h }) => (
  <>
    {/* Inset gold frame */}
    <div style={{
      position: 'absolute', top: h * 0.07, left: w * 0.05, right: w * 0.05, bottom: h * 0.07,
      border: `1.5px solid ${c.accent}`,
      opacity: 0.22,
    }} />
    {/* Corner dots */}
    {([
      [w * 0.05, h * 0.07],
      [w * 0.05, h * 0.93],
      [w * 0.95, h * 0.07],
      [w * 0.95, h * 0.93],
    ] as [number, number][]).map(([x, y], i) => (
      <div key={i} style={{
        position: 'absolute', left: x - 3, top: y - 3,
        width: 6, height: 6, borderRadius: '50%',
        background: c.accent, opacity: 0.55,
      }} />
    ))}
    {/* Bottom accent line */}
    <div style={{
      position: 'absolute', bottom: h * 0.12, left: w * 0.08,
      width: w * 0.16, height: 2,
      background: c.accent,
    }} />
  </>
);

const StructuredDecor: React.FC<{ c: TemplateSpec['theme']; w: number; h: number }> = ({ c, w, h }) => (
  <>
    {/* Left accent column */}
    <div style={{
      position: 'absolute', top: 0, left: 0, bottom: 0,
      width: w * 0.052,
      background: c.primary, opacity: 0.92,
    }} />
    {/* Top header band */}
    <div style={{
      position: 'absolute', top: 0, left: w * 0.052, right: 0,
      height: h * 0.056,
      background: c.primary, opacity: 0.82,
    }} />
    {/* Accent block bottom-right */}
    <div style={{
      position: 'absolute', right: w * 0.06, bottom: h * 0.1,
      width: w * 0.24, height: h * 0.3,
      background: c.accent, opacity: 0.5,
      borderRadius: 3,
    }} />
  </>
);

function Decor({ tpl, w, h }: { tpl: TemplateSpec; w: number; h: number }) {
  const c = tpl.theme;
  const m = getMotif(tpl);
  switch (m) {
    case 'angular':    return <AngularDecor    c={c} w={w} h={h} />;
    case 'gradient':   return <GradientDecor   c={c} w={w} h={h} />;
    case 'editorial':  return <EditorialDecor  c={c} w={w} h={h} />;
    case 'minimal':    return <MinimalDecor    c={c} w={w} h={h} />;
    case 'luxury':     return <LuxuryDecor     c={c} w={w} h={h} />;
    case 'structured': return <StructuredDecor c={c} w={w} h={h} />;
    default:           return null;
  }
}

// ── Cover slide ───────────────────────────────────────────────────────────────

const CoverSlide: React.FC<{ tpl: TemplateSpec; w: number; h: number }> = ({ tpl, w, h }) => {
  const c = tpl.theme;
  const cover = tpl.blueprint.background.cover || c.defaultBackground;
  const m = getMotif(tpl);
  const textLeft = m === 'structured' ? w * 0.10 : w * 0.07;
  // Heading block width as a fraction of slide width — narrower where shapes occupy space
  const headingFrac = m === 'editorial' ? 0.46 : m === 'angular' ? 0.52 : 0.63;

  return (
    <div style={{ width: w, height: h, ...bgStyle(cover), position: 'relative', overflow: 'hidden' }}>
      <Decor tpl={tpl} w={w} h={h} />

      {/* Main heading bar */}
      <div style={{
        position: 'absolute',
        top: h * 0.24, left: textLeft,
        width: w * headingFrac,
        height: h * 0.155,
        background: c.text, opacity: 0.88, borderRadius: 2,
      }} />
      {/* Subheading */}
      <div style={{
        position: 'absolute',
        top: h * 0.46, left: textLeft,
        width: w * 0.42,
        height: h * 0.07,
        background: c.muted, opacity: 0.6, borderRadius: 1,
      }} />
      {/* Small detail line */}
      <div style={{
        position: 'absolute',
        top: h * 0.58, left: textLeft,
        width: w * 0.22,
        height: h * 0.038,
        background: c.muted, opacity: 0.35, borderRadius: 1,
      }} />

      {/* Font hint */}
      <div style={{
        position: 'absolute', bottom: 5, right: 8,
        fontSize: Math.max(7, w * 0.022),
        color: c.muted, fontFamily: c.fontHeading, opacity: 0.58,
        lineHeight: 1,
      }}>
        Aa
      </div>
    </div>
  );
};

// ── Content slide (text + accent block) ──────────────────────────────────────

const ContentSlide: React.FC<{ tpl: TemplateSpec; w: number; h: number }> = ({ tpl, w, h }) => {
  const c = tpl.theme;
  const bg = bgStyle(c.defaultBackground);
  return (
    <div style={{ width: w, height: h, ...bg, position: 'relative', overflow: 'hidden', borderRadius: 3, border: '1px solid rgba(0,0,0,0.07)' }}>
      {/* Top accent bar */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.primary, opacity: 0.88 }} />
      {/* Heading */}
      <div style={{ position: 'absolute', top: '15%', left: '7%', right: '32%', height: 3, background: c.text, opacity: 0.82 }} />
      {/* Body lines */}
      {([0.32, 0.42, 0.52, 0.62, 0.72] as number[]).map((y, i) => (
        <div key={i} style={{
          position: 'absolute', left: '7%', right: i % 2 === 0 ? '14%' : '28%',
          top: `${y * 100}%`, height: 2,
          background: c.muted, opacity: 0.42,
        }} />
      ))}
      {/* Accent block right */}
      <div style={{
        position: 'absolute', right: '7%', top: '22%', bottom: '16%', width: '22%',
        background: c.accent, opacity: 0.5, borderRadius: 2,
      }} />
    </div>
  );
};

// ── Chart slide (bar chart mockup) ───────────────────────────────────────────

const ChartSlide: React.FC<{ tpl: TemplateSpec; w: number; h: number }> = ({ tpl, w, h }) => {
  const c = tpl.theme;
  const bg = bgStyle(c.defaultBackground);
  const bars = [0.68, 0.45, 0.88, 0.55, 0.72, 0.38];
  return (
    <div style={{ width: w, height: h, ...bg, position: 'relative', overflow: 'hidden', borderRadius: 3, border: '1px solid rgba(0,0,0,0.07)' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: c.primary, opacity: 0.88 }} />
      {/* Heading */}
      <div style={{ position: 'absolute', top: '14%', left: '8%', right: '42%', height: 3, background: c.text, opacity: 0.75 }} />
      {/* Bars */}
      {bars.map((bh, i) => (
        <div key={i} style={{
          position: 'absolute',
          bottom: '15%',
          left: `${8 + i * 14.5}%`,
          width: '10%',
          height: `${bh * 52}%`,
          background: i % 2 === 0 ? c.primary : c.accent,
          opacity: 0.78,
          borderRadius: '2px 2px 0 0',
        }} />
      ))}
      {/* Baseline */}
      <div style={{ position: 'absolute', bottom: '15%', left: '7%', right: '7%', height: 1, background: c.muted, opacity: 0.4 }} />
    </div>
  );
};

// ── Closing slide ─────────────────────────────────────────────────────────────

const ClosingSlide: React.FC<{ tpl: TemplateSpec; w: number; h: number }> = ({ tpl, w, h }) => {
  const c = tpl.theme;
  const closing = tpl.blueprint.background.closing || c.defaultBackground;
  return (
    <div style={{ width: w, height: h, ...bgStyle(closing), position: 'relative', overflow: 'hidden', borderRadius: 3, border: '1px solid rgba(0,0,0,0.07)' }}>
      {/* Center dot */}
      <div style={{
        position: 'absolute', top: '22%', left: '50%', transform: 'translateX(-50%)',
        width: 8, height: 8, borderRadius: '50%',
        background: c.accent, opacity: 0.75,
      }} />
      {/* Heading */}
      <div style={{ position: 'absolute', top: '38%', left: '18%', right: '18%', height: 4, background: c.text, opacity: 0.82, borderRadius: 2 }} />
      {/* Subline */}
      <div style={{ position: 'absolute', top: '53%', left: '28%', right: '28%', height: 2, background: c.muted, opacity: 0.5, borderRadius: 1 }} />
      {/* Tiny accent line */}
      <div style={{ position: 'absolute', bottom: '18%', left: '42%', right: '42%', height: 2, background: c.accent, opacity: 0.6, borderRadius: 1 }} />
    </div>
  );
};

// ── Public component ──────────────────────────────────────────────────────────

interface Props {
  template: TemplateSpec;
  width?:   number;
}

export const TemplatePreview: React.FC<Props> = ({ template, width = 200 }) => {
  const h = Math.round((width * 9) / 16);
  const c = template.theme;
  const cover = template.blueprint.background.cover || c.defaultBackground;

  // ─ Compact thumbnail (sidebar list) ─
  if (width < 80) {
    return (
      <div
        className="rounded overflow-hidden border border-slate-200 shadow-sm flex-shrink-0"
        style={{ width, height: h, ...bgStyle(cover), position: 'relative', overflow: 'hidden' }}
      >
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 4, background: c.primary, opacity: 0.95 }} />
        <div style={{ position: 'absolute', top: 8, right: 5, width: '22%', height: '38%', background: c.accent, opacity: 0.62, borderRadius: 2 }} />
        <div style={{ position: 'absolute', bottom: 9, left: 5, right: 5, height: 3, background: c.text, opacity: 0.72, borderRadius: 1 }} />
        <div style={{ position: 'absolute', bottom: 4, left: 5, width: '40%', height: 2, background: c.muted, opacity: 0.45, borderRadius: 1 }} />
      </div>
    );
  }

  // ─ Medium: single cover with motif shapes ─
  if (width < 240) {
    return (
      <div
        className="rounded-md overflow-hidden shadow-sm border border-slate-200"
        style={{ width, height: h }}
      >
        <CoverSlide tpl={template} w={width} h={h} />
      </div>
    );
  }

  // ─ Large: cover + 3 content mini-slides ─
  const GAP = 6;
  const miniW = Math.floor((width - GAP * 2) / 3);
  const miniH = Math.round((miniW * 9) / 16);

  return (
    <div className="rounded-lg overflow-hidden shadow-lg border border-slate-200" style={{ width }}>
      {/* Main cover */}
      <CoverSlide tpl={template} w={width} h={h} />

      {/* Three sample slides */}
      <div style={{
        display: 'flex', gap: GAP, padding: GAP,
        background: '#f1f5f9', borderTop: '1px solid #e2e8f0',
      }}>
        <ContentSlide tpl={template} w={miniW} h={miniH} />
        <ChartSlide   tpl={template} w={miniW} h={miniH} />
        <ClosingSlide tpl={template} w={miniW} h={miniH} />
      </div>

      {/* Template name label strip */}
      <div style={{
        padding: '4px 8px',
        background: '#f8fafc', borderTop: '1px solid #e2e8f0',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11, fontWeight: 600, color: '#334155', fontFamily: c.fontHeading }}>
          {template.name}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {([c.primary, c.accent, c.surface, c.background] as string[]).map((col, i) => (
            <div key={i} style={{
              width: 10, height: 10, borderRadius: '50%',
              background: col, border: '1px solid rgba(0,0,0,0.12)',
            }} />
          ))}
        </div>
      </div>
    </div>
  );
};
