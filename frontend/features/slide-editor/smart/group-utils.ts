// =============================================================================
//  Semantic grouping (Phase 15)
//
//  A "group" is a set of elements that should be treated as a unit for
//  selection / move / layout. The group identity is stored in
//  SlideElement.data.groupId — a free-form string we generate when a user
//  groups elements together.
//
//  No schema migration needed: SlideElement.data is already a JSONB column.
//
//  Operations are pure: they return arrays of `{ id, patch }` records that
//  the caller passes to `api.updateMany` (which already handles the batch).
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';

export type ElementPatch = { id: string; patch: Partial<SlideElementDTO> };

/** Resolve the groupId stored on an element's `data` payload (null if loose). */
export function groupIdOf(el: SlideElementDTO | null | undefined): string | null {
  if (!el) return null;
  const gid = (el.data as any)?.groupId;
  return typeof gid === 'string' && gid.length > 0 ? gid : null;
}

/** Return all elements that share the given groupId. */
export function groupMembers(elements: SlideElementDTO[], groupId: string): SlideElementDTO[] {
  return elements.filter((e) => groupIdOf(e) === groupId);
}

/** Bounding box (in %) for a group — the tightest rectangle containing all members. */
export function groupBounds(elements: SlideElementDTO[], groupId: string): { x: number; y: number; w: number; h: number } | null {
  const members = groupMembers(elements, groupId);
  if (members.length === 0) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const e of members) {
    if (e.x < minX) minX = e.x;
    if (e.y < minY) minY = e.y;
    if (e.x + e.width  > maxX) maxX = e.x + e.width;
    if (e.y + e.height > maxY) maxY = e.y + e.height;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Expand a selection to include every element in the same group as any selected one. */
export function expandSelectionToGroups(elements: SlideElementDTO[], selectedIds: string[]): string[] {
  if (selectedIds.length === 0) return selectedIds;
  const byId = new Map(elements.map((e) => [e.id, e]));
  const selected = selectedIds.map((id) => byId.get(id)).filter(Boolean) as SlideElementDTO[];
  const groupIds = new Set<string>();
  for (const e of selected) {
    const gid = groupIdOf(e);
    if (gid) groupIds.add(gid);
  }
  if (groupIds.size === 0) return selectedIds;
  const expanded = new Set(selectedIds);
  for (const e of elements) {
    const gid = groupIdOf(e);
    if (gid && groupIds.has(gid)) expanded.add(e.id);
  }
  return Array.from(expanded);
}

// =============================================================================
//  Group / ungroup mutations
// =============================================================================

/**
 * Tag every selected element with a fresh groupId. If any selected element
 * already has a group, all members of that group are merged into the new one.
 *
 * Returns the patches to apply *and* the new groupId.
 */
export function groupSelection(elements: SlideElementDTO[], selectedIds: string[]): { groupId: string; patches: ElementPatch[] } | null {
  if (selectedIds.length < 2) return null;       // can't group fewer than 2
  const byId = new Map(elements.map((e) => [e.id, e]));

  // Collect all existing group ids touched by the selection so we can merge them in.
  const touchedGroups = new Set<string>();
  for (const id of selectedIds) {
    const gid = groupIdOf(byId.get(id));
    if (gid) touchedGroups.add(gid);
  }

  const idsToTag = new Set(selectedIds);
  for (const e of elements) {
    const gid = groupIdOf(e);
    if (gid && touchedGroups.has(gid)) idsToTag.add(e.id);
  }

  const newId = `g_${Math.random().toString(36).slice(2, 10)}`;
  const patches: ElementPatch[] = [];
  for (const id of idsToTag) {
    const el = byId.get(id);
    if (!el) continue;
    const nextData = { ...(el.data as any || {}), groupId: newId };
    patches.push({ id, patch: { data: nextData } });
  }
  return { groupId: newId, patches };
}

/**
 * Clear groupId on every selected element (and its group siblings, since a
 * group needs ≥ 2 members — leaving 1 orphan is pointless).
 */
export function ungroupSelection(elements: SlideElementDTO[], selectedIds: string[]): ElementPatch[] {
  const byId = new Map(elements.map((e) => [e.id, e]));
  const touchedGroups = new Set<string>();
  for (const id of selectedIds) {
    const gid = groupIdOf(byId.get(id));
    if (gid) touchedGroups.add(gid);
  }
  if (touchedGroups.size === 0) return [];

  const patches: ElementPatch[] = [];
  for (const e of elements) {
    const gid = groupIdOf(e);
    if (gid && touchedGroups.has(gid)) {
      const nextData = { ...(e.data as any || {}) };
      delete nextData.groupId;
      patches.push({ id: e.id, patch: { data: nextData } });
    }
  }
  return patches;
}

// =============================================================================
//  Selection-level helper used by toolbar buttons to decide enabled state.
// =============================================================================

export interface GroupSelectionState {
  canGroup:   boolean;
  canUngroup: boolean;
}

export function selectionGroupState(elements: SlideElementDTO[], selectedIds: string[]): GroupSelectionState {
  if (selectedIds.length < 2) return { canGroup: false, canUngroup: hasGroupMember(elements, selectedIds) };
  const byId = new Map(elements.map((e) => [e.id, e]));
  const groupIds = new Set<string>();
  let loose = 0;
  for (const id of selectedIds) {
    const g = groupIdOf(byId.get(id));
    if (g) groupIds.add(g); else loose++;
  }
  // Already a single group covering exactly this selection? Then "canGroup" is
  // false (nothing to do) but "canUngroup" is true.
  if (loose === 0 && groupIds.size === 1) {
    return { canGroup: false, canUngroup: true };
  }
  return { canGroup: true, canUngroup: groupIds.size > 0 };
}

function hasGroupMember(elements: SlideElementDTO[], ids: string[]): boolean {
  const byId = new Map(elements.map((e) => [e.id, e]));
  return ids.some((id) => groupIdOf(byId.get(id)) !== null);
}
