// =============================================================================
//  Phase 32A — Select-similar utilities
//
//  Given a current selection, return id lists for "select all of the same
//  type", "select all text", "select all cards", "select all charts".
// =============================================================================

import type { SlideElementDTO, ElementType } from '@/types/slide-element';

const TEXT_TYPES: ReadonlyArray<ElementType> = [
  'heading', 'subheading', 'paragraph', 'quote', 'caption', 'label', 'cta', 'footer',
  'bulletList', 'numberedList',
];

const CARD_TYPES: ReadonlyArray<ElementType> = [
  'metric', 'kpi', 'pricingCard', 'testimonial', 'teamCard', 'featureGrid',
  'processSteps', 'comparison', 'swot', 'timeline', 'roadmap',
];

const CHART_TYPES: ReadonlyArray<ElementType> = ['chart'];

export function selectAllOfType(elements: SlideElementDTO[], type: ElementType): string[] {
  return elements.filter((e) => e.type === type && e.visible !== false).map((e) => e.id);
}

export function selectAllText(elements: SlideElementDTO[]): string[] {
  return elements.filter((e) => TEXT_TYPES.includes(e.type) && e.visible !== false).map((e) => e.id);
}

export function selectAllCards(elements: SlideElementDTO[]): string[] {
  return elements.filter((e) => CARD_TYPES.includes(e.type) && e.visible !== false).map((e) => e.id);
}

export function selectAllCharts(elements: SlideElementDTO[]): string[] {
  return elements.filter((e) => CHART_TYPES.includes(e.type) && e.visible !== false).map((e) => e.id);
}

/** "Select similar" — same type as the first selected element. */
export function selectSimilar(elements: SlideElementDTO[], selectedIds: string[]): string[] {
  if (selectedIds.length === 0) return [];
  const byId = new Map(elements.map((e) => [e.id, e]));
  const seed = byId.get(selectedIds[0]);
  if (!seed) return selectedIds;
  return selectAllOfType(elements, seed.type);
}
