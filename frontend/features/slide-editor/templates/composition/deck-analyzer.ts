// =============================================================================
//  Phase 26A — DeckNarrativeAnalyzer
//
//  Classifies each slide by narrative role, derives intensity/density curves,
//  and recognises the overall storytelling structure.
//
//  Output: DeckNarrativeProfile, consumed downstream by VisualPacingEngine,
//  SectionTransitionPlanner, NarrativeQualityScore, and the layout scorer.
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';
import { analyzeContent, type ContentProfile } from './content-analyzer';

export type NarrativeRole =
  | 'intro'
  | 'setup'
  | 'problem'
  | 'urgency'
  | 'solution'
  | 'proof'
  | 'market'
  | 'business-model'
  | 'traction'
  | 'differentiation'
  | 'credibility'
  | 'roadmap'
  | 'ask'
  | 'closing';

export type NarrativeType =
  | 'classic-pitch'     // problem → solution → market → traction → ask
  | 'product-launch'    // intro → feature → demo → traction → call-to-action
  | 'data-story'        // setup → data → insights → recommendation
  | 'strategy'          // landscape → challenge → strategy → execution
  | 'sales'             // hook → pain → solution → proof → close
  | 'board-update'      // recap → metrics → priorities → asks
  | 'training'          // overview → concepts → exercises → recap
  | 'unknown';

export type StoryStructure =
  | 'three-act'         // setup, confrontation, resolution
  | 'hero-journey'      // ordinary → call → trials → reward → return
  | 'situation-complication-resolution'  // McKinsey SCR
  | 'star'              // single dominant peak
  | 'crescendo'         // monotonically rising intensity
  | 'plateau'           // flat narrative — fatigue risk
  | 'unstructured';

export interface SlideNarrativeNode {
  index:           number;
  slideType:       string;
  role:            NarrativeRole;
  /** 0–100. Emotional/dramatic intensity of the slide. */
  intensity:       number;
  /** 0–100. Content density score (same scale as ContentProfile). */
  density:         number;
  /** Cached content profile for use by downstream analyzers. */
  profile:         ContentProfile;
  /** Title length for repetition detection. */
  titleLength:     number;
  /** Dominant content type (text/metrics/chart/etc). */
  dominantContent: string;
}

export interface DeckNarrativeProfile {
  nodes:           SlideNarrativeNode[];
  narrativeType:   NarrativeType;
  storyStructure:  StoryStructure;
  /** Average density 0–100. */
  avgDensity:      number;
  /** Average intensity 0–100. */
  avgIntensity:    number;
  /** Standard deviation of density (high = good variation). */
  densityVariance: number;
  /** Per-slide pacing label — derived from density+intensity curves. */
  pacingMap:       Array<'rest' | 'build' | 'peak' | 'cooldown'>;
  /** Per-slide intensity values (0–100). */
  intensityCurve:  number[];
  /** Per-slide density values (0–100). */
  densityCurve:    number[];
  /** Confidence the analyzer is correct about narrativeType (0–1). */
  confidenceScore: number;
}

export interface DeckSlideInput {
  slideType: string;
  title?:    string;
  elements:  SlideElementDTO[];
}

// =============================================================================
//  Slide-type → narrative role mapping
// =============================================================================

const SLIDE_TYPE_TO_ROLE: Record<string, NarrativeRole> = {
  'cover':                 'intro',
  'executive_summary':     'setup',
  'problem':               'problem',
  'solution':              'solution',
  'market':                'market',
  'market_opportunity':    'market',
  'tam_sam_som':           'market',
  'business_model':        'business-model',
  'revenue_streams':       'business-model',
  'traction':              'traction',
  'customer_segment':      'traction',
  'competition':           'differentiation',
  'competitor_analysis':   'differentiation',
  'competitive_advantage': 'differentiation',
  'go_to_market':          'business-model',
  'product_roadmap':       'roadmap',
  'roadmap':               'roadmap',
  'team':                  'credibility',
  'financial_projection':  'proof',
  'pricing':               'business-model',
  'ask':                   'ask',
  'investment_ask':        'ask',
  'use_of_funds':          'ask',
  'closing':               'closing',
  'thank_you':             'closing',
  'appendix':              'closing',
  'default':               'setup',
};

