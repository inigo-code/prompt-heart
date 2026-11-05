// Tests the automatic-sync cooldown with a fake clock.
import assert from 'node:assert/strict';

const { createAutoSync } = await import('@/sync/autoSync');

function setup(cooldown = 60_000, onPlan) {
  let now = 0;
  let timers: { at: number; fn: () => void; id: number }[] = [];
  let nextId = 1;
  const runs: number[] = [];
  const auto = createAutoSync(
    () => {
      runs.push(now);
      auto.started();
      auto.finished();
    },
    cooldown,
    {
      now: () => now,
      setTimeout: (fn: () => void, ms: number) => {
        const id = nextId++;
        timers.push({ at: now + ms, fn, id });
        return id;
      },
      clearTimeout: (id: unknown) => {
        timers = timers.filter((t) => t.id !== id);
      },
    },
    onPlan,
  );
  const advance = (ms: number) => {
    const end = now + ms;
    for (;;) {
      timers.sort((a, b) => a.at - b.at);
      const t = timers[0];
      if (!t || t.at > end) break;
      timers.shift();
      now = t.at;
      t.fn();
    }
    now = end;
  };
  return { auto, runs, advance, pending: () => timers.length, setNow: (t: number) => (now = t) };
}

// 1. First request with no recent sync runs after its delay.
{
  const { auto, runs, advance } = setup();
  auto.request(1500);
  advance(1499);
  assert.deepEqual(runs, []);
  advance(1);
  assert.deepEqual(runs, [1500]);
}

// 2. Requests during the cooldown are folded into one sync when it ends.
{
  const { auto, runs, advance } = setup();
  auto.request(0);
  advance(0);
  assert.deepEqual(runs, [0]);
  for (let i = 0; i < 10; i++) {
    advance(2000); // e.g. ten copies, two seconds apart
    auto.request(1500);
  }
  advance(60_000);
  assert.deepEqual(runs, [0, 60_000], 'one sync at the end of the cooldown, not ten');
}

// 3. After the cooldown has passed, a request runs after its normal delay again.
{
  const { auto, runs, advance } = setup();
  auto.request(0);
  advance(0);
  advance(120_000);
  auto.request(1500);
  advance(1500);
  assert.deepEqual(runs, [0, 121_500]);
}

// 4. A manual sync (started/finished without the scheduler) cancels a planned one and restarts the cooldown.
{
  const { auto, runs, advance, pending } = setup();
  auto.request(0);
  advance(0);
  auto.request(1500); // planned for 60s
  advance(10_000);
  auto.started(); // user taps Sync
  auto.finished();
  assert.equal(pending(), 0, 'the planned sync is dropped');
  auto.request(1500);
  advance(59_999);
  assert.deepEqual(runs, [0]);
  advance(1);
  assert.deepEqual(runs, [0, 70_000], 'next automatic sync waits a full cooldown after the manual one');
}

// 5. A request made while a sync is running is planned after that sync's cooldown.
{
  const { auto, runs, advance } = setup();
  auto.started();
  auto.request(1500); // an edit during the sync
  advance(3000);
  auto.finished(); // sync ends at 3s
  advance(59_999);
  assert.deepEqual(runs, []);
  advance(1);
  assert.deepEqual(runs, [63_000]);
}

// 6. An earlier planned sync isn't pushed back by later requests.
{
  const { auto, runs, advance } = setup();
  auto.request(1500);
  advance(1000);
  auto.request(1500); // would be 2.5s
  advance(500);
  assert.deepEqual(runs, [1500]);
}

// 7. cancel() drops planned and pending-while-running requests.
{
  const { auto, runs, advance } = setup();
  auto.request(1500);
  auto.cancel();
  advance(100_000);
  assert.deepEqual(runs, []);
  auto.started();
  auto.request();
  auto.cancel();
  auto.finished();
  advance(200_000);
  assert.deepEqual(runs, []);
}

// 8. onPlan reports the planned time, and null once it runs or is cancelled.
{
  const plans: (number | null)[] = [];
  const { auto, advance } = setup(60_000, (at: number | null) => plans.push(at));
  auto.request(0);
  advance(0); // runs at 0
  auto.request(1500); // planned for 60s (cooldown)
  advance(60_000); // runs
  auto.request(1500); // planned for 120s (a cooldown after the 60s sync)
  auto.cancel();
  assert.deepEqual(plans, [0, null, 60_000, null, 120_000, null]);
}


console.log('autoSync: all 9 cases pass');
