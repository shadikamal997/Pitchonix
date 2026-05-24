// =============================================================================
//  Phase 26B — VisualPacingEngine
//
//  Looks at the deck as a sequence and prescribes "rhythm" adjustments to
//  prevent monotony:
//   - 3 dense slides in a row → push the third toward 'lighter' variants
//   - 3 metric slides in a row → push the third toward non-KPI variants
//   - 3 identical layout intents in a row → force diversification
//
//  Each slide gets a PacingDirective with desired/avoided intents and a
//  "weight" used by the layout scorer (Phase 26D integration).
// =============================================================================

import type { SlideNarrativeNode } from './deck-analyzer';

export interface PacingDirective {
  /** Slot in the deck's rhythm. */
  beat:            'dense' | 'medium' | 'light' | 'strong' | 'rest';
  /** Layout intents that should be PREFERRED for this slide (positive bias). */
  preferIntents:   string[];
  /** Layout intents that should be AVOIDED (negative bias). */
  avoidIntents:    string[];
  /** Layout intents that should be FORBIDDEN if at all possible. */
  forbidIntents:   string[];
  /** Reason — debug/explainability. */
  reason:          string;
}

export interface PacingPlan {
  directives: PacingDirective[];
  /** Per-slide rhythm assignment. */
  rhythm:     Array<'dense' | 'medium' | 'light' | 'strong' | 'rest'>;
  /** Issues detected (used by validator). */
  issues:     Array<{ index: number; severity: 'warn' | 'error'; message: string }>;
}

const DENSE_INTENTS   = new Set(['editorial', 'dense-bullets', 'chart-focus', 'kpi-grid', 'comparison-matrix', 'comparison-table']);
const METRIC_INTENTS  = new Set(['metric-hero', 'metric-strip', 'kpi-grid', 'funding-hero']);
const HERO_INTENTS    = new Set(['hero-statement', 'metric-hero', 'vision-statement', 'pull-quote', 'quote-closing', 'funding-hero']);
const LIGHT_INTENTS   = new Set(['statement-focused', 'hero-statement', 'vision-statement', 'quote-closing', 'pull-quote']);

// =============================================================================
//  Window scan — detect 3-in-a-row patterns
// =============================================================================

function isDense(n: SlideNarrativeNode): boolean {
  return n.density >= 55 || DENSE_INTENTS.has(n.profile.recommendedLayoutIntent);
}

function isMetric(n: SlideNarrativeNode): boolean {
  return n.dominantContent === 'metrics' || METRIC_INTENTS.has(n.profile.recommendedLayoutIntent);
}

function isTimeline(n: SlideNarrativeNode): boolean {
  return n.dominantContent === 'timeline';
}

function isHero(n: SlideNarrativeNode): boolean {
  return HERO_INTENTS.has(n.profile.recommendedLayoutIntent);
}

// =============================================================================
//  Public API
// =============================================================================

export function planPacing(nodes: SlideNarrativeNode[]): PacingPlan {
  const directives: PacingDirective[] = nodes.map(() => ({
    beat:          'medium',
    preferIntents: [],
    avoidIntents:  [],
    forbidIntents: [],
    reason:        '',
  }));

  const rhythm: PacingPlan['rhythm'] = [];
  const issues: PacingPlan['issues'] = [];

  // 1. Initial beat from intensity
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (n.intensity >= 80)         rhythm.push('strong');
    else if (n.intensity >= 60)    rhythm.push('dense');
    else if (n.intensity >= 40)    rhythm.push('medium');
    else if (n.intensity >= 25)    rhythm.push('light');
    else                           rhythm.push('rest');
    directives[i].beat = rhythm[i];
  }

  // 2. Detect runs of identical patterns; nudge the third+
  for (let i = 2; i < nodes.length; i++) {
    const a = nodes[i - 2], b = nodes[i - 1], c = nodes[i];

    // 3 dense slides in a row → mark the third as needing 'lighter'
    if (isDense(a) && isDense(b) && isDense(c)) {
      directives[i].avoidIntents.push(...Array.from(DENSE_INTENTS));
      directives[i].preferIntents.push('statement-focused', 'hero-statement', 'metric-hero', 'pull-quote');
      directives[i].beat = 'light';
      rhythm[i] = 'light';
      directives[i].reason = '3 dense slides in a row — diversify with a lighter variant';
      issues.push({ index: i, severity: 'warn', message: '3 dense slides in a row' });
    }

    // 3 metric slides in a row → push third toward a different intent
    if (isMetric(a) && isMetric(b) && isMetric(c)) {
      directives[i].avoidIntents.push(...Array.from(METRIC_INTENTS));
      directives[i].preferIntents.push('chart-focus', 'editorial', 'statement-focused');
      directives[i].reason = (directives[i].reason ? directives[i].reason + '; ' : '') +
        '3 metric slides in a row — diversify the third';
      issues.push({ index: i, severity: 'warn', message: '3 metric slides in a row' });
    }

    // 3 timeline slides in a row
    if (isTimeline(a) && isTimeline(b) && isTimeline(c)) {
      directives[i].avoidIntents.push('phase-cards', 'compact-roadmap');
      directives[i].preferIntents.push('statement-focused', 'metric-hero');
      directives[i].reason = (directives[i].reason ? directives[i].reason + '; ' : '') +
        '3 timeline slides in a row';
      issues.push({ index: i, severity: 'warn', message: '3 timeline slides in a row' });
    }

    // 3 identical layout intents in a row
    const aI = a.profile.recommendedLayoutIntent;
    const bI = b.profile.recommendedLayoutIntent;
    const cI = c.profile.recommendedLayoutIntent;
    if (aI && bI && cI && aI === bI && bI === cI) {
      directives[i].avoidIntents.push(aI);
      directives[i].forbidIntents.push(aI);
      directives[i].reason = (directives[i].reason ? directives[i].reason + '; ' : '') +
        `3× ${aI} in a row — forbidden`;
      issues.push({ index: i, severity: 'error', message: `3× ${aI} in a row` });
    }

    // 3 hero slides in a row → calm the third
    if (isHero(a) && isHero(b) && isHero(c)) {
      directives[i].avoidIntents.push(...Array.from(HERO_INTENTS));
      directives[i].preferIntents.push('editorial', 'feature-grid', 'benefit-cards');
      directives[i].reason = (directives[i].reason ? directives[i].reason + '; ' : '') +
        '3 hero slides in a row';
      issues.push({ index: i, severity: 'warn', message: '3 hero slides in a row' });
    }
  }

  // 3. Apply Dense → Light → Medium → Strong → Light rhythm shaping
  //    Heuristically rotate the beat label so adjacent slides feel different.
  for (let i = 1; i < rhythm.length; i++) {
    if (rhythm[i] === rhythm[i - 1] && rhythm[i] === 'dense') {
      // Bias toward 'light' if not already constrained
      if (directives[i].preferIntents.length === 0) {
        directives[i].preferIntents.push('statement-focused', 'hero-statement');
        directives[i].reason = directives[i].reason || 'rhythm: alternate after dense';
      }
    }
  }

  return { directives, rhythm, issues };
}
