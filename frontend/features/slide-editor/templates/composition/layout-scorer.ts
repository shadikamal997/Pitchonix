// =============================================================================
//  Phase 24C / 24E — Layout Variant Scorer + Family Preferences
//
//  Given a set of candidate SlideVariants (all matching the same slide type)
//  and a ContentProfile, scores each candidate and returns the best one.
//
//  Scoring formula per variant:
//    base            = 50
//    default bonus   = +12 (first variant in the list — tiebreaker)
//    intentMatch     = +30 if variant.layoutIntent === recommendedLayoutIntent
//    signalMatch     = sum of matched contentSignal.score values
//    familyBias      = from FAMILY_PREFERENCES[familyId].intentBias
//    overflowPenalty = –35 if variant is flagged as density-incompatible
//
//  The variant with the highest total score wins. Minimum threshold: any score
//  beats 0 since base=50, so there is always a winner.
// =============================================================================

import type { SlideVariant } from './types';
import type { ContentProfile } from './content-analyzer';
import type { DeckSlideContext } from './deck-context';

// =============================================================================
//  Phase 24E — Per-family layout preferences
// =============================================================================

interface FamilyPreferences {
  /** Intents this family actively likes → bonus points added to score */
  intentBias: Partial<Record<string, number>>;
  /** Max density this family supports. Dense content on a sparse-preferring family
   *  gets a penalty to steer toward the compact/safe variant. */
  maxDensity: 'sparse' | 'balanced' | 'dense' | 'overflow-risk';
  /** If true, large single metric layouts get an extra bonus */
  preferMetricHero: boolean;
  /** If true, whitespace-preserving layouts get bonus; dense layouts get penalty */
  preferWhitespace: boolean;
}

const FAMILY_PREFERENCES: Record<string, FamilyPreferences> = {
  // Dramatic, cinematic — loves metric-heavy and asymmetric layouts
  'crimson-dark-business': {
    intentBias: {
      'metric-hero': 18, 'metric-strip': 12, 'statement-focused': 6,
      'hero-statement': 15, 'phase-cards': 10, 'funding-hero': 15,
      'vision-statement': 12, 'split-image-cover': 6, 'benefit-cards': 8,
    },
    maxDensity:       'dense',
    preferMetricHero: true,
    preferWhitespace: false,
  },

  // Professional blue — prefers structured, balanced layouts
  'light-blue-business-marketing': {
    intentBias: {
      'statement-focused': 10, 'chart-focus': 10, 'dense-bullets': 8,
      'benefit-cards': 12, 'profile-grid': 10, 'comparison-matrix': 12,
      'funding-hero': 8, 'use-of-funds-grid': 10, 'three-tier-cards': 8,
      'revenue-stream-cards': 8, 'hero-statement': 10,
    },
    maxDensity:       'dense',
    preferMetricHero: false,
    preferWhitespace: false,
  },

  // Opulent, centered — prefers large single elements, whitespace
  'luxury-dark': {
    intentBias: {
      'metric-hero': 20, 'statement-focused': 15, 'pull-quote': 12,
      'hero-statement': 16, 'vision-statement': 18, 'quote-closing': 14,
      'funding-hero': 12, 'split-image-cover': 8, 'benefit-cards': 10,
    },
    maxDensity:       'balanced',
    preferMetricHero: true,
    preferWhitespace: true,
  },

  // Energetic startup — loves floating cards, metric grids, colorful layouts
  'startup-gradient': {
    intentBias: {
      'metric-strip': 15, 'chart-focus': 12, 'three-tier': 10,
      'hero-statement': 12, 'benefit-cards': 14, 'three-tier-cards': 15,
      'use-of-funds-grid': 12, 'vision-statement': 10, 'founder-focus': 12,
      'revenue-stream-cards': 10,
    },
    maxDensity:       'dense',
    preferMetricHero: false,
    preferWhitespace: false,
  },

  // Formal monochrome — strict grids, formal text + chart
  'corporate-monochrome': {
    intentBias: {
      'editorial': 12, 'dense-bullets': 10, 'chart-focus': 8, 'statement-focused': 6,
      'comparison-matrix': 14, 'revenue-stream-cards': 10, 'profile-grid': 8,
      'three-tier-cards': 8, 'use-of-funds-grid': 10, 'feature-grid': 10,
    },
    maxDensity:       'dense',
    preferMetricHero: false,
    preferWhitespace: false,
  },

  // Magazine editorial — dense article layouts, pull quotes, sidebars
  'editorial-report': {
    intentBias: {
      'editorial': 18, 'pull-quote': 15, 'dense-bullets': 10,
      'quote-closing': 16, 'profile-grid': 10, 'vision-statement': 12,
      'feature-grid': 12, 'hero-statement': 8,
    },
    maxDensity:       'dense',
    preferMetricHero: false,
    preferWhitespace: false,
  },

  // Swiss minimal — maximum whitespace, fewer elements, giant single metrics
  'investor-minimal': {
    intentBias: {
      'metric-hero': 25, 'statement-focused': 20,
      'hero-statement': 18, 'funding-hero': 22, 'vision-statement': 20,
      'profile-grid': 10, 'compact-roadmap': 8, 'quote-closing': 12,
      'feature-grid': 8,
    },
    maxDensity:       'balanced',
    preferMetricHero: true,
    preferWhitespace: true,
  },

  // Geometric blue — soft rounded cards, structured panels
  'soft-geometric-blue': {
    intentBias: {
      'chart-focus': 12, 'statement-focused': 10, 'phase-cards': 8,
      'benefit-cards': 12, 'profile-grid': 10, 'comparison-matrix': 10,
      'three-tier-cards': 10, 'hero-statement': 10, 'split-image-cover': 12,
    },
    maxDensity:       'dense',
    preferMetricHero: false,
    preferWhitespace: false,
  },
};

