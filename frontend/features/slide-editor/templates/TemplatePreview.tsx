'use client';

import React from 'react';
import type { TemplateSpec } from './registry';

// =============================================================================
//  TemplatePreview — a tiny mock slide showing the template's visual identity.
//  Used as the thumbnail in the gallery. Pure CSS, no real slide fetch needed.
// =============================================================================

interface Props {
  template: TemplateSpec;
  width?:   number;          // pixels
}

export const TemplatePreview: React.FC<Props> = ({ template, width = 200 }) => {
  const h = (width * 9) / 16;
  const t = template.theme;
  const cover = template.blueprint.background.cover || t.defaultBackground;

  const bgStyle: React.CSSProperties = bgToCSS(cover);

  return (
    <div
      className="rounded-md overflow-hidden shadow-sm border border-slate-200"
      style={{ width, height: h, ...bgStyle, position: 'relative' }}
    >
      {/* Decorative top accent */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 4,
        background: t.primary,
        opacity: 0.95,
      }} />

      {/* Heading mock */}
      <div style={{
        position: 'absolute',
        top: h * 0.22,
        left: width * 0.07,
        right: width * 0.07,
        height: h * 0.18,
        background: t.text,
        opacity: 0.85,
        borderRadius: 1,
      }} />

      {/* Subheading mock */}
      <div style={{
        position: 'absolute',
        top: h * 0.45,
        left: width * 0.07,
        width: width * 0.55,
        height: h * 0.08,
        background: t.muted,
        opacity: 0.7,
        borderRadius: 1,
      }} />

      {/* Accent block (right) */}
      <div style={{
        position: 'absolute',
        right: width * 0.07,
        top:   h * 0.6,
        width: width * 0.18,
        height: h * 0.25,
        background: t.accent,
        opacity: 0.95,
        borderRadius: 4,
      }} />

      {/* Body lines (left) */}
      {[0, 1, 2].map((i) => (
        <div key={i} style={{
          position: 'absolute',
          left: width * 0.07,
          right: width * 0.32,
          top: h * (0.62 + i * 0.07),
          height: 2,
          background: t.muted,
          opacity: 0.5,
        }} />
      ))}

      {/* Font hint */}
      <div style={{
        position: 'absolute', bottom: 4, left: 6,
        fontSize: 7, color: t.muted,
        fontFamily: t.fontHeading, opacity: 0.6,
      }}>
        Aa
      </div>
    </div>
  );
};

function bgToCSS(bg: any): React.CSSProperties {
  if (!bg) return { background: '#fff' };
  if (bg.type === 'solid')    return { background: bg.color || '#fff' };
  if (bg.type === 'gradient' && bg.gradient) {
    const stops = (bg.gradient.stops || []).map((s: any) => `${s.color} ${Math.round((s.offset ?? 0) * 100)}%`).join(', ');
    if (bg.gradient.kind === 'radial') return { background: `radial-gradient(circle, ${stops})` };
    return { background: `linear-gradient(${bg.gradient.angle ?? 180}deg, ${stops})` };
  }
  if (bg.type === 'image' && bg.image?.src) {
    return { background: `url(${bg.image.src}) center/cover` };
  }
  return { background: '#fff' };
}
