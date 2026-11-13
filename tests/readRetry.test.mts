// Tests reading saved data again after a failed read.
import assert from 'node:assert/strict';

const { READ_RETRY_DELAYS, readWithRetries } = await import('@/lib/readRetry');

// Records the waits instead of waiting, so the test runs at once.
const waits: number[] = [];
const sleep = async (ms: number) => {
  waits.push(ms);
};

// Works first time: no waiting.
assert.equal(await readWithRetries(async () => 'saved', [10, 20], sleep), 'saved');
assert.deepEqual(waits, []);

// Fails twice, then works: the later try is the result, after the first two waits.
let calls = 0;
const flaky = async () => {
  calls++;
  if (calls < 3) throw new Error(`busy ${calls}`);
  return 'saved';
};
assert.equal(await readWithRetries(flaky, [10, 20, 30], sleep), 'saved');
assert.equal(calls, 3);
assert.deepEqual(waits, [10, 20]);

// Never works: one try per wait plus the first, then the last error comes back.
waits.length = 0;
calls = 0;
await assert.rejects(
  readWithRetries(
    async () => {
      calls++;
      throw new Error(`busy ${calls}`);
    },
    [10, 20, 30],
    sleep,
  ),
  { message: 'busy 4' },
);
assert.equal(calls, 4);
assert.deepEqual(waits, [10, 20, 30]);

// An empty value (nothing saved yet) is a successful read, not a failure.
assert.equal(await readWithRetries(async () => null, [10], sleep), null);

// The real waits add up to a couple of seconds, short enough to keep the app covered meanwhile.
const total = READ_RETRY_DELAYS.reduce((a, b) => a + b, 0);
assert.ok(READ_RETRY_DELAYS.length >= 2 && total <= 3000, `waits total ${total} ms`);
console.log('read retries: all cases pass');