const DEFAULT_PREFS: FamilyPreferences = {
  intentBias:       {},
  maxDensity:       'dense',
  preferMetricHero: false,
  preferWhitespace: false,
};

// =============================================================================
//  Debug output
// =============================================================================

export interface LayoutScoreEntry {
  layoutIntent: string | undefined;
  score:        number;
  breakdown: {
    base:           number;
    defaultBonus:   number;
    intentMatch:    number;
    signalTotal:    number;
    familyBias:     number;
    overflowPenalty:number;
    /** Phase 26D — Deck-level narrative bias. */
    narrativeBias:  number;
  };
}

export interface LayoutSelectionResult {
  chosen:     SlideVariant;
  scores:     LayoutScoreEntry[];
  fallbackUsed: boolean;
}

// =============================================================================
//  Scoring engine
// =============================================================================

function evaluateSignals(variant: SlideVariant, profile: ContentProfile): number {
  if (!variant.contentSignals || variant.contentSignals.length === 0) return 0;
  let total = 0;
  for (const sig of variant.contentSignals) {
    const rawValue: any = profile[sig.metric as keyof ContentProfile];
    const val = typeof rawValue === 'number' ? rawValue : rawValue === sig.value ? 1 : 0;
    let matched = false;
    const numVal   = typeof val === 'number' ? val : NaN;
    const numThres = typeof sig.value === 'number' ? sig.value : NaN;
    switch (sig.op) {
      case 'gt':  matched = !isNaN(numVal) && !isNaN(numThres) && numVal >  numThres; break;
      case 'gte': matched = !isNaN(numVal) && !isNaN(numThres) && numVal >= numThres; break;
      case 'lt':  matched = !isNaN(numVal) && !isNaN(numThres) && numVal <  numThres; break;
      case 'lte': matched = !isNaN(numVal) && !isNaN(numThres) && numVal <= numThres; break;
      case 'eq':  matched = rawValue === sig.value; break;
    }
    if (matched) total += sig.score;
  }
  return total;
}

