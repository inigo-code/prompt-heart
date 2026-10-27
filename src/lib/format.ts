// Markdown formatting for the prompt editor. Prompts stay plain text (that's what gets copied, and AI
// apps read Markdown), so formatting just inserts or removes the markers around the selection.

export type Selection = { start: number; end: number };
export type Edit = { text: string; selection: Selection };
export type FormatKind = 'bold' | 'italic' | 'code' | 'heading' | 'bullet' | 'numbered' | 'quote' | 'placeholder';

const wrap = (text: string, sel: Selection, open: string, close: string, empty = ''): Edit => {
  // Leave spaces around the selection outside the markers: "**word **" isn't Markdown.
  let { start, end } = sel;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  // Already wrapped (markers just outside the selection): unwrap.
  if (text.slice(start - open.length, start) === open && text.slice(end, end + close.length) === close) {
    return {
      text: text.slice(0, start - open.length) + text.slice(start, end) + text.slice(end + close.length),
      selection: { start: start - open.length, end: end - open.length },
    };
  }
  // The selection includes the markers: unwrap.
  const picked = text.slice(start, end);
  if (picked.length >= open.length + close.length && picked.startsWith(open) && picked.endsWith(close)) {
    const inner = picked.slice(open.length, picked.length - close.length);
    return { text: text.slice(0, start) + inner + text.slice(end), selection: { start, end: start + inner.length } };
  }
  const inner = picked || empty;
  return {
    text: text.slice(0, start) + open + inner + close + text.slice(end),
    selection: { start: start + open.length, end: start + open.length + inner.length },
  };
};

const HEADING = /^#{1,6} /;
const BULLET = /^[-*] /;
const NUMBERED = /^\d+\. /;
const QUOTE = /^> ?/;

/** Adds a prefix to every line the selection touches, or removes it when all of them have it. */
const prefixLines = (text: string, sel: Selection, pattern: RegExp, prefix: (i: number) => string): Edit => {
  const from = text.lastIndexOf('\n', sel.start - 1) + 1;
  const nl = text.indexOf('\n', sel.end > sel.start && text[sel.end - 1] === '\n' ? sel.end - 1 : sel.end);
  const to = nl === -1 ? text.length : nl;
  const lines = text.slice(from, to).split('\n');
  // Only blank lines (the usual way to start a list): add the marker so you can type after it.
  const blank = lines.every((l) => !l.trim());
  const all = !blank && lines.every((l) => pattern.test(l) || !l.trim());
  let i = 0;
  const next = lines.map((l, n) => {
    if (blank) return n === 0 ? prefix(0) : l;
    if (all) return l.replace(pattern, '');
    if (!l.trim()) return l;
    // Swap a different list or heading marker rather than stacking them ("- 1. item").
    return prefix(i++) + l.replace(HEADING, '').replace(BULLET, '').replace(NUMBERED, '').replace(QUOTE, '');
  });
  const block = next.join('\n');
  const delta = block.length - (to - from);
  if (blank) return { text: text.slice(0, from) + block + text.slice(to), selection: { start: from + next[0].length, end: from + next[0].length } };
  const single = lines.length === 1;
  return {
    text: text.slice(0, from) + block + text.slice(to),
    // One line: keep the cursor on the same text. Several: select the whole block.
    selection: single
      ? { start: Math.max(from, sel.start + delta), end: Math.max(from, sel.end + delta) }
      : { start: from, end: from + block.length },
  };
};

export function applyFormat(text: string, sel: Selection, kind: FormatKind): Edit {
  switch (kind) {
    case 'bold':
      return wrap(text, sel, '**', '**');
    case 'italic':
      return wrap(text, sel, '_', '_');
    case 'code':
      return text.slice(sel.start, sel.end).includes('\n') ? wrap(text, sel, '```\n', '\n```') : wrap(text, sel, '`', '`');
    case 'placeholder':
      return wrap(text, sel, '{{', '}}', 'name');
    case 'heading':
      return prefixLines(text, sel, HEADING, () => '## ');
    case 'bullet':
      return prefixLines(text, sel, BULLET, () => '- ');
    case 'numbered':
      return prefixLines(text, sel, NUMBERED, (i) => `${i + 1}. `);
    case 'quote':
      return prefixLines(text, sel, QUOTE, () => '> ');
  }
}

/** The text with Markdown markers taken out, for one-line previews on the home screen. */
export function stripMarkdown(text: string): string {
  return text
    .replace(/^```.*$/gm, '')
    .replace(/^#{1,6} /gm, '')
    .replace(/^> ?/gm, '')
    .replace(/\*\*([^*\n]+)\*\*/g, '$1')
    .replace(/(^|[^\w])_([^_\n]+)_(?!\w)/g, '$1$2')
    .replace(/`([^`\n]+)`/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}
