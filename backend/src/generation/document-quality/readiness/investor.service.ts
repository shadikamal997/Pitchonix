/**
 * Phase 30D — Investor Readiness Engine
 *
 * Pitch-deck-only. Scores the 8 dimensions an investor evaluates first.
 * All criteria are 0..100; the total is the weighted average.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType, WizardInput } from '../../slide-types/types';
import { ReadinessReport, ReadinessCriterion } from '../types';

@Injectable()
export class InvestorReadinessEngine {
  score(input: WizardInput, slides: SlideContent[]): ReadinessReport {
    const s = input.structured;
    const types = new Set(slides.map((sl) => sl.type));
    const criteria: ReadinessCriterion[] = [];

    // ── Problem clarity ─────────────────────────────────────────────────
    const problemText = (input.problem || '').trim();
    let problemScore = 0;
    if (problemText.length >= 80)      problemScore = 100;
    else if (problemText.length >= 40) problemScore = 70;
    else if (problemText.length >= 15) problemScore = 40;
    criteria.push({ key: 'problem-clarity', label: 'Problem clarity',
      score: problemScore,
      reason: problemScore < 70 ? 'Problem description is too short to be compelling' : undefined });

    // ── Market opportunity ──────────────────────────────────────────────
    const m = s?.marketSizing;
    const fieldsFilled = [m?.tam, m?.sam, m?.som, m?.growthRate].filter(Boolean).length;
    const hasNumberInText = /\$\s?\d|\d+\s?(?:B|M|K)\b|\d+%\s*(?:CAGR|growth)/i.test(input.marketOpportunity || '');
    let marketScore = 0;
    if (fieldsFilled >= 3)       marketScore = 100;
    else if (fieldsFilled === 2) marketScore = 80;
    else if (fieldsFilled === 1) marketScore = 60;
    else if (hasNumberInText)    marketScore = 50;
    else if (input.marketOpportunity) marketScore = 30;
    criteria.push({ key: 'market-opportunity', label: 'Market opportunity',
      score: marketScore,
      reason: marketScore < 70 ? 'Add TAM / SAM / SOM and growth rate' : undefined });

    // ── Differentiation ─────────────────────────────────────────────────
    const compCount = (s?.competitors?.length ?? 0);
    const diffText  = (input.differentiation || '').trim();
    let diffScore = 0;
    if (compCount >= 2 && diffText.length >= 60) diffScore = 100;
    else if (compCount >= 2)                     diffScore = 80;
    else if (compCount >= 1)                     diffScore = 60;
    else if (diffText.length >= 40)              diffScore = 50;
    else if (input.competitors)                  diffScore = 40;
    criteria.push({ key: 'differentiation', label: 'Differentiation',
      score: diffScore,
      reason: diffScore < 70 ? 'Add 2+ competitors with strengths/weaknesses' : undefined });

    // ── Business model ──────────────────────────────────────────────────
    const tierCount = s?.pricingTiers?.length ?? 0;
    const bmText    = (input.revenueModel || input.pricing || '').trim();
    let bmScore = 0;
    if (tierCount >= 2)                        bmScore = 100;
    else if (tierCount === 1)                  bmScore = 80;
    else if (bmText.length >= 80)              bmScore = 60;
    else if (bmText.length > 0)                bmScore = 40;
    criteria.push({ key: 'business-model', label: 'Business model',
      score: bmScore,
      reason: bmScore < 70 ? 'Add pricing tiers or a clearer revenue model' : undefined });

    // ── Traction ────────────────────────────────────────────────────────
    const kpiCount = s?.kpis?.length ?? 0;
    const tractionHasNums = /\$\s?\d|\d+\s?(?:K|M)\s*users|\d+%/.test(input.traction || '');
    let tractionScore = 0;
    if (kpiCount >= 4)              tractionScore = 100;
    else if (kpiCount >= 2)         tractionScore = 80;
    else if (kpiCount === 1)        tractionScore = 60;
    else if (tractionHasNums)       tractionScore = 50;
    else if (input.traction)        tractionScore = 30;
    criteria.push({ key: 'traction', label: 'Traction',
      score: tractionScore,
      reason: tractionScore < 70 ? 'Add 3+ quantified KPIs (MRR, users, growth, retention)' : undefined });

    // ── Team strength ───────────────────────────────────────────────────
    const teamCount = s?.teamMembers?.length ?? 0;
    const teamHasExp = (s?.teamMembers ?? []).some((m) => !!m.experience?.trim());
    let teamScore = 0;
    if (teamCount >= 3 && teamHasExp) teamScore = 100;
    else if (teamCount >= 2)          teamScore = 80;
    else if (teamCount === 1)         teamScore = 60;
    else if (input.team)              teamScore = 40;
    criteria.push({ key: 'team-strength', label: 'Team strength',
      score: teamScore,
      reason: teamScore < 70 ? 'Add 2+ team members with named experience' : undefined });

    // ── Roadmap ─────────────────────────────────────────────────────────
    const phaseCount = s?.roadmapPhases?.length ?? 0;
    let roadmapScore = 0;
    if (phaseCount >= 3) roadmapScore = 100;
    else if (phaseCount === 2) roadmapScore = 80;
    else if (phaseCount === 1) roadmapScore = 60;
    else if (input.roadmap)    roadmapScore = 40;
    criteria.push({ key: 'roadmap', label: 'Roadmap',
      score: roadmapScore,
      reason: roadmapScore < 70 ? 'Add 3+ roadmap phases with milestones' : undefined });

    // ── Funding ask ─────────────────────────────────────────────────────
    const f = s?.funding;
    const allocCount = f?.allocations.length ?? 0;
    let askScore = 0;
    if (f?.amount && allocCount >= 2)  askScore = 100;
    else if (f?.amount)                askScore = 75;
    else if (allocCount >= 1)          askScore = 60;
    else if (input.fundingAsk)         askScore = 40;
    else if (types.has(SlideType.ASK)) askScore = 30;
    criteria.push({ key: 'funding-ask', label: 'Funding ask',
      score: askScore,
      reason: askScore < 70 ? 'Add ask amount + use-of-funds allocation' : undefined });

    // ── Weighted total ──────────────────────────────────────────────────
    // Weights reflect what early-stage investors weight most heavily.
    const weights = {
      'problem-clarity':       0.10,
      'market-opportunity':    0.15,
      'differentiation':       0.10,
      'business-model':        0.10,
      'traction':              0.20,
      'team-strength':         0.15,
      'roadmap':               0.08,
      'funding-ask':           0.12,
    } as Record<string, number>;
    const total = Math.round(
      criteria.reduce((acc, c) => acc + c.score * (weights[c.key] ?? 0), 0),
    );

    return { documentType: 'pitch_deck', engine: 'investor', total, criteria, band: band(total) };
  }
}

function band(score: number): ReadinessReport['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}
