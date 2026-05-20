// =============================================================================
//  Pitchonix Design System — Phase 1 foundation tokens
//
//  Every renderer / family / slot should read from THESE scales. No more
//  inline magic numbers ("48px font", "24 padding", "shadow: 0 4px 12px ...").
//
//  Scales are intentionally narrow so designers cannot drift the system.
//  If a value isn't in a scale, it needs justification (and probably a token).
// =============================================================================

// -----------------------------------------------------------------------------
//  Typography scale — Major-Third progression (1.25x), anchored at 16px body.
//  Use the named step everywhere; never hard-code a fontSize.
// -----------------------------------------------------------------------------

export const TYPOGRAPHY = {
  // step name → font-size in px
  xs:    10,
  sm:    12,
  base:  14,    // body default
  md:    16,
  lg:    20,
  xl:    24,
  '2xl': 28,
  '3xl': 36,
  '4xl': 44,
  '5xl': 56,
  '6xl': 72,
  '7xl': 88,
  '8xl': 108,
  '9xl': 132,
  '10xl': 160,
} as const;

export type TypographyStep = keyof typeof TYPOGRAPHY;

// -----------------------------------------------------------------------------
//  Weight scale — common Google Fonts weights only.
// -----------------------------------------------------------------------------

export const WEIGHT = {
  light:    300,
  regular:  400,
  medium:   500,
  semibold: 600,
  bold:     700,
  extrabold: 800,
  black:    900,
} as const;

export type WeightStep = keyof typeof WEIGHT;

// -----------------------------------------------------------------------------
//  Line-height scale — paired with typography step intent.
// -----------------------------------------------------------------------------

export const LINE_HEIGHT = {
  tight:    1.0,    // display headings, single line
  snug:     1.12,
  normal:   1.35,
  relaxed:  1.55,
  loose:    1.7,    // long-form body
} as const;

// -----------------------------------------------------------------------------
//  Spacing scale — 4-px base. Use TS keys, not numbers.
// -----------------------------------------------------------------------------

export const SPACING = {
  0:   0,
  1:   4,
  2:   8,
  3:   12,
  4:   16,
  5:   20,
  6:   24,
  8:   32,
  10:  40,
  12:  48,
  16:  64,
  20:  80,
  24:  96,
} as const;

export type SpacingStep = keyof typeof SPACING;

// -----------------------------------------------------------------------------
//  Border radius scale — shape language tokens.
// -----------------------------------------------------------------------------

export const RADIUS = {
  none:    0,
  sm:      4,
  md:      8,
  lg:      12,
  xl:      16,
  '2xl':   24,
  pill:    9999,
} as const;

export type RadiusStep = keyof typeof RADIUS;

// -----------------------------------------------------------------------------
//  Elevation / shadow scale — semantic levels, not magic strings.
// -----------------------------------------------------------------------------

export const ELEVATION = {
  none:   'none',
  sm:     '0 1px 2px rgba(15, 23, 42, 0.06), 0 1px 3px rgba(15, 23, 42, 0.04)',
  md:     '0 4px 8px rgba(15, 23, 42, 0.08), 0 2px 4px rgba(15, 23, 42, 0.04)',
  lg:     '0 8px 24px rgba(15, 23, 42, 0.12), 0 4px 8px rgba(15, 23, 42, 0.06)',
  xl:     '0 16px 40px rgba(15, 23, 42, 0.16), 0 8px 16px rgba(15, 23, 42, 0.08)',
  premium:'0 20px 48px rgba(15, 23, 42, 0.18), 0 12px 24px rgba(15, 23, 42, 0.10)',
} as const;

export type ElevationStep = keyof typeof ELEVATION;

// -----------------------------------------------------------------------------
//  Safe area — top/bottom/sides on a 16:9 slide that must stay free of content
//  so chrome (page number, brand mark, frame lines) has room.
//
//  Values are in % of slide width/height (matches element coord system).
// -----------------------------------------------------------------------------

export const SAFE_AREA = {
  top:        6,      // above this y, only chrome / decorations
  bottom:     8,      // below 92%, footer + page number only
  leftStandard:  6,
  rightStandard: 6,
  leftWide:      14,  // some families use a left band (Light Blue, Investor)
  rightWide:     8,
} as const;

