/**
 * Phase 30G — Strategy Readiness Engine
 *
 * Strategy-presentation-only. Strategy needs SWOT, priorities, initiatives,
 * roadmap, KPIs.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType, WizardInput } from '../../slide-types/types';
import { ReadinessReport, ReadinessCriterion } from '../types';

@Injectable()
export class StrategyReadinessEngine {
  score(input: WizardInput, slides: SlideContent[]): ReadinessReport {
    const s = input.structured;
    const types = new Set(slides.map((sl) => sl.type));
    const criteria: ReadinessCriterion[] = [];

    // ── SWOT quality ────────────────────────────────────────────────────
    const sw = s?.swot;
    const quadrants = sw ? [sw.strengths, sw.weaknesses, sw.opportunities, sw.threats] : [];
    const filled = quadrants.filter((q) => Array.isArray(q) && q.length > 0).length;
    const totalItems = quadrants.reduce((a, q) => a + (q?.length ?? 0), 0);
    let swotScore = 0;
    if (filled === 4 && totalItems >= 8)  swotScore = 100;
    else if (filled === 4)                swotScore = 80;
    else if (filled >= 2)                 swotScore = 60;
    else if (filled === 1)                swotScore = 30;
    criteria.push({ key: 'swot-quality', label: 'SWOT quality',
      score: swotScore,
      reason: swotScore < 70 ? 'Fill all four SWOT quadrants with 2+ items each' : undefined });

    // ── Priorities ──────────────────────────────────────────────────────
    // Use the "executive summary" or vision text as a proxy for priorities.
    const priorityText = (input.shortDescription || input.solution || '').trim();
    const prioScore = priorityText.length >= 100 ? 100 :
                      priorityText.length >= 50  ? 70 :
                      priorityText.length >= 20  ? 40 : 0;
    criteria.push({ key: 'priorities', label: 'Strategic priorities',
      score: prioScore,
      reason: prioScore < 70 ? 'Articulate 3–5 strategic priorities for the period' : undefined });

    // ── Initiatives ─────────────────────────────────────────────────────
    const initCount =
      (s?.roadmapPhases ?? []).reduce((a, p) => a + p.milestones.length, 0);
    let initScore = 0;
    if (initCount >= 6)        initScore = 100;
    else if (initCount >= 3)   initScore = 70;
    else if (initCount >= 1)   initScore = 40;
    criteria.push({ key: 'initiatives', label: 'Initiatives',
      score: initScore,
      reason: initScore < 70 ? 'Add 6+ initiative-level milestones across phases' : undefined });

    // ── Roadmap ─────────────────────────────────────────────────────────
    const phaseCount = s?.roadmapPhases?.length ?? 0;
    let roadScore = 0;
    if (phaseCount >= 3)       roadScore = 100;
    else if (phaseCount >= 1)  roadScore = 60;
    else if (types.has(SlideType.ROADMAP)) roadScore = 40;
    criteria.push({ key: 'roadmap', label: 'Roadmap',
      score: roadScore,
      reason: roadScore < 70 ? 'Add 3+ roadmap phases' : undefined });

    // ── KPIs ────────────────────────────────────────────────────────────
    const kpiCount = s?.kpis?.length ?? 0;
    let kpiScore = 0;
    if (kpiCount >= 4)         kpiScore = 100;
    else if (kpiCount >= 2)    kpiScore = 70;
    else if (kpiCount >= 1)    kpiScore = 40;
    criteria.push({ key: 'kpis', label: 'KPIs',
      score: kpiScore,
      reason: kpiScore < 70 ? 'Add 4+ strategic KPIs' : undefined });

    const weights: Record<string, number> = {
      'swot-quality':  0.25,
      'priorities':    0.20,
      'initiatives':   0.20,
      'roadmap':       0.15,
      'kpis':          0.20,
    };
    const total = Math.round(
      criteria.reduce((acc, c) => acc + c.score * (weights[c.key] ?? 0), 0),
    );

    return { documentType: 'strategy_presentation', engine: 'strategy', total, criteria, band: band(total) };
  }
}

function band(score: number): ReadinessReport['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}
