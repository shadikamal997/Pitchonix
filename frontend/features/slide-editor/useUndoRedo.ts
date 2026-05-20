'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SlideElementDTO } from '@/types/slide-element';

// =============================================================================
//  useUndoRedo
//
//  Snapshot-based undo/redo for a single slide's elements.
//
//  Design:
//    - Snapshot = a deep-cloned SlideElementDTO[].
//    - The hook holds two stacks: past[] and future[].
//    - `commit(elements)` is called by the editor whenever a settled change
//      occurs (drag end, resize end, inspector field commit, insert, delete,
//      duplicate, reorder). Live dragging doesn't fire commits; only settles
//      do, which keeps the stack small.
//    - `undo()` pops past, pushes current → future, calls onRestore(target).
//    - `redo()` pops future, pushes current → past, calls onRestore(target).
//    - Stack capped at MAX so memory stays bounded.
//
//  The hook does NOT call the API itself — it delegates to `onRestore`, which
//  the editor wires to `useElementsApi.syncAll`.
// =============================================================================

const MAX = 50;

export interface UseUndoRedo {
  canUndo: boolean;
  canRedo: boolean;
  /** Push a snapshot of the current state (after a settled change). */
  commit:  (elements: SlideElementDTO[]) => void;
  /** Clear stacks (e.g. when the slide changes). */
  reset:   (elements?: SlideElementDTO[]) => void;
  undo:    () => void;
  redo:    () => void;
}

interface Args {
  /** Current canonical elements list — read at the moment of undo/redo. */
  getCurrent: () => SlideElementDTO[];
  /** Called with the elements that should be restored. */
  onRestore:  (elements: SlideElementDTO[]) => void | Promise<void>;
  /** Reset the stack whenever this changes (typically: slideId). */
  resetKey?:  string | number | null | undefined;
}

export function useUndoRedo({ getCurrent, onRestore, resetKey }: Args): UseUndoRedo {
  const past   = useRef<SlideElementDTO[][]>([]);
  const future = useRef<SlideElementDTO[][]>([]);
  // Re-render trigger so canUndo / canRedo update
  const [, force] = useState(0);
  const tick = () => force((n) => n + 1);

  // Clear stacks whenever the reset key changes (e.g. moved to a different slide)
  useEffect(() => {
    past.current = [];
    future.current = [];
    tick();
  }, [resetKey]);

  const commit = useCallback((elements: SlideElementDTO[]) => {
    // Snapshot has to be a deep clone so future edits don't mutate it
    past.current.push(deepClone(elements));
    if (past.current.length > MAX) past.current.shift();
    future.current = [];
    tick();
  }, []);

  const reset = useCallback((elements?: SlideElementDTO[]) => {
    past.current = [];
    future.current = [];
    if (elements) past.current.push(deepClone(elements));
    tick();
  }, []);

  const undo = useCallback(async () => {
    if (past.current.length === 0) return;
    // Move the latest "past" off the stack and into "future", restore the one before it
    const current = getCurrent();
    const target  = past.current.pop()!;     // most recent committed state
    future.current.push(deepClone(current));
    if (future.current.length > MAX) future.current.shift();
    tick();
    await onRestore(target);
  }, [getCurrent, onRestore]);

  const redo = useCallback(async () => {
    if (future.current.length === 0) return;
    const current = getCurrent();
    const target  = future.current.pop()!;
    past.current.push(deepClone(current));
    if (past.current.length > MAX) past.current.shift();
    tick();
    await onRestore(target);
  }, [getCurrent, onRestore]);

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
