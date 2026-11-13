// Tests the memory of what was typed into blanks: the cap, forgetting, and reading saved data.
import assert from 'node:assert/strict';

const { MAX_REMEMBERED_PROMPTS, forgetBlanks, parseBlankMemory, rememberBlanks } = await import('@/lib/blankValues');

// Remembering adds and replaces, and copies the values so later edits to the sheet's object can't leak in.
const typed = { topic: 'cats' };
let memory = rememberBlanks({}, 'a', typed, 1);
typed.topic = 'dogs';
assert.deepEqual(memory, { a: { at: 1, values: { topic: 'cats' } } });
memory = rememberBlanks(memory, 'a', { topic: 'birds' }, 2);
assert.deepEqual(memory.a, { at: 2, values: { topic: 'birds' } });

// Past the cap, the least recently used prompts go first.
let many = {};
for (let i = 0; i < MAX_REMEMBERED_PROMPTS; i++) many = rememberBlanks(many, `p${i}`, { x: String(i) }, 1000 + i);
many = rememberBlanks(many, 'p0', { x: 'again' }, 5000); // p0 is used again, so p1 is now the oldest
many = rememberBlanks(many, 'new', { x: 'n' }, 6000);
assert.equal(Object.keys(many).length, MAX_REMEMBERED_PROMPTS);
assert.ok('p0' in many && 'new' in many, 'recently used prompts stay');
assert.ok(!('p1' in many), 'the oldest prompt is dropped');

// Forgetting keeps what `keep` allows, and returns the same object when nothing changes.
const three = { a: { at: 1, values: {} }, b: { at: 2, values: {} }, 'library:x': { at: 3, values: {} } };
assert.equal(forgetBlanks(three, () => true), three);
assert.deepEqual(Object.keys(forgetBlanks(three, (id) => id !== 'b')), ['a', 'library:x']);
assert.deepEqual(forgetBlanks(three, () => false), {});

// Saved data in the wrong shape is skipped rather than breaking the fill-in sheet.
assert.deepEqual(parseBlankMemory(null), {});
assert.deepEqual(parseBlankMemory('not json'), {});
assert.deepEqual(parseBlankMemory('[1,2]'), {});
assert.deepEqual(
  parseBlankMemory(JSON.stringify({ ok: { at: 5, values: { a: 'x', n: 3 } }, noTime: { values: {} }, bad: 'x' })),
  { ok: { at: 5, values: { a: 'x' } } },
);
// Blank names like "constructor" are ordinary keys.
assert.equal(parseBlankMemory(JSON.stringify({ p: { at: 1, values: { constructor: 'hi' } } })).p.values.constructor, 'hi');
console.log('blank values: all cases pass');
