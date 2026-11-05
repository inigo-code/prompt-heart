import assert from 'node:assert/strict';

const { insights, isoDate } = await import('@/profile/insights');
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };

const at = (iso: string, h = 12) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)), h).getTime();
const P = (id: string, o: Record<string, unknown> = {}) => ({ id, title: id, body: 'Write about {{topic}} please', folderId: null, tags: [], images: [], copyCount: 0, createdAt: at('2026-10-01'), updatedAt: at('2026-10-01'), lastCopiedAt: null, ...o });
const today = '2026-10-28';

const prompts = [
  P('a', { copyCount: 12, lastCopiedAt: at('2026-10-27'), folderId: 'f1', tags: ['image'] }),
  P('b', { copyCount: 5, lastCopiedAt: at('2026-10-20'), folderId: 'f1', body: 'No blanks here' }),
  P('c', { copyCount: 30, lastCopiedAt: at('2026-10-28'), folderId: 'f2', images: ['x'] }),
  P('d', { copyCount: 0 }),
  P('e', { copyCount: 1, lastCopiedAt: at('2026-09-01') }),
];
const folders = [{ id: 'f1', name: 'Writing', color: '#111' }, { id: 'f2', name: 'Coding', color: '#222' }, { id: 'f3', name: 'Empty', color: '#333' }];
const versions = { a: [{ at: at('2026-10-26') }, { at: at('2026-10-02') }] };
const activity = { '2026-10-28': { copies: 3, opens: { chatgpt: 2, claude: 1 } }, '2026-10-27': { copies: 1, opens: { chatgpt: 1 } } };

const r = insights(prompts, folders, versions, activity, today);
eq(isoDate(new Date(2026, 0, 5)), '2026-01-05', 'isoDate pads');
eq([r.prompts, r.copies, r.templates], [5, 48, 4], 'counts');
eq(r.topFour.map((p: { id: string }) => p.id), ['c', 'a', 'b', 'e'], 'most-used four, most copied first, never-copied left out');
eq(r.topCategories.map((c: { name: string; count: number }) => [c.name, c.count]), [['Writing', 2], ['Coding', 1]], 'categories with prompts only');
eq(r.opens, [{ key: 'chatgpt', count: 3 }, { key: 'claude', count: 1 }], 'AI app launches summed');
eq(r.weeks.length, 53, '53 weeks');
eq(r.weeks.every((w: unknown[]) => w.length === 7), true, '7 days a week');
const last = r.weeks[52];
eq(last.find((d: { date: string }) => d.date === today).count, 3, 'today counts the logged copies (not lastCopiedAt again)');
eq(last.some((d: { future: boolean }) => d.future), true, 'later days this week are future');
eq(r.weeks.flat().find((d: { date: string }) => d.date === '2026-10-26').count, 1, 'an edit counts on its day');
eq(r.weeks.flat().find((d: { date: string }) => d.date === '2026-10-01').count, 5, 'saves count on the day');
eq([r.currentStreak, r.longestStreak], [3, 3], 'streak 26, 27, 28');
eq(r.busiestMonth.key, '2026-10', 'busiest month');
const ach = Object.fromEntries(r.achievements.map((a: { id: string }) => [a.id, a]));
eq([ach.collector.tier, ach.collector.progress, ach.collector.next], ['wood', 5, 25], 'collector: wood, next 25');
eq(ach['one-tap'].tier, 'wood', '48 copies is wood (10), not iron (50)');
eq(ach.faithful.tier, 'iron', 'one prompt copied 30 times is iron (20)');
eq([ach.streak.tier, ach['every-ai'].tier, ach.artist.tier, ach.picture.tier], ['wood', 'iron', 'wood', 'wood'], 'other badges');
eq(ach.organiser.tier, 'wood', 'two categories');

const empty = insights([], folders, {}, {}, today);
eq([empty.prompts, empty.currentStreak, empty.topFour.length, empty.busiestMonth], [0, 0, 0, null], 'empty store');
eq(empty.achievements.every((a: { tier: unknown }) => a.tier === null), true, 'all locked when empty');

// A streak with a gap, and today not yet active.
const s = insights([P('x', { createdAt: at('2026-10-20') }), P('y', { createdAt: at('2026-10-21') }), P('z', { createdAt: at('2026-10-25') }), P('w', { createdAt: at('2026-10-26') }), P('v', { createdAt: at('2026-10-27') })], [], {}, {}, today);
eq([s.currentStreak, s.longestStreak], [3, 3], 'current streak survives a quiet today');

console.log(`insights: all ${n} cases pass`);
