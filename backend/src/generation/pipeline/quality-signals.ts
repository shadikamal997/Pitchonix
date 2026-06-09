/**
 * Phase 14 — AI Quality Signals
 *
 * Three lightweight signals that complement the Phase 30 scorecard:
 *
 *   contentRichness  — how complete the wizard input is (0–100)
 *   visualCoverage   — what fraction of slides have smart components (0–100)
 *   compositeScore   — weighted blend of scorecard total + narrative + richness + visual
 *
 * All functions are pure (no I/O) so they can be tested in isolation.
 */

import type { WizardInput, SlideContent } from '../slide-types/types';

// ---------------------------------------------------------------------------
// contentRichness
// ---------------------------------------------------------------------------

/**
 * Score the wizard input completeness.
 * Each filled field contributes points. Structured data (kpis, teamMembers,
 * roadmapPhases, financials, pricingTiers) contributes more because it
 * produces richer slides.
 */
export function contentRichness(input: WizardInput): number {
  let points = 0;
  const max = 100;

  // Core narrative fields (4 pts each)
  const coreFields: (keyof WizardInput)[] = [
    'companyName',
    'problem',
    'solution',
    'shortDescription',
  ];
  for (const f of coreFields) {
    if (input[f] && String(input[f]).trim().length >= 10) points += 4;
  }

  // Supporting narrative (3 pts each)
  const supportFields: (keyof WizardInput)[] = [
    'marketOpportunity',
    'traction',
    'team',
    'fundingAsk',
    'revenueModel',
    'roadmap',
    'differentiation',
  ];
  for (const f of supportFields) {
    if (input[f] && String(input[f]).trim().length >= 10) points += 3;
  }

  // Structured data — highest weight (up to 8 pts per section)
  const s = input.structured;
  if (s) {
    if ((s.kpis?.length ?? 0) >= 2) points += 8;
    if ((s.teamMembers?.length ?? 0) >= 2) points += 8;
    if ((s.roadmapPhases?.length ?? 0) >= 2) points += 6;
    if ((s.pricingTiers?.length ?? 0) >= 2) points += 6;
    if (s.financials?.revenue || (s.financials?.projections?.length ?? 0) > 0) points += 6;
    if ((s.competitors?.length ?? 0) >= 2) points += 4;
    if (s.marketSizing?.tam) points += 4;
    if ((s.funding?.allocations?.length ?? 0) >= 2) points += 4;
  }

  return Math.min(max, Math.round(points));
}

// ---------------------------------------------------------------------------
// visualCoverage
// ---------------------------------------------------------------------------

/**
 * Percentage of slides that have at least one smart component attached.
 * Smart components include charts, teamCards, pricingCards, etc.
 */
export function visualCoverage(slides: SlideContent[]): number {
  if (!slides.length) return 0;
  const withVisual = slides.filter((s) => {
    const sc = (s as any).smartComponent || (s as any).content?.smartComponent;
    if (sc?.elementTree?.length > 0) return true;
    // Also count slides whose generated element tree has non-text elements
    return false;
  }).length;
  return Math.round((withVisual / slides.length) * 100);
}

// ---------------------------------------------------------------------------
// compositeScore
// ---------------------------------------------------------------------------

/**
 * Blend all quality signals into a single 0–100 score.
 *
 * Weights:
 *   scorecardTotal   40%
 *   narrativeScore   25%
 *   contentRichness  20%
 *   visualCoverage   15%
 */
export function compositeScore(params: {
  scorecardTotal: number;
  narrativeScore: number;
  contentRichness: number;
  visualCoverage: number;
}): number {
  const { scorecardTotal, narrativeScore, contentRichness: cr, visualCoverage: vc } = params;
  return Math.round(scorecardTotal * 0.4 + narrativeScore * 0.25 + cr * 0.2 + vc * 0.15);
}
