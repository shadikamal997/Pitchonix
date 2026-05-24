// =============================================================================
//  Phase 26 — Deck Context
//
//  Single entry point that runs all the deck-level analyzers and produces:
//    - DeckPlan       : per-slide context the layout scorer reads
//    - DeckTelemetry  : per-slide and deck-wide summary objects for debug
//    - NarrativeQualityScore : the final 0–100 deck score
//
//  Wire-up:
//    const plan = analyzeDeck(slides, familyId);
//    <ComposedSlide ... slideContext={plan.slides[i]} />
//
//  Or with React:
//    const plan = useDeckPlan(slides, familyId);
//    plan.slides[i] → DeckSlideContext
// =============================================================================

import { useMemo } from 'react';

import { analyzeDeckNarrative, type DeckSlideInput, type DeckNarrativeProfile, type SlideNarrativeNode } from './deck-analyzer';
export type { DeckSlideInput } from './deck-analyzer';
import { planPacing,           type PacingPlan, type PacingDirective } from './pacing-engine';
import { analyzeRelationships, type SlideRelationshipMap, type SlideRelationship } from './relationship-analyzer';
import { balanceDensity,       type DensityBalanceReport, type DensityAdjustment } from './density-balancer';
import { analyzeFatigue,       type FatigueReport, type SlideFatigueScore } from './fatigue-analyzer';
import { planTransitions,      type TransitionHint } from './transition-planner';
import { getFamilyStoryStyle,  type FamilyStoryStyle } from './family-storytelling';
import { computeNarrativeQualityScore, type NarrativeQualityScore } from './narrative-scorer';
import { validateNarrative,    type NarrativeValidationReport } from './narrative-validator';

// =============================================================================
//  Per-slide deck context — handed to the layout scorer
// =============================================================================

export interface DeckSlideContext {
  index:        number;
  total:        number;
  node:         SlideNarrativeNode;
  pacing:       PacingDirective;
  relationship: SlideRelationship;
  density:      DensityAdjustment;
  fatigue:      SlideFatigueScore;
  transition:   TransitionHint;
  /** Family-level storytelling bias for this slide's section. */
  familyStyle:  FamilyStoryStyle;
  /** Section bias bucket (the family's `sectionBias[role]` if any). */
  familySectionBias: Record<string, number>;
}

export interface DeckPlan {
  /** Per-slide contexts (same length as input slides). */
  slides:        DeckSlideContext[];
  /** Deck-level narrative profile. */
  profile:       DeckNarrativeProfile;
  /** Aggregate analyzer outputs (useful for debug/validation UI). */
  pacing:        PacingPlan;
  relationships: SlideRelationshipMap;
  density:       DensityBalanceReport;
  fatigue:       FatigueReport;
  transitions:   TransitionHint[];
  familyStyle:   FamilyStoryStyle;
  /** Deck-wide narrative score 0–100. */
  quality:       NarrativeQualityScore;
  /** Pre-render warnings. */
  validation:    NarrativeValidationReport;
}

// =============================================================================
//  Pure analyzer (call from anywhere, including non-React code)
// =============================================================================

export function analyzeDeck(slides: DeckSlideInput[], familyId?: string): DeckPlan {
  const profile       = analyzeDeckNarrative(slides);
  const pacing        = planPacing(profile.nodes);
  const relationships = analyzeRelationships(profile.nodes);
  const density       = balanceDensity(profile.nodes);
  const fatigue       = analyzeFatigue(profile.nodes);
  const transitions   = planTransitions(profile.nodes);
  const familyStyle   = getFamilyStoryStyle(familyId);

  const slideContexts: DeckSlideContext[] = profile.nodes.map((node, i) => ({
    index:        i,
    total:        profile.nodes.length,
    node,
    pacing:       pacing.directives[i],
    relationship: relationships[i],
    density:      density.adjustments[i],
    fatigue:      fatigue.perSlide[i],
    transition:   transitions[i],
    familyStyle,
    familySectionBias: familyStyle.sectionBias[node.role] ?? {},
  }));

  const quality = computeNarrativeQualityScore(profile, fatigue, density, pacing);
  const validation = validateNarrative({ profile, fatigue, density, pacing, transitions });

  return {
    slides:        slideContexts,
    profile,
    pacing,
    relationships,
    density,
    fatigue,
    transitions,
    familyStyle,
    quality,
    validation,
  };
}

// =============================================================================
//  React hook — memoised wrapper for the editor/canvas
// =============================================================================

export function useDeckPlan(slides: DeckSlideInput[], familyId?: string): DeckPlan {
  return useMemo(() => analyzeDeck(slides, familyId), [slides, familyId]);
}

// =============================================================================
//  Debug logger — dev-only one-liner per deck
// =============================================================================

export function logDeckPlan(plan: DeckPlan): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;

  const intentBars = plan.profile.nodes
    .map((n) => n.profile.recommendedLayoutIntent.slice(0, 6))
    .join(' → ');

  console.groupCollapsed(
    `%c[Deck] ${plan.profile.narrativeType} · ${plan.profile.storyStructure} · score ${plan.quality.total.toFixed(0)}`,
    'color:#0891b2;font-weight:700',
  );
  console.log('Intents :', intentBars);
  console.log('Roles   :', plan.profile.nodes.map((n) => n.role).join(' → '));
  console.log('Beats   :', plan.pacing.rhythm.join(' → '));
  console.log('Score   :', {
    total:        plan.quality.total.toFixed(0),
    pacing:       plan.quality.pacingScore.toFixed(0),
    density:      plan.quality.densityBalanceScore.toFixed(0),
    diversity:    plan.quality.visualDiversityScore.toFixed(0),
    progression:  plan.quality.progressionScore.toFixed(0),
    repetition:   plan.quality.repetitionScore.toFixed(0),
    flow:         plan.quality.informationFlowScore.toFixed(0),
    investor:     plan.quality.investorReadinessScore.toFixed(0),
  });
  if (plan.quality.strengths.length > 0) {
    console.log('✓ Strengths :', plan.quality.strengths);
  }
  if (plan.quality.weaknesses.length > 0) {
    console.log('⚠ Weaknesses:', plan.quality.weaknesses);
  }
  if (plan.validation.summary.error > 0 || plan.validation.summary.warn > 0) {
    console.log('Issues  :', plan.validation.issues);
  }
  console.groupEnd();
}