function roleFor(slideType: string): NarrativeRole {
  return SLIDE_TYPE_TO_ROLE[slideType] ?? 'setup';
}

// =============================================================================
//  Intensity model
//
//  Each narrative role has a base intensity. Content modifiers can boost it:
//   - large metrics + bold title → peak intensity
//   - dense text → cooldown intensity
//   - chart with single big number → peak
// =============================================================================

const BASE_INTENSITY: Record<NarrativeRole, number> = {
  'intro':           75,
  'setup':           35,
  'problem':         70,
  'urgency':         85,
  'solution':        80,
  'proof':           65,
  'market':          60,
  'business-model':  45,
  'traction':        75,
  'differentiation': 55,
  'credibility':     50,
  'roadmap':         50,
  'ask':             90,
  'closing':         80,
};

function intensityFor(role: NarrativeRole, profile: ContentProfile): number {
  let base = BASE_INTENSITY[role];

  // A single dominant metric is dramatic
  if (profile.metricCount === 1 && profile.paragraphWordCount < 40) base += 10;
  // Heavy charts with no surrounding text feel emphatic
  if (profile.chartCount === 1 && profile.bulletCount === 0) base += 6;
  // Dense bulleted slides feel like cooldown
  if (profile.bulletCount >= 6) base -= 12;
  // Overflow-risk slides drop intensity — they feel cluttered
  if (profile.density === 'overflow-risk') base -= 8;
  // Pull quotes are peaks
  if (profile.quoteLength > 40) base += 12;

  return Math.max(0, Math.min(100, base));
}

// =============================================================================
//  Narrative type classification
//
//  Heuristic: examine the role sequence; classify against canonical templates.
// =============================================================================

function classifyNarrativeType(roles: NarrativeRole[]): { type: NarrativeType; confidence: number } {
  const has = (r: NarrativeRole) => roles.includes(r);
  const set = new Set(roles);

  const hasPitchCore =
    has('problem') && has('solution') && has('market') && has('traction') && has('ask');

  if (hasPitchCore) return { type: 'classic-pitch', confidence: 0.9 };

  if (has('ask') && has('traction') && set.size <= 8) {
    return { type: 'board-update', confidence: 0.7 };
  }

  if (has('solution') && has('proof') && !has('ask')) {
    return { type: 'product-launch', confidence: 0.75 };
  }

  if (has('problem') && has('solution') && has('proof') && !has('market')) {
    return { type: 'sales', confidence: 0.7 };
  }

  if (has('setup') && has('market') && !has('ask')) {
    return { type: 'data-story', confidence: 0.6 };
  }

  if (has('differentiation') && has('roadmap') && !has('ask')) {
    return { type: 'strategy', confidence: 0.6 };
  }

  if (set.size >= 4 && !has('ask') && !has('problem')) {
    return { type: 'training', confidence: 0.5 };
  }

  return { type: 'unknown', confidence: 0.3 };
}

// =============================================================================
//  Story structure classification
//
//  Looks at the intensity curve shape, not the role sequence.
// =============================================================================

