/**
 * Phase 30A — Document Framework Engine (data layer)
 *
 * Declarative business frameworks for each document type. The
 * FrameworkEngine validates generated decks against these.
 *
 * Sections marked `required: true` must be satisfied (directly or via an
 * alternate slide type) for the framework to be considered complete.
 */

import { SlideType } from '../slide-types/types';
import { DocumentFramework } from './types';

// =============================================================================
//  Pitch Deck — investor narrative (Sequoia-style 9-section frame)
// =============================================================================

const PITCH_DECK_FRAMEWORK: DocumentFramework = {
  documentType: 'pitch_deck',
  name:         'Investor Pitch (Sequoia 9)',
  sections: [
    { order:  1, slideType: SlideType.PROBLEM,            label: 'Problem',         required: true },
    { order:  2, slideType: SlideType.SOLUTION,           label: 'Solution',        required: true },
    { order:  3, slideType: SlideType.MARKET_OPPORTUNITY, label: 'Market',          required: true },
    { order:  4, slideType: SlideType.BUSINESS_MODEL,     label: 'Business Model',  required: true, alternates: [SlideType.REVENUE_MODEL, SlideType.PRICING] },
    { order:  5, slideType: SlideType.COMPETITION,        label: 'Competition',     required: true },
    { order:  6, slideType: SlideType.TRACTION,           label: 'Traction',        required: true },
    { order:  7, slideType: SlideType.TEAM,               label: 'Team',            required: true },
    { order:  8, slideType: SlideType.ROADMAP,            label: 'Roadmap',         required: false },
    { order:  9, slideType: SlideType.ASK,                label: 'Ask',             required: true },
  ],
  targets: { minSlides: 9, maxSlides: 14, minVisualBlocks: 8, minKpis: 3 },
};

// =============================================================================
//  Board Meeting Deck — quarterly board frame
// =============================================================================

const BOARD_DECK_FRAMEWORK: DocumentFramework = {
  documentType: 'board_meeting_deck',
  name:         'Quarterly Board Meeting',
  sections: [
    { order:  1, slideType: SlideType.EXECUTIVE_SUMMARY, label: 'Executive Summary', required: true },
    { order:  2, slideType: SlideType.TRACTION,          label: 'KPI Review',        required: true, alternates: [SlideType.BUSINESS_MODEL] },
    { order:  3, slideType: SlideType.FINANCIALS,        label: 'Financial Review',  required: true },
    { order:  4, slideType: SlideType.RISKS,             label: 'Risks',             required: true },
    { order:  5, slideType: SlideType.ROADMAP,           label: 'Milestones',        required: true, alternates: [SlideType.ROADMAP] },
    { order:  6, slideType: SlideType.ASK,               label: 'Decisions Required', required: true, alternates: [SlideType.ASK] },
  ],
  targets: { minSlides: 6, maxSlides: 12, minVisualBlocks: 6, minKpis: 5 },
};

// =============================================================================
//  Sales Deck — buyer-journey frame
// =============================================================================

const SALES_DECK_FRAMEWORK: DocumentFramework = {
  documentType: 'sales_deck',
  name:         'Buyer-Journey Sales Deck',
  sections: [
    { order:  1, slideType: SlideType.PROBLEM,          label: 'Pain Point',     required: true },
    { order:  2, slideType: SlideType.PROBLEM,          label: 'Current State',  required: false, alternates: [SlideType.PROBLEM] },
    { order:  3, slideType: SlideType.SOLUTION,         label: 'Solution',       required: true },
    { order:  4, slideType: SlideType.PRODUCT_FEATURES, label: 'Benefits',       required: true, alternates: [SlideType.SOLUTION] },
    { order:  5, slideType: SlideType.TRACTION,         label: 'ROI Proof',      required: true, alternates: [SlideType.CASE_STUDY] },
    { order:  6, slideType: SlideType.CASE_STUDY,       label: 'Case Study',     required: false },
    { order:  7, slideType: SlideType.PRICING,          label: 'Pricing',        required: true },
    { order:  8, slideType: SlideType.ASK,              label: 'Call to Action', required: true },
  ],
  targets: { minSlides: 7, maxSlides: 12, minVisualBlocks: 6, minKpis: 2 },
};

// =============================================================================
//  Strategy Presentation
// =============================================================================

