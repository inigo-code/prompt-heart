import { AppState } from 'react-native';

// The photo picker, file picker and share sheet are the phone's own screens, opened over the app for a moment.
// Android counts them as leaving the app, so with App lock set to "Immediately" every photo or backup asked for
// the phone's lock again on the way back. A short trip to one of them doesn't count as leaving; a long one
// (someone who walked away from the picker, or went on into the app they shared to) still locks as usual.
const TRIP_MAX_MS = 2 * 60 * 1000;
// Coming back to the app and the picker's answer can arrive in either order; this covers the gap.
const SETTLE_MS = 1500;

let tripAt: number | null = null;

/** Runs `open` (a picker or share sheet) as a short trip out of the app, so App lock doesn't ask again after it. */
export async function stepOut<T>(open: () => Promise<T>): Promise<T> {
  const mine = Date.now();
  tripAt = mine;
  try {
    return await open();
  } finally {
    // Still away (in the share sheet, say): the return to the app settles it. Otherwise it's over.
    setTimeout(() => {
      if (tripAt === mine && AppState.currentState === 'active') tripAt = null;
    }, SETTLE_MS);
  }
}

/** On coming back to the app: whether it was from a short trip. Each trip counts once. */
export function backFromTrip(now: number): boolean {
  const short = tripAt !== null && now - tripAt < TRIP_MAX_MS;
  tripAt = null;
  return short;
}
