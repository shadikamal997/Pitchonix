// =============================================================================
//  Phase 26C — SlideRelationshipAnalyzer
//
//  Builds an adjacency map describing how each slide relates to its neighbors:
//   - is the previous slide the same dominant content?
//   - is the previous slide the same intent?
//   - is the next slide a section boundary?
//   - what's the "diversity demand" for this slide?
//
//  Output: SlideRelationshipMap (per-slide). Used by the layout scorer to
//  prefer diversification.
// =============================================================================

import type { SlideNarrativeNode } from './deck-analyzer';

export interface SlideRelationship {
  index:                    number;
  previousIndex:            number | null;
  nextIndex:                number | null;
  /** True when previous slide has the same dominantContent. */
  sameAsPrev:               boolean;
  /** True when previous slide has the same recommendedLayoutIntent. */
  sameIntentAsPrev:         boolean;
  /** True when the next slide differs in role (entering a new section). */
  enteringNewSection:       boolean;
  /** True when leaving a section (different role than next). */
  leavingSection:           boolean;
  /** Density delta vs previous slide. Positive = denser than prev. */
  densityDeltaFromPrev:     number;
  /** Intensity delta vs previous slide. */
  intensityDeltaFromPrev:   number;
  /** 0..100 — how strongly this slide should DIFFER from neighbors. */
  diversityDemand:          number;
}

export type SlideRelationshipMap = SlideRelationship[];

const SECTION_ROLES: Record<string, string> = {
  'intro': 'intro',
  'setup': 'setup',
  'problem': 'problem',
  'urgency': 'problem',
  'solution': 'solution',
  'proof': 'proof',
  'market': 'market',
  'business-model': 'business',
  'traction': 'traction',
  'differentiation': 'differentiation',
  'credibility': 'team',
  'roadmap': 'roadmap',
  'ask': 'ask',
  'closing': 'closing',
};

export function analyzeRelationships(nodes: SlideNarrativeNode[]): SlideRelationshipMap {
  return nodes.map((n, i) => {
    const prev = i > 0 ? nodes[i - 1] : null;
    const next = i < nodes.length - 1 ? nodes[i + 1] : null;

    const sameAsPrev =
      !!prev && prev.dominantContent === n.dominantContent;
    const sameIntentAsPrev =
      !!prev && prev.profile.recommendedLayoutIntent === n.profile.recommendedLayoutIntent;

    const prevSection = prev ? SECTION_ROLES[prev.role] : null;
    const curSection  = SECTION_ROLES[n.role];
    const nextSection = next ? SECTION_ROLES[next.role] : null;

    const enteringNewSection = !!prev && prevSection !== curSection;
    const leavingSection     = !!next && nextSection !== curSection;

    const densityDeltaFromPrev   = prev ? n.density   - prev.density   : 0;
    const intensityDeltaFromPrev = prev ? n.intensity - prev.intensity : 0;

    // Demand grows when we're repeating ourselves
    let diversityDemand = 20;
    if (sameAsPrev)                 diversityDemand += 25;
    if (sameIntentAsPrev)           diversityDemand += 30;
    if (Math.abs(densityDeltaFromPrev) < 10) diversityDemand += 10;
    if (enteringNewSection)         diversityDemand += 15;

    return {
      index:                  i,
      previousIndex:          prev ? i - 1 : null,
      nextIndex:              next ? i + 1 : null,
      sameAsPrev,
      sameIntentAsPrev,
      enteringNewSection,
      leavingSection,
      densityDeltaFromPrev,
      intensityDeltaFromPrev,
      diversityDemand:        Math.min(100, diversityDemand),
    };
  });
}
