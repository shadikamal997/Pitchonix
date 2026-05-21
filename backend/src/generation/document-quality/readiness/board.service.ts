/**
 * Phase 30F — Board Readiness Engine
 *
 * Board-meeting-deck-only. Boards expect KPIs, financials, risks, decisions.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType, WizardInput } from '../../slide-types/types';
import { ReadinessReport, ReadinessCriterion } from '../types';

@Injectable()
export class BoardReadinessEngine {
  score(input: WizardInput, slides: SlideContent[]): ReadinessReport {
    const s = input.structured;
    const types = new Set(slides.map((sl) => sl.type));
    const criteria: ReadinessCriterion[] = [];

    // ── KPI completeness ────────────────────────────────────────────────
    const kpiCount = s?.kpis?.length ?? 0;
    let kpiScore = 0;
    if (kpiCount >= 5)        kpiScore = 100;
    else if (kpiCount >= 3)   kpiScore = 80;
    else if (kpiCount >= 1)   kpiScore = 50;
    criteria.push({ key: 'kpi-completeness', label: 'KPI completeness',
      score: kpiScore,
      reason: kpiScore < 70 ? 'Boards typically expect 5+ tracked KPIs' : undefined });

    // ── Financial completeness ──────────────────────────────────────────
    const f = s?.financials;
    const finFields = [f?.revenue, f?.costs, f?.grossMargin, f?.burnRate, f?.runway].filter(Boolean).length;
    const hasProjections = (f?.projections?.length ?? 0) > 0;
    let finScore = 0;
    if (finFields >= 4 && hasProjections) finScore = 100;
    else if (finFields >= 3)              finScore = 80;
    else if (finFields >= 1)              finScore = 60;
    else if (types.has(SlideType.FINANCIALS)) finScore = 40;
    criteria.push({ key: 'financial-completeness', label: 'Financial completeness',
      score: finScore,
      reason: finScore < 70 ? 'Add revenue, costs, runway + projection table' : undefined });

    // ── Risks ───────────────────────────────────────────────────────────
    let riskScore = 0;
    if (types.has(SlideType.RISKS)) riskScore = 100;
    else if (/risk/i.test(JSON.stringify(slides))) riskScore = 60;
    criteria.push({ key: 'risks', label: 'Risks',
      score: riskScore,
      reason: riskScore < 70 ? 'Add a risks slide identifying top 3–5 risks + mitigations' : undefined });

    // ── Actions / milestones ────────────────────────────────────────────
    const phaseCount = s?.roadmapPhases?.length ?? 0;
    let actionScore = 0;
    if (phaseCount >= 2)                    actionScore = 100;
    else if (phaseCount === 1)              actionScore = 70;
    else if (types.has(SlideType.ROADMAP))  actionScore = 50;
    criteria.push({ key: 'actions', label: 'Actions / Milestones',
      score: actionScore,
      reason: actionScore < 70 ? 'Add 2+ upcoming milestones with target dates' : undefined });

    // ── Decisions required ──────────────────────────────────────────────
    const hasDecision = types.has(SlideType.ASK) ||
                        /decision|approve|sign-off|vote/i.test(input.desiredAction || '');
    criteria.push({ key: 'decisions', label: 'Decisions required',
      score: hasDecision ? 100 : 0,
      reason: hasDecision ? undefined : 'Specify what decisions the board must take' });

    const weights: Record<string, number> = {
      'kpi-completeness':       0.30,
      'financial-completeness': 0.30,
      'risks':                  0.15,
      'actions':                0.15,
      'decisions':              0.10,
    };
    const total = Math.round(
      criteria.reduce((acc, c) => acc + c.score * (weights[c.key] ?? 0), 0),
    );

    return { documentType: 'board_meeting_deck', engine: 'board', total, criteria, band: band(total) };
  }
}

function band(score: number): ReadinessReport['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}
