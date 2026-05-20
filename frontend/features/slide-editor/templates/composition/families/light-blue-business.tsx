'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Light Blue Business Marketing — clean white + blue panels, executive grade
// =============================================================================

const NAVY    = '#1e3a8a';
const BLUE    = '#1d4ed8';
const SKY     = '#38bdf8';
const PALE    = '#e0f2fe';
const INK     = '#0f172a';
const MUTED   = '#64748b';

const Decor: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    <rect x="0" y="0" width="128" height="720" fill={PALE} />
    <polygon points="1280,0 1280,140 1140,0" fill={SKY} opacity="0.35" />
    <polygon points="1280,40 1280,140 1180,40" fill={BLUE} opacity="0.55" />
    <polygon points="0,720 0,580 140,720" fill={SKY} opacity="0.30" />
    <line x1="160" y1="76" x2="280" y2="76" stroke={BLUE} strokeWidth="3" />
  </svg>
);

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 26, right: 60, fontFamily: '"Manrope", Inter, sans-serif', fontSize: 11, fontWeight: 600, color: NAVY, letterSpacing: 1, fontVariantNumeric: 'tabular-nums' }}>
      {String(slideIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', bottom: 24, right: 60, fontFamily: '"Manrope", Inter, sans-serif', fontSize: 10, fontWeight: 700, color: MUTED, letterSpacing: 3, textTransform: 'uppercase' }}>
      Pitchonix Business
    </div>
  </>
);

const F = footerSlots();

export const LIGHT_BLUE_BUSINESS: TemplateFamily = {
  id:   'light-blue-business-marketing',
  name: 'Light Blue Business Marketing',
  category: 'Business',
  theme: {
    primary: NAVY, secondary: BLUE, accent: SKY, text: INK, muted: MUTED,
    surface: PALE, background: '#ffffff',
    fontHeading: '"Manrope", "Inter", sans-serif', fontBody: 'Inter, system-ui, sans-serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 44, fontWeight: 800, lineHeight: 1.08, color: NAVY, letterSpacing: -1 },
      subheading: { fontSize: 15, fontWeight: 600, lineHeight: 1.4, color: BLUE, letterSpacing: 0.5 },
      paragraph:  { fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: '#1e293b' },
      caption:    { fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' },
      label:      { fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: 2, textTransform: 'uppercase' },
      metric:     { fontSize: 60, fontWeight: 800, color: NAVY, letterSpacing: -2 },
      quote:      { fontSize: 22, fontWeight: 500, lineHeight: 1.4, color: NAVY },
      cta:        { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
    },
  },
  chrome: { background: '#ffffff', decorations: Decor, overlays: Overlay },

  variants: [
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 14, y: 16, w: 40, h: 4 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 14, y: 30, w: 78, h: 26 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 14, y: 60, w: 70, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 14, y: 70, w: 70, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 80, fontWeight: 800, lineHeight: 1.0, color: NAVY, letterSpacing: -2 } } },
    },
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 14, y: RHYTHM.yLabel,    w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 14, y: RHYTHM.yTitle,    w: 50, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 14, y: RHYTHM.ySubtitle, w: 50, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 14, y: RHYTHM.yLead,     w: 50, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 14, y: RHYTHM.yBody, w: 50, h: RHYTHM.hBody },
        { id: 'sideStat', acceptsTypes: ['metric', 'kpi'],    x: 68, y: 28, w: 26, h: 36 },
        ...F,
      ],
    },
    { matches: ['solution'],  slots: [...rhythmSlots({ x: 14, w: 80, bodyId: 'features', bodyAccepts: ['featureGrid', 'bulletList', 'numberedList', 'paragraph'] }), ...F] },
    { matches: ['market_opportunity', 'market', 'tam_sam_som'], slots: [
      ...rhythmSlots({ x: 14, w: 80, noBody: true }),
      ...splitBodySlots({ x: 14, leftId: 'chart', leftAccepts: ['chart'], leftW: 48, rightId: 'rightBody', rightAccepts: ['bulletList', 'paragraph'], rightW: 28 }),
      ...F,
    ]},
    { matches: ['business_model', 'revenue_streams'], slots: [...rhythmSlots({ x: 14, w: 80, bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison', 'bulletList', 'paragraph'] }), ...F] },
    { matches: ['traction', 'customer_segment'], slots: [
      ...rhythmSlots({ x: 14, w: 80, noBody: true }),
      ...splitBodySlots({ x: 14, leftId: 'chart', leftAccepts: ['chart'], leftW: 46, rightId: 'metrics', rightAccepts: ['featureGrid', 'kpi', 'metric', 'bulletList'], rightW: 30 }),
      ...F,
    ]},
    { matches: ['team'], slots: [...rhythmSlots({ x: 14, w: 80, bodyId: 'team', bodyAccepts: ['teamCard'] }), ...F] },
    { matches: ['competition', 'competitor_analysis', 'competitive_advantage'], slots: [...rhythmSlots({ x: 14, w: 80, bodyId: 'comparison', bodyAccepts: ['comparison', 'table', 'featureGrid'] }), ...F] },
    { matches: ['roadmap', 'product_roadmap'], slots: [...rhythmSlots({ x: 14, w: 80, bodyId: 'roadmap', bodyAccepts: ['roadmap', 'timeline', 'processSteps', 'bulletList'] }), ...F] },
    { matches: ['pricing'], slots: [...rhythmSlots({ x: 14, w: 80, bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison'] }), ...F] },
    {
      matches: ['ask', 'investment_ask', 'use_of_funds'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 14, y: RHYTHM.yLabel, w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 14, y: RHYTHM.yTitle, w: 80, h: RHYTHM.hTitle },
        { id: 'amount',   acceptsTypes: ['metric'],           x: 14, y: 28, w: 80, h: 32 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 14, y: 64, w: 60, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 14, y: 72, w: 80, h: 16 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 116, fontWeight: 800, color: NAVY, lineHeight: 0.95, letterSpacing: -3 } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 14, y: 32, w: 80, h: 22 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 14, y: 56, w: 80, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 14, y: 66, w: 80, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 88, fontWeight: 800, color: NAVY, letterSpacing: -2 } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots({ x: 14, w: 80 }), ...F] },
  ],
};
