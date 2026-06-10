'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  useUndoRedo  (Ω.PRODUCT.3B.1 — present-pointer model)
//
//  Snapshot-based undo/redo for a single slide's elements.
//
//  History is a three-part timeline: past[] · present · future[].
//   - `present` is the last COMMITTED canonical state.
//   - The editor calls `commit(newState)` AFTER a settled mutation (drag/resize
//     end, delete, duplicate, insert, reorder, inspector commit, layout apply).
//     commit() pushes the PREVIOUS `present` onto `past`, then adopts `newState`
//     as the new `present`, and clears `future`.
//   - `undo()` restores `past.pop()` (the state BEFORE the last mutation) and
//     parks the current `present` on `future` for redo.
//   - `redo()` is the mirror.
//
//  This is the correct semantics for commit-AFTER callers: undoing a delete
//  restores the deleted element, undoing a move restores the prior geometry —
//  the prior fix-defect (committing the post-mutation state and restoring it,
//  i.e. a no-op) is gone. The hook never calls the API itself; it delegates the
//  actual element replacement to `onRestore` (wired to useElementsApi.syncAll).
// =============================================================================

const MAX = 50;

export interface UseUndoRedo {
  canUndo: boolean;
  canRedo: boolean;
  /** Adopt a snapshot as the new present (call AFTER a settled change). */
  commit:  (elements: SlideElementDTO[]) => void;
  /** Clear the timeline and seed the present (e.g. when the slide changes). */
  reset:   (elements?: SlideElementDTO[]) => void;
  undo:    () => void;
  redo:    () => void;
}

interface Args {
  /** Retained for API compatibility; the present-pointer model tracks state
   *  internally so this is no longer consulted for undo/redo. */
  getCurrent?: () => SlideElementDTO[];
  /** Called with the elements that should be restored into the editor + DB. */
  onRestore:  (elements: SlideElementDTO[]) => void | Promise<void>;
  /** Reset the timeline whenever this changes (typically: slideId). */
  resetKey?:  string | number | null | undefined;
}

export function useUndoRedo({ onRestore, resetKey }: Args): UseUndoRedo {
  const past    = useRef<SlideElementDTO[][]>([]);
  const future  = useRef<SlideElementDTO[][]>([]);
  const present = useRef<SlideElementDTO[]>([]); // last committed canonical state
  // Re-render trigger so canUndo / canRedo update
  const [, force] = useState(0);
  const tick = () => force((n) => n + 1);

  // Clear the timeline whenever the reset key changes (e.g. different slide)
  useEffect(() => {
    past.current = [];
    future.current = [];
    present.current = [];
    tick();
  }, [resetKey]);

  const commit = useCallback((elements: SlideElementDTO[]) => {
    // Push the PREVIOUS present onto `past` (so undo returns to it), then adopt
    // the committed snapshot as the new present and clear redo. Every settled
    // mutation establishes one checkpoint; this is what makes undo of delete /
    // move / duplicate restore the pre-mutation state.
    past.current.push(deepClone(present.current));
    if (past.current.length > MAX) past.current.shift();
    present.current = deepClone(elements);
    future.current = [];
    tick();
  }, []);

  const reset = useCallback((elements?: SlideElementDTO[]) => {
    past.current = [];
    future.current = [];
    present.current = elements ? deepClone(elements) : [];
    tick();
  }, []);

  const undo = useCallback(async () => {
    if (past.current.length === 0) return;
    future.current.push(deepClone(present.current));
    if (future.current.length > MAX) future.current.shift();
    present.current = past.current.pop()!;
    tick();
    await onRestore(deepClone(present.current));
  }, [onRestore]);

  const redo = useCallback(async () => {
    if (future.current.length === 0) return;
    past.current.push(deepClone(present.current));
    if (past.current.length > MAX) past.current.shift();
    present.current = future.current.pop()!;
    tick();
    await onRestore(deepClone(present.current));
  }, [onRestore]);

  return {
    canUndo: past.current.length > 0,
    canRedo: future.current.length > 0,
    commit,
    reset,
    undo,
    redo,
  };
}

// Cheap deep clone via JSON — fine for plain-JSON DTOs.
function deepClone<T>(v: T): T { return JSON.parse(JSON.stringify(v)); }
