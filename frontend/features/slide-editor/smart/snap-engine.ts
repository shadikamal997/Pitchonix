// =============================================================================
//  Phase 32E — Snap engine with visual guide lines
//
//  Compares the dragged element's 6 alignment lines (left / hCenter / right,
//  top / vCenter / bottom) against the same lines on every other visible
//  element and against the canvas (edges + center). When any pair is within
//  the snap threshold, the drag delta is adjusted so they coincide exactly,
//  and a guide line is emitted for the canvas to render.
//
//  Coordinates are in % of the canvas. The threshold is converted from px
//  using the live stage size.
//
//  Pure function: no React, no state.
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';
import { groupIdOf } from './group-utils';

const SNAP_PX = 6;

interface Box {
  x: number; y: number; w: number; h: number;
  /** Alignment lines (in %). */
  left:   number; hCenter: number; right:  number;
  top:    number; vCenter: number; bottom: number;
}

export interface SnapResult {
  x: number; y: number;
  guides: SnapGuide[];
}

export interface SnapGuide {
  /** Coordinate in % along the perpendicular axis. */
  pos:   number;
  axis:  'vertical' | 'horizontal';
  /** Optional kind — used to colour the guide line. */
  kind:  'canvas' | 'element-edge' | 'element-center';
}

function boxOf(x: number, y: number, w: number, h: number): Box {
  return {
    x, y, w, h,
    left:    x,
    right:   x + w,
    hCenter: x + w / 2,
    top:     y,
    bottom:  y + h,
    vCenter: y + h / 2,
  };
}

/**
 * Snap a moving box to the canvas (edges + center) and to other visible
 * elements (edges + center, both axes). Returns the snapped position plus a
 * list of guides to render.
 *
 * @param ignoreIds       Elements to ignore (the ones being dragged).
 * @param stageWidth/Height Px size of the canvas, used to convert SNAP_PX to %.
 */
export function snapWithGuides(
  movingX:    number,
  movingY:    number,
  movingW:    number,
  movingH:    number,
  others:     SlideElementDTO[],
  ignoreIds:  Set<string>,
  stageWidth: number,
  stageHeight: number,
): SnapResult {
  // Convert px threshold → %
  const tx = stageWidth  > 0 ? (SNAP_PX / stageWidth)  * 100 : 0.5;
  const ty = stageHeight > 0 ? (SNAP_PX / stageHeight) * 100 : 0.5;

  const moving = boxOf(movingX, movingY, movingW, movingH);
  const guides: SnapGuide[] = [];

  // Build candidate alignment values (X axis = vertical guides).
  const xLines: Array<{ pos: number; kind: SnapGuide['kind'] }> = [
    { pos: 0,   kind: 'canvas' },
    { pos: 50,  kind: 'canvas' },
    { pos: 100, kind: 'canvas' },
  ];
  const yLines: Array<{ pos: number; kind: SnapGuide['kind'] }> = [
    { pos: 0,   kind: 'canvas' },
    { pos: 50,  kind: 'canvas' },
    { pos: 100, kind: 'canvas' },
  ];

  for (const e of others) {
    if (ignoreIds.has(e.id))   continue;
    if (e.visible === false)   continue;
    const b = boxOf(e.x, e.y, e.width, e.height);
    xLines.push({ pos: b.left,    kind: 'element-edge'   });
    xLines.push({ pos: b.hCenter, kind: 'element-center' });
    xLines.push({ pos: b.right,   kind: 'element-edge'   });
    yLines.push({ pos: b.top,     kind: 'element-edge'   });
    yLines.push({ pos: b.vCenter, kind: 'element-center' });
    yLines.push({ pos: b.bottom,  kind: 'element-edge'   });
  }

  // Find the best snap for each of the moving box's three X-alignment lines.
  type Hit = { delta: number; targetPos: number; kind: SnapGuide['kind'] };
  const bestX: Hit | null = bestSnap(
    [
      { source: moving.left,    offset: 0 },
      { source: moving.hCenter, offset: -moving.w / 2 },
      { source: moving.right,   offset: -moving.w },
    ],
    xLines,
    tx,
  );
  const bestY: Hit | null = bestSnap(
    [
      { source: moving.top,     offset: 0 },
      { source: moving.vCenter, offset: -moving.h / 2 },
      { source: moving.bottom,  offset: -moving.h },
    ],
    yLines,
    ty,
  );

  let snappedX = movingX;
  let snappedY = movingY;

  if (bestX) {
    snappedX = bestX.targetPos + bestX.delta;   // delta encodes offset → x
    guides.push({ pos: bestX.targetPos, axis: 'vertical',   kind: bestX.kind });
  }
  if (bestY) {
    snappedY = bestY.targetPos + bestY.delta;
    guides.push({ pos: bestY.targetPos, axis: 'horizontal', kind: bestY.kind });
  }

  return { x: snappedX, y: snappedY, guides };
}

/**
 * For each of the moving box's source lines (left / center / right or
 * top / center / bottom), find the closest candidate line. Return the
 * winner: the smallest distance under threshold.
 *
 * The `offset` on each source describes how to translate the box's x/y to
 * line up that source line on the target — e.g. centering means
 * `newX = targetPos - w/2`, so we encode that as `targetPos + delta` where
 * `delta = -w/2`.
 */
function bestSnap(
  sources: Array<{ source: number; offset: number }>,
  lines:   Array<{ pos: number; kind: SnapGuide['kind'] }>,
  threshold: number,
): { delta: number; targetPos: number; kind: SnapGuide['kind'] } | null {
  let best: { delta: number; targetPos: number; kind: SnapGuide['kind']; abs: number } | null = null;
  for (const s of sources) {
    for (const l of lines) {
      const diff = Math.abs(l.pos - s.source);
      if (diff > threshold) continue;
      if (!best || diff < best.abs) {
        best = { delta: s.offset, targetPos: l.pos, kind: l.kind, abs: diff };
      }
    }
  }
  return best ? { delta: best.delta, targetPos: best.targetPos, kind: best.kind } : null;
}

// =============================================================================
//  Group-aware helpers
// =============================================================================

/** When dragging a group, every group member should be in ignoreIds. */
export function ignoreSetForDrag(elements: SlideElementDTO[], draggedIds: string[]): Set<string> {
  const set = new Set<string>(draggedIds);
  const byId = new Map(elements.map((e) => [e.id, e]));
  const touchedGroups = new Set<string>();
  for (const id of draggedIds) {
    const gid = groupIdOf(byId.get(id));
    if (gid) touchedGroups.add(gid);
  }
  if (touchedGroups.size > 0) {
    for (const e of elements) {
      const gid = groupIdOf(e);
      if (gid && touchedGroups.has(gid)) set.add(e.id);
    }
  }
  return set;
}
