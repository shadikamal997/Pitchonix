'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Luxury Dark — black canvas, gold accents, generous space, serif display
// =============================================================================

const BG     = '#080706';
const GOLD   = '#d4af6f';
const CREAM  = '#f5edd9';
const MUTED  = '#8a7b5c';

const RadialBg: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <radialGradient id="lux-vignette" cx="50%" cy="35%" r="65%">
        <stop offset="0%"   stopColor="#1c1812" />
        <stop offset="100%" stopColor={BG} />
      </radialGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#lux-vignette)" />
  </svg>
);

const CornerFrames: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    {[
      { x1: 36, y1: 36, x2: 96, y2: 36 }, { x1: 36, y1: 36, x2: 36, y2: 96 },
      { x1: 1244, y1: 36, x2: 1184, y2: 36 }, { x1: 1244, y1: 36, x2: 1244, y2: 96 },
      { x1: 36, y1: 684, x2: 96, y2: 684 }, { x1: 36, y1: 684, x2: 36, y2: 624 },
      { x1: 1244, y1: 684, x2: 1184, y2: 684 }, { x1: 1244, y1: 684, x2: 1244, y2: 624 },
    ].map((c, i) => <line key={i} {...c} stroke={GOLD} strokeWidth="1.5" />)}
  </svg>
);

const Decor: React.FC = () => (<><RadialBg /><CornerFrames /></>);

function toRoman(n: number): string {
  const map: [number, string][] = [
    [1000, 'M'], [900, 'CM'], [500, 'D'], [400, 'CD'], [100, 'C'], [90, 'XC'],
    [50, 'L'], [40, 'XL'], [10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I'],
  ];
  let r = '';
  for (const [v, s] of map) { while (n >= v) { r += s; n -= v; } }
  return r || 'I';
}

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex }) => (
  <>
    <div style={{ position: 'absolute', top: 28, left: '50%', transform: 'translateX(-50%)', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 15, fontWeight: 400, color: GOLD, letterSpacing: 4 }}>
      {toRoman(slideIndex + 1)}
    </div>
    <div style={{ position: 'absolute', bottom: 32, left: '50%', transform: 'translateX(-50%)', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 6, textTransform: 'uppercase' }}>
      Pitchonix · Confidential
    </div>
  </>
);

const F = footerSlots();

export const LUXURY_DARK: TemplateFamily = {
  id:   'luxury-dark',
  name: 'Luxury Dark',
  category: 'Luxury',
  theme: {
    primary: GOLD, accent: CREAM, text: CREAM, muted: MUTED,
    surface: '#16120c', background: BG,
    fontHeading: '"Playfair Display", "Cormorant Garamond", Georgia, serif',
    fontBody:    'Lora, Georgia, serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 52, fontWeight: 700, lineHeight: 1.1, color: CREAM, letterSpacing: -1, fontFamily: '"Playfair Display", Georgia, serif' },
      subheading: { fontSize: 14, fontWeight: 500, lineHeight: 1.4, color: GOLD, letterSpacing: 4, textTransform: 'uppercase' },
      paragraph:  { fontSize: 14, fontWeight: 400, lineHeight: 1.7, color: '#d6cbb5' },
      label:      { fontSize: 11, fontWeight: 600, color: GOLD, letterSpacing: 4, textTransform: 'uppercase' },
      caption:    { fontSize: 10, fontWeight: 400, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' },
      metric:     { fontSize: 72, fontWeight: 800, color: GOLD, letterSpacing: -2 },
      quote:      { fontSize: 24, fontWeight: 300, lineHeight: 1.4, color: CREAM, fontFamily: '"Playfair Display", Georgia, serif' },
      cta:        { fontSize: 13, fontWeight: 600, letterSpacing: 3, textTransform: 'uppercase' },
    },
  },
  chrome: { background: BG, decorations: Decor, overlays: Overlay },

  variants: [
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 35, y: 16, w: 30, h: 4 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 10, y: 30, w: 80, h: 26 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 10, y: 60, w: 80, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 10, y: 70, w: 80, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 92, fontWeight: 800, lineHeight: 1.0, letterSpacing: -2, color: CREAM, fontFamily: '"Playfair Display", Georgia, serif' } } },
    },
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 10, y: RHYTHM.yLabel,    w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 10, y: RHYTHM.yTitle,    w: 50, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 10, y: RHYTHM.ySubtitle, w: 50, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 10, y: RHYTHM.yLead,     w: 50, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 10, y: RHYTHM.yBody, w: 50, h: RHYTHM.hBody },
        { id: 'sideStat', acceptsTypes: ['metric', 'kpi'],    x: 64, y: 28, w: 26, h: 36 },
        ...F,
      ],
    },
    { matches: ['solution'],  slots: [...rhythmSlots({ x: 10, w: 80, bodyId: 'features', bodyAccepts: ['featureGrid', 'bulletList', 'numberedList', 'paragraph'] }), ...F] },
    { matches: ['market_opportunity', 'market', 'tam_sam_som'], slots: [
      ...rhythmSlots({ x: 10, w: 80, noBody: true }),
      ...splitBodySlots({ x: 10, leftId: 'chart', leftAccepts: ['chart'], leftW: 48, rightId: 'rightBody', rightAccepts: ['bulletList', 'paragraph'], rightW: 28 }),
      ...F,
    ]},
    { matches: ['business_model', 'revenue_streams'], slots: [...rhythmSlots({ x: 10, w: 80, bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison', 'bulletList', 'paragraph'] }), ...F] },
    { matches: ['traction', 'customer_segment'], slots: [
      ...rhythmSlots({ x: 10, w: 80, noBody: true }),
      ...splitBodySlots({ x: 10, leftId: 'chart', leftAccepts: ['chart'], leftW: 46, rightId: 'metrics', rightAccepts: ['featureGrid', 'kpi', 'metric', 'bulletList'], rightW: 30 }),
      ...F,
    ]},
    { matches: ['team'], slots: [...rhythmSlots({ x: 10, w: 80, bodyId: 'team', bodyAccepts: ['teamCard'] }), ...F] },
    { matches: ['competition', 'competitor_analysis', 'competitive_advantage'], slots: [...rhythmSlots({ x: 10, w: 80, bodyId: 'comparison', bodyAccepts: ['comparison', 'table', 'featureGrid'] }), ...F] },
    { matches: ['roadmap', 'product_roadmap'], slots: [...rhythmSlots({ x: 10, w: 80, bodyId: 'roadmap', bodyAccepts: ['roadmap', 'timeline', 'processSteps', 'bulletList'] }), ...F] },
    { matches: ['pricing'], slots: [...rhythmSlots({ x: 10, w: 80, bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison'] }), ...F] },
    {
      matches: ['ask', 'investment_ask', 'use_of_funds'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 10, y: RHYTHM.yLabel, w: 80, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 10, y: RHYTHM.yTitle, w: 80, h: RHYTHM.hTitle },
        { id: 'amount',   acceptsTypes: ['metric'],           x: 10, y: 28, w: 80, h: 30 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 10, y: 62, w: 80, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 20, y: 72, w: 60, h: 14 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 148, fontWeight: 800, color: GOLD, lineHeight: 0.95, letterSpacing: -4 } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 10, y: 32, w: 80, h: 22 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 10, y: 56, w: 80, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 10, y: 66, w: 80, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 112, fontWeight: 700, color: CREAM, letterSpacing: -2, fontFamily: '"Playfair Display", Georgia, serif' } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots({ x: 10, w: 80 }), ...F] },
  ],
};
