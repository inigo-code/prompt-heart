import assert from 'node:assert/strict';

const { parseImport, parseCsv, planImport, toCsv } = await import('@/lib/importFiles');
let n = 0;
const eq = (a: unknown, b: unknown, msg: string) => { assert.deepEqual(a, b, msg); n++; };

// CSV: quoted fields with commas, quotes and newlines; semicolon delimiter detection.
eq(parseCsv('a,b\n"x, y","he said ""hi""\nline 2"\n'), [['a', 'b'], ['x, y', 'he said "hi"\nline 2']], 'quoted CSV');
eq(parseCsv('a;b\r\n1;2\r\n'), [['a', 'b'], ['1', '2']], 'semicolon CSV with CRLF');

// awesome-chatgpt-prompts style.
const awesome = parseImport('prompts.csv', '"act","prompt","for_devs"\n"Linux Terminal","I want you to act as a linux terminal.","TRUE"\n"Travel Guide","I want you to act as a travel guide.","FALSE"\n');
eq(awesome.prompts.map((p: { title: string }) => p.title), ['Linux Terminal', 'Travel Guide'], 'act/prompt columns');
eq(awesome.format, 'csv', 'format csv');

// Notion-style export with category and tags.
const notion = parseImport('Notion.csv', 'Name,Prompt,Category,Tags\nCold email,"Write a cold email to {{name}}",Sales,"email, outreach"\n');
eq(notion.prompts[0], { title: 'Cold email', body: 'Write a cold email to {{name}}', tags: ['email', 'outreach'], category: 'Sales' }, 'Notion row');

// No known header: first column title, second prompt.
eq(parseImport('x.csv', 'Summarise,Summarise this text\n').prompts[0].title, 'Summarise', 'headerless two columns');

// JSON: arrays, wrapped lists, plain strings, and a title -> prompt map.
eq(parseImport('a.json', '[{"name":"Hi","content":"Say hi"}]').prompts[0], { title: 'Hi', body: 'Say hi', tags: [], category: null }, 'JSON array');
eq(parseImport('a.json', '{"prompts":[{"title":"T","prompt":"P","tags":["A b","#c"]}]}').prompts[0].tags, ['a-b', 'c'], 'JSON wrapped, tags tidied');
eq(parseImport('a.json', '["Just a prompt here"]').prompts[0].title, 'Just a prompt here', 'JSON strings');
eq(parseImport('a.json', '{"Greeter":"Say hello warmly"}').prompts[0], { title: 'Greeter', body: 'Say hello warmly', tags: [], category: null }, 'JSON map');
assert.throws(() => parseImport('bad.json', '{nope'), /isn't valid JSON/);
n++;

// Markdown: our own export reads back (categories from ##, prompts from ###, tags line, fenced body).
const md = '# Prompt Heart prompts\n\nExported today\n\n## Coding\n\n### Review\n#review #code\n\n```\nReview {{code}}\n```\n\n### Explain\n\n```\nExplain it\n```\n\n## Writing\n\n### Tone\n\n```\nRewrite in a {{tone|friendly}} tone\n```\n';
const mdp = parseImport('export.md', md).prompts;
eq(mdp.map((p: { title: string; category: string }) => [p.title, p.category]), [['Review', 'Coding'], ['Explain', 'Coding'], ['Tone', 'Writing']], 'markdown sections and categories');
eq([mdp[0].body, mdp[0].tags], ['Review {{code}}', ['review', 'code']], 'fence and tags removed from body');
eq(parseImport('My prompt.md', 'Just write it well.').prompts[0].title, 'My prompt', 'single markdown file titled from file name');

// Text: separated by --- lines.
eq(parseImport('notes.txt', 'First prompt\n---\nSecond prompt').prompts.length, 2, 'text split by ---');
eq(parseImport('one.txt', 'Only one').prompts[0].title, 'one', 'single text file');
assert.throws(() => parseImport('empty.csv', 'title,prompt\n'), /No prompts found/);
n++;

// Planning: duplicates skipped, categories matched by name, new ones listed once.
const plan = planImport([notion, parseImport('more.csv', 'Name,Prompt,Category\nCold email,"Write a cold email to {{name}}",sales\nBlog,"Draft a blog",Writing\nAd,"Write an ad",Sales\n')], [{ title: 'cold email', body: 'Write a cold email to {{name}}' }], [{ id: 'f-writing', name: 'writing' }]);
eq([plan.prompts.length, plan.duplicates], [2, 2], 'existing and repeated prompts skipped');
eq(plan.newCategories, ['Sales'], 'Sales is new, Writing matches');
eq([plan.folderIdFor('WRITING'), plan.folderIdFor('Sales'), plan.folderIdFor(null)], ['f-writing', null, null], 'folder lookup');

// CSV export reads back in.
const csv = toCsv([{ title: 'A, "quoted"', body: 'Line 1\nLine 2', tags: ['x', 'y'], folderId: 'f1', pinned: true, copyCount: 3, createdAt: 0, updatedAt: 0 }], [{ id: 'f1', name: 'Work' }]);
eq(parseImport('back.csv', csv).prompts[0], { title: 'A, "quoted"', body: 'Line 1\nLine 2', tags: ['x', 'y'], category: 'Work' }, 'CSV export round trip');

console.log(`import: all ${n} cases pass`);
