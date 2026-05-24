// =============================================================================
//  Smart Component Types — Phase 32.75 Tier 3
//
//  Mirrored at frontend/types/smart-component.ts.
// =============================================================================

import type { ComponentCategory, ComponentElementTree } from '../component-types';

/** The 30 component types every family must support (Tier 3 base + Tier 6 additions). */
export type SmartComponentType =
  // Tier 3 — base 20
  | 'kpiCard'
  | 'metricCard'
  | 'statBlock'
  | 'pricingCard'
  | 'pricingTable'
  | 'teamCard'
  | 'teamGrid'
  | 'roadmapBlock'
  | 'timelineBlock'
  | 'featureCard'
  | 'featureGrid'
  | 'comparisonMatrix'
  | 'swotBlock'
  | 'processFlow'
  | 'quoteCard'
  | 'testimonialCard'
  | 'fundingBlock'
  | 'marketOpportunity'
  | 'tamSamSom'
  | 'riskMatrix'
  // Tier 6 — completes the design system (10 new)
  | 'coverCard'
  | 'executiveSummary'
  | 'narrativeBlock'
  | 'visionBlock'
  | 'financialDashboard'
  | 'caseStudyBlock'
  | 'companyOverviewBlock'
  | 'heroStatement'
  | 'problemStatement'
  | 'solutionStatement';

export const SMART_COMPONENT_TYPES: SmartComponentType[] = [
  'kpiCard', 'metricCard', 'statBlock',
  'pricingCard', 'pricingTable',
  'teamCard', 'teamGrid',
  'roadmapBlock', 'timelineBlock',
  'featureCard', 'featureGrid',
  'comparisonMatrix', 'swotBlock', 'processFlow',
  'quoteCard', 'testimonialCard',
  'fundingBlock', 'marketOpportunity', 'tamSamSom',
  'riskMatrix',
  // Tier 6
  'coverCard', 'executiveSummary', 'narrativeBlock', 'visionBlock',
  'financialDashboard', 'caseStudyBlock', 'companyOverviewBlock',
  'heroStatement', 'problemStatement', 'solutionStatement',
];

/** The 8 families the registry must cover. Mirrors composition family ids. */
export type SmartFamilyId =
  | 'crimson-dark'
  | 'light-blue-business'
  | 'luxury-dark'
  | 'startup-gradient'
  | 'corporate-monochrome'
  | 'editorial-report'
  | 'investor-minimal'
  | 'soft-geometric-blue';

export const SMART_FAMILIES: SmartFamilyId[] = [
  'crimson-dark', 'light-blue-business', 'luxury-dark', 'startup-gradient',
  'corporate-monochrome', 'editorial-report', 'investor-minimal', 'soft-geometric-blue',
];

/** Display grouping for the "Built-In" section of the library. */
export type SmartUseCase = 'Business' | 'Investor' | 'Sales' | 'Board' | 'Strategy' | 'Marketing';

export const SMART_USE_CASES: SmartUseCase[] = ['Business', 'Investor', 'Sales', 'Board', 'Strategy', 'Marketing'];

/** What category bucket each smart type belongs to inside the user library. */
export const SMART_TYPE_CATEGORY: Record<SmartComponentType, ComponentCategory> = {
  kpiCard: 'kpi', metricCard: 'metric', statBlock: 'kpi',
  pricingCard: 'pricing', pricingTable: 'pricing',
  teamCard: 'team', teamGrid: 'team',
  roadmapBlock: 'roadmap', timelineBlock: 'timeline',
  featureCard: 'featureGrid', featureGrid: 'featureGrid',
  comparisonMatrix: 'comparison', swotBlock: 'swot', processFlow: 'process',
  quoteCard: 'quote', testimonialCard: 'testimonial',
  fundingBlock: 'kpi', marketOpportunity: 'dashboard', tamSamSom: 'dashboard',
  riskMatrix: 'comparison',
  // Tier 6
  coverCard:            'hero',
  executiveSummary:     'dashboard',
  narrativeBlock:       'custom',
  visionBlock:          'quote',
  financialDashboard:   'dashboard',
  caseStudyBlock:       'custom',
  companyOverviewBlock: 'custom',
  heroStatement:        'hero',
  problemStatement:     'custom',
  solutionStatement:    'custom',
};

