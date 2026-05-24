// =============================================================================
//  Phase 26F — VisualFatigueAnalyzer
//
//  Detects repeated structural patterns across the deck and emits per-slide
//  fatigue scores. High fatigue → the scorer should prefer an alternate
//  variant over the canonical one for that slide type/family.
//
//  Patterns watched:
//   - repeated card structures (3+ slides using the same dominant card type)
//   - repeated KPI strips
//   - repeated chart-zones (multiple chart-focus slides)
//   - repeated hero layouts (multiple metric-hero / hero-statement)
//   - repeated layoutIntent across the deck
// =============================================================================

import type { SlideNarrativeNode } from './deck-analyzer';

export interface SlideFatigueScore {
  index:        number;
  fatigueScore: number;        // 0..100, higher = more fatigued
  reasons:      string[];
  /** Layout intents to force-avoid when fatigueScore is high. */
  blockedIntents: string[];
}

export interface FatigueReport {
  perSlide:    SlideFatigueScore[];
  /** Histogram of layoutIntents across the deck. */
  intentCount: Record<string, number>;
  /** Slides flagged "high fatigue" (>= 60). */
  highFatigueIndices: number[];
}

const HERO_INTENTS    = new Set(['hero-statement', 'metric-hero', 'vision-statement', 'pull-quote', 'quote-closing', 'funding-hero']);
const CHART_INTENTS   = new Set(['chart-focus']);
const KPI_INTENTS     = new Set(['metric-strip', 'metric-hero', 'kpi-grid']);
const CARD_INTENTS    = new Set(['benefit-cards', 'three-tier-cards', 'phase-cards', 'feature-grid', 'revenue-stream-cards']);

export function analyzeFatigue(nodes: SlideNarrativeNode[]): FatigueReport {
  const intentCount: Record<string, number> = {};
  for (const n of nodes) {
    const intent = n.profile.recommendedLayoutIntent;
    if (intent) intentCount[intent] = (intentCount[intent] ?? 0) + 1;
  }

  const perSlide: SlideFatigueScore[] = nodes.map((n) => ({
    index:          n.index,
    fatigueScore:   0,
    reasons:        [],
    blockedIntents: [],
  }));

  // 1. Penalty for repeated intent across the deck (>= 3 occurrences)
  for (let i = 0; i < nodes.length; i++) {
    const intent = nodes[i].profile.recommendedLayoutIntent;
    if (!intent) continue;
    const count = intentCount[intent] ?? 0;
    if (count >= 3) {
      perSlide[i].fatigueScore += Math.min(30, (count - 2) * 12);
      perSlide[i].reasons.push(`${intent} used ${count}× in deck`);
    }
  }

  // 2. Penalty for sliding-window repetition (3 in a row of same category)
  for (let i = 2; i < nodes.length; i++) {
    const a = nodes[i - 2], b = nodes[i - 1], c = nodes[i];
    const aI = a.profile.recommendedLayoutIntent;
    const bI = b.profile.recommendedLayoutIntent;
    const cI = c.profile.recommendedLayoutIntent;

    const triple = (set: Set<string>): boolean =>
      !!aI && !!bI && !!cI && set.has(aI) && set.has(bI) && set.has(cI);

    if (triple(HERO_INTENTS)) {
      perSlide[i].fatigueScore += 25;
      perSlide[i].reasons.push('3 hero-style slides in a row');
      perSlide[i].blockedIntents.push(...Array.from(HERO_INTENTS));
    }
    if (triple(CHART_INTENTS)) {
      perSlide[i].fatigueScore += 25;
      perSlide[i].reasons.push('3 chart-focus slides in a row');
      perSlide[i].blockedIntents.push('chart-focus');
    }
    if (triple(KPI_INTENTS)) {
      perSlide[i].fatigueScore += 22;
      perSlide[i].reasons.push('3 KPI-style slides in a row');
      perSlide[i].blockedIntents.push(...Array.from(KPI_INTENTS));
    }
    if (triple(CARD_INTENTS)) {
      perSlide[i].fatigueScore += 18;
      perSlide[i].reasons.push('3 card-grid slides in a row');
      perSlide[i].blockedIntents.push(...Array.from(CARD_INTENTS));
    }

    // Exact-repeat penalty (any same intent 3×)
    if (aI && aI === bI && bI === cI) {
      perSlide[i].fatigueScore += 20;
      perSlide[i].reasons.push(`identical layout ${aI} 3× in a row`);
      perSlide[i].blockedIntents.push(aI);
    }
  }

  // 3. Penalty for repeated dominantContent across a 4-slide window
  for (let i = 3; i < nodes.length; i++) {
    const window = nodes.slice(i - 3, i + 1).map((n) => n.dominantContent);
    const counts: Record<string, number> = {};
    for (const w of window) counts[w] = (counts[w] ?? 0) + 1;
    const max = Math.max(...Object.values(counts));
    if (max >= 4) {
      perSlide[i].fatigueScore += 15;
      perSlide[i].reasons.push(`4 slides in a row dominated by ${window[3]}`);
    }
  }

  // 4. Cap and dedupe
  for (const s of perSlide) {
    s.fatigueScore = Math.min(100, s.fatigueScore);
    s.blockedIntents = Array.from(new Set(s.blockedIntents));
    s.reasons = Array.from(new Set(s.reasons));
  }

  const highFatigueIndices = perSlide.filter((s) => s.fatigueScore >= 60).map((s) => s.index);
  return { perSlide, intentCount, highFatigueIndices };
}
