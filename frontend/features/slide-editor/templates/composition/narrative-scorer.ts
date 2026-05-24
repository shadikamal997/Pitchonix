// =============================================================================
//  Phase 26H — NarrativeQualityScore
//
//  Computes a 0–100 narrative quality score for a deck along several
//  dimensions. Used as the deck-level objective function and surfaced in
//  the editor for designers to validate their decks before export.
// =============================================================================

import type { DeckNarrativeProfile } from './deck-analyzer';
import type { FatigueReport }        from './fatigue-analyzer';
import type { DensityBalanceReport } from './density-balancer';
import type { PacingPlan }           from './pacing-engine';

export interface NarrativeQualityScore {
  total:                 number;  // 0..100
  pacingScore:           number;
  densityBalanceScore:   number;
  visualDiversityScore:  number;
  progressionScore:      number;  // narrative shape strength
  repetitionScore:       number;  // lower repetition = higher score
  informationFlowScore:  number;
  investorReadinessScore: number;
  /** Free-text strengths and weaknesses. */
  strengths:             string[];
  weaknesses:            string[];
}

const W = {
  pacing:        0.18,
  densityBalance:0.14,
  diversity:     0.18,
  progression:   0.14,
  repetition:    0.12,
  flow:          0.12,
  investor:      0.12,
};

export function computeNarrativeQualityScore(
  profile: DeckNarrativeProfile,
  fatigue: FatigueReport,
  density: DensityBalanceReport,
  pacing:  PacingPlan,
): NarrativeQualityScore {
  const n = profile.nodes.length;
  const strengths: string[]  = [];
  const weaknesses: string[] = [];

  // ── 1. Pacing score ────────────────────────────────────────────────────────
  // Reward variety in pacing labels; penalise "rest"/"peak" runs > 2.
  let pacingScore = 70;
  const runs: Record<string, number> = {};
  let lastBeat = '';
  let runLen = 0;
  for (const b of pacing.rhythm) {
    if (b === lastBeat) runLen++; else { runLen = 1; lastBeat = b; }
    runs[`${b}>${runLen}`] = (runs[`${b}>${runLen}`] ?? 0) + 1;
    if (runLen >= 3) pacingScore -= 5;
    if (runLen >= 4) pacingScore -= 5;
  }
  pacingScore += pacing.issues.filter((i) => i.severity === 'warn').length * -3;
  pacingScore += pacing.issues.filter((i) => i.severity === 'error').length * -8;
  pacingScore = clamp(pacingScore);

  if (pacingScore >= 80) strengths.push('Pacing flows well across the deck.');
  else if (pacingScore <= 40) weaknesses.push('Pacing is monotonous — too many similar beats in sequence.');

  // ── 2. Density balance score ───────────────────────────────────────────────
  let densityBalanceScore = 80 - density.hotspots.reduce((s, h) => s + (h.len - 2) * 6, 0);
  // Variance bonus: more density variation across deck = healthier
  const idealVariance = 20;
  densityBalanceScore += clamp(20 - Math.abs(profile.densityVariance - idealVariance), -10, 10);
  densityBalanceScore = clamp(densityBalanceScore);

  if (density.hotspots.length === 0) strengths.push('Density is well distributed across slides.');
  else weaknesses.push(`Detected ${density.hotspots.length} density hotspot(s).`);

  // ── 3. Visual diversity score ──────────────────────────────────────────────
  // Distinct layout intents used / total slides, plus penalty for dominant intents.
  const intents = Object.keys(fatigue.intentCount);
  const distinct = intents.length;
  const maxCount = Math.max(0, ...Object.values(fatigue.intentCount));
  const dominance = n > 0 ? maxCount / n : 0;
  let diversityScore = clamp(40 + distinct * 8 - dominance * 50);
  diversityScore -= fatigue.highFatigueIndices.length * 4;
  diversityScore = clamp(diversityScore);

  if (diversityScore >= 80) strengths.push('Strong visual variety across the deck.');
  else if (dominance > 0.4) weaknesses.push(`One layout (${dominantIntent(fatigue)}) appears in over 40% of slides.`);

  // ── 4. Progression score (narrative shape) ─────────────────────────────────
  const goodStructures: Record<string, number> = {
    'three-act': 90, 'situation-complication-resolution': 88, 'hero-journey': 85,
    'crescendo': 80, 'star': 75, 'plateau': 35, 'unstructured': 45,
  };
  const progressionScore = goodStructures[profile.storyStructure] ?? 60;
  if (progressionScore >= 80) strengths.push(`Narrative structure: ${profile.storyStructure}.`);
  if (profile.storyStructure === 'plateau') weaknesses.push('Narrative feels flat — no climactic moment.');

  // ── 5. Repetition score ────────────────────────────────────────────────────
  let repetitionScore = 90 - fatigue.highFatigueIndices.length * 8;
  for (const [intent, count] of Object.entries(fatigue.intentCount)) {
    if (count >= 4) repetitionScore -= (count - 3) * 6;
    void intent;
  }
  repetitionScore = clamp(repetitionScore);
  if (fatigue.highFatigueIndices.length === 0) strengths.push('No high-fatigue slides detected.');

  // ── 6. Information flow score ──────────────────────────────────────────────
  // Reward roles that follow canonical investor logic order
  const order: Record<string, number> = {
    intro: 0, setup: 1, problem: 2, urgency: 3, solution: 4, proof: 5,
    market: 6, 'business-model': 7, traction: 8, differentiation: 9,
    credibility: 10, roadmap: 11, ask: 12, closing: 13,
  };
  let inversions = 0;
  for (let i = 1; i < profile.nodes.length; i++) {
    const a = order[profile.nodes[i - 1].role];
    const b = order[profile.nodes[i].role];
    if (a !== undefined && b !== undefined && b < a) inversions++;
  }
  const flowScore = clamp(85 - inversions * 6);
  if (flowScore >= 80) strengths.push('Slide order follows investor logic.');
  else if (inversions >= 2) weaknesses.push(`${inversions} ordering inversions vs canonical pitch flow.`);

  // ── 7. Investor readiness ──────────────────────────────────────────────────
  const hasRoles = new Set(profile.nodes.map((n) => n.role));
  const requiredForPitch = ['problem', 'solution', 'market', 'traction', 'ask'];
  const missing = requiredForPitch.filter((r) => !hasRoles.has(r as any));
  const investorScore = clamp(95 - missing.length * 18);
  if (missing.length === 0) strengths.push('All core pitch sections present.');
  else weaknesses.push(`Missing core sections: ${missing.join(', ')}.`);

  // ── Weighted total ─────────────────────────────────────────────────────────
  const total = clamp(
    pacingScore         * W.pacing      +
    densityBalanceScore * W.densityBalance +
    diversityScore      * W.diversity   +
    progressionScore    * W.progression +
    repetitionScore     * W.repetition  +
    flowScore           * W.flow        +
    investorScore       * W.investor,
  );

  return {
    total,
    pacingScore,
    densityBalanceScore,
    visualDiversityScore: diversityScore,
    progressionScore,
    repetitionScore,
    informationFlowScore: flowScore,
    investorReadinessScore: investorScore,
    strengths,
    weaknesses,
  };
}

function clamp(v: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, v));
}

function dominantIntent(f: FatigueReport): string {
  let best = ''; let bestCount = -1;
  for (const [k, v] of Object.entries(f.intentCount)) {
    if (v > bestCount) { best = k; bestCount = v; }
  }
  return best;
}
