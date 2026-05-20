'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Crimson Dark Business — cinematic black + crimson, premium investor-grade
// =============================================================================

const INK     = '#0a0606';
const CRIMSON = '#dc2626';
const CRIMSON_D = '#7f1d1d';
const CREAM   = '#fef7ee';
const MUTED   = '#8b7a78';

const Decor: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <radialGradient id="crim-glow" cx="15%" cy="85%" r="55%">
        <stop offset="0%"   stopColor={CRIMSON_D} stopOpacity="0.55" />
        <stop offset="100%" stopColor={CRIMSON_D} stopOpacity="0" />
      </radialGradient>
      <radialGradient id="crim-glow2" cx="90%" cy="10%" r="45%">
        <stop offset="0%"   stopColor={CRIMSON} stopOpacity="0.18" />
        <stop offset="100%" stopColor={CRIMSON} stopOpacity="0" />
      </radialGradient>
      <linearGradient id="crim-strip" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%"   stopColor={CRIMSON} />
        <stop offset="100%" stopColor={CRIMSON_D} />
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill={INK} />
    <rect width="1280" height="720" fill="url(#crim-glow)" />
    <rect width="1280" height="720" fill="url(#crim-glow2)" />
    <rect x="0" y="0" width="1280" height="4" fill="url(#crim-strip)" />
    <rect x="60" y="685" width="220" height="2" fill={CRIMSON} />
  </svg>
);

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 20, right: 60, fontFamily: '"Playfair Display", Georgia, serif', fontSize: 13, fontWeight: 500, color: CREAM, letterSpacing: 4 }}>
      {String(slideIndex + 1).padStart(2, '0')} · {String(total).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', bottom: 22, right: 60, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 4, textTransform: 'uppercase' }}>
      Confidential
    </div>
  </>
);

const F = footerSlots();

export const CRIMSON_DARK_BUSINESS: TemplateFamily = {
  id:   'crimson-dark-business',
  name: 'Crimson Dark Business',
  category: 'Dark',
  theme: {
    primary: CRIMSON, secondary: CRIMSON_D, accent: '#fca5a5',
    text: CREAM, muted: MUTED, surface: '#1a0606', background: INK,
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody: 'Inter, system-ui, sans-serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 48, fontWeight: 700, lineHeight: 1.08, color: CREAM, letterSpacing: -1, fontFamily: '"Playfair Display", Georgia, serif' },
      subheading: { fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: '#fca5a5', letterSpacing: 2, textTransform: 'uppercase' },
      paragraph:  { fontSize: 14, fontWeight: 400, lineHeight: 1.55, color: '#e2cfcd' },
      caption:    { fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' },
      label:      { fontSize: 11, fontWeight: 700, color: CRIMSON, letterSpacing: 4, textTransform: 'uppercase' },
      metric:     { fontSize: 76, fontWeight: 800, color: CRIMSON, letterSpacing: -2 },
      quote:      { fontSize: 24, fontWeight: 400, lineHeight: 1.4, color: CREAM, fontFamily: '"Playfair Display", Georgia, serif' },
      cta:        { fontSize: 13, fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase' },
    },
  },
  chrome: { background: INK, decorations: Decor, overlays: Overlay },

  variants: [
    // ── Cover ──
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: 16, w: 40, h: 4 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: 30, w: 84, h: 28 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: 62, w: 70, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: 72, w: 70, h: 10 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 88, fontWeight: 700, lineHeight: 1.05, letterSpacing: -2, color: CREAM, fontFamily: '"Playfair Display", Georgia, serif' } } },
    },
    // ── Problem — asymmetric: text left, big stat right ──
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: RHYTHM.yLabel,    w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: RHYTHM.yTitle,    w: 54, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: RHYTHM.ySubtitle, w: 54, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: RHYTHM.yLead,     w: 54, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 8, y: RHYTHM.yBody, w: 54, h: RHYTHM.hBody },
        { id: 'sideStat', acceptsTypes: ['metric', 'kpi'],    x: 66, y: 28, w: 28, h: 36 },
        ...F,
      ],
    },
    // ── Solution ──
    { matches: ['solution'],  slots: [...rhythmSlots({ bodyId: 'features', bodyAccepts: ['featureGrid', 'bulletList', 'numberedList', 'paragraph'] }), ...F] },
    // ── Market ──
    { matches: ['market_opportunity', 'market', 'tam_sam_som'], slots: [
      ...rhythmSlots({ noBody: true }),
      ...splitBodySlots({ leftId: 'chart', leftAccepts: ['chart'], leftW: 50, rightId: 'rightBody', rightAccepts: ['bulletList', 'paragraph'], rightW: 30 }),
      ...F,
    ]},
    // ── Business Model ──
    { matches: ['business_model', 'revenue_streams'], slots: [...rhythmSlots({ bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison', 'bulletList', 'paragraph'] }), ...F] },
    // ── Traction ──
    { matches: ['traction', 'customer_segment'], slots: [
      ...rhythmSlots({ noBody: true }),
      ...splitBodySlots({ leftId: 'chart', leftAccepts: ['chart'], leftW: 48, rightId: 'metrics', rightAccepts: ['featureGrid', 'kpi', 'metric', 'bulletList'], rightW: 32 }),
      ...F,
    ]},
    // ── Team ──
    { matches: ['team'], slots: [...rhythmSlots({ bodyId: 'team', bodyAccepts: ['teamCard'] }), ...F] },
    // ── Competition ──
    { matches: ['competition', 'competitor_analysis', 'competitive_advantage'], slots: [...rhythmSlots({ bodyId: 'comparison', bodyAccepts: ['comparison', 'table', 'featureGrid'] }), ...F] },
    // ── Roadmap ──
    { matches: ['roadmap', 'product_roadmap'], slots: [...rhythmSlots({ bodyId: 'roadmap', bodyAccepts: ['roadmap', 'timeline', 'processSteps', 'bulletList'] }), ...F] },
    // ── Pricing ──
    { matches: ['pricing'], slots: [...rhythmSlots({ bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison'] }), ...F] },
    // ── Ask ──
    {
      matches: ['ask', 'investment_ask', 'use_of_funds'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: RHYTHM.yLabel, w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: RHYTHM.yTitle, w: 84, h: RHYTHM.hTitle },
        { id: 'amount',   acceptsTypes: ['metric'],           x: 8, y: 28, w: 84, h: 32 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: 64, w: 84, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: 72, w: 84, h: 16 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 132, fontWeight: 800, color: CRIMSON, lineHeight: 0.95, letterSpacing: -4 } } },
    },
    // ── Closing ──
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 8, y: 32, w: 84, h: 24 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 8, y: 58, w: 84, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 8, y: 68, w: 70, h: 10 },
        { id: 'cta',      acceptsTypes: ['cta'],       x: 8, y: 82, w: 30, h: 6 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 100, fontWeight: 700, color: CREAM, letterSpacing: -2, fontFamily: '"Playfair Display", Georgia, serif' } } },
    },
    // ── Default / executive summary ──
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots(), ...F] },
  ],
};