function scoreVariant(
  variant:   SlideVariant,
  isDefault: boolean,
  profile:   ContentProfile,
  prefs:     FamilyPreferences,
  deckCtx?:  DeckSlideContext,
): LayoutScoreEntry {
  const base          = 50;
  const defaultBonus  = isDefault ? 12 : 0;
  const intentMatch   = variant.layoutIntent === profile.recommendedLayoutIntent ? 30 : 0;
  const signalTotal   = evaluateSignals(variant, profile);
  const familyBias    = (variant.layoutIntent ? (prefs.intentBias[variant.layoutIntent] ?? 0) : 0);

  // Overflow penalty: if the profile is dense/overflow-risk and this family
  // prefers whitespace, steer away from non-compact layouts.
  let overflowPenalty = 0;
  const isDenseVariant = variant.layoutIntent && ['editorial', 'dense-bullets', 'chart-focus', 'kpi-grid'].includes(variant.layoutIntent);
  if (prefs.preferWhitespace && profile.density === 'dense') {
    overflowPenalty -= 15;
  }
  if (prefs.preferWhitespace && profile.density === 'overflow-risk') {
    overflowPenalty -= 30;
  }
  // If variant is compact-layout and there IS overflow risk, reward it
  if (variant.layoutIntent === 'compact-layout' && profile.overflowRiskScore >= 60) {
    overflowPenalty += 20;
  }
  // Penalise dense variants on sparse-preferring families
  if (isDenseVariant && profile.density === 'sparse') {
    overflowPenalty -= 10;
  }

  // ── Phase 26D — Narrative bias from deck-level analyzers ──────────────────
  const narrativeBias = deckCtx ? computeNarrativeBias(variant, deckCtx) : 0;

  const score = base + defaultBonus + intentMatch + signalTotal + familyBias + overflowPenalty + narrativeBias;

  return {
    layoutIntent: variant.layoutIntent,
    score,
    breakdown: { base, defaultBonus, intentMatch, signalTotal, familyBias, overflowPenalty, narrativeBias },
  };
}

// =============================================================================
//  Phase 26D — Narrative Layout Planner integration
//
//  Folds Pacing, Relationship, Density, Fatigue, Transition, and Family-Style
//  signals into a single per-variant adjustment. Each subsystem's `prefer` /
//  `avoid` / `forbid` lists are walked and bonuses/penalties accumulated.
// =============================================================================

function computeNarrativeBias(variant: SlideVariant, ctx: DeckSlideContext): number {
  const intent = variant.layoutIntent;
  if (!intent) return 0;

  let bias = 0;

  // 1. Pacing directive
  if (ctx.pacing.forbidIntents.includes(intent)) bias -= 60;        // hard block
  if (ctx.pacing.avoidIntents.includes(intent))  bias -= 18;
  if (ctx.pacing.preferIntents.includes(intent)) bias += 18;

  // 2. Fatigue: blocked intents get a strong penalty
  if (ctx.fatigue.blockedIntents.includes(intent)) {
    // Scale penalty by fatigue strictness — stricter families penalise more
    const strict = ctx.familyStyle.fatigueStrictness;
    bias -= Math.round(20 + 25 * strict);
  }
  // Direct fatigue scalar — slides with high fatigue should be open to anything except blocked intents
  if (ctx.fatigue.fatigueScore >= 60 && !ctx.fatigue.blockedIntents.includes(intent)) {
    bias += 6; // small "diversify" bonus to break out of rut
  }

  // 3. Relationship: penalise repeating prev neighbour's intent
  if (ctx.relationship.sameIntentAsPrev && ctx.node.profile.recommendedLayoutIntent === intent) {
    bias -= 10;
  }
  // Diversity demand: when high, push away from the canonical recommendation
  if (ctx.relationship.diversityDemand >= 60 && intent === ctx.node.profile.recommendedLayoutIntent) {
    bias -= Math.round((ctx.relationship.diversityDemand - 50) * 0.2);
  }

  // 4. Density adjustment: balancer wants this slide lighter/denser than usual
  if (ctx.density.targetTier === 'light' &&
      ['editorial', 'dense-bullets', 'chart-focus', 'kpi-grid'].includes(intent)) {
    bias += ctx.density.bias * -1; // when bias is +25 (target=light), penalise dense intents
  }
  if (ctx.density.targetTier === 'light' &&
      ['hero-statement', 'statement-focused', 'metric-hero', 'vision-statement', 'pull-quote'].includes(intent)) {
    bias += ctx.density.bias; // reward light intents
  }

  // 5. Transition hints
  if (ctx.transition.preferIntents.includes(intent)) bias += 12;
  if (ctx.transition.avoidIntents.includes(intent))  bias -= 10;
  if (ctx.transition.recommendedStyle === 'hero-reset' &&
      ['hero-statement', 'metric-hero', 'vision-statement', 'pull-quote', 'funding-hero'].includes(intent)) {
    bias += 10;
  }

  // 6. Family-specific section bias
  const sectionBonus = ctx.familySectionBias[intent];
  if (typeof sectionBonus === 'number') bias += sectionBonus;

  // 7. Family target intensity vs slide intensity — luxury/investor favour calm,
  //    crimson/startup favour energetic. Use to nudge selection.
  if (ctx.familyStyle.preferStrongMoments &&
      ['hero-statement', 'metric-hero', 'vision-statement', 'funding-hero', 'pull-quote'].includes(intent)) {
    bias += 5;
  }
  if (ctx.familyStyle.whitespaceFirst &&
      ['editorial', 'dense-bullets'].includes(intent)) {
    bias -= 8;
  }

  return bias;
}

