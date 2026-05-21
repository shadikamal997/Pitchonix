/**
 * Phase 30I — Auto-Expansion Service
 *
 * Before generation, decides which framework sections should be added even
 * if they wouldn't be promoted by the SlideFactory's default core list.
 *
 * Algorithm:
 *   1. Look up the document's framework (Phase 30A).
 *   2. For each *required* section, check whether the user supplied data
 *      that justifies generating that slide. Data sources are:
 *        - the structured wizard payload (Phase 28)
 *        - the free-text wizard fields
 *   3. Return the union of those slide types as promotions for the
 *      SlideFactory's `getStructuredPromotions` step.
 *
 * This is what closes the loop between "user gave us info" and
 * "the framework actually contains it."
 */

import { Injectable } from '@nestjs/common';
import { WizardInput, SlideType } from '../slide-types/types';
import { AutoExpansionResult } from './types';
import { getFramework } from './frameworks';

@Injectable()
export class AutoExpansionService {
  expand(input: WizardInput): AutoExpansionResult {
    const framework = getFramework(input.documentType);
    const promotions: SlideType[] = [];
    const skipped: AutoExpansionResult['skipped'] = [];

    for (const section of framework.sections) {
      if (!section.required) continue;
      const evidence = this.hasEvidenceFor(input, section.slideType);
      if (evidence.ok) {
        promotions.push(section.slideType);
      } else {
        skipped.push({ slideType: section.slideType, reason: evidence.reason });
      }
    }

    return { promotions: dedupe(promotions), skipped };
  }

  /**
   * Inspect the wizard input and answer: do we have enough data to actually
   * render a slide of this type? If yes, we promote it; if no, we skip so
   * the framework engine reports it as missing (rather than emitting an
   * empty placeholder).
   */
  private hasEvidenceFor(input: WizardInput, type: SlideType): { ok: boolean; reason: string } {
    const s = input.structured;
    switch (type) {
      case SlideType.PROBLEM:
        return input.problem?.trim()
          ? { ok: true,  reason: '' }
          : { ok: false, reason: 'No problem statement' };

      case SlideType.SOLUTION:
        return input.solution?.trim()
          ? { ok: true,  reason: '' }
          : { ok: false, reason: 'No solution description' };

      case SlideType.MARKET_OPPORTUNITY:
        if (!!(s?.marketSizing?.tam || s?.marketSizing?.sam || s?.marketSizing?.som) ||
            (input.marketOpportunity || '').trim().length > 20) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No market sizing data' };

      case SlideType.BUSINESS_MODEL:
      case SlideType.REVENUE_MODEL:
        if ((s?.pricingTiers?.length ?? 0) > 0 ||
            input.revenueModel?.trim() ||
            input.pricing?.trim()) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No business model / pricing' };

      case SlideType.COMPETITION:
        if ((s?.competitors?.length ?? 0) > 0 || (input.competitors || '').trim().length > 10) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No competitors listed' };

      case SlideType.TRACTION:
        if ((s?.kpis?.length ?? 0) > 0 || (input.traction || '').trim().length > 20) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No traction data / KPIs' };

      case SlideType.TEAM:
        if ((s?.teamMembers?.length ?? 0) > 0 || (input.team || '').trim().length > 20) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No team members' };

      case SlideType.ROADMAP:
        if ((s?.roadmapPhases?.length ?? 0) > 0 || (input.roadmap || '').trim().length > 20) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No roadmap data' };

      case SlideType.ASK:
        if (!!input.fundingAsk?.trim() ||
            !!s?.funding?.amount ||
            (s?.funding?.allocations?.length ?? 0) > 0 ||
            !!input.desiredAction?.trim()) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No ask / next-step' };

      case SlideType.FINANCIALS:
        if (!!s?.financials?.revenue ||
            (s?.financials?.projections?.length ?? 0) > 0) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No financial data' };

      case SlideType.EXECUTIVE_SUMMARY:
        if ((input.shortDescription || input.problem || input.solution || '').trim().length > 40) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No summary content' };

      case SlideType.PRICING:
        if ((s?.pricingTiers?.length ?? 0) > 0 || (input.pricing || '').trim().length > 20) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No pricing data' };

      case SlideType.RISKS:
        // No structured risks field yet — only generated when the user
        // mentioned risks explicitly somewhere.
        if (/risk|threat|uncertain/i.test(JSON.stringify(input))) {
          return { ok: true, reason: '' };
        }
        return { ok: false, reason: 'No risks mentioned' };

      case SlideType.PRODUCT_FEATURES:
        return (input.solution || input.productService || '').trim().length > 30
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'No product description' };

      case SlideType.GO_TO_MARKET:
        return (input.targetCustomers || input.audience || '').trim().length > 20
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'No GTM details' };

      case SlideType.VISION:
        return (input.shortDescription || '').trim().length > 20
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'No vision statement' };

      case SlideType.COMPANY_OVERVIEW:
        return !!input.companyName
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'No company name' };

      case SlideType.CASE_STUDY:
        return /case|customer|client|success|deployed/i.test(input.traction || '')
          ? { ok: true, reason: '' }
          : { ok: false, reason: 'No case study data' };

      case SlideType.COVER:
        return { ok: true, reason: '' };

      default:
        return { ok: false, reason: 'No mapping' };
    }
  }
}

function dedupe<T>(xs: T[]): T[] {
  return Array.from(new Set(xs));
}
