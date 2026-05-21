/**
 * Phase 30B — Business Logic Validator
 *
 * Examines a generated deck + the underlying wizard input and flags missing
 * critical business facts: market size, business model, pricing, competitors,
 * roadmap, KPIs, team, funding ask, etc.
 *
 * Severity is calibrated per document type — e.g. a board deck without KPIs
 * is an `error`, whereas a training deck without KPIs is informational.
 */

import { Injectable } from '@nestjs/common';
import { WizardInput, SlideContent, SlideType } from '../slide-types/types';
import { BusinessLogicReport, BusinessLogicWarning, BusinessLogicCode } from './types';

@Injectable()
export class BusinessLogicValidator {
  validate(input: WizardInput, slides: SlideContent[]): BusinessLogicReport {
    const warnings: BusinessLogicWarning[] = [];
    const present = new Set(slides.map((s) => s.type));
    const doc = input.documentType;
    const s = input.structured;

    const sev = (
      code: BusinessLogicCode,
      severity: BusinessLogicWarning['severity'],
      message: string,
      hint?: string,
    ) => warnings.push({ code, severity, message, hint });

    // ── Market size ──────────────────────────────────────────────────────
    const hasMarketSizing = !!(s?.marketSizing?.tam || s?.marketSizing?.sam || s?.marketSizing?.som);
    const hasMarketText   = (input.marketOpportunity || '').trim().length > 20;
    if (!hasMarketSizing && !hasMarketText && requiresMarket(doc)) {
      sev('missing-market-size',
        doc === 'pitch_deck' ? 'error' : 'warn',
        'No market sizing data',
        'Add TAM / SAM / SOM in the wizard to unlock the market sizing slide.');
    }

    // ── Business model ───────────────────────────────────────────────────
    const hasBusinessModelSlide = present.has(SlideType.BUSINESS_MODEL) || present.has(SlideType.REVENUE_MODEL);
    const hasBusinessModelText  = !!(input.revenueModel?.trim() || input.pricing?.trim());
    if (!hasBusinessModelSlide && !hasBusinessModelText && requiresBusinessModel(doc)) {
      sev('missing-business-model', 'error',
        'No business model defined',
        'Describe revenue model or pricing structure.');
    }

    // ── Pricing ──────────────────────────────────────────────────────────
    const hasPricingTiers = (s?.pricingTiers?.length ?? 0) > 0;
    if (!hasPricingTiers && !input.pricing && requiresPricing(doc)) {
      sev('missing-pricing',
        doc === 'sales_deck' || doc === 'proposal' ? 'error' : 'warn',
        'No pricing data',
        'Add pricing tiers in the Business Data step.');
    }

    // ── Competitors ──────────────────────────────────────────────────────
    const hasCompetitors = (s?.competitors?.length ?? 0) > 0 || !!input.competitors;
    if (!hasCompetitors && requiresCompetitors(doc)) {
      sev('missing-competitors',
        doc === 'pitch_deck' ? 'error' : 'warn',
        'No competitors listed',
        'Add 2–3 competitors to enable the competitive landscape slide.');
    }

    // ── Roadmap ──────────────────────────────────────────────────────────
    const hasRoadmap = (s?.roadmapPhases?.length ?? 0) > 0 || !!input.roadmap;
    if (!hasRoadmap && requiresRoadmap(doc)) {
      sev('missing-roadmap', 'warn',
        'No roadmap data',
        'Add roadmap phases with milestones in the Business Data step.');
    }

    // ── KPIs ─────────────────────────────────────────────────────────────
    const hasKpis = (s?.kpis?.length ?? 0) >= 1 || (input.traction || '').match(/\d/);
    if (!hasKpis && requiresKpis(doc)) {
      sev('missing-kpis',
        doc === 'board_meeting_deck' ? 'error' : 'warn',
        'No KPIs defined',
        'Add at least 3 KPIs (label / value / trend).');
    }

    // ── Team ─────────────────────────────────────────────────────────────
    const hasTeam = (s?.teamMembers?.length ?? 0) > 0 || !!input.team;
    if (!hasTeam && requiresTeam(doc)) {
      sev('missing-team',
        doc === 'pitch_deck' ? 'error' : 'warn',
        'No team information',
        'Add at least 2 team members to enable the team slide.');
    }

    // ── Ask ──────────────────────────────────────────────────────────────
    const hasAsk = !!input.fundingAsk?.trim() ||
                   !!s?.funding?.amount ||
                   (s?.funding?.allocations?.length ?? 0) > 0;
    if (!hasAsk && requiresAsk(doc)) {
      sev('missing-ask',
        doc === 'pitch_deck' ? 'error' : 'warn',
        'No funding ask or call-to-action',
        'Specify what you\'re asking for (funds, decisions, signature).');
    }

    // ── Financials ───────────────────────────────────────────────────────
    const hasFinancials = !!s?.financials?.revenue || (s?.financials?.projections?.length ?? 0) > 0;
    if (!hasFinancials && requiresFinancials(doc)) {
      sev('missing-financials',
        doc === 'board_meeting_deck' || doc === 'business_plan' ? 'error' : 'warn',
        'No financial data',
        'Add revenue, costs, or projections in the Business Data step.');
    }

    // ── SWOT (strategy only) ─────────────────────────────────────────────
    const hasSwot = !!s?.swot && Object.values(s.swot).some((arr) => Array.isArray(arr) && arr.length > 0);
    if (!hasSwot && doc === 'strategy_presentation') {
      sev('missing-swot', 'warn',
        'No SWOT entries',
        'Add at least one item to each SWOT quadrant.');
    }

    // ── Risks (board only) ───────────────────────────────────────────────
    if (doc === 'board_meeting_deck' && !present.has(SlideType.RISKS)) {
      sev('missing-risks', 'warn',
        'No risks section',
        'Board decks should surface top risks and mitigations.');
    }

    // ── ROI proof (sales only) ───────────────────────────────────────────
    if (doc === 'sales_deck') {
      const hasRoiProof = present.has(SlideType.CASE_STUDY) || present.has(SlideType.TRACTION) || hasKpis;
      if (!hasRoiProof) {
        sev('missing-roi', 'warn',
          'No ROI proof',
          'Add KPIs or a case study to demonstrate measurable impact.');
      }
    }

    const errorCount = warnings.filter((w) => w.severity === 'error').length;
    const warnCount  = warnings.filter((w) => w.severity === 'warn').length;
    return { warnings, errorCount, warnCount };
  }
}

