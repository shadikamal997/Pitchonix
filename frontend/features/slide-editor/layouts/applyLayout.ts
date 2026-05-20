'use client';

import type { SlideElementDTO } from '@/types/slide-element';
import type { LayoutSpec, LayoutSlot } from './registry';

// =============================================================================
//  applyLayout
//
//  Takes the current element list for a slide and the layout to apply.
//  Returns the new element list (NOT yet persisted) — caller is responsible
//  for `syncAll` + slide.metadata.layoutId PATCH.
//
//  Algorithm:
//    1. If layout.blank → return [] (caller confirms first).
//    2. Otherwise iterate slots in order. For each slot, pick the first
//       un-claimed element on the slide whose type is in `slot.acceptsTypes`
//       (in priority order). Re-position it to the slot's geometry.
//    3. Elements never assigned to a slot keep their current geometry.
//
//  Property: idempotent. Re-applying the same layout to the already-laid-out
//  slide yields the same element list.
// =============================================================================

export function applyLayout(
  elements: SlideElementDTO[],
  layout: LayoutSpec,
): SlideElementDTO[] {
  if (layout.blank) return [];

  // Sort elements by zIndex so we pick the "main" instance of each type first.
  const pool = [...elements].sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
  const claimed = new Set<string>();
  const updated = new Map<string, SlideElementDTO>();   // id → updated copy

  for (const slot of layout.slots) {
    const target = pickForSlot(pool, claimed, slot);
    if (!target) continue;
    claimed.add(target.id);
    updated.set(target.id, {
      ...target,
      x: slot.x,
      y: slot.y,
      width: slot.w,
      height: slot.h,
    });
  }

  // Compose: for each element, either the updated copy or unchanged
  return pool.map((el) => updated.get(el.id) || el);
}

function pickForSlot(
  pool: SlideElementDTO[],
  claimed: Set<string>,
  slot: LayoutSlot,
): SlideElementDTO | null {
  for (const acceptsType of slot.acceptsTypes) {
    const found = pool.find((el) => !claimed.has(el.id) && el.type === acceptsType && el.visible !== false);
    if (found) return found;
  }
  return null;
}
