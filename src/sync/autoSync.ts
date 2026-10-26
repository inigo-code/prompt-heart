/**
 * Spaces out automatic syncs. After a sync, automatic requests (edits, copies, reopening the app,
 * live changes from other devices) wait until the cooldown has passed, and every request made in
 * the meantime is folded into a single sync at the end of it. Manual syncs (the Sync button, pull
 * to refresh) don't go through this and run straight away.
 */
export const AUTO_SYNC_COOLDOWN_MS = 60_000;

export type Timers = {
  now: () => number;
  setTimeout: (fn: () => void, ms: number) => unknown;
  clearTimeout: (handle: unknown) => void;
};

const systemTimers: Timers = {
  now: () => Date.now(),
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

export type AutoSync = {
  /** Ask for a sync in `delayMs`, or when the cooldown ends if that's later. */
  request: (delayMs?: number) => void;
  /** Call when a sync starts: it covers everything asked for until now. */
  started: () => void;
  /** Call when a sync ends: the cooldown starts now. */
  finished: () => void;
  /** Drop any planned sync (signed out, unmounted). */
  cancel: () => void;
  /** When the current cooldown ends (ms timestamp); in the past when there is none. */
  cooldownEndsAt: () => number;
};

/**
 * `onPlan` is told the time of the next planned sync, or null when none is planned (for a countdown).
 */
export function createAutoSync(
  run: () => void,
  cooldownMs = AUTO_SYNC_COOLDOWN_MS,
  timers: Timers = systemTimers,
  onPlan: (at: number | null) => void = () => {},
): AutoSync {
  let lastFinishedAt = -Infinity;
  let running = false;
  let askedWhileRunning = false;
  let handle: unknown = null;
  let dueAt = Infinity;

  const cancel = () => {
    if (handle !== null) timers.clearTimeout(handle);
    const hadPlan = handle !== null;
    handle = null;
    dueAt = Infinity;
    if (hadPlan) onPlan(null);
  };

  const request = (delayMs = 0) => {
    if (running) {
      // Changes made during a sync may have missed it; plan one after this sync's cooldown.
      askedWhileRunning = true;
      return;
    }
    const at = Math.max(timers.now() + delayMs, lastFinishedAt + cooldownMs);
    if (at >= dueAt) return; // an earlier sync is already planned and will cover this one
    cancel();
    dueAt = at;
    handle = timers.setTimeout(() => {
      handle = null;
      dueAt = Infinity;
      onPlan(null);
      run();
    }, at - timers.now());
    onPlan(at);
  };

  return {
    request,
    started: () => {
      cancel();
      running = true;
      askedWhileRunning = false;
    },
    finished: () => {
      running = false;
      lastFinishedAt = timers.now();
      if (askedWhileRunning) {
        askedWhileRunning = false;
        request();
      }
    },
    cancel: () => {
      cancel();
      askedWhileRunning = false;
    },
    cooldownEndsAt: () => lastFinishedAt + cooldownMs,
  };
}
