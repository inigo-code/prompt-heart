// Undo/redo for the prompt editor. Typing within a short pause counts as one step, so undo takes back
// a burst of typing rather than a single letter; formatting and pastes are always their own step.
// The editor also ends a burst at each word and when you move between fields (breakBurst).

export type UndoKind = 'typing' | 'action';

export function createUndo<T>(initial: T, { limit = 100, mergeMs = 1000, same = (a: T, b: T) => a === b } = {}) {
  let past: T[] = [];
  let present = initial;
  let future: T[] = [];
  let lastAt = -Infinity;
  let lastKind: UndoKind = 'action';

  return {
    /** Returns true when this change started a new step. */
    record(next: T, now: number, kind: UndoKind = 'typing'): boolean {
      if (same(next, present)) return false;
      const merge = kind === 'typing' && lastKind === 'typing' && now - lastAt < mergeMs && past.length > 0;
      if (!merge) {
        past.push(present);
        if (past.length > limit) past.shift();
      }
      present = next;
      future = [];
      lastAt = now;
      lastKind = kind;
      return !merge;
    },
    /** The next change starts a new step even if it comes straight after this one. */
    breakBurst() {
      lastKind = 'action';
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

/** Where two versions of a text differ: from `start`, `removed` characters became `inserted`. */
export function textChange(before: string, after: string) {
  let start = 0;
  const max = Math.min(before.length, after.length);
  while (start < max && before[start] === after[start]) start++;
  let tail = 0;
  while (tail < max - start && before[before.length - 1 - tail] === after[after.length - 1 - tail]) tail++;
  return { start, removed: before.length - start - tail, inserted: after.slice(start, after.length - tail) };
}
