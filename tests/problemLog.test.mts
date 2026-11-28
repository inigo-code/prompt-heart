// Tests what "Report a problem" keeps of an error: what it says, never someone's own details.
import assert from 'node:assert/strict';

const { cleanError, noteError, recentErrors, restoreErrors } = await import('@/lib/problemLog');

assert.equal(cleanError(new Error('No connection')), 'No connection');
assert.equal(cleanError(new TypeError('x is not a function')), 'TypeError: x is not a function');
assert.equal(cleanError('plain text'), 'plain text');
// Personal details go.
assert.equal(cleanError(new Error('No account for asha.k@example.com')), 'No account for [email]');
assert.equal(cleanError(new Error('GET https://x.supabase.co/rest/v1/prompts?id=eq.5 failed')), 'GET [address] failed');
assert.equal(cleanError(new Error('Couldn\'t save "My secret prompt" now')), 'Couldn\'t save "…" now');
assert.equal(cleanError(new Error("Unknown category 'Work stuff'")), "Unknown category '…'");
assert.equal(cleanError(new Error('Call 9876543210')), 'Call #');
assert.ok(cleanError(new Error('x'.repeat(500))).length <= 160);

// Keeps the last eight, folds repeats, and saves each change.
const saved: unknown[] = [];
restoreErrors([{ at: 1, where: 'sync', text: 'old' }, { bad: true }], (n) => saved.push(n));
assert.deepEqual(recentErrors().map((n) => n.text), ['old']);
noteError(new Error('again'), 'sync');
noteError(new Error('again'), 'sync');
assert.equal(recentErrors().length, 2);
for (let i = 0; i < 10; i++) noteError(new Error(`e${i}`));
assert.equal(recentErrors().length, 8);
assert.equal(recentErrors()[7].text, 'e9');
assert.equal(saved.length, 12);
noteError(undefined);
assert.equal(saved.length, 12);