function classifyStoryStructure(intensity: number[], density: number[]): StoryStructure {
  if (intensity.length < 3) return 'unstructured';

  const mean   = intensity.reduce((s, v) => s + v, 0) / intensity.length;
  const stdDev = Math.sqrt(intensity.reduce((s, v) => s + (v - mean) ** 2, 0) / intensity.length);
  const peakIdx = intensity.indexOf(Math.max(...intensity));
  const lowIdx  = intensity.indexOf(Math.min(...intensity));

  // Crescendo: monotonically rising
  let rising = 0;
  for (let i = 1; i < intensity.length; i++) {
    if (intensity[i] >= intensity[i - 1] - 5) rising++;
  }
  if (rising >= intensity.length - 2) return 'crescendo';

  // Plateau: very low variance
  if (stdDev < 8) return 'plateau';

  // Star: single dominant peak in middle, slope down each side
  const mid = Math.floor(intensity.length / 2);
  if (Math.abs(peakIdx - mid) <= 1 && stdDev > 15) return 'star';

  // SCR: low → rise → rest pattern, peak in last third
  if (peakIdx >= Math.floor(intensity.length * 0.6) && lowIdx < peakIdx) {
    return 'situation-complication-resolution';
  }

  // Three-act: density curve has clear setup→climax→resolution shape
  const thirds = Math.floor(intensity.length / 3);
  if (thirds >= 1) {
    const a = avg(intensity.slice(0, thirds));
    const b = avg(intensity.slice(thirds, thirds * 2));
    const c = avg(intensity.slice(thirds * 2));
    if (b > a + 5 && b > c - 5) return 'three-act';
  }

  // Hero journey: dip after intro then rise toward end
  if (intensity.length >= 5 && intensity[0] > intensity[1] && intensity[intensity.length - 1] > mean) {
    return 'hero-journey';
  }

  return 'unstructured';
}

function avg(xs: number[]): number {
  if (xs.length === 0) return 0;
  return xs.reduce((s, v) => s + v, 0) / xs.length;
}

// =============================================================================
//  Pacing labels
//
//  Per-slide bucket:
//   - 'rest':    low intensity + low density (intro/transition/breather)
//   - 'build':   rising intensity from previous slide
//   - 'peak':    local intensity maximum
//   - 'cooldown':descending intensity from a peak
// =============================================================================

function deriveBpcePacing(intensity: number[]): Array<'rest' | 'build' | 'peak' | 'cooldown'> {
  const out: Array<'rest' | 'build' | 'peak' | 'cooldown'> = [];
  for (let i = 0; i < intensity.length; i++) {
    const cur  = intensity[i];
    const prev = i > 0 ? intensity[i - 1] : cur;
    const next = i < intensity.length - 1 ? intensity[i + 1] : cur;
    if (cur >= prev && cur >= next && cur >= 60) out.push('peak');
    else if (cur < 40 && Math.abs(cur - prev) < 12) out.push('rest');
    else if (cur > prev + 6) out.push('build');
    else if (cur < prev - 6) out.push('cooldown');
    else if (cur >= 60) out.push('peak');
    else out.push('rest');
  }
  return out;
}

// =============================================================================
//  Public API
// =============================================================================

export function analyzeDeckNarrative(slides: DeckSlideInput[]): DeckNarrativeProfile {
  const nodes: SlideNarrativeNode[] = slides.map((s, i) => {
    const profile = analyzeContent(s.elements);
    const role    = roleFor(s.slideType);
    return {
      index:           i,
      slideType:       s.slideType,
      role,
      intensity:       intensityFor(role, profile),
      density:         profile.contentDensityScore,
      profile,
      titleLength:     profile.titleLength,
      dominantContent: profile.dominantContent,
    };
  });

  const intensityCurve = nodes.map((n) => n.intensity);
  const densityCurve   = nodes.map((n) => n.density);
  const avgDensity     = avg(densityCurve);
  const avgIntensity   = avg(intensityCurve);
  const variance       = densityCurve.reduce((s, v) => s + (v - avgDensity) ** 2, 0) / Math.max(1, densityCurve.length);
  const densityVariance = Math.sqrt(variance);

  const { type: narrativeType, confidence: confidenceScore } =
    classifyNarrativeType(nodes.map((n) => n.role));

  const storyStructure = classifyStoryStructure(intensityCurve, densityCurve);
  const pacingMap      = deriveBpcePacing(intensityCurve);

  return {
    nodes,
    narrativeType,
    storyStructure,
    avgDensity,
    avgIntensity,
    densityVariance,
    pacingMap,
    intensityCurve,
    densityCurve,
    confidenceScore,
  };
}