// =============================================================================
//  Public API
// =============================================================================

export function selectBestVariant(
  candidates: SlideVariant[],
  profile:    ContentProfile,
  familyId:   string,
  deckCtx?:   DeckSlideContext,
): LayoutSelectionResult {
  if (candidates.length === 0) {
    // This should never happen — caller guarantees at least 1 candidate.
    throw new Error('selectBestVariant: no candidates');
  }
  if (candidates.length === 1) {
    return {
      chosen: candidates[0],
      scores: [{ layoutIntent: candidates[0].layoutIntent, score: 50, breakdown: { base: 50, defaultBonus: 0, intentMatch: 0, signalTotal: 0, familyBias: 0, overflowPenalty: 0, narrativeBias: 0 } }],
      fallbackUsed: false,
    };
  }

  const prefs = FAMILY_PREFERENCES[familyId] ?? DEFAULT_PREFS;

  const scores: LayoutScoreEntry[] = candidates.map((v, i) =>
    scoreVariant(v, i === 0, profile, prefs, deckCtx),
  );

  let bestIdx = 0;
  for (let i = 1; i < scores.length; i++) {
    if (scores[i].score > scores[bestIdx].score) bestIdx = i;
  }

  return { chosen: candidates[bestIdx], scores, fallbackUsed: false };
}

// =============================================================================
//  Phase 24F — Debug logging
// =============================================================================

export function logLayoutDecision(
  slideIndex:  number,
  slideType:   string,
  profile:     ContentProfile,
  result:      LayoutSelectionResult,
): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;

  const chosen = result.chosen.layoutIntent ?? '(no-intent)';
  const top = result.scores.map((s) => `${s.layoutIntent ?? '?'}=${s.score}`).join(', ');

  console.groupCollapsed(
    `%c[Layout] slide ${slideIndex + 1} · ${slideType} → ${chosen}`,
    'color:#7c3aed;font-weight:700',
  );
  console.log('Profile :', {
    density:    profile.density,
    dominant:   profile.dominantContent,
    intent:     profile.recommendedLayoutIntent,
    density_score: profile.contentDensityScore,
    overflow:   profile.overflowRiskScore,
    bullets:    profile.bulletCount,
    metrics:    profile.metricCount,
    charts:     profile.chartCount,
    riskFlags:  profile.riskFlags,
  });
  console.log('Scores  :', top);
  result.scores.forEach((s) => {
    const { base, defaultBonus, intentMatch, signalTotal, familyBias, overflowPenalty, narrativeBias } = s.breakdown;
    console.log(
      `  ${s.layoutIntent ?? '?'} → ${s.score} ` +
      `[base:${base} default:${defaultBonus} intent:${intentMatch} signals:${signalTotal} family:${familyBias} overflow:${overflowPenalty} narrative:${narrativeBias}]`,
    );
  });
  if (result.fallbackUsed) console.warn('⚠ Fallback layout was used.');
  console.groupEnd();
}
