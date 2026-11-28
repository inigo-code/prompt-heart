// Tests what the profile photo does when this phone and the account disagree.
import assert from 'node:assert/strict';

const { avatarAction } = await import('@/profile/avatarSync');

const base = { local: null, syncedFor: null, removal: null, userId: 'u1', meta: null, metaHasKey: false };

// In step: nothing to do.
assert.equal(avatarAction({ ...base, local: 100, syncedFor: 'u1', meta: 100, metaHasKey: true }), null);
assert.equal(avatarAction(base), null);

// Newer photo on the account: download it.
assert.equal(avatarAction({ ...base, local: 100, syncedFor: 'u1', meta: 200, metaHasKey: true }), 'download');
assert.equal(avatarAction({ ...base, meta: 200, metaHasKey: true }), 'download');

// Photo picked here while offline: upload it.
assert.equal(avatarAction({ ...base, local: 300, meta: 200, metaHasKey: true }), 'upload');
assert.equal(avatarAction({ ...base, local: 300 }), 'upload');

// Removed on another device.
assert.equal(avatarAction({ ...base, local: 100, syncedFor: 'u1', meta: null, metaHasKey: true }), 'removedElsewhere');

// The bug: removed here while offline. The account still has the photo, and it must not come back.
const removal = { at: 500, for: 'u1' };
assert.equal(avatarAction({ ...base, removal, meta: 100, metaHasKey: true }), 'finishRemoval');
// The account already has none: the removal is done.
assert.equal(avatarAction({ ...base, removal, meta: null, metaHasKey: true }), 'dropRemoval');
// A photo set on another device after the removal wins.
assert.equal(avatarAction({ ...base, removal, meta: 900, metaHasKey: true }), 'download');
// Signed in to a different account since: the removal was for the other account.
assert.equal(avatarAction({ ...base, removal: { at: 500, for: 'u2' }, meta: 100, metaHasKey: true }), 'dropRemoval');