const STRATEGY_FRAMEWORK: DocumentFramework = {
  documentType: 'strategy_presentation',
  name:         'Strategic Plan',
  sections: [
    { order:  1, slideType: SlideType.EXECUTIVE_SUMMARY, label: 'Current Situation',   required: true },
    { order:  2, slideType: SlideType.MARKET_OPPORTUNITY, label: 'SWOT / Market',      required: true },
    { order:  3, slideType: SlideType.VISION,            label: 'Strategic Priorities', required: true, alternates: [SlideType.EXECUTIVE_SUMMARY] },
    { order:  4, slideType: SlideType.GO_TO_MARKET,      label: 'Initiatives',        required: true, alternates: [SlideType.ROADMAP] },
    { order:  5, slideType: SlideType.ROADMAP,           label: 'Roadmap',            required: true },
    { order:  6, slideType: SlideType.TRACTION,          label: 'KPIs',               required: true },
  ],
  targets: { minSlides: 6, maxSlides: 12, minVisualBlocks: 5, minKpis: 4 },
};

// =============================================================================
//  Business Plan
// =============================================================================

const BUSINESS_PLAN_FRAMEWORK: DocumentFramework = {
  documentType: 'business_plan',
  name:         'Standard Business Plan',
  sections: [
    { order:  1, slideType: SlideType.EXECUTIVE_SUMMARY,  label: 'Executive Summary', required: true },
    { order:  2, slideType: SlideType.PROBLEM,            label: 'Problem',           required: true },
    { order:  3, slideType: SlideType.SOLUTION,           label: 'Solution',          required: true },
    { order:  4, slideType: SlideType.MARKET_OPPORTUNITY, label: 'Market',            required: true },
    { order:  5, slideType: SlideType.COMPETITION,        label: 'Competition',       required: true },
    { order:  6, slideType: SlideType.BUSINESS_MODEL,     label: 'Business Model',    required: true },
    { order:  7, slideType: SlideType.GO_TO_MARKET,       label: 'Go-to-Market',      required: true },
    { order:  8, slideType: SlideType.TEAM,               label: 'Team',              required: true },
    { order:  9, slideType: SlideType.FINANCIALS,         label: 'Financials',        required: true },
    { order: 10, slideType: SlideType.ROADMAP,            label: 'Roadmap',           required: false },
  ],
  targets: { minSlides: 9, maxSlides: 16, minVisualBlocks: 8, minKpis: 4 },
};

// =============================================================================
//  Executive Summary
// =============================================================================

const EXECUTIVE_SUMMARY_FRAMEWORK: DocumentFramework = {
  documentType: 'executive_summary',
  name:         'Executive Summary',
  sections: [
    { order:  1, slideType: SlideType.EXECUTIVE_SUMMARY,  label: 'Overview',       required: true },
    { order:  2, slideType: SlideType.MARKET_OPPORTUNITY, label: 'Market',         required: true },
    { order:  3, slideType: SlideType.BUSINESS_MODEL,     label: 'Business Model', required: true },
    { order:  4, slideType: SlideType.TRACTION,           label: 'Traction',       required: true },
    { order:  5, slideType: SlideType.FINANCIALS,         label: 'Financials',     required: false },
  ],
  targets: { minSlides: 4, maxSlides: 8, minVisualBlocks: 4, minKpis: 3 },
};

// =============================================================================
//  Company Profile
// =============================================================================

const COMPANY_PROFILE_FRAMEWORK: DocumentFramework = {
  documentType: 'company_profile',
  name:         'Company Profile',
  sections: [
    { order: 1, slideType: SlideType.COVER,            label: 'Cover',           required: true },
    { order: 2, slideType: SlideType.VISION,           label: 'Vision & Mission', required: true },
    { order: 3, slideType: SlideType.COMPANY_OVERVIEW, label: 'Company Overview', required: true },
    { order: 4, slideType: SlideType.PRODUCT_FEATURES, label: 'Products',        required: true },
    { order: 5, slideType: SlideType.TEAM,             label: 'Team',            required: true },
    { order: 6, slideType: SlideType.TRACTION,         label: 'Highlights',      required: false },
  ],
  targets: { minSlides: 5, maxSlides: 10, minVisualBlocks: 4, minKpis: 2 },
};

// =============================================================================
//  Partnership Proposal
// =============================================================================

const PARTNERSHIP_FRAMEWORK: DocumentFramework = {
  documentType: 'partnership_proposal',
  name:         'Partnership Proposal',
  sections: [
    { order: 1, slideType: SlideType.VISION,            label: 'Why Partner',     required: true },
    { order: 2, slideType: SlideType.COMPANY_OVERVIEW,  label: 'Who We Are',      required: true },
    { order: 3, slideType: SlideType.MARKET_OPPORTUNITY, label: 'Market Opportunity', required: true },
    { order: 4, slideType: SlideType.BUSINESS_MODEL,    label: 'Partnership Model', required: true },
    { order: 5, slideType: SlideType.ASK,               label: 'Next Steps',      required: true },
  ],
  targets: { minSlides: 5, maxSlides: 10, minVisualBlocks: 4, minKpis: 2 },
};

