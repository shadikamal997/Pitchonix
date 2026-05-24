// =============================================================================
//  Saved Component Types — Phase 32.75 Tier 2
//
//  Mirrored at frontend/types/saved-component.ts. Keep in sync manually.
// =============================================================================

import type { SlideElementDTO } from '../slides/element-types';

/** Canonical component categories. `custom` is a catch-all user bucket. */
export type ComponentCategory =
  // Business
  | 'kpi'
  | 'metric'
  | 'dashboard'
  | 'pricing'
  | 'revenueModel'
  // Presentation
  | 'team'
  | 'testimonial'
  | 'featureGrid'
  | 'comparison'
  | 'swot'
  | 'process'
  | 'roadmap'
  | 'timeline'
  // Charts
  | 'chart'
  | 'dataPanel'
  // Media
  | 'hero'
  | 'quote'
  | 'imageCard'
  // Custom
  | 'custom';

export const COMPONENT_CATEGORIES: ComponentCategory[] = [
  'kpi', 'metric', 'dashboard', 'pricing', 'revenueModel',
  'team', 'testimonial', 'featureGrid', 'comparison', 'swot',
  'process', 'roadmap', 'timeline',
  'chart', 'dataPanel',
  'hero', 'quote', 'imageCard',
  'custom',
];

/**
 * Element tree stored on a SavedComponent.
 *
 * Each entry is a SlideElement-shaped object whose x/y/width/height are
 * interpreted relative to the component's bounding box (0..100 in component
 * coordinates). At instance-resolve time the elements are translated by
 * the instance anchor + scaled by the instance scale.
 */
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
  version:     number;        // acknowledged source version
  createdAt:   string;
}

/** Input for "save the selection as a component". */
export interface CreateComponentInput {
  name:         string;
  category:     ComponentCategory;
  description?: string;
  tags?:        string[];
  familyId?:    string;
  thumbnail?:   string;
  elementTree:  ComponentElementTree;
}

/** Search/filter inputs for listing the user's library. */
export interface ListComponentsQuery {
  search?:    string;
  category?:  ComponentCategory;
  favorite?:  boolean;
  tag?:       string;
  limit?:     number;
  offset?:    number;
}
