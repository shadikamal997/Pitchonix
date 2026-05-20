'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Startup Gradient — violet→pink gradient, bold caps, geometric shapes
// =============================================================================

const VIOLET = '#7c3aed';
const PINK   = '#ec4899';
const LIME   = '#84cc16';
const INK    = '#0f0a26';
const WHITE  = '#ffffff';

const GradientBg: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <linearGradient id="sg-bg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor={VIOLET} />
        <stop offset="60%"  stopColor="#a855f7" />
        <stop offset="100%" stopColor={PINK} />
      </linearGradient>
      <radialGradient id="sg-glow" cx="80%" cy="20%" r="60%">
        <stop offset="0%"   stopColor="#ffffff" stopOpacity="0.35" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </radialGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#sg-bg)" />
    <rect width="1280" height="720" fill="url(#sg-glow)" />
    <circle cx="1140" cy="120" r="48" fill="none" stroke={WHITE} strokeWidth="1.5" opacity="0.5" />
    <circle cx="160"  cy="600" r="32" fill={LIME} opacity="0.7" />
    <rect x="60" y="60" width="6" height="120" fill={WHITE} opacity="0.6" />
  </svg>
);

const Decor: React.FC = () => <GradientBg />;

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 32, right: 60, padding: '5px 12px', background: WHITE, color: INK, borderRadius: 999, fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 11, fontWeight: 800, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
      {String(slideIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', bottom: 28, left: 60, fontFamily: '"Space Grotesk", Inter, sans-serif', fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: 4, textTransform: 'uppercase' }}>
      ★ Pitchonix
    </div>
  </>
);

const F = footerSlots();

export const STARTUP_GRADIENT: TemplateFamily = {
  id:   'startup-gradient',
  name: 'Startup Gradient',
  category: 'Vibrant',
  theme: {
    primary: WHITE, secondary: PINK, accent: LIME, text: WHITE,
    muted: '#e9d5ff', surface: '#f5f3ff', background: VIOLET,
    fontHeading: '"Space Grotesk", "Inter", sans-serif',
    fontBody: 'Inter, system-ui, sans-serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 56, fontWeight: 900, lineHeight: 1.02, color: WHITE, letterSpacing: -1.5, textTransform: 'uppercase' as any },
      subheading: { fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: LIME, letterSpacing: 3, textTransform: 'uppercase' as any },
      paragraph:  { fontSize: 14, fontWeight: 500, lineHeight: 1.55, color: '#f3e8ff' },
      caption:    { fontSize: 10, fontWeight: 700, color: WHITE, letterSpacing: 4, textTransform: 'uppercase' as any },
      label:      { fontSize: 11, fontWeight: 800, color: LIME, letterSpacing: 4, textTransform: 'uppercase' as any },
      metric:     { fontSize: 84, fontWeight: 900, color: WHITE, letterSpacing: -3 },
      quote:      { fontSize: 26, fontWeight: 700, lineHeight: 1.2, color: WHITE, textTransform: 'uppercase' as any, letterSpacing: -1 },
      cta:        { fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as any },
    },
  },
  chrome: { background: VIOLET, decorations: Decor, overlays: Overlay },

  variants: [
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: 14, w: 30, h: 5 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: 28, w: 84, h: 36 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: 68, w: 60, h: 6 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: 76, w: 70, h: 10 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 108, fontWeight: 900, lineHeight: 0.92, color: WHITE, letterSpacing: -3, textTransform: 'uppercase' as any } } },
    },
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: RHYTHM.yLabel,    w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: RHYTHM.yTitle,    w: 52, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: RHYTHM.ySubtitle, w: 52, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: RHYTHM.yLead,     w: 52, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 8, y: RHYTHM.yBody, w: 52, h: RHYTHM.hBody },
        { id: 'sideStat', acceptsTypes: ['metric', 'kpi'],    x: 66, y: 28, w: 28, h: 36 },
        ...F,
      ],
    },
    { matches: ['solution'],  slots: [...rhythmSlots({ bodyId: 'features', bodyAccepts: ['featureGrid', 'bulletList', 'numberedList', 'paragraph'] }), ...F] },
    { matches: ['market_opportunity', 'market', 'tam_sam_som'], slots: [
      ...rhythmSlots({ noBody: true }),
      ...splitBodySlots({ leftId: 'chart', leftAccepts: ['chart'], leftW: 50, rightId: 'rightBody', rightAccepts: ['bulletList', 'paragraph'], rightW: 30 }),
      ...F,
    ]},
    { matches: ['business_model', 'revenue_streams'], slots: [...rhythmSlots({ bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison', 'bulletList', 'paragraph'] }), ...F] },
    { matches: ['traction', 'customer_segment'], slots: [
      ...rhythmSlots({ noBody: true }),
      ...splitBodySlots({ leftId: 'chart', leftAccepts: ['chart'], leftW: 48, rightId: 'metrics', rightAccepts: ['featureGrid', 'kpi', 'metric', 'bulletList'], rightW: 32 }),
      ...F,
    ]},
    { matches: ['team'], slots: [...rhythmSlots({ bodyId: 'team', bodyAccepts: ['teamCard'] }), ...F] },
    { matches: ['competition', 'competitor_analysis', 'competitive_advantage'], slots: [...rhythmSlots({ bodyId: 'comparison', bodyAccepts: ['comparison', 'table', 'featureGrid'] }), ...F] },
    { matches: ['roadmap', 'product_roadmap'], slots: [...rhythmSlots({ bodyId: 'roadmap', bodyAccepts: ['roadmap', 'timeline', 'processSteps', 'bulletList'] }), ...F] },
    { matches: ['pricing'], slots: [...rhythmSlots({ bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison'] }), ...F] },
    {
      matches: ['ask', 'investment_ask', 'use_of_funds'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: RHYTHM.yLabel, w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: RHYTHM.yTitle, w: 84, h: RHYTHM.hTitle },
        { id: 'amount',   acceptsTypes: ['metric'],           x: 8, y: 28, w: 84, h: 32 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: 64, w: 60, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: 72, w: 60, h: 14 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 144, fontWeight: 900, color: WHITE, lineHeight: 0.9, letterSpacing: -5 } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 8, y: 30, w: 84, h: 24 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 8, y: 56, w: 84, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 8, y: 66, w: 70, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 108, fontWeight: 900, color: WHITE, letterSpacing: -4, textTransform: 'uppercase' as any } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots(), ...F] },
  ],
};
