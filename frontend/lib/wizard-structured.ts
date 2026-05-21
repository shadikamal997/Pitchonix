/**
 * Phase 28 — Structured wizard data
 *
 * Shapes that the wizard's structured-input forms write to. These travel
 * alongside the existing free-text fields (problem, solution, …) and are
 * preferred by the backend ContentStructureAnalyzer when present.
 *
 * Everything is optional — populating each section is gated by the document
 * type. The completeness scorer uses these to compute the live score.
 *
 * KEEP IN SYNC with backend/src/generation/slide-types/types.ts WizardInput.
 */

export interface KPIEntry {
  label:  string;          // "MRR" / "Active Users"
  value:  string;          // "$50K" / "15,000"
  trend?: string;          // "+150% YoY"
  trendDirection?: 'up' | 'down' | 'flat';
}

export interface PricingTierEntry {
  name:      string;       // "Starter" / "Pro" / "Enterprise"
  price:     string;       // "$9/mo" / "Custom"
  features:  string[];     // bullet list of included features
  target?:   string;       // target customer description
  highlight?: boolean;     // mark as recommended tier
}

export interface RoadmapPhaseEntry {
  phase:       string;     // "Q1 2026 launch"
  period?:     string;     // "Q1 2026"
  milestones:  string[];   // bullets of what ships
}

export interface TeamMemberEntry {
  name:            string;
  role:            string;
  experience?:     string;  // background
  responsibilities?: string;
}

export interface CompetitorEntry {
  name:        string;
  strengths?:  string;     // free-text
  weaknesses?: string;     // free-text
}

export interface FundingAllocationEntry {
  category:    string;     // "Engineering" / "Marketing"
  percentage?: number;     // 0..100
  amount?:     string;     // "$1M"
}

export interface FundingDataEntry {
  amount?:   string;       // "$2M"
  roundType?:string;       // "Seed" / "Series A"
  runway?:   string;       // "18 months"
  allocations: FundingAllocationEntry[];
}

export interface MarketSizingEntry {
  tam?: string;            // "$185B"
  sam?: string;            // "$12B"
  som?: string;            // "$850M"
  growthRate?: string;     // "25% CAGR"
  region?: string;
  drivers?: string[];      // bullets of market drivers
}

export interface SWOTEntry {
  strengths:     string[];
  weaknesses:    string[];
  opportunities: string[];
  threats:       string[];
}

export interface FinancialsEntry {
  revenue?:    string;
  costs?:      string;
  grossMargin?:string;
  burnRate?:   string;
  runway?:     string;
  projections?: Array<{ year: string; revenue: string; expenses: string; ebitda?: string }>;
}

// =============================================================================
//  Combined structured payload that lives next to WizardData
// =============================================================================

export interface StructuredWizardData {
  kpis?:          KPIEntry[];
  pricingTiers?:  PricingTierEntry[];
  roadmapPhases?: RoadmapPhaseEntry[];
  teamMembers?:   TeamMemberEntry[];
  competitors?:   CompetitorEntry[];
  funding?:       FundingDataEntry;
  marketSizing?:  MarketSizingEntry;
  swot?:          SWOTEntry;
  financials?:    FinancialsEntry;
}

// =============================================================================
//  Defaults
// =============================================================================

export const emptyStructuredWizardData: StructuredWizardData = {
  kpis: [],
  pricingTiers: [],
  roadmapPhases: [],
  teamMembers: [],
  competitors: [],
  funding: { allocations: [] },
  marketSizing: {},
  swot: { strengths: [], weaknesses: [], opportunities: [], threats: [] },
  financials: {},
};

// =============================================================================
//  Document-type → section visibility
//
//  Which structured sections to show on the wizard for each document type.
//  The wizard hides irrelevant sections so the form stays focused.
// =============================================================================

export type StructuredSectionKey =
  | 'kpis' | 'pricing' | 'roadmap' | 'team' | 'competitors'
  | 'funding' | 'market' | 'swot' | 'financials';

export const DOCUMENT_SECTION_MAP: Record<string, StructuredSectionKey[]> = {
  pitch_deck:           ['market', 'pricing', 'team', 'competitors', 'funding', 'roadmap', 'kpis'],
  sales_deck:           ['pricing', 'competitors', 'kpis'],
  board_meeting_deck:   ['kpis', 'financials', 'roadmap'],
  product_launch:       ['pricing', 'roadmap', 'kpis'],
  training_presentation:['roadmap'],
  strategy_presentation:['swot', 'roadmap', 'competitors'],
  business_plan:        ['market', 'pricing', 'team', 'competitors', 'funding', 'roadmap', 'financials', 'kpis'],
  company_profile:      ['team', 'roadmap', 'kpis'],
  case_study:           ['kpis'],
  proposal:             ['pricing'],
  marketing_plan:       ['kpis', 'competitors'],
  executive_summary:    ['kpis', 'financials'],
  one_pager:            ['kpis'],
};

export function getSectionsFor(documentType: string): StructuredSectionKey[] {
  return DOCUMENT_SECTION_MAP[documentType] || ['kpis'];
}
