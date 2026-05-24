// =============================================================================
//  Phase 23B — Family Card Style Tokens
//
//  Per-family visual token sets for composite card renderers. Each family
//  receives a distinct token set that drives: card backgrounds, borders,
//  accent colors, typography colors, and SWOT quadrant palettes.
//
//  Usage:
//    import { getCardTokens } from './card-variants';
//    const tk = getCardTokens(familyId);
// =============================================================================

export interface CardTokens {
  // Card shell
  cardBg:          string;
  cardBorder:      string;
  cardBorderWidth: number;
  cardRadius:      number;
  cardShadow?:     string;

  // Color roles
  accentColor:     string;
  headingColor:    string;
  bodyColor:       string;
  mutedColor:      string;

  // Metric / KPI
  metricColor:     string;

  // Pricing highlight
  highlightBg:     string;
  highlightBorder: string;

  // Lists
  bulletColor:     string;
  numberColor:     string;

  // Team cards
  avatarBg:        string;
  roleColor:       string;

  // Roadmap / Timeline
  phaseBg:         string;
  phasePeriodColor:string;

  // SWOT quadrants
  strengthsBg:     string; strengthsFg:     string;
  weaknessesBg:    string; weaknessesFg:    string;
  opportunitiesBg: string; opportunitiesFg: string;
  threatsBg:       string; threatsFg:       string;

  // Typography overrides
  fontHeading?: string;
  fontBody?:    string;
}

// =============================================================================
//  Per-family token definitions
// =============================================================================

