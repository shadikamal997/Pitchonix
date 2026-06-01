// =============================================================================
//  Narrative Flow Engine — Phase 6
//
//  Knows the canonical investor story arc for every document type.
//  Provides two exports used by the generation pipeline:
//
//    sortByNarrativeArc(slides, docType)
//      Re-orders any slide array so it follows the canonical arc.
//      Called by SlideFactory AFTER generation to fix accidental priority
//      collisions (e.g. Vision priority-3 appearing before Market priority-4).
//
//    analyzeNarrativeFlow(types, docType)
//      Detects missing "tent-pole" slides, ordering violations, and produces
//      a 0-100 narrative coherence score stored in generation metrics.
// =============================================================================

import { SlideType } from '../slide-types/types';

// ---------------------------------------------------------------------------
//  Canonical narrative arcs
// ---------------------------------------------------------------------------

const PITCH_ARC: SlideType[] = [
  SlideType.COVER,
  SlideType.EXECUTIVE_SUMMARY,
  SlideType.PROBLEM,
  SlideType.SOLUTION,
  SlideType.MARKET_OPPORTUNITY,
  SlideType.BUSINESS_MODEL,
  SlideType.TRACTION,
  SlideType.COMPETITION,
  SlideType.TEAM,
  SlideType.ROADMAP,
  SlideType.FINANCIALS,
  SlideType.PRICING,
  SlideType.ASK,
];

const BUSINESS_PLAN_ARC: SlideType[] = [
  SlideType.COVER,
  SlideType.EXECUTIVE_SUMMARY,
  SlideType.COMPANY_OVERVIEW,
  SlideType.VISION,
  SlideType.PROBLEM,
  SlideType.SOLUTION,
  SlideType.PRODUCT_FEATURES,
  SlideType.MARKET_OPPORTUNITY,
  SlideType.COMPETITION,
  SlideType.BUSINESS_MODEL,
  SlideType.PRICING,
  SlideType.GO_TO_MARKET,
  SlideType.TRACTION,
  SlideType.TEAM,
  SlideType.FINANCIALS,
  SlideType.ROADMAP,
  SlideType.RISKS,
  SlideType.ASK,
];

const SALES_ARC: SlideType[] = [
  SlideType.COVER,
  SlideType.PROBLEM,
  SlideType.SOLUTION,
  SlideType.PRODUCT_FEATURES,
  SlideType.CASE_STUDY,
  SlideType.TRACTION,
  SlideType.COMPETITION,
  SlideType.PRICING,
  SlideType.TEAM,
  SlideType.ASK,
];

const BOARD_ARC: SlideType[] = [
  SlideType.COVER,
  SlideType.EXECUTIVE_SUMMARY,
  SlideType.TRACTION,
  SlideType.FINANCIALS,
  SlideType.BUSINESS_MODEL,
  SlideType.ROADMAP,
  SlideType.RISKS,
  SlideType.ASK,
];

const COMPANY_PROFILE_ARC: SlideType[] = [
  SlideType.COVER,
  SlideType.VISION,
  SlideType.COMPANY_OVERVIEW,
  SlideType.PRODUCT_FEATURES,
  SlideType.MARKET_OPPORTUNITY,
  SlideType.TRACTION,
  SlideType.TEAM,
  SlideType.PARTNERSHIP,
];

const PRODUCT_LAUNCH_ARC: SlideType[] = [
  SlideType.COVER,
  SlideType.PROBLEM,
  SlideType.SOLUTION,
  SlideType.PRODUCT_FEATURES,
  SlideType.MARKET_OPPORTUNITY,
  SlideType.GO_TO_MARKET,
  SlideType.PRICING,
  SlideType.ROADMAP,
  SlideType.TEAM,
  SlideType.ASK,
];

const ARC_BY_DOC_TYPE: Record<string, SlideType[]> = {
  pitch_deck:             PITCH_ARC,
  investor_deck:          PITCH_ARC,
  business_plan:          BUSINESS_PLAN_ARC,
  sales_deck:             SALES_ARC,
  board_meeting_deck:     BOARD_ARC,
  board_meeting:          BOARD_ARC,
  board_deck:             BOARD_ARC,
  strategy_presentation:  BUSINESS_PLAN_ARC,
  strategy_deck:          BUSINESS_PLAN_ARC,
  company_profile:        COMPANY_PROFILE_ARC,
  product_launch:         PRODUCT_LAUNCH_ARC,
};

function getArc(documentType?: string): SlideType[] {
  return ARC_BY_DOC_TYPE[documentType || ''] ?? PITCH_ARC;
}

// Position of a type in the arc — types not in the arc land at the end,
// preserving their relative order among themselves.
function arcPos(type: SlideType, arc: SlideType[]): number {
  const i = arc.indexOf(type);
  return i === -1 ? 10000 : i;
}

// ---------------------------------------------------------------------------
//  Public: sort
// ---------------------------------------------------------------------------

/**
 * Returns a new array sorted to match the canonical narrative arc.
 * Slides whose type appears in the arc are ordered by arc position;
 * slides not in the arc are appended in their original relative order.
 * Each returned slide has its `order` field re-indexed from 0.
 */
