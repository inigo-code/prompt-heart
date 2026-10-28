// Reads prompts out of files other apps export: CSV (Notion, Google Sheets, Excel, the awesome-chatgpt-prompts
// list), JSON lists of prompts, Markdown (one prompt per heading) and plain text. Pure, so it's easy to check.

export type ImportedPrompt = { title: string; body: string; tags: string[]; category: string | null };
export type ParsedFile = { name: string; prompts: ImportedPrompt[]; format: 'csv' | 'json' | 'markdown' | 'text' };

const TITLE_KEYS = ['title', 'name', 'act', 'prompt name', 'prompt_name', 'label', 'heading', 'subject', 'command'];
const BODY_KEYS = ['prompt', 'body', 'content', 'text', 'template', 'prompt text', 'prompt_text', 'instructions', 'value', 'description'];
const TAG_KEYS = ['tags', 'tag', 'labels', 'keywords'];
const CATEGORY_KEYS = ['category', 'folder', 'group', 'collection', 'type', 'section'];

const norm = (s: string) => s.trim().toLowerCase();
const pick = (row: Record<string, unknown>, keys: string[]) => {
  const lower = Object.fromEntries(Object.entries(row).map(([k, v]) => [norm(k), v]));
  for (const k of keys) {
    const v = lower[k];
    if (typeof v === 'string' && v.trim()) return v;
    if (typeof v === 'number') return String(v);
    if (Array.isArray(v) && v.length) return v;
  }
  return null;
};
const splitTags = (v: unknown): string[] =>
  (Array.isArray(v) ? v.map(String) : typeof v === 'string' ? v.split(/[,;|]/) : [])
    .map((t) => t.trim().replace(/^#/, '').toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean);
const baseName = (file: string) => file.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
const titleFrom = (body: string) => {
  const line = body.split('\n').find((l) => l.trim()) ?? '';
  const t = line.replace(/^#+\s*/, '').trim();
  return t.length > 60 ? `${t.slice(0, t.lastIndexOf(' ', 57) > 20 ? t.lastIndexOf(' ', 57) : 57)}…` : t;
};

/** RFC 4180 CSV with quoted fields; the delimiter (comma, semicolon or tab) is picked from the header line. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '');
  const head = src.slice(0, src.indexOf('\n') === -1 ? src.length : src.indexOf('\n'));
  const delim = [',', ';', '\t'].map((d) => [d, head.split(d).length] as const).sort((a, b) => b[1] - a[1])[0][0];
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"' && field === '') quoted = true;
    else if (c === delim) { row.push(field); field = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter((r) => r.some((f) => f.trim()));
}

function fromRows(rows: Record<string, unknown>[]): ImportedPrompt[] {
  const out: ImportedPrompt[] = [];
  for (const r of rows) {
    const bodyV = pick(r, BODY_KEYS);
    const titleV = pick(r, TITLE_KEYS);
    const body = typeof bodyV === 'string' ? bodyV.trim() : '';
    const title = typeof titleV === 'string' ? titleV.trim() : '';
    if (!body && !title) continue;
    const category = pick(r, CATEGORY_KEYS);
    out.push({ title: title || titleFrom(body), body: body || title, tags: splitTags(pick(r, TAG_KEYS)), category: typeof category === 'string' ? category.trim() : null });
  }
  return out;
}

function fromCsv(text: string): ImportedPrompt[] {
  const rows = parseCsv(text);
  if (!rows.length) return [];
  const header = rows[0].map(norm);
  const known = [...TITLE_KEYS, ...BODY_KEYS, ...TAG_KEYS, ...CATEGORY_KEYS];
  if (header.some((h) => known.includes(h))) {
    return fromRows(rows.slice(1).map((r) => Object.fromEntries(header.map((h, i) => [h, r[i] ?? '']))));
  }
  // No header we know: two or more columns are title and prompt; one column is the prompt.
  return rows
    .map((r) => (r.length >= 2 ? { title: r[0].trim(), body: r[1].trim() } : { title: '', body: r[0].trim() }))
    .filter((r) => r.body || r.title)
    .map((r) => ({ title: r.title || titleFrom(r.body), body: r.body || r.title, tags: [], category: null }));
}

function fromJson(data: unknown): ImportedPrompt[] {
  const list = Array.isArray(data)
    ? data
    : data && typeof data === 'object'
      ? ((['prompts', 'items', 'data', 'commands', 'templates', 'library'].map((k) => (data as Record<string, unknown>)[k]).find(Array.isArray) as unknown[] | undefined) ??
        // A map of title -> prompt.
        Object.entries(data as Record<string, unknown>)
          .filter(([, v]) => typeof v === 'string')
          .map(([k, v]) => ({ title: k, prompt: v })))
      : [];
  return fromRows(list.map((x) => (typeof x === 'string' ? { prompt: x } : x && typeof x === 'object' ? (x as Record<string, unknown>) : {})));
}

const unfence = (s: string) => {
  const m = s.trim().match(/^```[^\n]*\n([\s\S]*?)\n```$/);
  return m ? m[1] : s.trim();
};

function fromMarkdown(text: string, file: string): ImportedPrompt[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  // Split at the deepest heading level that appears more than once: those are the prompts.
  const levels = [2, 3, 1].filter((n) => lines.filter((l) => new RegExp(`^#{${n}}\\s`).test(l)).length > 1);
  if (!levels.length) {
    const body = text.trim();
    const heading = lines.find((l) => /^#\s/.test(l));
    return body ? [{ title: heading ? heading.replace(/^#\s*/, '').trim() : baseName(file) || titleFrom(body), body: unfence(heading ? body.replace(heading, '').trim() : body), tags: [], category: null }] : [];
  }
  const level = Math.max(...levels);
  const marker = new RegExp(`^#{${level}}\\s+(.*)$`);
  const parent = level > 1 ? new RegExp(`^#{${level - 1}}\\s+(.*)$`) : null;
  const out: ImportedPrompt[] = [];
  let category: string | null = null;
  let current: { title: string; lines: string[]; category: string | null } | null = null;
  const flush = () => {
    if (!current) return;
    let body = current.lines.join('\n').trim();
    const tagLine = body.split('\n')[0];
    let tags: string[] = [];
    if (/^(#[\w-]+\s*)+$/.test(tagLine)) {
      tags = splitTags(tagLine.split(/\s+/).join(','));
      body = body.split('\n').slice(1).join('\n').trim();
    }
    body = unfence(body);
    if (body || current.title) out.push({ title: current.title || titleFrom(body), body: body || current.title, tags, category: current.category });
    current = null;
  };
  for (const l of lines) {
    const p = parent?.exec(l);
    if (p) { flush(); category = p[1].trim(); continue; }
    const m = marker.exec(l);
    if (m) { flush(); current = { title: m[1].trim(), lines: [], category }; continue; }
    if (current) current.lines.push(l);
  }
  flush();
  return out;
}

