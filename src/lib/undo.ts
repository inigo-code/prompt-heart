// Undo/redo for the prompt editor. Typing within a short pause counts as one step, so undo takes back
// a burst of typing rather than a single letter; formatting and pastes are always their own step.

export type UndoKind = 'typing' | 'action';

export function createUndo<T>(initial: T, { limit = 100, mergeMs = 1000 } = {}) {
  let past: T[] = [];
  let present = initial;
  let future: T[] = [];
  let lastAt = -Infinity;
  let lastKind: UndoKind = 'action';

  return {
    record(next: T, now: number, kind: UndoKind = 'typing') {
      if (next === present) return;
      const merge = kind === 'typing' && lastKind === 'typing' && now - lastAt < mergeMs && past.length > 0;
      if (!merge) {
        past.push(present);
        if (past.length > limit) past.shift();
      }
      present = next;
      future = [];
      lastAt = now;
      lastKind = kind;
    },
    undo(): T | null {
      const prev = past.pop();
      if (prev === undefined) return null;
      future.push(present);
      present = prev;
      lastKind = 'action';
      return prev;
    },
    redo(): T | null {
      const next = future.pop();
      if (next === undefined) return null;
      past.push(present);
      present = next;
      lastKind = 'action';
      return next;
    },
    reset(value: T) {
      past = [];
      future = [];
      present = value;
      lastKind = 'action';
    },
    canUndo: () => past.length > 0,
    canRedo: () => future.length > 0,
  };
}
