// =============================================================================
//  Family Design Tokens — Phase 32.75 Tier 3
//
//  Each composition family supplies a self-contained token set every smart
//  component inherits. Adding a new family means filling out this table only;
//  the 20 smart-component builders pick up the new look automatically.
// =============================================================================

import type { SmartFamilyId } from './smart-types';

export interface FamilyTokens {
  /** Primary brand colour. Used for headlines, key metrics, button fills. */
  accent:      string;
  /** Secondary accent — used for secondary chart series, badges. */
  accent2:     string;
  /** Default text colour on the family's canvas. */
  text:        string;
  /** Muted text (captions, axis labels, footers). */
  muted:       string;
  /** Slide-level background (solid or gradient). */
  bg:          string;
  /** Card / surface fill. */
  surface:     string;
  /** Border colour for cards and dividers. */
  border:      string;
  /** Subtle divider (rules inside cards). */
  divider:     string;
  /** Positive / negative semantic colours. */
  positive:    string;
  negative:    string;
  /** Card radius in px (0 for sharp, ≥10 for soft). */
  radius:      number;
  /** Strokes — set to 0 for borderless cards. */
  strokeWidth: number;
  /** Card elevation (CSS box-shadow). */
  shadow:      string;
  /** Heading + body fonts. */
  fontHeading: string;
  fontBody:    string;
  /** Default weight bumps — e.g. luxury wants lighter weight. */
  fontWeightHeading: number;
  fontWeightBody:    number;
  /** Spacing scale modifier — 1 = normal, >1 = looser. */
  spacing:     number;
  /** Numbers feel — 'tabular' or 'proportional'. Used as letter-spacing. */
  numberLetterSpacing: number;
  /** Casing for labels — 'uppercase' for restrained corporate, etc. */
  labelTransform: 'uppercase' | 'none';
  /** Mood descriptor (also a tag for the registry). */
  mood:        string;
  /** Whether the family is on a dark canvas — flips a few choices. */
  isDark:      boolean;
}

const FAMILIES: Record<SmartFamilyId, FamilyTokens> = {
  'crimson-dark': {
    accent: '#ef4444', accent2: '#fb923c',
    text: '#fafafa', muted: '#a1a1aa',
    bg: '#18181b', surface: '#27272a',
    border: 'rgba(239,68,68,0.35)', divider: 'rgba(255,255,255,0.06)',
    positive: '#22c55e', negative: '#f87171',
    radius: 4, strokeWidth: 1,
    shadow: '0 8px 24px rgba(0,0,0,0.45)',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 800, fontWeightBody: 500,
    spacing: 1.0, numberLetterSpacing: -0.5,
    labelTransform: 'uppercase',
    mood: 'dramatic', isDark: true,
  },
  'light-blue-business': {
    accent: '#2563eb', accent2: '#0ea5e9',
    text: '#0f172a', muted: '#64748b',
    bg: '#f8fafc', surface: '#ffffff',
    border: '#e2e8f0', divider: '#f1f5f9',
    positive: '#16a34a', negative: '#dc2626',
    radius: 8, strokeWidth: 1,
    shadow: '0 1px 3px rgba(15,23,42,0.06)',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 700, fontWeightBody: 400,
    spacing: 1.0, numberLetterSpacing: 0,
    labelTransform: 'none',
    mood: 'corporate', isDark: false,
  },
  'luxury-dark': {
    accent: '#d4af37', accent2: '#facc15',
    text: '#f5f5f4', muted: '#a8a29e',
    bg: '#0c0a09', surface: '#1c1917',
    border: 'rgba(212,175,55,0.3)', divider: 'rgba(212,175,55,0.12)',
    positive: '#a3e635', negative: '#fb7185',
    radius: 2, strokeWidth: 0.5,
    shadow: '0 16px 40px rgba(0,0,0,0.6)',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 600, fontWeightBody: 300,
    spacing: 1.3, numberLetterSpacing: -1.5,
    labelTransform: 'uppercase',
    mood: 'premium', isDark: true,
  },
  'startup-gradient': {
    accent: '#a855f7', accent2: '#ec4899',
    text: '#ffffff', muted: 'rgba(255,255,255,0.7)',
    bg: 'linear-gradient(135deg, #a855f7 0%, #ec4899 100%)',
    surface: 'rgba(255,255,255,0.12)',
    border: 'rgba(255,255,255,0.25)', divider: 'rgba(255,255,255,0.12)',
    positive: '#86efac', negative: '#fda4af',
    radius: 16, strokeWidth: 1,
    shadow: '0 8px 32px rgba(168,85,247,0.4)',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 800, fontWeightBody: 500,
    spacing: 1.05, numberLetterSpacing: -1,
    labelTransform: 'none',
    mood: 'playful', isDark: true,
  },
  'corporate-monochrome': {
    accent: '#475569', accent2: '#94a3b8',
    text: '#1e293b', muted: '#64748b',
    bg: '#ffffff', surface: '#f8fafc',
    border: '#cbd5e1', divider: '#e2e8f0',
    positive: '#16a34a', negative: '#dc2626',
    radius: 6, strokeWidth: 1,
    shadow: 'none',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 600, fontWeightBody: 400,
    spacing: 1.0, numberLetterSpacing: 0,
    labelTransform: 'uppercase',
    mood: 'neutral', isDark: false,
  },
  'editorial-report': {
    accent: '#0f172a', accent2: '#7c2d12',
    text: '#0f172a', muted: '#475569',
    bg: '#fefdf8', surface: '#ffffff',
    border: '#d6d3d1', divider: '#e7e5e4',
    positive: '#15803d', negative: '#b91c1c',
    radius: 2, strokeWidth: 1.5,
    shadow: 'none',
    fontHeading: '"Playfair Display", Georgia, serif',
    fontBody:    'Lora, Georgia, serif',
    fontWeightHeading: 700, fontWeightBody: 400,
    spacing: 0.95, numberLetterSpacing: -0.5,
    labelTransform: 'uppercase',
    mood: 'editorial', isDark: false,
  },
  'investor-minimal': {
    accent: '#ea580c', accent2: '#f59e0b',
    text: '#1c1917', muted: '#78716c',
    bg: '#fafaf9', surface: '#ffffff',
    border: '#e7e5e4', divider: '#f5f5f4',
    positive: '#16a34a', negative: '#dc2626',
    radius: 4, strokeWidth: 0.75,
    shadow: 'none',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 500, fontWeightBody: 300,
    spacing: 1.25, numberLetterSpacing: -1,
    labelTransform: 'uppercase',
    mood: 'minimal', isDark: false,
  },
  'soft-geometric-blue': {
    accent: '#60a5fa', accent2: '#38bdf8',
    text: '#1e293b', muted: '#64748b',
    bg: '#eff6ff', surface: '#ffffff',
    border: '#bfdbfe', divider: '#dbeafe',
    positive: '#22c55e', negative: '#ef4444',
    radius: 12, strokeWidth: 1,
    shadow: '0 4px 12px rgba(96,165,250,0.15)',
    fontHeading: 'Inter, system-ui, sans-serif',
    fontBody:    'Inter, system-ui, sans-serif',
    fontWeightHeading: 700, fontWeightBody: 400,
    spacing: 1.0, numberLetterSpacing: -0.25,
    labelTransform: 'none',
    mood: 'geometric', isDark: false,
  },
};

export function getFamilyTokens(family: SmartFamilyId): FamilyTokens {
  return FAMILIES[family];
}

/** Internal — used by the validator. */
export const ALL_FAMILY_TOKENS: Readonly<Record<SmartFamilyId, FamilyTokens>> = FAMILIES;