// -----------------------------------------------------------------------------
//  Grid — 12-column grid at 16:9 (1280×720).
//  Gutter is 8px (~0.625% of width). Column = (100% - 2×margin - 11×gutter) / 12.
// -----------------------------------------------------------------------------

export const GRID = {
  columns: 12,
  gutter:  0.6,                       // % of slide width between columns
  marginX: SAFE_AREA.leftStandard,    // % of slide width left/right margin
} as const;

/** Compute the x and width of a span on the 12-col grid (returns 0..100 %). */
export function gridSpan(startCol: number, colCount: number, opts: { marginX?: number } = {}): { x: number; w: number } {
  const margin = opts.marginX ?? GRID.marginX;
  const innerW = 100 - 2 * margin;
  const colW = (innerW - (GRID.columns - 1) * GRID.gutter) / GRID.columns;
  const x = margin + (startCol - 1) * (colW + GRID.gutter);
  const w = colCount * colW + (colCount - 1) * GRID.gutter;
  return { x: +x.toFixed(3), w: +w.toFixed(3) };
}

// -----------------------------------------------------------------------------
//  Vertical rhythm — y-bands on a 16:9 slide.
//  Compositions place content INTO these bands; values are % of slide height.
// -----------------------------------------------------------------------------

export const RHYTHM = {
  // Top safe-area + eyebrow label
  yEyebrow:   8,    hEyebrow:   4,
  // Title block (display heading)
  yTitle:     13,   hTitle:     12,
  // Subtitle block (deck/section label)
  ySubtitle:  27,   hSubtitle:  5,
  // Lead paragraph (short intro / lede)
  yLead:      34,   hLead:      6,
  // Body / composite zone
  yBody:      42,   hBody:      44,
  // Footer / page number band
  yFooter:    92,   hFooter:    4,
} as const;

// -----------------------------------------------------------------------------
//  Type-style presets — paired step + weight + line-height for common roles.
//  Families can override; this is the baseline.
// -----------------------------------------------------------------------------

export const TYPE_STYLES = {
  displayHero:    { size: TYPOGRAPHY['7xl'], weight: WEIGHT.extrabold, lineHeight: LINE_HEIGHT.tight,    letterSpacing: -1.5 },
  displayLarge:   { size: TYPOGRAPHY['6xl'], weight: WEIGHT.bold,      lineHeight: LINE_HEIGHT.tight,    letterSpacing: -1.0 },
  heading:        { size: TYPOGRAPHY['4xl'], weight: WEIGHT.bold,      lineHeight: LINE_HEIGHT.snug,     letterSpacing: -0.5 },
  subheading:     { size: TYPOGRAPHY.md,     weight: WEIGHT.semibold,  lineHeight: LINE_HEIGHT.normal,   letterSpacing: 0    },
  eyebrow:        { size: TYPOGRAPHY.sm,     weight: WEIGHT.bold,      lineHeight: LINE_HEIGHT.snug,     letterSpacing: 2    },
  paragraph:      { size: TYPOGRAPHY.base,   weight: WEIGHT.regular,   lineHeight: LINE_HEIGHT.relaxed,  letterSpacing: 0    },
  caption:        { size: TYPOGRAPHY.xs,     weight: WEIGHT.medium,    lineHeight: LINE_HEIGHT.normal,   letterSpacing: 1    },
  metricBig:      { size: TYPOGRAPHY['8xl'], weight: WEIGHT.black,     lineHeight: LINE_HEIGHT.tight,    letterSpacing: -3.0 },
  metricHuge:     { size: TYPOGRAPHY['9xl'], weight: WEIGHT.black,     lineHeight: LINE_HEIGHT.tight,    letterSpacing: -4.0 },
  quote:          { size: TYPOGRAPHY['2xl'], weight: WEIGHT.medium,    lineHeight: LINE_HEIGHT.normal,   letterSpacing: -0.3 },
  cta:            { size: TYPOGRAPHY.sm,     weight: WEIGHT.bold,      lineHeight: LINE_HEIGHT.snug,     letterSpacing: 2    },
} as const;

// -----------------------------------------------------------------------------
//  Density — controls margin / padding inside cards.
// -----------------------------------------------------------------------------

export const DENSITY = {
  compact:     { pad: SPACING[2], gap: SPACING[2] },
  comfortable: { pad: SPACING[4], gap: SPACING[3] },
  spacious:    { pad: SPACING[6], gap: SPACING[5] },
} as const;

export type DensityStep = keyof typeof DENSITY;