const TOKENS: Record<string, CardTokens> = {

  // ──────────────────────────────────────────────────────────────────────────
  //  Crimson Dark — dark glass panels, glowing red accents, white text
  // ──────────────────────────────────────────────────────────────────────────
  'crimson-dark': {
    cardBg:          'rgba(30,5,15,0.85)',
    cardBorder:      'rgba(220,38,38,0.35)',
    cardBorderWidth: 1,
    cardRadius:      6,
    cardShadow:      '0 4px 24px rgba(220,38,38,0.18), inset 0 1px 0 rgba(255,255,255,0.06)',
    accentColor:     '#ef4444',
    headingColor:    '#ffffff',
    bodyColor:       '#fecaca',
    mutedColor:      '#9ca3af',
    metricColor:     '#ef4444',
    highlightBg:     'rgba(220,38,38,0.25)',
    highlightBorder: '#ef4444',
    bulletColor:     '#ef4444',
    numberColor:     '#ef4444',
    avatarBg:        '#450a0a',
    roleColor:       '#f87171',
    phaseBg:         'rgba(220,38,38,0.15)',
    phasePeriodColor:'#ef4444',
    strengthsBg:     '#0a180a', strengthsFg:     '#4ade80',
    weaknessesBg:    '#1a0808', weaknessesFg:    '#f87171',
    opportunitiesBg: '#080818', opportunitiesFg: '#60a5fa',
    threatsBg:       '#181000', threatsFg:       '#fbbf24',
    fontHeading:     '"Space Grotesk", sans-serif',
    fontBody:        'Inter, sans-serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Light Blue Business — clean corporate, navy-blue accents, white cards
  // ──────────────────────────────────────────────────────────────────────────
  'light-blue-business': {
    cardBg:          '#f0f7ff',
    cardBorder:      '#93c5fd',
    cardBorderWidth: 1,
    cardRadius:      8,
    cardShadow:      '0 1px 4px rgba(59,130,246,0.08)',
    accentColor:     '#1d4ed8',
    headingColor:    '#1e3a5f',
    bodyColor:       '#374151',
    mutedColor:      '#6b7280',
    metricColor:     '#1d4ed8',
    highlightBg:     '#dbeafe',
    highlightBorder: '#2563eb',
    bulletColor:     '#2563eb',
    numberColor:     '#2563eb',
    avatarBg:        '#dbeafe',
    roleColor:       '#2563eb',
    phaseBg:         '#eff6ff',
    phasePeriodColor:'#1d4ed8',
    strengthsBg:     '#f0fdf4', strengthsFg:     '#166534',
    weaknessesBg:    '#fef2f2', weaknessesFg:    '#991b1b',
    opportunitiesBg: '#eff6ff', opportunitiesFg: '#1e3a8a',
    threatsBg:       '#fefce8', threatsFg:       '#713f12',
    fontHeading:     '"Inter", sans-serif',
    fontBody:        'Inter, sans-serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Luxury Dark — near-black + gold, serif headings, zero-radius cards
  // ──────────────────────────────────────────────────────────────────────────
  'luxury-dark': {
    cardBg:          '#0a0800',
    cardBorder:      '#92400e',
    cardBorderWidth: 1,
    cardRadius:      2,
    cardShadow:      '0 0 30px rgba(217,119,6,0.10)',
    accentColor:     '#d97706',
    headingColor:    '#fef3c7',
    bodyColor:       '#d6d3d1',
    mutedColor:      '#78716c',
    metricColor:     '#f59e0b',
    highlightBg:     'rgba(217,119,6,0.18)',
    highlightBorder: '#d97706',
    bulletColor:     '#d97706',
    numberColor:     '#d97706',
    avatarBg:        '#1c1400',
    roleColor:       '#d97706',
    phaseBg:         'rgba(217,119,6,0.10)',
    phasePeriodColor:'#f59e0b',
    strengthsBg:     '#060e06', strengthsFg:     '#86efac',
    weaknessesBg:    '#0e0606', weaknessesFg:    '#fca5a5',
    opportunitiesBg: '#06060e', opportunitiesFg: '#93c5fd',
    threatsBg:       '#0e0a00', threatsFg:       '#fde68a',
    fontHeading:     '"Playfair Display", "Georgia", serif',
    fontBody:        '"Inter", sans-serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Startup Gradient — frosted glass on violet→pink gradient, lime accents
  // ──────────────────────────────────────────────────────────────────────────
  'startup-gradient': {
    cardBg:          'rgba(255,255,255,0.12)',
    cardBorder:      'rgba(255,255,255,0.22)',
    cardBorderWidth: 1,
    cardRadius:      12,
    cardShadow:      '0 8px 32px rgba(124,58,237,0.25)',
    accentColor:     '#84cc16',
    headingColor:    '#ffffff',
    bodyColor:       '#e9d5ff',
    mutedColor:      '#c4b5fd',
    metricColor:     '#ffffff',
    highlightBg:     'rgba(132,204,22,0.25)',
    highlightBorder: '#84cc16',
    bulletColor:     '#84cc16',
    numberColor:     '#84cc16',
    avatarBg:        'rgba(255,255,255,0.20)',
    roleColor:       '#84cc16',
    phaseBg:         'rgba(255,255,255,0.10)',
    phasePeriodColor:'#84cc16',
    strengthsBg:     'rgba(132,204,22,0.18)', strengthsFg:     '#d9f99d',
    weaknessesBg:    'rgba(236,72,153,0.18)', weaknessesFg:    '#fbcfe8',
    opportunitiesBg: 'rgba(99,102,241,0.22)', opportunitiesFg: '#c7d2fe',
    threatsBg:       'rgba(245,158,11,0.18)', threatsFg:       '#fde68a',
    fontHeading:     '"Space Grotesk", sans-serif',
    fontBody:        'Inter, sans-serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Corporate Monochrome — black/white, hairline rules, zero color
  // ──────────────────────────────────────────────────────────────────────────
  'corporate-monochrome': {
    cardBg:          '#ffffff',
    cardBorder:      '#d1d5db',
    cardBorderWidth: 1,
    cardRadius:      0,
    cardShadow:      undefined,
    accentColor:     '#111827',
    headingColor:    '#111827',
    bodyColor:       '#374151',
    mutedColor:      '#6b7280',
    metricColor:     '#111827',
    highlightBg:     '#f9fafb',
    highlightBorder: '#111827',
    bulletColor:     '#111827',
    numberColor:     '#111827',
    avatarBg:        '#e5e7eb',
    roleColor:       '#374151',
    phaseBg:         '#f9fafb',
    phasePeriodColor:'#111827',
    strengthsBg:     '#f9fafb', strengthsFg:     '#111827',
    weaknessesBg:    '#f3f4f6', weaknessesFg:    '#111827',
    opportunitiesBg: '#f9fafb', opportunitiesFg: '#111827',
    threatsBg:       '#f3f4f6', threatsFg:       '#111827',
    fontHeading:     '"Inter", sans-serif',
    fontBody:        '"Inter", sans-serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Editorial Report — warm newsprint, crimson magazine accent, serif fonts
  // ──────────────────────────────────────────────────────────────────────────
  'editorial-report': {
    cardBg:          '#fffbf5',
    cardBorder:      '#e7e0d5',
    cardBorderWidth: 1,
    cardRadius:      4,
    cardShadow:      undefined,
    accentColor:     '#b91c1c',
    headingColor:    '#1c1c1c',
    bodyColor:       '#374151',
    mutedColor:      '#6b7280',
    metricColor:     '#b91c1c',
    highlightBg:     '#fef2f2',
    highlightBorder: '#b91c1c',
    bulletColor:     '#b91c1c',
    numberColor:     '#b91c1c',
    avatarBg:        '#f5f0e8',
    roleColor:       '#6b7280',
    phaseBg:         '#fef2f2',
    phasePeriodColor:'#b91c1c',
    strengthsBg:     '#f0fdf4', strengthsFg:     '#14532d',
    weaknessesBg:    '#fef2f2', weaknessesFg:    '#7f1d1d',
    opportunitiesBg: '#eff6ff', opportunitiesFg: '#1e3a8a',
    threatsBg:       '#fefce8', threatsFg:       '#713f12',
    fontHeading:     '"Playfair Display", "Georgia", serif',
    fontBody:        '"Source Serif 4", "Georgia", serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Investor Minimal — Swiss white, terracotta hairline accent, near-zero radius
  // ──────────────────────────────────────────────────────────────────────────
  'investor-minimal': {
    cardBg:          '#ffffff',
    cardBorder:      '#e5e7eb',
    cardBorderWidth: 1,
    cardRadius:      0,
    cardShadow:      undefined,
    accentColor:     '#b04a2e',
    headingColor:    '#0a0a0a',
    bodyColor:       '#2a2a2a',
    mutedColor:      '#8a8377',
    metricColor:     '#b04a2e',
    highlightBg:     '#fdf5f2',
    highlightBorder: '#b04a2e',
    bulletColor:     '#b04a2e',
    numberColor:     '#b04a2e',
    avatarBg:        '#f5f0ec',
    roleColor:       '#8a8377',
    phaseBg:         '#fafaf7',
    phasePeriodColor:'#b04a2e',
    strengthsBg:     '#fafafa', strengthsFg:     '#0a0a0a',
    weaknessesBg:    '#fafafa', weaknessesFg:    '#0a0a0a',
    opportunitiesBg: '#fafafa', opportunitiesFg: '#0a0a0a',
    threatsBg:       '#fafafa', threatsFg:       '#0a0a0a',
    fontHeading:     '"Inter", sans-serif',
    fontBody:        '"Inter", sans-serif',
  },

  // ──────────────────────────────────────────────────────────────────────────
  //  Soft Geometric Blue — sky-blue rounded cards, teal accents
  // ──────────────────────────────────────────────────────────────────────────
  'soft-geometric-blue': {
    cardBg:          '#f0f9ff',
    cardBorder:      '#7dd3fc',
    cardBorderWidth: 1,
    cardRadius:      16,
    cardShadow:      '0 2px 12px rgba(14,165,233,0.10)',
    accentColor:     '#0284c7',
    headingColor:    '#0c4a6e',
    bodyColor:       '#1e3a5f',
    mutedColor:      '#64748b',
    metricColor:     '#0284c7',
    highlightBg:     '#e0f2fe',
    highlightBorder: '#0284c7',
    bulletColor:     '#0284c7',
    numberColor:     '#0284c7',
    avatarBg:        '#bae6fd',
    roleColor:       '#0369a1',
    phaseBg:         '#e0f2fe',
    phasePeriodColor:'#0284c7',
    strengthsBg:     '#f0fdf4', strengthsFg:     '#166534',
    weaknessesBg:    '#fef2f2', weaknessesFg:    '#991b1b',
    opportunitiesBg: '#f0f9ff', opportunitiesFg: '#0c4a6e',
    threatsBg:       '#fefce8', threatsFg:       '#713f12',
    fontHeading:     '"Inter", sans-serif',
    fontBody:        'Inter, sans-serif',
  },
};

// =============================================================================
//  Fallback tokens — neutral, used when familyId is unknown
// =============================================================================

const FALLBACK: CardTokens = {
  cardBg:          '#f8fafc',
  cardBorder:      '#e2e8f0',
  cardBorderWidth: 1,
  cardRadius:      8,
  cardShadow:      undefined,
  accentColor:     '#16a34a',
  headingColor:    '#111827',
  bodyColor:       '#374151',
  mutedColor:      '#6b7280',
  metricColor:     '#16a34a',
  highlightBg:     '#f0fdf4',
  highlightBorder: '#16a34a',
  bulletColor:     '#16a34a',
  numberColor:     '#16a34a',
  avatarBg:        '#e2e8f0',
  roleColor:       '#16a34a',
  phaseBg:         '#f8fafc',
  phasePeriodColor:'#16a34a',
  strengthsBg:     '#f0fdf4', strengthsFg:     '#14532d',
  weaknessesBg:    '#fef2f2', weaknessesFg:    '#7f1d1d',
  opportunitiesBg: '#eff6ff', opportunitiesFg: '#1e3a8a',
  threatsBg:       '#fefce8', threatsFg:       '#713f12',
};

export function getCardTokens(familyId?: string): CardTokens {
  if (!familyId) return FALLBACK;
  return TOKENS[familyId] ?? FALLBACK;
}
