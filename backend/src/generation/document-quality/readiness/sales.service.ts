/**
 * Phase 30E — Sales Readiness Engine
 *
 * Sales-deck-only. Scores the buyer-journey dimensions.
 */

import { Injectable } from '@nestjs/common';
import { SlideContent, SlideType, WizardInput } from '../../slide-types/types';
import { ReadinessReport, ReadinessCriterion } from '../types';

@Injectable()
export class SalesReadinessEngine {
  score(input: WizardInput, slides: SlideContent[]): ReadinessReport {
    const s = input.structured;
    const types = new Set(slides.map((sl) => sl.type));
    const criteria: ReadinessCriterion[] = [];

    // ── Customer pain ───────────────────────────────────────────────────
    const painText = (input.problem || input.targetCustomers || '').trim();
    const painScore = painText.length >= 60 ? 100 :
                      painText.length >= 30 ? 70 :
                      painText.length >= 10 ? 40 : 0;
    criteria.push({ key: 'customer-pain', label: 'Customer pain',
      score: painScore,
      reason: painScore < 70 ? 'Describe the customer pain in 2–3 sentences' : undefined });

    // ── Solution fit ────────────────────────────────────────────────────
    const solText = (input.solution || '').trim();
    const diffText = (input.differentiation || '').trim();
    const fitScore = solText.length >= 80 && diffText.length >= 30 ? 100 :
                     solText.length >= 50                          ? 70 :
                     solText.length >= 20                          ? 40 : 0;
    criteria.push({ key: 'solution-fit', label: 'Solution fit',
      score: fitScore,
      reason: fitScore < 70 ? 'Add solution detail + clear differentiation' : undefined });

    // ── ROI proof ───────────────────────────────────────────────────────
    const kpiCount = s?.kpis?.length ?? 0;
    const hasCaseStudy = types.has(SlideType.CASE_STUDY);
    let roiScore = 0;
    if (kpiCount >= 3 && hasCaseStudy) roiScore = 100;
    else if (kpiCount >= 2)            roiScore = 80;
    else if (kpiCount === 1)           roiScore = 60;
    else if (hasCaseStudy)             roiScore = 60;
    else if (/\d+%|\d+x/.test(input.traction || '')) roiScore = 50;
    criteria.push({ key: 'roi-proof', label: 'ROI proof',
      score: roiScore,
      reason: roiScore < 70 ? 'Add 2+ KPIs or a case study with measurable results' : undefined });

    // ── Testimonials / case study ───────────────────────────────────────
    const testimonialScore = hasCaseStudy ? 100 :
                             /testimonial|customer|client|quote/i.test(input.traction || '') ? 60 : 0;
    criteria.push({ key: 'testimonials', label: 'Testimonials',
      score: testimonialScore,
      reason: testimonialScore < 70 ? 'Add a customer testimonial or case study' : undefined });

    // ── Pricing clarity ─────────────────────────────────────────────────
    const tierCount = s?.pricingTiers?.length ?? 0;
    let pricingScore = 0;
    if (tierCount >= 3)            pricingScore = 100;
    else if (tierCount === 2)      pricingScore = 80;
    else if (tierCount === 1)      pricingScore = 60;
    else if (input.pricing)        pricingScore = 40;
    criteria.push({ key: 'pricing-clarity', label: 'Pricing clarity',
      score: pricingScore,
      reason: pricingScore < 70 ? 'Add 2–3 named pricing tiers with features' : undefined });

    // ── CTA strength ────────────────────────────────────────────────────
    const ctaText = (input.desiredAction || input.fundingAsk || '').trim();
    let ctaScore = 0;
    if (types.has(SlideType.ASK) && ctaText.length >= 20) ctaScore = 100;
    else if (types.has(SlideType.ASK))                    ctaScore = 70;
    else if (ctaText.length >= 20)                        ctaScore = 50;
    criteria.push({ key: 'cta-strength', label: 'Call-to-action',
      score: ctaScore,
      reason: ctaScore < 70 ? 'Add an explicit next-step CTA (demo / signature / pilot)' : undefined });

    const weights: Record<string, number> = {
      'customer-pain':    0.20,
      'solution-fit':     0.20,
      'roi-proof':        0.20,
      'testimonials':     0.10,
      'pricing-clarity':  0.15,
      'cta-strength':     0.15,
    };
    const total = Math.round(
      criteria.reduce((acc, c) => acc + c.score * (weights[c.key] ?? 0), 0),
    );

    return { documentType: 'sales_deck', engine: 'sales', total, criteria, band: band(total) };
  }
}

function band(score: number): ReadinessReport['band'] {
  if (score >= 85) return 'excellent';
  if (score >= 70) return 'good';
  if (score >= 50) return 'fair';
  return 'poor';
}
