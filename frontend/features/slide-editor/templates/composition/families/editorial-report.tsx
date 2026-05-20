'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Editorial Report — magazine serif on warm paper
// =============================================================================

const PAPER  = '#fdf7e9';
const INK    = '#1c1a17';
const RUST   = '#b35432';
const RUST2  = '#7c2d12';
const MUTED  = '#7a6f5b';

const PaperFrame: React.FC = () => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    <rect x="44" y="44" width="1192" height="632" fill="none" stroke={INK} strokeWidth="0.7" />
    <rect x="56" y="56" width="1168" height="608" fill="none" stroke={INK} strokeWidth="0.4" opacity="0.6" />
  </svg>
);

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 22, left: '50%', transform: 'translateX(-50%)', fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 11, fontStyle: 'italic', color: MUTED, letterSpacing: 3 }}>
      — Pitchonix Quarterly —
    </div>
    <div style={{ position: 'absolute', bottom: 20, left: 0, right: 0, display: 'flex', justifyContent: 'space-between', paddingInline: 84, fontFamily: '"Cormorant Garamond", Georgia, serif', fontSize: 11, fontStyle: 'italic', color: MUTED }}>
      <span>Volume I</span>
      <span>{String(slideIndex + 1).padStart(2, '0')} of {String(total).padStart(2, '0')}</span>
    </div>
  </>
);

const F = footerSlots();

export const EDITORIAL_REPORT: TemplateFamily = {
  id:   'editorial-report',
  name: 'Editorial Report',
  category: 'Editorial',
  theme: {
    primary: RUST, accent: RUST, text: INK, muted: MUTED,
    surface: '#f6efde', background: PAPER,
    fontHeading: '"Cormorant Garamond", Georgia, serif',
    fontBody:    'Lora, "EB Garamond", Georgia, serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 52, fontWeight: 600, lineHeight: 1.1, color: INK, fontFamily: '"Cormorant Garamond", serif' },
      subheading: { fontSize: 15, fontWeight: 500, lineHeight: 1.4, color: RUST, letterSpacing: 3, textTransform: 'uppercase' },
      paragraph:  { fontSize: 14, fontWeight: 400, lineHeight: 1.7, color: '#2a2620' },
      caption:    { fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' },
      label:      { fontSize: 11, fontWeight: 700, color: RUST, letterSpacing: 4, textTransform: 'uppercase' },
      metric:     { fontSize: 76, fontWeight: 700, color: RUST2, letterSpacing: -1 },
      quote:      { fontSize: 24, fontWeight: 400, lineHeight: 1.4, color: INK },
      cta:        { fontSize: 13, fontWeight: 600, letterSpacing: 2 },
    },
  },
  chrome: { background: PAPER, decorations: PaperFrame, overlays: Overlay },

  variants: [
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 10, y: 16, w: 80, h: 5 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 10, y: 30, w: 80, h: 30 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 10, y: 64, w: 80, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 10, y: 74, w: 80, h: 10 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 96, fontWeight: 600, lineHeight: 1.0, color: INK, fontFamily: '"Cormorant Garamond", serif' } } },
    },
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 8, y: RHYTHM.yLabel,    w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 8, y: RHYTHM.yTitle,    w: 52, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 8, y: RHYTHM.ySubtitle, w: 52, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 8, y: RHYTHM.yLead,     w: 52, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 8, y: RHYTHM.yBody, w: 52, h: RHYTHM.hBody },
        { id: 'sideStat', acceptsTypes: ['metric', 'kpi'],    x: 64, y: 28, w: 28, h: 36 },
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
        { id: 'label',    acceptsTypes: ['label'], x: 8, y: RHYTHM.yLabel, w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'], x: 8, y: RHYTHM.yTitle, w: 84, h: RHYTHM.hTitle },
        { id: 'amount',   acceptsTypes: ['metric'], x: 8, y: 28, w: 84, h: 32 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 8, y: 64, w: 60, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 8, y: 72, w: 84, h: 16 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 132, fontWeight: 700, color: RUST2, lineHeight: 0.95, letterSpacing: -3 } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 8, y: 32, w: 84, h: 22 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 8, y: 56, w: 84, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 8, y: 66, w: 70, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 112, fontWeight: 600, color: INK, fontFamily: '"Cormorant Garamond", serif' } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots(), ...F] },
  ],
};
