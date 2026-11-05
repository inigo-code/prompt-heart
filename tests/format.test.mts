import assert from 'node:assert/strict';

const { applyFormat, stripMarkdown } = await import('@/lib/format');
const { createUndo } = await import('@/lib/undo');

let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => {
  assert.deepEqual(a, b, msg);
  n++;
};
// Render "text with [selection]" for readable assertions.
const show = (e: { text: string; selection: { start: number; end: number } }) =>
  e.text.slice(0, e.selection.start) + '[' + e.text.slice(e.selection.start, e.selection.end) + ']' + e.text.slice(e.selection.end);
const at = (marked: string) => {
  const start = marked.indexOf('[');
  const end = marked.indexOf(']') - 1;
  return { text: marked.replace('[', '').replace(']', ''), sel: { start, end } };
};
const run = (marked: string, kind: string) => {
  const { text, sel } = at(marked);
  return show(applyFormat(text, sel, kind));
};

eq(run('make [this] bold', 'bold'), 'make **[this]** bold', 'bold wraps');
eq(run('make **[this]** bold', 'bold'), 'make [this] bold', 'bold unwraps (markers outside)');
eq(run('make [**this**] bold', 'bold'), 'make [this] bold', 'bold unwraps (markers inside)');
eq(run('make [this ]bold', 'bold'), 'make **[this]** bold', 'bold leaves a trailing space outside');
eq(run('x[]y', 'bold'), 'x**[]**y', 'bold on empty selection puts cursor inside');
eq(run('a [b] c', 'italic'), 'a _[b]_ c', 'italic');
eq(run('run [ls] now', 'code'), 'run `[ls]` now', 'inline code');
eq(run('[a\nb]', 'code'), '```\n[a\nb]\n```', 'code block for multi-line');
eq(run('Hi []', 'placeholder'), 'Hi {{[name]}}', 'empty placeholder selects "name"');
eq(run('Hi [tone]', 'placeholder'), 'Hi {{[tone]}}', 'placeholder wraps');

eq(run('Title[]', 'heading'), '## Title[]', 'heading on cursor line');
eq(run('## Title[]', 'heading'), 'Title[]', 'heading toggles off');
eq(run('intro\nit[e]m', 'bullet'), 'intro\n- it[e]m', 'bullet only on the touched line');
eq(run('[one\ntwo\n\nthree]', 'numbered'), '[1. one\n2. two\n\n3. three]', 'numbered skips blank lines');
eq(run('[1. one\n2. two]', 'numbered'), '[one\ntwo]', 'numbered toggles off');
eq(run('[- one\n- two]', 'numbered'), '[1. one\n2. two]', 'numbered replaces bullets');
eq(run('[a\nb]', 'quote'), '[> a\n> b]', 'quote');
eq(run('[a\n]b', 'bullet'), '- [a\n]b', 'selection ending at a line break stays on that line');

eq(stripMarkdown('## Hi\n**bold** and _it_ and `x`\n> q'), 'Hi\nbold and it and x\nq', 'stripMarkdown');
eq(stripMarkdown('snake_case_name stays'), 'snake_case_name stays', 'stripMarkdown keeps snake_case');

const u = createUndo({ body: '' }, { mergeMs: 1000 });
const s = (body: string) => ({ body });
const a = s('h'), b = s('he'), c = s('hel');
u.record(a, 0);
u.record(b, 300);
u.record(c, 600); // one typing burst
eq(u.undo(), { body: '' }, 'undo takes back the whole burst');
eq(u.redo(), c, 'redo restores the burst');
const d = s('hel**lo**');
u.record(d, 700, 'action');
eq(u.undo(), c, 'formatting is its own step');
u.record(s('help'), 5000);
eq(u.canRedo(), false, 'new typing clears redo');
eq(u.undo(), c, 'typing after a pause is a new step');
u.reset(s('fresh'));
eq([u.canUndo(), u.canRedo()], [false, false], 'reset clears history');

eq(run('Steps:\n[]', 'bullet'), 'Steps:\n- []', 'bullet on an empty line adds the marker');
eq(run('Steps:\n[]', 'numbered'), 'Steps:\n1. []', 'numbered on an empty line');
eq(run('[]', 'heading'), '## []', 'heading on an empty prompt');

const { textChange } = await import('@/lib/undo');
eq(textChange('alpha omega', 'alpha beta omega'), { start: 6, removed: 0, inserted: 'beta ' }, 'textChange insert (shifted to the right when ambiguous)');
eq(textChange('abc', 'ac'), { start: 1, removed: 1, inserted: '' }, 'textChange delete');
eq(textChange('aaa', 'aaaa'), { start: 3, removed: 0, inserted: 'a' }, 'textChange repeated letters');

const v = createUndo({ body: '' }, { same: (x: { body: string }, y: { body: string }) => x.body === y.body });
eq(v.record({ body: '' }, 0), false, 'an unchanged value is not a step');
eq(v.canUndo(), false, 'still nothing to undo');
eq(v.record({ body: 'a' }, 0), true, 'record reports a new step');
eq(v.record({ body: 'ab' }, 10), false, 'and a merged one');

console.log(`format + undo: all ${n} cases pass`);
