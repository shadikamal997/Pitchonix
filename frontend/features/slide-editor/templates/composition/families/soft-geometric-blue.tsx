'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Soft Geometric Blue — white with big rounded blue squares as decoration
//
//  Inspired by the soft business-marketing reference template: white canvas,
//  large rotated rounded-square decorative shapes in pale blue + dark navy,
//  photo masks with rounded corners, soft minimalist Manrope typography.
// =============================================================================

const NAVY    = '#0f1e3a';
const BLUE    = '#3d6eae';
const PALE    = '#dee9f2';
const SOFT    = '#eef4f9';
const INK     = '#172033';
const MUTED   = '#7a8499';
const WHITE   = '#ffffff';

const RoundedSquare: React.FC<{ x: number; y: number; size: number; fill: string; rotate: number; opacity?: number }> = ({ x, y, size, fill, rotate, opacity = 1 }) => (
  <rect x={x} y={y} width={size} height={size} rx={Math.floor(size * 0.18)} fill={fill} opacity={opacity}
    transform={`rotate(${rotate} ${x + size/2} ${y + size/2})`} />
);

const Decor: React.FC<{ slideIndex: number; total: number }> = ({ slideIndex }) => {
  // Vary the decoration pattern slightly per slide for visual rhythm.
  const phase = slideIndex % 3;
  return (
    <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
      <rect width="1280" height="720" fill={WHITE} />
      {phase === 0 && (
        <>
          <RoundedSquare x={1110} y={-30}  size={120} fill={PALE} rotate={20} />
          <RoundedSquare x={1170} y={120}  size={70}  fill={BLUE} rotate={20} opacity={0.5} />
          <RoundedSquare x={-30}  y={600}  size={140} fill={PALE} rotate={20} />
        </>
      )}
      {phase === 1 && (
        <>
          <RoundedSquare x={-50}  y={-30}  size={170} fill={PALE} rotate={20} />
          <RoundedSquare x={1100} y={580}  size={130} fill={PALE} rotate={-15} />
          <RoundedSquare x={60}   y={620}  size={70}  fill={BLUE} rotate={20} opacity={0.5} />
        </>
      )}
      {phase === 2 && (
        <>
          <RoundedSquare x={1140} y={40}   size={120} fill={PALE} rotate={20} />
          <RoundedSquare x={-50}  y={300}  size={100} fill={SOFT} rotate={20} />
          <RoundedSquare x={1180} y={500}  size={130} fill={PALE} rotate={-10} />
        </>
      )}
    </svg>
  );
};

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 30, right: 60, fontFamily: '"Manrope", "Inter", sans-serif', fontSize: 11, fontWeight: 700, color: NAVY, letterSpacing: 2 }}>
      {String(slideIndex + 1).padStart(2, '0')} / {String(total).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', bottom: 26, right: 60, fontFamily: '"Manrope", "Inter", sans-serif', fontSize: 10, fontWeight: 700, color: BLUE, letterSpacing: 3, textTransform: 'uppercase' }}>
      Pitchonix
    </div>
  </>
);

const F = footerSlots();

export const SOFT_GEOMETRIC_BLUE: TemplateFamily = {
  id:   'soft-geometric-blue',
  name: 'Soft Geometric Blue',
  category: 'Business',
  theme: {
    primary: NAVY, secondary: BLUE, accent: BLUE,
    text: INK, muted: MUTED, surface: SOFT, background: WHITE,
    fontHeading: '"Manrope", "Inter", sans-serif',
    fontBody:    '"Inter", sans-serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 48, fontWeight: 800, lineHeight: 1.08, color: NAVY, letterSpacing: -1 },
      subheading: { fontSize: 14, fontWeight: 600, lineHeight: 1.4, color: BLUE, letterSpacing: 2, textTransform: 'uppercase' as any },
      paragraph:  { fontSize: 14, fontWeight: 400, lineHeight: 1.6, color: '#2a3548' },
      caption:    { fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 1, textTransform: 'uppercase' as any },
      label:      { fontSize: 11, fontWeight: 800, color: BLUE, letterSpacing: 3, textTransform: 'uppercase' as any },
      metric:     { fontSize: 64, fontWeight: 800, color: NAVY, letterSpacing: -2 },
      quote:      { fontSize: 22, fontWeight: 500, lineHeight: 1.4, color: NAVY },
      cta:        { fontSize: 13, fontWeight: 700, letterSpacing: 1 },
    },
  },
  chrome: { background: WHITE, decorations: Decor, overlays: Overlay },

  variants: [
    // Cover — title + subtitle on left, photo with rounded mask on the right
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 6, y: 18, w: 40, h: 4 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 6, y: 30, w: 44, h: 32 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 6, y: 64, w: 44, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 6, y: 74, w: 44, h: 12 },
        { id: 'heroPhoto', acceptsTypes: ['image'], x: 56, y: 14, w: 36, h: 68 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 76, fontWeight: 800, lineHeight: 1.0, color: NAVY, letterSpacing: -2 } } },
    },
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: RHYTHM.yLabel,    w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: RHYTHM.yTitle,    w: 50, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: RHYTHM.ySubtitle, w: 50, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: RHYTHM.yLead,     w: 50, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 8, y: RHYTHM.yBody, w: 50, h: RHYTHM.hBody },
        { id: 'sidePhoto', acceptsTypes: ['image'], x: 62, y: 22, w: 32, h: 60 },
        ...F,
      ],
    },
    { matches: ['solution'],  slots: [...rhythmSlots({ bodyId: 'features', bodyAccepts: ['featureGrid', 'bulletList', 'numberedList', 'paragraph'] }), ...F] },
    { matches: ['market_opportunity', 'market', 'tam_sam_som'], slots: [
      ...rhythmSlots({ noBody: true }),
      ...splitBodySlots({ leftId: 'chart', leftAccepts: ['chart', 'image'], leftW: 50, rightId: 'rightBody', rightAccepts: ['bulletList', 'paragraph'], rightW: 30 }),
      ...F,
    ]},
    { matches: ['business_model', 'revenue_streams'], slots: [...rhythmSlots({ bodyId: 'pricing', bodyAccepts: ['pricingCard', 'featureGrid', 'comparison', 'bulletList', 'paragraph'] }), ...F] },
    { matches: ['traction', 'customer_segment'], slots: [
      ...rhythmSlots({ noBody: true }),
      ...splitBodySlots({ leftId: 'chart', leftAccepts: ['chart', 'image'], leftW: 48, rightId: 'metrics', rightAccepts: ['featureGrid', 'kpi', 'metric', 'bulletList'], rightW: 32 }),
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
        { id: 'amount',   acceptsTypes: ['metric'],           x: 8, y: 28, w: 84, h: 34 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: 64, w: 60, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: 72, w: 60, h: 14 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 132, fontWeight: 800, color: NAVY, lineHeight: 0.92, letterSpacing: -3 } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 8, y: 30, w: 84, h: 22 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 8, y: 54, w: 84, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 8, y: 64, w: 70, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 96, fontWeight: 800, color: NAVY, letterSpacing: -2 } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots(), ...F] },
  ],
};