// =============================================================================
//  Marketing Plan
// =============================================================================

const MARKETING_PLAN_FRAMEWORK: DocumentFramework = {
  documentType: 'marketing_plan',
  name:         'Marketing Plan',
  sections: [
    { order: 1, slideType: SlideType.EXECUTIVE_SUMMARY,  label: 'Summary',         required: true },
    { order: 2, slideType: SlideType.MARKET_OPPORTUNITY, label: 'Market & Audience', required: true },
    { order: 3, slideType: SlideType.COMPETITION,        label: 'Competition',     required: true },
    { order: 4, slideType: SlideType.GO_TO_MARKET,       label: 'Tactics',         required: true },
    { order: 5, slideType: SlideType.PRICING,            label: 'Pricing',         required: false },
    { order: 6, slideType: SlideType.ROADMAP,            label: 'Timeline',        required: true },
    { order: 7, slideType: SlideType.TRACTION,           label: 'KPIs',            required: true },
  ],
  targets: { minSlides: 6, maxSlides: 12, minVisualBlocks: 5, minKpis: 4 },
};

// =============================================================================
//  Product Launch
// =============================================================================

const PRODUCT_LAUNCH_FRAMEWORK: DocumentFramework = {
  documentType: 'product_launch',
  name:         'Product Launch',
  sections: [
    { order: 1, slideType: SlideType.COVER,             label: 'Launch Cover',     required: true },
    { order: 2, slideType: SlideType.PROBLEM,           label: 'Customer Need',    required: true },
    { order: 3, slideType: SlideType.SOLUTION,          label: 'Product',          required: true },
    { order: 4, slideType: SlideType.PRODUCT_FEATURES,  label: 'Features',         required: true },
    { order: 5, slideType: SlideType.MARKET_OPPORTUNITY, label: 'Market Opportunity', required: true },
    { order: 6, slideType: SlideType.GO_TO_MARKET,      label: 'Launch Plan',      required: true, alternates: [SlideType.ROADMAP] },
    { order: 7, slideType: SlideType.PRICING,           label: 'Pricing',          required: false },
    { order: 8, slideType: SlideType.TRACTION,          label: 'Success Metrics',  required: false },
  ],
  targets: { minSlides: 6, maxSlides: 12, minVisualBlocks: 5, minKpis: 2 },
};

// =============================================================================
//  Training Presentation
// =============================================================================

const TRAINING_FRAMEWORK: DocumentFramework = {
  documentType: 'training_presentation',
  name:         'Training',
  sections: [
    { order: 1, slideType: SlideType.COVER,            label: 'Cover',             required: true },
    { order: 2, slideType: SlideType.VISION,           label: 'Learning Objectives', required: true },
    { order: 3, slideType: SlideType.PRODUCT_FEATURES, label: 'Modules',           required: true },
    { order: 4, slideType: SlideType.CASE_STUDY,       label: 'Exercises',         required: false },
    { order: 5, slideType: SlideType.ASK,              label: 'Next Steps',        required: false },
  ],
  targets: { minSlides: 4, maxSlides: 12, minVisualBlocks: 3, minKpis: 0 },
};

// =============================================================================
//  Defaults & lookup
// =============================================================================

export const FRAMEWORKS: Record<string, DocumentFramework> = {
  pitch_deck:             PITCH_DECK_FRAMEWORK,
  board_meeting_deck:     BOARD_DECK_FRAMEWORK,
  // Project DTO enum uses `board_meeting` (without `_deck`) — alias so both work.
  board_meeting:          BOARD_DECK_FRAMEWORK,
  sales_deck:             SALES_DECK_FRAMEWORK,
  strategy_presentation:  STRATEGY_FRAMEWORK,
  business_plan:          BUSINESS_PLAN_FRAMEWORK,
  executive_summary:      EXECUTIVE_SUMMARY_FRAMEWORK,
  company_profile:        COMPANY_PROFILE_FRAMEWORK,
  partnership_proposal:   PARTNERSHIP_FRAMEWORK,
  marketing_plan:         MARKETING_PLAN_FRAMEWORK,
  product_launch:         PRODUCT_LAUNCH_FRAMEWORK,
  training_presentation:  TRAINING_FRAMEWORK,
};

export function getFramework(documentType: string): DocumentFramework {
  return FRAMEWORKS[documentType] || PITCH_DECK_FRAMEWORK;
}