export function sortByNarrativeArc<T extends { type: SlideType; order: number }>(
  slides: T[],
  documentType?: string,
): T[] {
  const arc = getArc(documentType);
  const sorted = [...slides].sort((a, b) => {
    const diff = arcPos(a.type, arc) - arcPos(b.type, arc);
    return diff !== 0 ? diff : a.order - b.order;
  });
  return sorted.map((s, i) => ({ ...s, order: i }));
}

// ---------------------------------------------------------------------------
//  Public: analysis
// ---------------------------------------------------------------------------

export interface NarrativeGap {
  type: SlideType;
  reason: string;
  severity: 'critical' | 'warning' | 'suggestion';
}

export interface NarrativeFlowAnalysis {
  narrativeScore:  number;        // 0–100
  gaps:            NarrativeGap[];
  outOfOrder:      SlideType[];   // types that violate arc sequence
  recommendedArc:  SlideType[];   // arc filtered to present types
}

// Minimum required slides per document type
const CRITICAL_SLIDES: Record<string, Array<{ type: SlideType; reason: string }>> = {
  pitch_deck: [
    { type: SlideType.PROBLEM,           reason: 'Investors must understand the pain before the solution' },
    { type: SlideType.SOLUTION,          reason: 'The solution anchors the entire investment thesis' },
    { type: SlideType.MARKET_OPPORTUNITY,reason: 'Market size justifies why this is worth funding' },
    { type: SlideType.TEAM,              reason: 'Investors back teams, not just ideas' },
    { type: SlideType.ASK,               reason: 'Every pitch deck needs a clear funding ask' },
  ],
  investor_deck: [
    { type: SlideType.PROBLEM,           reason: 'Investors must understand the pain before the solution' },
    { type: SlideType.SOLUTION,          reason: 'The solution anchors the entire investment thesis' },
    { type: SlideType.MARKET_OPPORTUNITY,reason: 'Market size justifies why this is worth funding' },
    { type: SlideType.TEAM,              reason: 'Investors back teams, not just ideas' },
    { type: SlideType.ASK,               reason: 'Every pitch deck needs a clear funding ask' },
  ],
  business_plan: [
    { type: SlideType.EXECUTIVE_SUMMARY, reason: 'Business plans require an executive summary' },
    { type: SlideType.MARKET_OPPORTUNITY,reason: 'Market sizing is mandatory for business plans' },
    { type: SlideType.FINANCIALS,        reason: 'Financial projections are the backbone of a business plan' },
  ],
  sales_deck: [
    { type: SlideType.PROBLEM,           reason: 'Start with the customer\'s pain' },
    { type: SlideType.SOLUTION,          reason: 'Show how you solve it' },
    { type: SlideType.PRICING,           reason: 'Sales decks must address pricing' },
  ],
};

// Pairs that must appear in a specific order
const ORDER_DEPENDENCIES: Array<{ before: SlideType; after: SlideType }> = [
  { before: SlideType.PROBLEM,  after: SlideType.SOLUTION },
  { before: SlideType.SOLUTION, after: SlideType.MARKET_OPPORTUNITY },
  { before: SlideType.TRACTION, after: SlideType.ASK },
  { before: SlideType.BUSINESS_MODEL, after: SlideType.FINANCIALS },
];

export function analyzeNarrativeFlow(
  slideTypes: SlideType[],
  documentType?: string,
): NarrativeFlowAnalysis {
  const typeSet   = new Set(slideTypes);
  const arc       = getArc(documentType);
  const gaps: NarrativeGap[] = [];

  // Missing critical slides
  const criticals = CRITICAL_SLIDES[documentType || 'pitch_deck'] ?? CRITICAL_SLIDES['pitch_deck'];
  for (const { type, reason } of criticals) {
    if (!typeSet.has(type)) gaps.push({ type, reason, severity: 'critical' });
  }

  // Suggested narrative additions (warning-level)
  if (!typeSet.has(SlideType.TRACTION) && (documentType === 'pitch_deck' || documentType === 'investor_deck')) {
    gaps.push({ type: SlideType.TRACTION, reason: 'Traction evidence de-risks the investment', severity: 'warning' });
  }
  if (!typeSet.has(SlideType.COMPETITION) && (documentType === 'pitch_deck' || documentType === 'investor_deck')) {
    gaps.push({ type: SlideType.COMPETITION, reason: 'Competitive differentiation strengthens the thesis', severity: 'suggestion' });
  }

  // Out-of-order detection
  const outOfOrder: SlideType[] = [];
  for (const { before, after } of ORDER_DEPENDENCIES) {
    if (typeSet.has(before) && typeSet.has(after)) {
      if (slideTypes.indexOf(before) > slideTypes.indexOf(after)) {
        outOfOrder.push(before);
      }
    }
  }

  // Score: 100 − critical×20 − warning×7 − out-of-order×5
  const criticalCount = gaps.filter((g) => g.severity === 'critical').length;
  const warningCount  = gaps.filter((g) => g.severity === 'warning').length;
  const orderPenalty  = outOfOrder.length * 5;
  const narrativeScore = Math.max(0, 100 - criticalCount * 20 - warningCount * 7 - orderPenalty);

  const recommendedArc = arc.filter((t) => typeSet.has(t));

  return { narrativeScore, gaps, outOfOrder, recommendedArc };
}
