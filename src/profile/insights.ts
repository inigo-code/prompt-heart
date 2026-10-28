// Everything the profile shows about how you use your prompts, worked out from the store, the version
// history and the copy log. Pure (no React Native imports), so it's easy to check.

export type Tier = 'wood' | 'iron' | 'silver' | 'gold' | 'platinum';
export type Achievement = {
  id: string;
  name: string;
  /** What it takes for the next tier, e.g. "Save 25 prompts". */
  goal: string;
  icon: string;
  /** The highest tier reached, or null while still locked. */
  tier: Tier | null;
  /** Towards the next tier (or the last one, once it's all done). */
  progress: number;
  next: number;
};

/** One day in the copy log: copies, and which AI app each "Copy & open" went to. */
export type ActivityDay = { copies: number; opens: Record<string, number> };

type PromptLike = {
  id: string;
  title: string;
  body: string;
  folderId: string | null;
  tags: string[];
  images: string[];
  copyCount: number;
  createdAt: number;
  updatedAt: number;
  lastCopiedAt: number | null;
};
type FolderLike = { id: string; name: string; color: string };

export type Insights = {
  prompts: number;
  copies: number;
  /** Prompts with at least one {{blank}}. */
  templates: number;
  categories: number;
  tags: number;
  images: number;
  words: number;
  versions: number;
  /** The four prompts copied most (at least once each). */
  topFour: { id: string; title: string; copies: number }[];
  topCategories: { name: string; color: string; count: number }[];
  /** "Copy & open" launches per AI app, most first (from the copy log). */
  opens: { key: string; count: number }[];
  /** Activity per day for the last 53 weeks, oldest first, each week Monday to Sunday. */
  weeks: { date: string; count: number; future: boolean }[][];
  activeDays: number;
  currentStreak: number;
  longestStreak: number;
  busiestMonth: { key: string; count: number } | null;
  achievements: Achievement[];
};

const TIERS: Tier[] = ['wood', 'iron', 'silver', 'gold', 'platinum'];
export const TIER_COLORS: Record<Tier, string> = { wood: '#B07A4A', iron: '#8C96A1', silver: '#B9C1CC', gold: '#E2A52A', platinum: '#5FC8D6' };

const PLACEHOLDER = /\{\{\s*[^{}|]+?\s*(?:\|[^{}]*)?\}\}/;
const DAY = 24 * 60 * 60 * 1000;

const pad = (n: number) => String(n).padStart(2, '0');
/** A local calendar date as YYYY-MM-DD. */
export const isoDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const parseIso = (iso: string) => new Date(Number(iso.slice(0, 4)), Number(iso.slice(5, 7)) - 1, Number(iso.slice(8, 10)));
const dayOf = (ms: number) => isoDate(new Date(ms));
/** "1 prompt", "5 prompts". */
const pl = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

function achieve(id: string, name: string, goal: (n: number) => string, icon: string, value: number, steps: number[]): Achievement {
  const reached = steps.filter((s) => value >= s).length;
  const next = steps[Math.min(reached, steps.length - 1)];
  return { id, name, goal: goal(next), icon, tier: reached ? TIERS[reached - 1] : null, progress: Math.min(value, next), next };
}