// ── Document-type requirement matrix ──────────────────────────────────────
// `true` means the document type expects this kind of data; we flag if absent.

const requiresMarket = (doc: string) =>
  ['pitch_deck', 'business_plan', 'strategy_presentation', 'marketing_plan',
   'executive_summary', 'product_launch', 'partnership_proposal'].includes(doc);
const requiresBusinessModel = (doc: string) =>
  ['pitch_deck', 'business_plan', 'executive_summary', 'partnership_proposal'].includes(doc);
const requiresPricing = (doc: string) =>
  ['pitch_deck', 'sales_deck', 'proposal', 'business_plan', 'product_launch', 'marketing_plan'].includes(doc);
const requiresCompetitors = (doc: string) =>
  ['pitch_deck', 'business_plan', 'sales_deck', 'marketing_plan', 'strategy_presentation'].includes(doc);
const requiresRoadmap = (doc: string) =>
  ['pitch_deck', 'business_plan', 'strategy_presentation', 'product_launch', 'board_meeting_deck',
   'marketing_plan', 'internal_report'].includes(doc);
const requiresKpis = (doc: string) =>
  ['pitch_deck', 'board_meeting_deck', 'business_plan', 'executive_summary', 'marketing_plan',
   'strategy_presentation', 'sales_deck', 'company_profile'].includes(doc);
const requiresTeam = (doc: string) =>
  ['pitch_deck', 'business_plan', 'company_profile', 'partnership_proposal'].includes(doc);
const requiresAsk = (doc: string) =>
  ['pitch_deck', 'partnership_proposal', 'board_meeting_deck', 'proposal', 'sales_deck'].includes(doc);
const requiresFinancials = (doc: string) =>
  ['business_plan', 'board_meeting_deck', 'executive_summary', 'financial_projection',
   'internal_report'].includes(doc);
