// Tests the copy-stats merge rules.
import assert from 'node:assert/strict';

const { mergePrompts, clearPending, promptVersion } = await import('@/store/merge');

const P = (o: object) => ({ id: 'a', title: 't', body: 'b', folderId: null, tags: [], pinned: false, images: [], copyCount: 0, createdAt: 0, updatedAt: 0, lastCopiedAt: null, modifiedAt: 0, deletedAt: null, ...o });

// 1. Remote has newer text but fewer copies (local copies not yet uploaded): newer text, local count.
{
  const [m] = mergePrompts([P({ title: 'old', modifiedAt: 100, copyCount: 7, lastCopiedAt: 900 })], [P({ title: 'new', modifiedAt: 200, copyCount: 5, lastCopiedAt: 500 })]);
  assert.equal(m.title, 'new');
  assert.equal(m.copyCount, 7);
  assert.equal(m.lastCopiedAt, 900);
}
// 2. Remote has older text but more copies (copied on another device): local text, remote count.
{
  const [m] = mergePrompts([P({ title: 'mine', modifiedAt: 300, copyCount: 2, lastCopiedAt: 100 })], [P({ title: 'theirs', modifiedAt: 200, copyCount: 9, lastCopiedAt: 800 })]);
  assert.equal(m.title, 'mine');
  assert.equal(m.copyCount, 9);
  assert.equal(m.lastCopiedAt, 800);
}
// 3. Identical: the same object is kept (no needless re-render).
{
  const mine = P({ modifiedAt: 5, copyCount: 3, lastCopiedAt: 7 });
  const [m] = mergePrompts([mine], [P({ modifiedAt: 5, copyCount: 3, lastCopiedAt: 7 })]);
  assert.equal(m, mine);
}
// 4. Never-copied stays null.
{
  const [m] = mergePrompts([P({ modifiedAt: 1 })], [P({ modifiedAt: 2 })]);
  assert.equal(m.lastCopiedAt, null);
}
// 5. A copy during an upload keeps the prompt pending; an unchanged one is cleared.
{
  const sent = { a: promptVersion(P({ modifiedAt: 10, copyCount: 1 })), b: promptVersion(P({ id: 'b', modifiedAt: 10, copyCount: 4 })) };
  const now = [P({ modifiedAt: 10, copyCount: 2 }), P({ id: 'b', modifiedAt: 10, copyCount: 4 })];
  assert.deepEqual(clearPending(['a', 'b'], now, sent, promptVersion), ['a']);
}
// 6. Folders still clear by modifiedAt (default version).
{
  assert.deepEqual(clearPending(['f'], [{ id: 'f', modifiedAt: 3 }], { f: 3 }), []);
}
console.log('merge: all 6 cases pass');
