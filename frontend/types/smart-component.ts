// =============================================================================
//  Smart Component types — Phase 32.75 Tier 3 (frontend mirror)
//
//  Mirrors backend/src/components/smart/smart-types.ts. The frontend only
//  needs the type signatures; element trees are computed server-side and
//  fetched via /api/components/smart.
// =============================================================================

import type { ComponentCategory, ComponentElementTree } from './saved-component';

export type SmartComponentType =
  | 'kpiCard' | 'metricCard' | 'statBlock'
  | 'pricingCard' | 'pricingTable'
  | 'teamCard' | 'teamGrid'
  | 'roadmapBlock' | 'timelineBlock'
  | 'featureCard' | 'featureGrid'
  | 'comparisonMatrix' | 'swotBlock' | 'processFlow'
  | 'quoteCard' | 'testimonialCard'
  | 'fundingBlock' | 'marketOpportunity' | 'tamSamSom'
  | 'riskMatrix';

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
];

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

export type SmartUseCase = 'Business' | 'Investor' | 'Sales' | 'Board' | 'Strategy' | 'Marketing';
export const SMART_USE_CASES: SmartUseCase[] = ['Business', 'Investor', 'Sales', 'Board', 'Strategy', 'Marketing'];

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
