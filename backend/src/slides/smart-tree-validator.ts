// =============================================================================
//  Smart Component Tree Validator — Phase 32.75 Tier 5 (T5D)
//
//  Validates a `slide.content.smartComponent.elementTree` payload before the
//  migration service trusts it. The smart-component-first path renders any
//  valid tree directly into SlideElement rows; anything invalid falls back
//  to legacy reconstruction (T5C — never break generation).
//
//  A tree is valid when every entry has:
//    - a non-empty `type` string
//    - finite numeric x/y/width/height in [0, 100]
//    - a string `id` (anything; we re-prefix on materialisation)
//
//  The validator is permissive on optional fields (style, content, data,
//  rotation, zIndex) — those default sanely if missing. We're catching
//  malformed/corrupt trees, not enforcing schema purity.
// =============================================================================

import type { ElementType } from './element-types';

export interface SmartTreeValidationResult {
  valid:        boolean;
  reason:       string | null;
  elementCount: number;
}

const VALID_ELEMENT_TYPES: ReadonlySet<ElementType> = new Set<ElementType>([
  'heading', 'subheading', 'paragraph', 'quote', 'caption', 'label',
  'cta', 'footer', 'pageNumber',
  'bulletList', 'numberedList',
  'metric', 'kpi', 'chart', 'table',
  'image', 'icon', 'logo', 'videoPlaceholder', 'embeddedMediaPlaceholder',
  'testimonial', 'teamCard', 'pricingCard', 'comparison', 'swot',
  'featureGrid', 'processSteps', 'timeline', 'roadmap',
  'shape', 'line', 'divider',
]);

export function validateSmartComponentTree(tree: unknown): SmartTreeValidationResult {
  if (!Array.isArray(tree)) {
    return { valid: false, reason: 'tree is not an array', elementCount: 0 };
  }
  if (tree.length === 0) {
    return { valid: false, reason: 'tree is empty', elementCount: 0 };
  }
  for (let i = 0; i < tree.length; i++) {
    const e = tree[i] as any;
    if (!e || typeof e !== 'object') {
      return { valid: false, reason: `entry ${i} is not an object`, elementCount: tree.length };
    }
    if (typeof e.id !== 'string' || e.id.length === 0) {
      return { valid: false, reason: `entry ${i} missing id`, elementCount: tree.length };
    }
    if (typeof e.type !== 'string' || !VALID_ELEMENT_TYPES.has(e.type)) {
      return { valid: false, reason: `entry ${i} has invalid type: ${e.type}`, elementCount: tree.length };
    }
    for (const k of ['x', 'y', 'width', 'height'] as const) {
      const v = e[k];
      if (typeof v !== 'number' || !Number.isFinite(v) || v < 0 || v > 100) {
        return { valid: false, reason: `entry ${i} has invalid ${k}: ${v}`, elementCount: tree.length };
      }
    }
  }
  return { valid: true, reason: null, elementCount: tree.length };
}
