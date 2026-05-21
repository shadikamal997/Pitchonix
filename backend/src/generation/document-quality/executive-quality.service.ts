/**
 * Phase 30C — Executive Quality Engine
 *
 * Multi-axis quality score for a generated deck:
 *   - slide count vs framework targets
 *   - information balance (length distribution across slides)
 *   - visual balance (visual-heavy vs text-heavy ratio)
 *   - framework completeness (from FrameworkEngine)
 *   - KPI coverage (KPIs surfaced ÷ KPIs available)
 *   - financial coverage (financial slides present when needed)
 *   - narrative strength (cover/problem/solution arc)
 *
 * Each axis is 0..100; total is a weighted average.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType, WizardInput } from '../slide-types/types';
import { ExecutiveQualityReport } from './types';
import { getFramework } from './frameworks';

@Injectable()
export class ExecutiveQualityEngine {
  /**
   * @param frameworkCompleteness 0..100 from the FrameworkEngine
   */
  score(
    input: WizardInput,
    slides: SlideContent[],
    frameworkCompleteness: number,
  ): ExecutiveQualityReport {
    const framework = getFramework(input.documentType);
    const notes: string[] = [];

    // ── Slide count ─────────────────────────────────────────────────────
    const count = slides.length;
    let slideCount = 100;
    if (count < framework.targets.minSlides) {
      slideCount = Math.round((count / framework.targets.minSlides) * 100);
      notes.push(`Only ${count}/${framework.targets.minSlides} target slides`);
    } else if (count > framework.targets.maxSlides) {
      const over = count - framework.targets.maxSlides;
      slideCount = Math.max(50, 100 - over * 10);
      notes.push(`${over} slides over the recommended max (${framework.targets.maxSlides})`);
    }

    // ── Information balance ─────────────────────────────────────────────
    // Use bullet/word counts per slide; penalise outliers.
    const wordCounts = slides.map((s) => extractWordCount(s));
    const informationBalance = computeBalance(wordCounts);
    if (informationBalance < 60) {
      notes.push('Uneven information distribution across slides');
    }

    // ── Visual balance ──────────────────────────────────────────────────
    const visualSlideCount = slides.filter(hasVisualContent).length;
    const visualRatio = slides.length === 0 ? 0 : visualSlideCount / slides.length;
    // Sweet spot ≈ 0.5–0.8
    let visualBalance: number;
    if (visualRatio >= 0.5 && visualRatio <= 0.8) {
      visualBalance = 100;
    } else if (visualRatio >= 0.3 && visualRatio < 0.5) {
      visualBalance = Math.round(60 + (visualRatio - 0.3) * 200);
    } else if (visualRatio > 0.8) {
      visualBalance = Math.max(70, 100 - Math.round((visualRatio - 0.8) * 200));
    } else {
      visualBalance = Math.round(visualRatio * 200);
      notes.push('Deck is text-heavy — add KPIs, pricing, or roadmap to unlock visual blocks');
    }

    // ── KPI coverage ────────────────────────────────────────────────────
    const kpisAvailable = input.structured?.kpis?.length ?? 0;
    const kpisSurfaced = slides
      .map((s) => (s.content?.metrics?.length ?? 0) + (s.content?.kpis?.length ?? 0))
      .reduce((a, b) => a + b, 0);
    let kpiCoverage: number;
    if (kpisAvailable === 0 && framework.targets.minKpis > 0) {
      kpiCoverage = 0;
      notes.push(`No KPIs supplied (target: ${framework.targets.minKpis})`);
    } else if (kpisAvailable === 0) {
      kpiCoverage = 100;
    } else {
      kpiCoverage = Math.min(100, Math.round((kpisSurfaced / Math.max(1, kpisAvailable)) * 100));
    }

    // ── Financial coverage ──────────────────────────────────────────────
    const needsFinancials = ['business_plan', 'board_meeting_deck', 'executive_summary'].includes(input.documentType);
    let financialCoverage = 100;
    if (needsFinancials) {
      const hasFinSlide = slides.some((s) => s.type === SlideType.FINANCIALS);
      const hasFinData  = !!input.structured?.financials?.revenue ||
                          (input.structured?.financials?.projections?.length ?? 0) > 0;
      if (!hasFinSlide && !hasFinData) {
        financialCoverage = 30;
        notes.push('Financials expected for this document type but no data present');
      } else if (!hasFinSlide) {
        financialCoverage = 60;
      } else if (!hasFinData) {
        financialCoverage = 75;
      }
    }

    // ── Narrative strength ──────────────────────────────────────────────
    // Heuristic: opening hook + closing CTA + at least 2 supporting slides.
    const types = new Set(slides.map((s) => s.type));
    let narrativeStrength = 50;
    if (types.has(SlideType.COVER))            narrativeStrength += 10;
    if (types.has(SlideType.PROBLEM))          narrativeStrength += 15;
    if (types.has(SlideType.SOLUTION))         narrativeStrength += 15;
    if (types.has(SlideType.ASK) || types.has(SlideType.EXECUTIVE_SUMMARY))
                                               narrativeStrength += 10;
    narrativeStrength = Math.min(100, narrativeStrength);
    if (narrativeStrength < 70) {
      notes.push('Narrative arc lacks problem→solution→ask structure');
    }

    // ── Weighted total ──────────────────────────────────────────────────
    const total = Math.round(
      slideCount             * 0.10 +
      informationBalance     * 0.15 +
      visualBalance          * 0.20 +
      frameworkCompleteness  * 0.25 +
      kpiCoverage            * 0.10 +
      financialCoverage      * 0.05 +
      narrativeStrength      * 0.15,
    );

    return {
      total,
      slideCount,
      informationBalance,
      visualBalance,
      frameworkCompleteness,
      kpiCoverage,
      financialCoverage,
      narrativeStrength,
      notes,
    };
  }
}

