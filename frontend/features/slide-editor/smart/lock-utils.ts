// =============================================================================
//  Phase 32H — Granular locking
//
//  The legacy `el.locked` flag (boolean) locked everything: position, size,
//  style edits, inline-text. Phase 32 adds a finer-grained lock set stored on
//  `el.data.locks`:
//
//    { position?: boolean; size?: boolean; style?: boolean; content?: boolean }
//
//  The legacy `locked: true` flag still acts as a master lock (everything
//  forbidden). When `locked` is false but `data.locks.position` is true, only
//  drag is prevented — resize and inline edit remain available.
// =============================================================================

import type { SlideElementDTO } from '@/types/slide-element';

export interface ElementLocks {
  position?: boolean;
  size?:     boolean;
  style?:    boolean;
  content?:  boolean;
}

export function getLocks(el: SlideElementDTO | null | undefined): ElementLocks {
  if (!el) return {};
  const raw = (el.data as any)?.locks;
  if (!raw || typeof raw !== 'object') return {};
  return {
    position: !!raw.position,
    size:     !!raw.size,
    style:    !!raw.style,
    content:  !!raw.content,
  };
}

export function isPositionLocked(el: SlideElementDTO | null | undefined): boolean {
  if (!el) return false;
  if (el.locked) return true;
  return !!getLocks(el).position;
}

export function isSizeLocked(el: SlideElementDTO | null | undefined): boolean {
  if (!el) return false;
  if (el.locked) return true;
  return !!getLocks(el).size;
}

export function isStyleLocked(el: SlideElementDTO | null | undefined): boolean {
  if (!el) return false;
  if (el.locked) return true;
  return !!getLocks(el).style;
}

export function isContentLocked(el: SlideElementDTO | null | undefined): boolean {
  if (!el) return false;
  if (el.locked) return true;
  return !!getLocks(el).content;
}

/** Patch helper — toggle a single lock on the element's `data.locks`. */
export function withLock(el: SlideElementDTO, kind: keyof ElementLocks, value: boolean): { data: Record<string, any> } {
  const prevData = (el.data as any) || {};
  const prevLocks = (prevData.locks as any) || {};
  const nextLocks = { ...prevLocks, [kind]: value };
  // Clean up false entries to keep `data` tidy
  if (!value) delete nextLocks[kind];
  const data = { ...prevData };
  if (Object.keys(nextLocks).length === 0) delete data.locks;
  else                                     data.locks = nextLocks;
  return { data };
}
