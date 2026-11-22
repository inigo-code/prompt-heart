// Writes seed.json: the demo data (localStorage keys) the screenshots and video start from.
// Everything here is made up for the pictures; nothing comes from a real account.
import fs from 'node:fs';

const NOW = new Date(2026, 10, 22, 10, 30).getTime();
const H = 3600e3, D = 24 * H;
const pad = (n) => String(n).padStart(2, '0');
const iso = (ms) => { const d = new Date(ms); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`; };

const folders = [
  ['f-writing', 'Writing', '#F2B84B'],
  ['f-coding', 'Coding', '#5B8DEF'],
  ['f-work', 'Work', '#4CB782'],
  ['f-image', 'Image generation', '#E07A5F'],
  ['f-research', 'Research', '#9B7BD8'],
  ['ai-chatgpt', 'ChatGPT', '#10A37F'],
  ['ai-claude', 'Claude', '#D97757'],
  ['ai-gemini', 'Gemini', '#4285F4'],
  ['ai-grok', 'Grok', '#2B2B2B'],
  ['ai-perplexity', 'Perplexity', '#20808D'],
].map(([id, name, color]) => ({ id, name, color, createdAt: NOW - 200 * D, modifiedAt: 0, deletedAt: null }));

// [id, title, folder, tags, pinned, copies, edited (hours ago), last copied (hours ago), body]
const rows = [
  ['p-review', 'Senior code review', 'ai-claude', ['review'], true, 23, 2, 1,
    'You are a senior engineer reviewing a pull request. List bugs and edge cases, worst first. Point out anything hard to read, then suggest a corrected version.\n\nBe direct. Skip the praise.\n\n{{code}}'],
  ['p-proofread', 'Proofread without changing my voice', 'f-writing', ['editing'], true, 31, 5, 3,
    'Fix spelling, grammar and punctuation in the text I paste next. Keep my wording, tone and sentence length. Show the corrected text, then a short list of what you changed.'],
  ['p-social', 'Social media posts', 'f-work', ['marketing'], false, 9, 8, 30,
    'Write {{number of posts|5}} {{platform|LinkedIn}} posts about {{topic}} for {{audience}}. Give each a strong hook in the first line, one clear idea, and a call to action. Vary the formats.'],
  ['p-cold', 'Cold email that gets replies', 'ai-chatgpt', ['email'], false, 17, 26, 20,
    'Write a short, friendly cold email to {{name}} at {{company}}. Mention {{something specific about them}}, offer one concrete idea, and end with an easy yes-or-no question. Under 120 words.'],
  ['p-golden', 'Cinematic wide shot at golden hour', 'f-image', ['photo'], false, 14, 50, 44,
    'A cinematic wide shot of {{scene}} at golden hour, low sun behind the subject, long soft shadows, anamorphic lens flare, warm highlights and teal shadows, 35mm film grain. Aspect ratio {{aspect ratio|21:9}}.'],
  ['p-meeting', 'Meeting notes to action items', 'f-work', ['productivity'], false, 6, 75, 70,
    'Turn these meeting notes into:\n1. A three-sentence summary\n2. Decisions made\n3. Action items as a table (owner, task, due date)\n4. Open questions\n\nNotes:\n{{notes}}'],
  ['p-paper', 'Summarise a paper', 'f-research', ['reading'], false, 5, 98, 96,
    'Summarise this paper in five bullet points: the question, the method, the key result, the limitations, and why it matters. Then list three follow-up questions.\n\n{{paper}}'],
  ['p-explain', 'Explain it like I’m new to it', 'f-research', ['learning'], false, 4, 140, 130,
    'Explain {{topic}} to someone smart who has never studied it. Start with one everyday analogy, then build up in three short steps. End with the one thing most people get wrong.'],
  ['p-bug', 'Find the bug', 'f-coding', ['debugging'], false, 8, 170, 160,
    'Here is some {{language}} code and the error it gives. Explain the cause in plain words, show the smallest fix, and tell me how to stop it happening again.\n\nCode:\n{{code}}\n\nError:\n{{error}}'],
  ['p-product', 'Studio product photo', 'f-image', ['photo'], false, 3, 220, 210,
    'Studio product photo of {{product}} on a matte stone pedestal, warm beige seamless background, soft diffused key light from the left, gentle shadow, sharp focus, high detail.'],
];

const prompts = rows.map(([id, title, folderId, tags, pinned, copyCount, edited, copied, body], i) => ({
  id, title, body, folderId, tags, pinned, images: [], copyCount,
  createdAt: NOW - (30 + i * 9) * D, updatedAt: NOW - edited * H, lastCopiedAt: NOW - copied * H,
  modifiedAt: NOW - edited * H, deletedAt: null,
}));

// A year of copying: busier lately, quiet some weeks, a streak at the end.
const activity = {};
let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let d = 300; d >= 0; d--) {
  const recent = d < 60 ? 0.62 : d < 150 ? 0.42 : 0.25;
  if (d > 9 && rnd() > recent) continue;
  const copies = 1 + Math.floor(rnd() * (d < 60 ? 5 : 3));
  activity[iso(NOW - d * D)] = { copies, opens: {} };
}
const opens = { claude: 26, chatgpt: 18, gemini: 9, perplexity: 4 };
const days = Object.keys(activity).reverse();
for (const [app, n] of Object.entries(opens)) for (let k = 0; k < n; k++) { const day = activity[days[(k * 3 + app.length) % 40]]; day.opens[app] = (day.opens[app] ?? 0) + 1; }

const history = {
  'p-review': [
    { at: NOW - 5 * D, title: 'Code review', body: 'Review this code and point out any problems.\n\n{{code}}' },
    { at: NOW - 2 * D, title: 'Senior code review', body: 'You are a senior engineer reviewing a pull request. List bugs and edge cases, worst first. Suggest a corrected version.\n\n{{code}}' },
  ],
};

const aiApps = { chatgpt: true, claude: true, gemini: true, grok: true, perplexity: true, copilot: false, deepseek: false, mistral: false };
const settings = (o = {}) => ({
  themeMode: 'dark', accent: 'amber', layout: 'list', sort: 'recent', previewLines: 3, haptics: true, showTokens: true,
  aiApps, showAiBar: true, dismissedTips: ['ai-launch', 'library'], appLock: false, lockAfter: 60,
  seenUpdate: '2026-11-22-cleaner-look', onboarded: true, widgetWhileLocked: false, ...o,
});

const store = { version: 2, sync: { userId: null, lastPulledAt: null, pendingPrompts: [], pendingFolders: [], pendingImageUploads: [], pendingImageDeletes: [] }, folders, prompts };
const out = {
  'prompt-notes/v1': JSON.stringify(store),
  'promptheart/activity': JSON.stringify(activity),
  'promptheart/history': JSON.stringify(history),
  'promptheart/settings': JSON.stringify(settings()),
  'promptheart/profile': JSON.stringify({ name: 'Maya Fernandes', bio: 'Product designer. Prompts for research, writing and the odd image.', avatarVersion: null, avatarSyncedFor: null }),
};
fs.writeFileSync(new URL('./seed.json', import.meta.url), JSON.stringify(out));
fs.writeFileSync(new URL('./seed-settings.json', import.meta.url), JSON.stringify({ dark: settings(), light: settings({ themeMode: 'light' }), grid: settings({ layout: 'grid' }), welcome: settings({ onboarded: false }), whatsnew: settings({ seenUpdate: '2026-11-13-share-and-fixes' }) }));
console.log('seed:', prompts.length, 'prompts,', days.length, 'active days');