export function insights(
  prompts: PromptLike[],
  folders: FolderLike[],
  versions: Record<string, { at: number }[]>,
  activity: Record<string, ActivityDay>,
  todayIso: string,
): Insights {
  const copies = prompts.reduce((a, p) => a + p.copyCount, 0);
  const templates = prompts.filter((p) => PLACEHOLDER.test(p.body)).length;
  const tagSet = new Set(prompts.flatMap((p) => p.tags));
  const images = prompts.reduce((a, p) => a + p.images.length, 0);
  const words = prompts.reduce((a, p) => a + (p.body.trim() ? p.body.trim().split(/\s+/).length : 0), 0);
  const versionCount = Object.values(versions).reduce((a, v) => a + v.length, 0);

  const topFour = prompts
    .filter((p) => p.copyCount > 0)
    .sort((a, b) => b.copyCount - a.copyCount || (b.lastCopiedAt ?? 0) - (a.lastCopiedAt ?? 0))
    .slice(0, 4)
    .map((p) => ({ id: p.id, title: p.title || 'Untitled', copies: p.copyCount }));

  const byFolder = new Map<string, number>();
  for (const p of prompts) if (p.folderId) byFolder.set(p.folderId, (byFolder.get(p.folderId) ?? 0) + 1);
  const topCategories = folders
    .filter((f) => byFolder.has(f.id))
    .map((f) => ({ name: f.name, color: f.color, count: byFolder.get(f.id) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 5);

  const openMap = new Map<string, number>();
  for (const d of Object.values(activity)) for (const [k, n] of Object.entries(d.opens)) openMap.set(k, (openMap.get(k) ?? 0) + n);
  const opens = [...openMap.entries()].map(([key, count]) => ({ key, count })).sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));

  // Activity per day: prompts saved, versions kept (edits), and copies. Copies come from the log where it
  // has the day, otherwise from a prompt's last copy, so older prompts still show up.
  const perDay = new Map<string, number>();
  const add = (iso: string, n = 1) => perDay.set(iso, (perDay.get(iso) ?? 0) + n);
  for (const p of prompts) add(dayOf(p.createdAt));
  for (const list of Object.values(versions)) for (const v of list) add(dayOf(v.at));
  for (const [iso, d] of Object.entries(activity)) if (d.copies) add(iso, d.copies);
  for (const p of prompts) {
    if (!p.lastCopiedAt) continue;
    const iso = dayOf(p.lastCopiedAt);
    if (!activity[iso]?.copies) add(iso);
  }

  const end = parseIso(todayIso);
  const mondayOffset = (end.getDay() + 6) % 7;
  const start = new Date(end.getFullYear(), end.getMonth(), end.getDate() - mondayOffset - 52 * 7);
  const weeks: Insights['weeks'] = [];
  for (let w = 0; w < 53; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const iso = isoDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + w * 7 + d));
      week.push({ date: iso, count: perDay.get(iso) ?? 0, future: iso > todayIso });
    }
    weeks.push(week);
  }

  // Streaks of consecutive days with something done. Today without activity yet doesn't break one.
  const days = [...perDay.keys()].filter((d) => d <= todayIso).sort();
  let longestStreak = 0;
  let run = 0;
  let prev: string | null = null;
  for (const d of days) {
    run = prev && isoDate(new Date(parseIso(prev).getTime() + DAY + 2 * 60 * 60 * 1000)) === d ? run + 1 : 1;
    longestStreak = Math.max(longestStreak, run);
    prev = d;
  }
  let currentStreak = 0;
  for (let d = new Date(end); ; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)) {
    const iso = isoDate(d);
    if (perDay.has(iso)) currentStreak++;
    else if (iso !== todayIso) break;
  }

  const months = new Map<string, number>();
  for (const [iso, n] of perDay) months.set(iso.slice(0, 7), (months.get(iso.slice(0, 7)) ?? 0) + n);
  const busiest = [...months.entries()].sort((a, b) => b[1] - a[1] || b[0].localeCompare(a[0]))[0];

  const mostCopied = topFour[0]?.copies ?? 0;
  const imagePrompts = prompts.filter((p) => p.tags.includes('image')).length;

  const achievements = [
    achieve('collector', 'Collector', (n) => `Save ${pl(n, 'prompt')}`, 'albums', prompts.length, [5, 25, 100, 250, 500]),
    achieve('one-tap', 'One Tap', (n) => `Copy prompts ${pl(n, 'time')}`, 'copy', copies, [10, 50, 200, 500, 1000]),
    achieve('blanks', 'Fill in the Blanks', (n) => `${pl(n, 'prompt')} with {{blanks}}`, 'code-slash', templates, [1, 5, 15, 40, 100]),
    achieve('faithful', 'Old Faithful', (n) => `Copy one prompt ${pl(n, 'time')}`, 'heart', mostCopied, [5, 20, 50, 100, 250]),
    achieve('streak', 'Daily Habit', (n) => `A ${n}-day streak`, 'flame', longestStreak, [3, 7, 14, 30, 100]),
    achieve('wordsmith', 'Wordsmith', (n) => `Keep ${pl(n, 'earlier version')}`, 'create', versionCount, [1, 10, 50, 150, 365]),
    achieve('organiser', 'Organiser', (n) => `Use ${pl(n, 'category', 'categories')}`, 'folder-open', byFolder.size, [2, 4, 7, 10, 15]),
    achieve('tags', 'Tag Team', (n) => `Use ${pl(n, 'different tag')}`, 'pricetags', tagSet.size, [3, 10, 25, 50, 100]),
    achieve('artist', 'Prompt Artist', (n) => pl(n, 'image-generation prompt'), 'color-palette', imagePrompts, [1, 5, 15, 40, 100]),
    achieve('picture', 'Picture This', (n) => `Attach ${pl(n, 'reference image')}`, 'image', images, [1, 5, 20, 50, 100]),
    achieve('every-ai', 'All the AIs', (n) => `Open ${pl(n, 'different AI app')}`, 'apps', opens.length, [1, 2, 3, 5, 8]),
  ];

  return {
    prompts: prompts.length,
    copies,
    templates,
    categories: byFolder.size,
    tags: tagSet.size,
    images,
    words,
    versions: versionCount,
    topFour,
    topCategories,
    opens,
    weeks,
    activeDays: perDay.size,
    currentStreak,
    longestStreak,
    busiestMonth: busiest ? { key: busiest[0], count: busiest[1] } : null,
    achievements,
  };
}
