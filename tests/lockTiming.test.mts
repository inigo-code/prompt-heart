// Tests when the app should lock again.
import assert from 'node:assert/strict';

const { shouldLockOnReturn, LOCK_AFTER_OPTIONS } = await import('@/lock/lockTiming');
const t0 = 1_000_000;

assert.equal(shouldLockOnReturn(60, null, t0), false, 'never backgrounded: stays unlocked');
assert.equal(shouldLockOnReturn(0, t0, t0), true, 'Immediately: locks on any return');
assert.equal(shouldLockOnReturn(0, t0, t0 + 500), true, 'Immediately: locks after half a second');
assert.equal(shouldLockOnReturn(60, t0, t0 + 59_999), false, '1 minute: not yet');
assert.equal(shouldLockOnReturn(60, t0, t0 + 60_000), true, '1 minute: exactly a minute');
assert.equal(shouldLockOnReturn(300, t0, t0 + 120_000), false, '5 minutes: 2 minutes away is fine');
assert.equal(shouldLockOnReturn(300, t0, t0 + 300_001), true, '5 minutes: locks after');
assert.deepEqual(LOCK_AFTER_OPTIONS.map((o) => o.value), [0, 60, 300]);
console.log('lock timing: all 8 cases pass');