// =============================================================================
//  Helpers
// =============================================================================

function extractWordCount(slide: SlideContent): number {
  const c = slide.content || {};
  const parts: string[] = [];
  if (slide.title)    parts.push(slide.title);
  if (slide.subtitle) parts.push(slide.subtitle);
  for (const v of Object.values(c)) {
    if (typeof v === 'string') parts.push(v);
    else if (Array.isArray(v)) for (const x of v) {
      if (typeof x === 'string') parts.push(x);
    }
  }
  return parts.join(' ').split(/\s+/).filter(Boolean).length;
}

function hasVisualContent(slide: SlideContent): boolean {
  const c = slide.content || {};
  return !!(
    (Array.isArray(c.metrics)        && c.metrics.length > 0) ||
    (Array.isArray(c.kpis)           && c.kpis.length > 0) ||
    (Array.isArray(c.pricingTiers)   && c.pricingTiers.length > 0) ||
    (Array.isArray(c.team)           && c.team.length > 0) ||
    (Array.isArray(c.phases)         && c.phases.length > 0) ||
    (Array.isArray(c.competitors)    && c.competitors.length > 0) ||
    (c.swot && (c.swot.strengths?.length || c.swot.weaknesses?.length)) ||
    (Array.isArray(c.allocations)    && c.allocations.length > 0) ||
    c.marketSizing ||
    c.timeline ||
    c.chart ||
    c.featureGrid ||
    c.processSteps
  );
}

/**
 * Compute 0..100 balance score from a numeric distribution.
 * 100 = perfectly even, 0 = one slide dominates.
 */
function computeBalance(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  const mean = sum / values.length;
  const variance = values.reduce((a, v) => a + (v - mean) ** 2, 0) / values.length;
  const stdDev = Math.sqrt(variance);
  // Coefficient of variation, inverted into a 0..100 score.
  const cv = mean === 0 ? 0 : stdDev / mean;
  return Math.max(0, Math.min(100, Math.round((1 - Math.min(cv, 1)) * 100)));
}
