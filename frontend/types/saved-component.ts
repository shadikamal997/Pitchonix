// =============================================================================
//  Saved Component types — Phase 32.75 Tier 2
//
//  Frontend mirror of backend/src/components/component-types.ts.
// =============================================================================

import type { SlideElementDTO } from './slide-element';

export type ComponentCategory =
  | 'kpi' | 'metric' | 'dashboard' | 'pricing' | 'revenueModel'
  | 'team' | 'testimonial' | 'featureGrid' | 'comparison' | 'swot'
  | 'process' | 'roadmap' | 'timeline'
  | 'chart' | 'dataPanel'
  | 'hero' | 'quote' | 'imageCard'
  | 'custom';

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'kpi', 'metric', 'dashboard', 'pricing', 'revenueModel',
  'team', 'testimonial', 'featureGrid', 'comparison', 'swot',
  'process', 'roadmap', 'timeline',
  'chart', 'dataPanel',
  'hero', 'quote', 'imageCard',
  'custom',
];

// Display groupings used by the ComponentsPanel. Mirrors the spec.
export const COMPONENT_CATEGORY_GROUPS: Array<{ label: string; categories: ComponentCategory[] }> = [
  { label: 'Business',     categories: ['kpi', 'metric', 'dashboard', 'pricing', 'revenueModel'] },
  { label: 'Presentation', categories: ['team', 'testimonial', 'featureGrid', 'comparison', 'swot', 'process', 'roadmap', 'timeline'] },
  { label: 'Charts',       categories: ['chart', 'dataPanel'] },
  { label: 'Media',        categories: ['hero', 'quote', 'imageCard'] },
  { label: 'Custom',       categories: ['custom'] },
];

export type ComponentElementTree = SlideElementDTO[];

export interface SavedComponentDTO {
  id:           string;
  userId:       string;
  workspaceId:  string | null;
  name:         string;
  description:  string | null;
  category:     ComponentCategory;
  thumbnail:    string | null;
  familyId:     string | null;
  tags:         string[];
  favorite:     boolean;
  usageCount:   number;
  version:      number;
  elementTree:  ComponentElementTree;
  createdAt:    string;
  updatedAt:    string;
}

export interface ComponentInstanceDTO {
  id:          string;
  componentId: string;
  slideId:     string;
  anchorX:     number;
  anchorY:     number;
  scale:       number;
  version:     number;
  createdAt:   string;
}

export interface CreateComponentInput {
  name:         string;
  category:     ComponentCategory;
  description?: string;
  tags?:        string[];
  familyId?:    string;
  thumbnail?:   string;
  elementTree:  ComponentElementTree;
}

export interface ListComponentsQuery {
  search?:   string;
  category?: ComponentCategory;
  favorite?: boolean;
  tag?:      string;
  limit?:    number;
  offset?:   number;
}
