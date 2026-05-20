'use client';

import React from 'react';
import type { TemplateFamily } from '../types';
import { rhythmSlots, footerSlots, splitBodySlots, RHYTHM } from '../slot-rhythm';

// =============================================================================
//  Corporate Monochrome — dark navy + photo backgrounds, bold corporate type
//
//  Inspired by the reference business-strategy templates: photo-as-background
//  on cover/section slides, light cream on content slides, monochrome rule
//  between halves, big bold sans display.
// =============================================================================

const INK    = '#0a0e1a';
const NAVY   = '#161b29';
const CREAM  = '#f5f1ea';
const ACCENT = '#c7a45d';
const MUTED  = '#6b7180';

const Decor: React.FC<{ slideIndex: number; total: number }> = ({ slideIndex }) => (
  <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
    <defs>
      <linearGradient id="cm-bg" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%"   stopColor={CREAM} />
        <stop offset="100%" stopColor="#ece6dd" />
      </linearGradient>
    </defs>
    <rect width="1280" height="720" fill="url(#cm-bg)" />
    {/* Thin top-left accent rail */}
    <rect x="60" y="60" width="3" height="120" fill={ACCENT} />
    {/* Bottom monochrome divider */}
    <line x1="60" y1="660" x2="1220" y2="660" stroke={INK} strokeWidth="0.7" />
    {/* Big slide number — editorial corner mark */}
    <text x="1180" y="160" fontFamily="'Manrope', 'Inter', sans-serif" fontSize="120" fontWeight="900" fill={INK} opacity="0.04" textAnchor="end">
      {String(slideIndex + 1).padStart(2, '0')}
    </text>
  </svg>
);

const Overlay: React.FC<{ slideIndex: number; total: number; title?: string }> = ({ slideIndex, total }) => (
  <>
    <div style={{ position: 'absolute', top: 30, right: 60, fontFamily: '"Manrope", "Inter", sans-serif', fontSize: 11, fontWeight: 700, color: INK, letterSpacing: 4, textTransform: 'uppercase' }}>
      Vol. I · No. {String(slideIndex + 1).padStart(2, '0')}
    </div>
    <div style={{ position: 'absolute', bottom: 26, right: 60, fontFamily: '"Manrope", "Inter", sans-serif', fontSize: 10, fontWeight: 600, color: MUTED, letterSpacing: 3, textTransform: 'uppercase' }}>
      Pitchonix · Confidential
    </div>
    {/* Side label — rotated brand text on the very left */}
    <div style={{
      position: 'absolute', left: 18, top: '50%', transform: 'translateY(-50%) rotate(-90deg)', transformOrigin: 'center',
      fontFamily: '"Manrope", "Inter", sans-serif', fontSize: 10, fontWeight: 800, color: MUTED, letterSpacing: 6, textTransform: 'uppercase',
    }}>
      Business · Strategy
    </div>
  </>
);

const F = footerSlots();