export const SMART_TYPE_USE_CASE: Record<SmartComponentType, SmartUseCase> = {
  kpiCard: 'Business', metricCard: 'Business', statBlock: 'Business',
  pricingCard: 'Sales', pricingTable: 'Sales',
  teamCard: 'Investor', teamGrid: 'Investor',
  roadmapBlock: 'Strategy', timelineBlock: 'Strategy',
  featureCard: 'Marketing', featureGrid: 'Marketing',
  comparisonMatrix: 'Strategy', swotBlock: 'Strategy', processFlow: 'Strategy',
  quoteCard: 'Marketing', testimonialCard: 'Marketing',
  fundingBlock: 'Investor', marketOpportunity: 'Investor', tamSamSom: 'Investor',
  riskMatrix: 'Board',
  // Tier 6
  coverCard:            'Marketing',
  executiveSummary:     'Board',
  narrativeBlock:       'Business',
  visionBlock:          'Marketing',
  financialDashboard:   'Investor',
  caseStudyBlock:       'Sales',
  companyOverviewBlock: 'Business',
  heroStatement:        'Marketing',
  problemStatement:     'Investor',
  solutionStatement:    'Investor',
};

/** Display labels. */
export const SMART_TYPE_LABEL: Record<SmartComponentType, string> = {
  kpiCard: 'KPI Card', metricCard: 'Metric Card', statBlock: 'Stat Block',
  pricingCard: 'Pricing Card', pricingTable: 'Pricing Table',
  teamCard: 'Team Card', teamGrid: 'Team Grid',
  roadmapBlock: 'Roadmap', timelineBlock: 'Timeline',
  featureCard: 'Feature Card', featureGrid: 'Feature Grid',
  comparisonMatrix: 'Comparison Matrix', swotBlock: 'SWOT Block', processFlow: 'Process Flow',
  quoteCard: 'Quote Card', testimonialCard: 'Testimonial Card',
  fundingBlock: 'Funding Block', marketOpportunity: 'Market Opportunity',
  tamSamSom: 'TAM / SAM / SOM', riskMatrix: 'Risk Matrix',
  // Tier 6
  coverCard:            'Cover Card',
  executiveSummary:     'Executive Summary',
  narrativeBlock:       'Narrative Block',
  visionBlock:          'Vision Block',
  financialDashboard:   'Financial Dashboard',
  caseStudyBlock:       'Case Study',
  companyOverviewBlock: 'Company Overview',
  heroStatement:        'Hero Statement',
  problemStatement:     'Problem Statement',
  solutionStatement:    'Solution Statement',
};

export const SMART_FAMILY_LABEL: Record<SmartFamilyId, string> = {
  'crimson-dark':         'Crimson Dark',
  'light-blue-business':  'Light Blue Business',
  'luxury-dark':          'Luxury Dark',
  'startup-gradient':     'Startup Gradient',
  'corporate-monochrome': 'Corporate Monochrome',
  'editorial-report':     'Editorial Report',
  'investor-minimal':     'Investor Minimal',
  'soft-geometric-blue':  'Soft Geometric Blue',
};

/**
 * A built-in smart component, ready to display in the library.
 *
 * - `id` is synthetic: `smart:<family>:<type>`
 * - `elementTree` is freshly generated for the requested family every time
 *   it's fetched, so family-token changes propagate without DB migrations.
 */
export interface SmartComponentDTO {
  id:           string;
  family:       SmartFamilyId;
  type:         SmartComponentType;
  name:         string;
  description:  string;
  category:     ComponentCategory;
  useCase:      SmartUseCase;
  tags:         string[];
  thumbnail:    string | null;
  elementTree:  ComponentElementTree;
}