function fromText(text: string, file: string): ImportedPrompt[] {
  const parts = text.replace(/\r\n/g, '\n').split(/\n-{3,}\n/).map((p) => p.trim()).filter(Boolean);
  if (parts.length === 1) return [{ title: baseName(file) || titleFrom(parts[0]), body: parts[0], tags: [], category: null }];
  return parts.map((p) => ({ title: titleFrom(p), body: p, tags: [], category: null }));
}

/** Reads one file. Throws with a readable message when nothing in it looks like a prompt. */
export function parseImport(file: string, text: string): ParsedFile {
  const ext = file.toLowerCase().split('.').pop() ?? '';
  const trimmed = text.trim();
  let format: ParsedFile['format'];
  let prompts: ImportedPrompt[];
  if (ext === 'json' || ((ext === 'txt' || !ext) && /^[[{]/.test(trimmed))) {
    let data: unknown;
    try {
      data = JSON.parse(trimmed);
    } catch {
      throw new Error(`${file} isn't valid JSON.`);
    }
    format = 'json';
    prompts = fromJson(data);
  } else if (ext === 'csv' || ext === 'tsv') {
    format = 'csv';
    prompts = fromCsv(text);
  } else if (ext === 'md' || ext === 'markdown') {
    format = 'markdown';
    prompts = fromMarkdown(text, file);
  } else {
    format = 'text';
    prompts = fromText(text, file);
  }
  if (!prompts.length) throw new Error(`No prompts found in ${file}.`);
  return { name: file, prompts, format };
}

const key = (title: string, body: string) => `${norm(title)}\u0000${body.trim()}`;

/**
 * Plans an import: which prompts are new (not already saved with the same title and text), and which
 * categories they need. Categories match yours by name, ignoring case; the rest are created.
 */
export function planImport(files: ParsedFile[], existing: { title: string; body: string }[], folders: { id: string; name: string }[]) {
  const seen = new Set(existing.map((p) => key(p.title, p.body)));
  const byName = new Map(folders.map((f) => [norm(f.name), f.id]));
  const fresh: ImportedPrompt[] = [];
  let duplicates = 0;
  for (const f of files) {
    for (const p of f.prompts) {
      const k = key(p.title, p.body);
      if (seen.has(k)) { duplicates++; continue; }
      seen.add(k);
      fresh.push(p);
    }
  }
  const newCategories = [...new Set(fresh.map((p) => p.category).filter((c): c is string => !!c && !byName.has(norm(c))))];
  return { prompts: fresh, duplicates, newCategories, folderIdFor: (name: string | null) => (name ? byName.get(norm(name)) ?? null : null) };
}

const csvCell = (v: string) => (/[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

/** A spreadsheet of your prompts; reads back in with parseImport. */
export function toCsv(prompts: { title: string; body: string; tags: string[]; folderId: string | null; pinned: boolean; copyCount: number; createdAt: number; updatedAt: number }[], folders: { id: string; name: string }[]) {
  const name = (id: string | null) => folders.find((f) => f.id === id)?.name ?? '';
  const rows = [['title', 'prompt', 'category', 'tags', 'pinned', 'copies', 'created', 'updated']];
  for (const p of prompts) {
    rows.push([p.title, p.body, name(p.folderId), p.tags.join(', '), p.pinned ? 'yes' : '', String(p.copyCount), new Date(p.createdAt).toISOString(), new Date(p.updatedAt).toISOString()]);
  }
  return rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
}