export const CORPORATE_MONOCHROME: TemplateFamily = {
  id:   'corporate-monochrome',
  name: 'Corporate Monochrome',
  category: 'Business',
  theme: {
    primary: INK, secondary: NAVY, accent: ACCENT,
    text: INK, muted: MUTED, surface: CREAM, background: CREAM,
    fontHeading: '"Manrope", "Inter", sans-serif',
    fontBody:    '"Inter", sans-serif',
  },
  typography: {
    perType: {
      heading:    { fontSize: 60, fontWeight: 900, lineHeight: 1.0, color: INK, letterSpacing: -1.5 },
      subheading: { fontSize: 13, fontWeight: 700, color: ACCENT, letterSpacing: 4, textTransform: 'uppercase' as any, lineHeight: 1.4 },
      paragraph:  { fontSize: 14, fontWeight: 400, lineHeight: 1.65, color: '#2a2e3a' },
      caption:    { fontSize: 10, fontWeight: 500, color: MUTED, letterSpacing: 2, textTransform: 'uppercase' as any },
      label:      { fontSize: 11, fontWeight: 800, color: INK, letterSpacing: 4, textTransform: 'uppercase' as any },
      metric:     { fontSize: 84, fontWeight: 900, color: INK, letterSpacing: -2 },
      quote:      { fontSize: 24, fontWeight: 500, lineHeight: 1.35, color: INK },
      cta:        { fontSize: 13, fontWeight: 800, letterSpacing: 2, textTransform: 'uppercase' as any },
    },
  },
  chrome: { background: CREAM, decorations: Decor, overlays: Overlay },

  variants: [
    // Cover — split: text left half (cream) + photo right half (full-bleed dark)
    {
      matches: ['cover'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 6,  y: 18, w: 36, h: 4 },
        { id: 'title',    acceptsTypes: ['heading'],          x: 6,  y: 30, w: 42, h: 32 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 6,  y: 64, w: 42, h: 6 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 6,  y: 72, w: 42, h: 12 },
        // Photo slot — right half, full bleed
        { id: 'heroPhoto', acceptsTypes: ['image'], x: 50, y: 6, w: 44, h: 80 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 88, fontWeight: 900, lineHeight: 0.95, letterSpacing: -3, color: INK } } },
      chrome: {
        background: CREAM,
        decorations: () => (
          <svg viewBox="0 0 1280 720" width="100%" height="100%" preserveAspectRatio="none" style={{ position: 'absolute', inset: 0 }}>
            {/* Solid dark slab on the right where the photo lives — acts as fallback when no photo */}
            <rect x="640" y="0" width="640" height="720" fill={INK} />
            <rect x="60" y="60" width="3" height="120" fill={ACCENT} />
            <line x1="60" y1="660" x2="600" y2="660" stroke={INK} strokeWidth="0.7" />
          </svg>
        ),
      },
    },
    // Problem — text left, image right
    {
      matches: ['problem'],
      slots: [
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 6, y: RHYTHM.yLabel,    w: 28, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 6, y: RHYTHM.yTitle,    w: 54, h: RHYTHM.hTitle },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 6, y: RHYTHM.ySubtitle, w: 54, h: RHYTHM.hSubtitle },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 6, y: RHYTHM.yLead,     w: 54, h: RHYTHM.hLead },
        { id: 'body',     acceptsTypes: ['bulletList', 'numberedList', 'paragraph'], x: 6, y: RHYTHM.yBody, w: 54, h: RHYTHM.hBody },
        { id: 'sidePhoto', acceptsTypes: ['image'], x: 64, y: 22, w: 30, h: 60 },
        ...F,
      ],
    },
    { matches: ['solution'],  slots: [...rhythmSlots({ bodyId: 'features', bodyAccepts: ['featureGrid', 'bulletList', 'numberedList', 'paragraph'] }), ...F] },
    // Market — chart + supporting visual
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
        { id: 'label',    acceptsTypes: ['label', 'caption'], x: 6, y: RHYTHM.yLabel, w: 30, h: RHYTHM.hLabel },
        { id: 'title',    acceptsTypes: ['heading'],          x: 6, y: RHYTHM.yTitle, w: 88, h: RHYTHM.hTitle },
        { id: 'amount',   acceptsTypes: ['metric'],           x: 6, y: 28, w: 88, h: 34 },
        { id: 'subtitle', acceptsTypes: ['subheading'],       x: 6, y: 64, w: 60, h: 5 },
        { id: 'lead',     acceptsTypes: ['paragraph'],        x: 6, y: 72, w: 60, h: 14 },
        ...F,
      ],
      typography: { perType: { metric: { fontSize: 152, fontWeight: 900, color: INK, lineHeight: 0.9, letterSpacing: -5 } } },
    },
    {
      matches: ['closing', 'thank_you'],
      slots: [
        { id: 'title',    acceptsTypes: ['heading'],   x: 6, y: 30, w: 88, h: 24 },
        { id: 'subtitle', acceptsTypes: ['subheading'], x: 6, y: 56, w: 88, h: 7 },
        { id: 'lead',     acceptsTypes: ['paragraph'], x: 6, y: 66, w: 70, h: 12 },
        ...F,
      ],
      typography: { perType: { heading: { fontSize: 108, fontWeight: 900, color: INK, letterSpacing: -3 } } },
    },
    { matches: ['default', 'executive_summary'], slots: [...rhythmSlots(), ...F] },
  ],
};
