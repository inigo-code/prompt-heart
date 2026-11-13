// Tests version history: reading saved data, adding versions kept while it loaded, and dropping deleted prompts.
import assert from 'node:assert/strict';

const { MAX_VERSIONS, mergeHistory, parseHistory, pruneHistory } = await import('@/store/versions');

const v = (at: number, body = `text ${at}`) => ({ at, title: 'T', body });

// Saved data in the wrong shape is skipped; unreadable data gives an empty history, as before.
assert.deepEqual(parseHistory(null), {});
assert.deepEqual(parseHistory('not json'), {});
assert.deepEqual(parseHistory('null'), {});
assert.deepEqual(parseHistory('[1]'), {});
assert.deepEqual(parseHistory(JSON.stringify({ a: [v(1), { at: 'x' }, 3], b: 'x' })), { a: [v(1)] });

// Versions kept while loading are added to the saved ones, newest first, without repeats.
const saved = { a: [v(3), v(2)], b: [v(1)] };
assert.equal(mergeHistory(saved, {}).a, saved.a, 'nothing new: the saved lists stay as they are');
assert.deepEqual(mergeHistory(saved, { a: [v(4), v(3)], c: [v(5)] }), { a: [v(4), v(3), v(2)], b: [v(1)], c: [v(5)] });
// Same time but different text is a different version.
assert.deepEqual(mergeHistory({ a: [v(3, 'old')] }, { a: [v(3, 'new')] }).a.length, 2);

// The merged list keeps the cap.
const long = { a: Array.from({ length: MAX_VERSIONS }, (_, i) => v(i)) };
const merged = mergeHistory(long, { a: [v(1000)] });
assert.equal(merged.a.length, MAX_VERSIONS);
assert.equal(merged.a[0].at, 1000);
assert.ok(!merged.a.some((x) => x.at === 0), 'the oldest version goes');

// Pruning keeps what `keep` allows, and returns the same object when nothing goes.
const h = { a: [v(1)], b: [v(2)], c: [v(3)] };
assert.equal(pruneHistory(h, () => true), h);
assert.deepEqual(Object.keys(pruneHistory(h, (id) => id !== 'b')), ['a', 'c']);
assert.deepEqual(pruneHistory(h, () => false), {});
assert.deepEqual(pruneHistory({}, () => false), {});
console.log('version history: all cases pass');
