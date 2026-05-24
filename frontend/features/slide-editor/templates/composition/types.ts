// =============================================================================
//  Template Composition Engine — types
//
//  A "template family" is a complete visual system. Each family owns a unique
//  visual identity that goes far beyond color/font swaps:
//
//   - per-slide-type compositions (cover/problem/solution/team/ask… each unique)
//   - decorative chrome (corner marks, accent rails, frame lines, page-number style)
//   - typography scale (per element type — heading sizes vary 40-96pt across families)
//   - shape language (sharp vs rounded vs hairline)
//   - spacing scale (gap / padding base unit)
//   - slot system (where each element type lands per slide type)
//
//  Switching a family triggers `mapElementsToFamilyVariant()` which remaps
//  existing elements to the new family's slot positions, preserving content.
// =============================================================================

import type React from 'react';
import type { SlideElementDTO, ElementType } from '@/types/slide-element';

// =============================================================================
//  Slide type taxonomy — the system supports an open set; families register
//  variants for the slide types they care about, plus a default fallback.
// =============================================================================

export type SlideTypeKey =
  | 'cover'
  | 'problem'
  | 'solution'
  | 'market_opportunity' | 'market' | 'tam_sam_som'
  | 'business_model'      | 'revenue_streams'
  | 'traction'            | 'customer_segment'
  | 'competition'         | 'competitor_analysis' | 'competitive_advantage'
  | 'go_to_market'
  | 'roadmap'             | 'product_roadmap'
  | 'team'
  | 'financial_projection'
  | 'ask'                 | 'investment_ask' | 'use_of_funds'
  | 'executive_summary'
  | 'pricing'
  | 'closing'
  | 'thank_you'
  | 'appendix'
  | 'default';

// =============================================================================
//  Slot system — generalised from Phase 11. Each slot accepts certain element
//  types (priority order) and has a position + style hint for the renderer.
// =============================================================================

export interface VariantSlot {
  id:           string;
  acceptsTypes: ElementType[];      // priority order
  x:            number;             // 0..100 %
  y:            number;
  w:            number;
  h:            number;
  /** Family-specific hint the renderer uses to style this slot
   *  (e.g. 'hero', 'side', 'displayNumber', 'asideQuote'). */
  role?:        string;
}

// =============================================================================
//  Per-element typography overrides for the family
// =============================================================================

export interface FamilyTypography {
  fontFamily?:    { heading?: string; body?: string };
  /** Per element type — applied as default style when family is active. */
  perType?: Partial<Record<ElementType, {
    fontSize?:      number;
    fontWeight?:    number;
    letterSpacing?: number;
    textTransform?: 'uppercase' | 'lowercase' | 'capitalize' | 'none';
    lineHeight?:    number;
    color?:         string;
    fontFamily?:    string;
  }>>;
}

// =============================================================================
//  Decorative chrome — the "background composition" of a slide.
//  Each variant declares its own chrome (and the renderer paints SVG / divs).
// =============================================================================

export interface DecorativeChrome {
  /** Background fill (solid, gradient, image). */
  background?:    string;            // any CSS background value
  /** Stage padding within the 16:9 box (in %). Some families need huge margins. */
  insetTop?:      number;
  insetRight?:    number;
  insetBottom?:   number;
  insetLeft?:     number;
  /** A React component that paints decorative shapes (corner marks, lines,
   *  geometric accents, framing rules, etc.) inside the slide stage. It runs
   *  BEHIND the elements but in front of the background. */
  decorations?:   React.FC<{ slideIndex: number; total: number }>;
  /** A React component that paints overlays (page number style, footer text,
   *  signature mark) IN FRONT of element content. */
  overlays?:      React.FC<{ slideIndex: number; total: number; title?: string }>;
}

// =============================================================================
//  Slide variant — the full composition for one slide type
// =============================================================================

export interface SlideVariant {
  /** Which slide types this variant applies to. The first match wins. */
  matches:    SlideTypeKey[];
  /** Slot positions for this variant. */
  slots:      VariantSlot[];
  /** Decorative chrome for this variant (overrides family-level chrome). */
  chrome?:    DecorativeChrome;
  /** Typography overrides specific to this slide type. */
  typography?: FamilyTypography;

  // ---------------------------------------------------------------------------
  //  Phase 26-era layout-scorer hints (consumed by layout-scorer.ts +
  //  fatigue-analyzer.ts). All optional — variants that don't declare them
  //  get a base score and let the default-variant bonus break ties.
  //
  //  layoutIntent  : the named layout shape (e.g. 'metric-hero', 'three-tier',
  //                  'compact-layout') — compared against the content profile's
  //                  recommendedLayoutIntent for a +30 bonus on match.
  //
  //  contentSignals: rules that bump this variant when the slide content
  //                  matches a metric/threshold (e.g. bullet count > 5 → +10).
  // ---------------------------------------------------------------------------
  layoutIntent?:    string;
  contentSignals?:  Array<{
    metric: string;
    op:     'gt' | 'gte' | 'lt' | 'lte' | 'eq';
    value:  number | string;
    score:  number;
  }>;
}

// =============================================================================
//  Family — the top-level visual system
// =============================================================================

export interface TemplateFamily {
  id:        string;                  // 'investor-minimal', 'luxury-dark', etc.
  name:      string;
  category?: string;
  /** Theme tokens — colors, base fonts. Used by the renderer for accent colors. */
  theme: {
    primary:    string;
    secondary?: string;
    accent:     string;
    text:       string;
    muted:      string;
    surface:    string;
    background: string;
    fontHeading: string;
    fontBody:    string;
  };
  /** Family-wide typography defaults. Variants can override per slide type. */
  typography: FamilyTypography;
  /** Family-wide decorative chrome. Variants can override. */
  chrome:    DecorativeChrome;
  /** Per-slide-type variants. Lookup is `slideType → first variant whose `matches` includes it`. */
  variants:  SlideVariant[];
}

// =============================================================================
//  Lookup helpers
// =============================================================================

export function findVariant(family: TemplateFamily, slideType: string): SlideVariant | null {
  const key = slideType as SlideTypeKey;
  for (const v of family.variants) {
    if (v.matches.includes(key)) return v;
  }
  const def = family.variants.find((v) => v.matches.includes('default'));
  return def || family.variants[0] || null;
}

/**
 * Return every variant within the family that matches `slideType` (vs.
 * `findVariant` which returns only the first). Used by the canvas's
 * layout scorer to evaluate multiple candidate layouts and pick the best
 * one for the slide's content.
 */
export function findAllVariants(family: TemplateFamily, slideType: string): SlideVariant[] {
  const key = slideType as SlideTypeKey;
  const matches = family.variants.filter((v) => v.matches.includes(key));
  if (matches.length > 0) return matches;
  const def = family.variants.filter((v) => v.matches.includes('default'));
  return def.length > 0 ? def : (family.variants[0] ? [family.variants[0]] : []);
}
