// =============================================================================
//  Component Instance → SlideElement expansion — Phase 32.75 Tier 2
//
//  Takes a list of ComponentInstance rows + the components they reference
//  and produces SlideElement rows ready for the renderer. Translates each
//  element's local (component-space) x/y/w/h to slide-space using the
//  instance anchor, and applies the optional uniform scale.
//
//  Component-space coordinates are 0..100 of the component's bounding box.
//  Instance anchor (x/y) is 0..100 in slide space; the component's bounding
//  box is implicitly the full slide unless `scale < 1` shrinks it.
//
//  This function is pure — no I/O — so the export pipeline can call it
//  synchronously after fetching components in a single batch query.
// =============================================================================

import type { SlideElementDTO } from '../slides/element-types';
import type {
  ComponentInstanceDTO, SavedComponentDTO, ComponentElementTree,
} from './component-types';

export interface ResolveContext {
  /** Map of componentId → SavedComponent (latest version). */
  components: Map<string, SavedComponentDTO>;
}

/**
 * Expand every instance on a slide into SlideElement-shaped rows. Each
 * resolved element gets its id prefixed with `inst:${instanceId}:` so the
 * editor / debugger can tell synthesised rows apart from real elements.
 */
export function resolveInstancesForSlide(
  instances: ComponentInstanceDTO[],
  ctx: ResolveContext,
): SlideElementDTO[] {
  const out: SlideElementDTO[] = [];
  for (const inst of instances) {
    const component = ctx.components.get(inst.componentId);
    if (!component) continue; // component was deleted — silently skip
    out.push(...expandOne(component.elementTree, inst));
  }
  return out;
}

function expandOne(tree: ComponentElementTree, inst: ComponentInstanceDTO): SlideElementDTO[] {
  const scale = inst.scale && inst.scale > 0 ? inst.scale : 1;
  const ax = inst.anchorX;
  const ay = inst.anchorY;

  return tree.map((el) => {
    // Component-local coordinates → slide-space.
    //   local (lx, ly, lw, lh) in [0..100] of component bounding box.
    //   anchor in [0..100] of slide.
    //   slideX = anchor.x + lx * scale * componentSpan / 100
    // For simplicity we treat componentSpan = 100, so:
    //   slideX = ax + lx * scale
    //   slideW = lw  * scale
    const lx = el.x ?? 0;
    const ly = el.y ?? 0;
    const lw = el.width  ?? 0;
    const lh = el.height ?? 0;

    return {
      ...el,
      id:      `inst:${inst.id}:${el.id}`,
      slideId: inst.slideId,
      x:      clampPct(ax + lx * scale),
      y:      clampPct(ay + ly * scale),
      width:  clampPct(lw * scale),
      height: clampPct(lh * scale),
      // Linked instances are always non-destructive: lock them in the editor
      // so users edit the source, not the placement.
      locked: true,
    };
  });
}

function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
}
