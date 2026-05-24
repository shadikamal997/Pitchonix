// =============================================================================
//  Phase 26I — Family-Specific Storytelling
//
//  Each TemplateFamily tells stories differently. This module encodes those
//  per-family preferences so the deck-level planner can bias decisions
//  according to the chosen template's "voice".
// =============================================================================

export interface FamilyStoryStyle {
  /** Human label. */
  voice:           string;
  /** Average target intensity (drives pacing aggression). */
  targetIntensity: number;
  /** Tolerance for density (higher = denser decks OK). */
  densityCeiling:  number;
  /** Layout intents to favour at section boundaries. */
  transitionIntents: string[];
  /** Bias for visual fatigue penalty (higher = stricter). */
  fatigueStrictness: number; // 0..1
  /** Whether to prefer fewer-but-stronger moments. */
  preferStrongMoments: boolean;
  /** Whether to lean toward whitespace-reset transitions. */
  whitespaceFirst:   boolean;
  /** Per-section intent bias map: `section → intent → bonus`. */
  sectionBias:      Record<string, Record<string, number>>;
}

const DEFAULT_STYLE: FamilyStoryStyle = {
  voice:             'neutral',
  targetIntensity:   55,
  densityCeiling:    65,
  transitionIntents: ['hero-statement', 'statement-focused'],
  fatigueStrictness: 0.5,
  preferStrongMoments: false,
  whitespaceFirst:   false,
  sectionBias:       {},
};

export const FAMILY_STORY_STYLES: Record<string, FamilyStoryStyle> = {
  // Dramatic pacing, emotional impact, bold transitions
  'crimson-dark-business': {
    voice:               'cinematic',
    targetIntensity:     70,
    densityCeiling:      70,
    transitionIntents:   ['hero-statement', 'metric-hero', 'vision-statement', 'funding-hero'],
    fatigueStrictness:   0.6,
    preferStrongMoments: true,
    whitespaceFirst:     false,
    sectionBias: {
      problem:  { 'statement-focused': 8, 'editorial': 6 },
      solution: { 'benefit-cards': 10, 'hero-statement': 8 },
      ask:      { 'funding-hero': 15, 'metric-hero': 10 },
      closing:  { 'vision-statement': 12 },
    },
  },

  // Calm, sparse, whitespace
  'investor-minimal': {
    voice:               'restrained',
    targetIntensity:     45,
    densityCeiling:      45,
    transitionIntents:   ['hero-statement', 'metric-hero', 'vision-statement'],
    fatigueStrictness:   0.85,
    preferStrongMoments: true,
    whitespaceFirst:     true,
    sectionBias: {
      cover:    { 'hero-statement': 12 },
      problem:  { 'statement-focused': 12, 'editorial': -4 },
      traction: { 'metric-hero': 15 },
      ask:      { 'funding-hero': 20 },
      closing:  { 'vision-statement': 15 },
    },
  },

  // Magazine, structured chapters
  'editorial-report': {
    voice:               'article',
    targetIntensity:     50,
    densityCeiling:      80,
    transitionIntents:   ['editorial', 'feature-grid', 'pull-quote'],
    fatigueStrictness:   0.3,
    preferStrongMoments: false,
    whitespaceFirst:     false,
    sectionBias: {
      problem:  { 'editorial': 10, 'dense-bullets': 8 },
      solution: { 'feature-grid': 10 },
      market:   { 'chart-focus': 6 },
      closing:  { 'quote-closing': 14 },
    },
  },

  // Energetic, KPI-emphasis
  'startup-gradient': {
    voice:               'energetic',
    targetIntensity:     65,
    densityCeiling:      75,
    transitionIntents:   ['hero-statement', 'metric-strip', 'three-tier-cards'],
    fatigueStrictness:   0.5,
    preferStrongMoments: false,
    whitespaceFirst:     false,
    sectionBias: {
      cover:    { 'hero-statement': 8, 'split-image-cover': 8 },
      solution: { 'benefit-cards': 12 },
      traction: { 'metric-strip': 14 },
      pricing:  { 'three-tier-cards': 12 },
      ask:      { 'funding-hero': 8 },
    },
  },

  // Formal executive structure
  'corporate-monochrome': {
    voice:               'executive',
    targetIntensity:     50,
    densityCeiling:      80,
    transitionIntents:   ['editorial', 'comparison-matrix', 'statement-focused'],
    fatigueStrictness:   0.4,
    preferStrongMoments: false,
    whitespaceFirst:     false,
    sectionBias: {
      problem:        { 'editorial': 8 },
      competition:    { 'comparison-matrix': 12 },
      market:         { 'chart-focus': 10 },
      financial_projection: { 'editorial': 6 },
    },
  },

  // Premium luxury — fewer but stronger moments
  'luxury-dark': {
    voice:               'opulent',
    targetIntensity:     65,
    densityCeiling:      55,
    transitionIntents:   ['hero-statement', 'vision-statement', 'quote-closing'],
    fatigueStrictness:   0.7,
    preferStrongMoments: true,
    whitespaceFirst:     true,
    sectionBias: {
      cover:    { 'hero-statement': 14 },
      ask:      { 'funding-hero': 12 },
      closing:  { 'vision-statement': 18, 'quote-closing': 14 },
    },
  },

  // Structured business — chart + comparison heavy
  'light-blue-business-marketing': {
    voice:               'professional',
    targetIntensity:     55,
    densityCeiling:      70,
    transitionIntents:   ['hero-statement', 'statement-focused'],
    fatigueStrictness:   0.5,
    preferStrongMoments: false,
    whitespaceFirst:     false,
    sectionBias: {
      solution:    { 'benefit-cards': 10 },
      market:      { 'chart-focus': 12 },
      competition: { 'comparison-matrix': 10 },
      traction:    { 'metric-strip': 8 },
    },
  },

  // Geometric, structured
  'soft-geometric-blue': {
    voice:               'geometric',
    targetIntensity:     55,
    densityCeiling:      70,
    transitionIntents:   ['hero-statement', 'statement-focused', 'benefit-cards'],
    fatigueStrictness:   0.5,
    preferStrongMoments: false,
    whitespaceFirst:     false,
    sectionBias: {
      solution:    { 'benefit-cards': 12 },
      traction:    { 'metric-strip': 10 },
      pricing:     { 'three-tier-cards': 10 },
    },
  },
};

export function getFamilyStoryStyle(familyId?: string): FamilyStoryStyle {
  if (!familyId) return DEFAULT_STYLE;
  return FAMILY_STORY_STYLES[familyId] ?? DEFAULT_STYLE;
}
