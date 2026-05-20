// =============================================================================
//  OverlapPreventionEngine
//
//  Validates every variant's slot geometry to guarantee no two slots overlap.
//  Decorative slots (matching anything with role='decor') are allowed to
//  overlap content slots; everything else MUST be disjoint.
//
//  Runs once per family at module load. In dev, logs collisions to the
//  console and surfaces them on the in-page debug badge. In prod the validator
//  is a no-op (zero runtime cost).
//
//  Also exposes `boxOverlaps(a, b, margin)` for runtime overflow checks.
// =============================================================================

import type { TemplateFamily, SlideVariant, VariantSlot } from './types';

const SAFE_MARGIN = 0.5;   // % — slots must be at least this far apart

export interface SlotCollision {
  familyId: string;
  variantMatches: string[];
  a: VariantSlot;
  b: VariantSlot;
  overlapArea: number;
}

const collisions: SlotCollision[] = [];

export function getKnownCollisions(): SlotCollision[] { return [...collisions]; }

export function boxOverlaps(
  a: { x: number; y: number; w: number; h: number },
  b: { x: number; y: number; w: number; h: number },
  margin = SAFE_MARGIN,
): { overlaps: boolean; area: number } {
  const ax0 = a.x - margin,         ay0 = a.y - margin;
  const ax1 = a.x + a.w + margin,   ay1 = a.y + a.h + margin;
  const bx0 = b.x,                   by0 = b.y;
  const bx1 = b.x + b.w,             by1 = b.y + b.h;
  const xOverlap = Math.max(0, Math.min(ax1, bx1) - Math.max(ax0, bx0));
  const yOverlap = Math.max(0, Math.min(ay1, by1) - Math.max(ay0, by0));
  return { overlaps: xOverlap > 0 && yOverlap > 0, area: xOverlap * yOverlap };
}

export function validateFamily(family: TemplateFamily): SlotCollision[] {
  const found: SlotCollision[] = [];
  for (const variant of family.variants) {
    const slots = variant.slots.filter((s) => !s.role || s.role !== 'decor');
    for (let i = 0; i < slots.length; i++) {
      for (let j = i + 1; j < slots.length; j++) {
        const a = slots[i], b = slots[j];
        const r = boxOverlaps(a, b, SAFE_MARGIN);
        if (r.overlaps) {
          const collision: SlotCollision = {
            familyId: family.id,
            variantMatches: variant.matches.map(String),
            a, b,
            overlapArea: +r.area.toFixed(2),
          };
          found.push(collision);
          collisions.push(collision);
          if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
            console.warn(
              `[overlap-validator] ${family.id} / [${variant.matches.join(', ')}] — slots "${a.id}" and "${b.id}" overlap by ${r.area.toFixed(1)} % (margin ${SAFE_MARGIN}%)`,
            );
          }
        }
      }
    }
    // Also verify bounds: every slot must sit fully inside [0, 100]
    for (const s of slots) {
      if (s.x < 0 || s.y < 0 || s.x + s.w > 100 || s.y + s.h > 100) {
        console.warn(`[overlap-validator] ${family.id} / [${variant.matches.join(', ')}] — slot "${s.id}" out of bounds: (${s.x},${s.y}) ${s.w}×${s.h}`);
      }
    }
  }
  return found;
}
