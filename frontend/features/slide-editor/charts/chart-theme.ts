// =============================================================================
//  Phase 33A + 33G — Chart Theme Engine
//
//  Derives a per-chart palette + typography from the active composition
//  family. Falls back to the legacy 8-colour palette when no family is
//  resolved (preserves the look of charts that pre-date Phase 33).
//
//  Used by ChartRenderer to colour every chart variant — bar, line, area,
//  pie, donut, scatter, funnel, waterfall, radar, heatmap, etc.
// =============================================================================

import { getCardTokens } from '../renderers/card-variants';

export interface ChartTheme {
  /** Sequential palette — index N picks the Nth series. Length ≥ 4. */
  palette:        string[];
  /** Accent colour used for primary metric highlights. */
  accent:         string;
  /** Background colour of the chart card (transparent allowed). */
  background:    string;
  /** Default text colour for chart labels and titles. */
  text:           string;
  /** Muted text colour for axis ticks and footnotes. */
  muted:          string;
  /** Grid line colour. */
  grid:           string;
  /** Colour used for "best value" callouts in the insight layer. */
  positive:       string;
  /** Colour used for "worst value" or negative callouts. */
  negative:       string;
  fontFamily?:    string;
}

// =============================================================================
//  Legacy palette (kept for backwards compatibility when no family is active)
// =============================================================================

const LEGACY_PALETTE = [
  '#16a34a', '#0ea5e9', '#7c3aed', '#f59e0b',
  '#ef4444', '#0891b2', '#db2777', '#525252',
];

// =============================================================================
//  Default theme — what we hand back when family isn't recognised
// =============================================================================

export const DEFAULT_CHART_THEME: ChartTheme = {
  palette:    LEGACY_PALETTE,
  accent:     '#16a34a',
  background: 'transparent',
  text:       '#111827',
  muted:      '#6b7280',
  grid:       '#e5e7eb',
  positive:   '#16a34a',
  negative:   '#ef4444',
};

// =============================================================================
//  Family → theme mapping
//
//  Each family's "accentColor" becomes the chart's accent + the lead palette
//  entry. The remaining palette entries are drawn from the legacy palette
//  (skipping any that would clash with the accent) so multi-series charts
//  still get distinct colours.
// =============================================================================

export function getChartTheme(familyId?: string | null, override?: Partial<ChartTheme>): ChartTheme {
  // No family → legacy look.
  if (!familyId) {
    return { ...DEFAULT_CHART_THEME, ...(override || {}) };
  }
  const tk = getCardTokens(familyId);
  // Derive the palette: lead with the family accent, then dedupe + extend
  // from the legacy palette so series ≥ 2 are still differentiated.
  const leadColors = [tk.accentColor, tk.metricColor, tk.headingColor]
    .filter((c, i, arr) => !!c && arr.indexOf(c) === i);
  const seen = new Set(leadColors.map((c) => c.toLowerCase()));
  const palette = [
    ...leadColors,
    ...LEGACY_PALETTE.filter((c) => !seen.has(c.toLowerCase())),
  ].slice(0, 8);

  // Cards backgrounds can be dark (Crimson, Luxury) — pick a text colour
  // that contrasts.
  const isDark = isDarkColor(tk.cardBg);

  const theme: ChartTheme = {
    palette,
    accent:     tk.accentColor,
    background: 'transparent',  // Chart card backgrounds are owned by the host slide; keep transparent.
    text:       isDark ? '#f9fafb' : tk.headingColor || '#111827',
    muted:      isDark ? '#cbd5e1' : tk.mutedColor   || '#6b7280',
    grid:       isDark ? 'rgba(255,255,255,0.08)' : 'rgba(15,23,42,0.08)',
    positive:   '#16a34a',
    negative:   '#ef4444',
    fontFamily: tk.fontBody,
  };
  return { ...theme, ...(override || {}) };
}

// =============================================================================
//  Helpers
// =============================================================================

function isDarkColor(color: string): boolean {
  if (!color) return false;
  // Detect rgba(...) with alpha — if the base colour is dark and alpha > 0.5
  const rgba = color.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/);
  if (rgba) {
    const r = +rgba[1], g = +rgba[2], b = +rgba[3];
    return (r * 299 + g * 587 + b * 114) / 1000 < 110;
  }
  const hex = color.trim();
  let r = 0, g = 0, b = 0;
  if (/^#([0-9a-fA-F]{6})$/.test(hex)) {
    r = parseInt(hex.slice(1, 3), 16);
    g = parseInt(hex.slice(3, 5), 16);
    b = parseInt(hex.slice(5, 7), 16);
  } else if (/^#([0-9a-fA-F]{3})$/.test(hex)) {
    r = parseInt(hex[1] + hex[1], 16);
    g = parseInt(hex[2] + hex[2], 16);
    b = parseInt(hex[3] + hex[3], 16);
  } else {
    return false;
  }
  return (r * 299 + g * 587 + b * 114) / 1000 < 110;
}

/** Convenience: pick the Nth palette colour, wrapping. */
export function paletteColorAt(theme: ChartTheme, index: number): string {
  return theme.palette[index % theme.palette.length];
}
