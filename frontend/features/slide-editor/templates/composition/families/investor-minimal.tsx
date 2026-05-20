'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Investor Minimal — Swiss-grid, hairline accents, restrained typography
// =============================================================================

const INK     = '#0a0a0a';
const ACCENT  = '#b04a2e';
const MUTED   = '#8a8377';

const Decor: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none">
    <line x1="60"  y1="60"  x2="180"  y2="60"  stroke={ACCENT} strokeWidth="3" />
    <line x1="60"  y1="660" x2="1220" y2="660" stroke={MUTED}  strokeWidth="0.5" />
  </svg>
);

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 36, right: 60, fontFamily: 'Inter, sans-serif', fontSize: 11, fontWeight: 500, color: MUTED, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
      {String(slideIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', bottom: 22, right: 60, fontFamily: 'Inter, sans-serif', fontSize: 10, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: 3 }}>
      Pitchonix
    </div>
  </>
);

const F = footerSlots();

export const INVESTOR_MINIMAL: TemplateFamily = {
  id:   'investor-minimal',
  name: 'Investor Minimal',
  category: 'Investor',
  theme: {
    primary: INK, accent: ACCENT, text: INK, muted: MUTED,
    surface: '#fafaf7', background: '#ffffff',
    fontHeading: '"Inter", sans-serif', fontBody: '"Inter", sans-serif',
  },
  typography: {
    perType: {
      heading:      { fontSize: 40, fontWeight: 700, lineHeight: 1.1, letterSpacing: -0.5, color: INK },
      subheading:   { fontSize: 15, fontWeight: 500, lineHeight: 1.4, color: MUTED },
      paragraph:    { fontSize: 13, fontWeight: 400, lineHeight: 1.55, color: '#2a2a2a' },
      caption:      { fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
      label:        { fontSize: 10, fontWeight: 700, color: ACCENT, letterSpacing: 2, textTransform: 'uppercase' },
      metric:       { fontSize: 40, fontWeight: 700, color: INK, letterSpacing: -1 },
      quote:        { fontSize: 22, fontWeight: 300, lineHeight: 1.35, color: INK },
      cta:          { fontSize: 13, fontWeight: 600, letterSpacing: 1, textTransform: 'uppercase' },
    },
  },
  chrome: { background: '#ffffff', decorations: Decor, overlays: Overlay },

  variants: [
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8,  y: 14, w: 30, h: 4 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8,  y: 30, w: 84, h: 26 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8,  y: 60, w: 70, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8,  y: 70, w: 70, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 76, fontWeight: 800, lineHeight: 0.95, letterSpacing: -2 } } },
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
      typography: { perType: { metric: { fontSize: 84, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3, color: ACCENT } } },
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
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: 64, w: 84, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: 72, w: 84, h: 16 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 112, fontWeight: 800, lineHeight: 0.95, letterSpacing: -3, color: INK } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 8, y: 32, w: 84, h: 22 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 8, y: 56, w: 84, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 8, y: 66, w: 70, h: 12 },
        { id: 'cta',      acceptsTypes: ['cta'],       x: 8, y: 82, w: 30, h: 6 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 88, fontWeight: 800, letterSpacing: -2 } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots(), ...F] },
  ],
};
