// Reading saved data can fail for a moment (the phone is busy or short of memory). A few more tries, each a
// little later, usually get through. If they don't, the caller must not save: it doesn't know what's there,
// and saving its defaults would put them over the real data.

/** How long to wait before each new try, in milliseconds. About two seconds in all. */
export const READ_RETRY_DELAYS: readonly number[] = [200, 600, 1200];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Runs `read` until it works, waiting `delays[i]` before try i + 2. Rejects with the last error. */
export async function readWithRetries<T>(read: () => Promise<T>, delays: readonly number[] = READ_RETRY_DELAYS, sleep: (ms: number) => Promise<void> = wait): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await read();
    } catch (error) {
      if (attempt >= delays.length) throw error;
      await sleep(delays[attempt]);
    }
  }
}
