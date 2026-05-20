// =============================================================================
//  Tidy / auto-flow engine (Phase 15)
//
//  "Tidy slide" decides which existing layout best fits the slide's current
//  element mix and applies it. The decision is composition-based — we count
//  elements by type and pick the layout whose slot signature matches most
//  closely.
//
//  Falls back to a non-layout distribution pass that just resolves overlaps
//  vertically when no canonical layout fits (e.g. shapes / decorative
//  elements).
// =============================================================================

import type { SlideElementDTO, ElementType } from '@/types/slide-element';
import { LAYOUTS, type LayoutSpec, type LayoutSlot } from '../layouts/registry';
import { applyLayout } from '../layouts/applyLayout';

export interface TidyDecision {
  layoutId:  string | null;            // which layout we applied (null = distribute)
  layoutName: string;
  reason:    string;
  next:      SlideElementDTO[];        // new element list (already laid out)
}

export function tidySlide(elements: SlideElementDTO[]): TidyDecision {
  if (elements.length === 0) {
    return { layoutId: null, layoutName: 'Empty', reason: 'No elements to arrange.', next: [] };
  }

  const tally = countByType(elements);
  const best  = pickBestLayout(LAYOUTS, tally);

  if (best && best.score > 0) {
    const next = applyLayout(elements, best.layout);
    return {
      layoutId:   best.layout.id,
      layoutName: best.layout.name,
      reason:     `Best fit (score ${best.score}): ${describeMatch(best, tally)}.`,
      next,
    };
  }

  // No canonical layout matches — fall back to a vertical distribution that
  // resolves obvious overlaps without changing element types.
  return {
    layoutId:   null,
    layoutName: 'Distributed',
    reason:     'No canonical layout matched. Distributed elements vertically with even spacing.',
    next:       distributeVertically(elements),
  };
}

// =============================================================================
//  Layout-fit scoring
// =============================================================================

interface ScoredLayout {
  layout: LayoutSpec;
  score:  number;
  matched: Record<string, number>;     // slot.id -> elements consumed
}

function pickBestLayout(layouts: LayoutSpec[], tally: Record<ElementType, number>): ScoredLayout | null {
  let best: ScoredLayout | null = null;
  for (const l of layouts) {
    if (l.blank) continue;
    const scored = scoreLayout(l, tally);
    if (!best || scored.score > best.score) best = scored;
  }
  return best;
}

function scoreLayout(layout: LayoutSpec, tally: Record<ElementType, number>): ScoredLayout {
  // Each slot consumes the FIRST acceptsTypes match available in the tally.
  const remaining = { ...tally };
  const matched: Record<string, number> = {};
  let consumed = 0;
  for (const slot of layout.slots) {
    if (slot.id === 'footer' || slot.id === 'pageNumber') continue;
    const found = findFirstAvailable(slot, remaining);
    if (found) {
      remaining[found] = (remaining[found] || 0) - 1;
      matched[slot.id] = (matched[slot.id] || 0) + 1;
      consumed++;
    }
  }
  // Score:  +2 per filled core slot, -1 per leftover (orphaned) element.
  const leftover = Object.values(remaining).reduce((a, b) => a + b, 0)
                 - (remaining['footer'] || 0)
                 - (remaining['pageNumber'] || 0);
  const score = consumed * 2 - Math.max(0, leftover);
  return { layout, score, matched };
}

function findFirstAvailable(slot: LayoutSlot, tally: Record<string, number>): ElementType | null {
  for (const t of slot.acceptsTypes) {
    if ((tally[t] || 0) > 0) return t;
  }
  return null;
}

function describeMatch(best: ScoredLayout, _tally: Record<ElementType, number>): string {
  const slots = Object.keys(best.matched);
  if (slots.length === 0) return 'no obvious match';
  return `${slots.length} slot${slots.length === 1 ? '' : 's'} filled`;
}

// =============================================================================
//  Fallback: vertical distribution
// =============================================================================

function distributeVertically(elements: SlideElementDTO[]): SlideElementDTO[] {
  // Keep footers / page numbers anchored to the bottom.
  const anchored: SlideElementDTO[] = [];
  const flowing:  SlideElementDTO[] = [];
  for (const el of elements) {
    if (el.type === 'footer' || el.type === 'pageNumber') anchored.push(el);
    else flowing.push(el);
  }

  // Sort by current Y so the visual order is preserved.
  flowing.sort((a, b) => a.y - b.y);

  // Target zone: 6%..88% vertical, leaving room for footer.
  const TOP = 6, BOTTOM = 88, MAX_W = 88;
  const totalNeeded = flowing.reduce((sum, e) => sum + e.height, 0);
  const space = BOTTOM - TOP;
  const gapTotal = Math.max(0, space - totalNeeded);
  const gap = flowing.length > 1 ? gapTotal / (flowing.length - 1) : 0;

  let cursor = TOP;
  const next: SlideElementDTO[] = [];
  for (const el of flowing) {
    next.push({
      ...el,
      x: 6,
      y: +cursor.toFixed(3),
      width:  el.width > MAX_W ? MAX_W : el.width,
    });
    cursor += el.height + gap;
  }
  // Preserve anchored elements as-is.
  return [...next, ...anchored];
}

// =============================================================================
//  Tally helpers
// =============================================================================

function countByType(elements: SlideElementDTO[]): Record<ElementType, number> {
  const t: any = {};
  for (const el of elements) t[el.type] = (t[el.type] || 0) + 1;
  return t;
}
