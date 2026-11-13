// Earlier versions of each prompt's text, kept on this device. Pure (no React Native imports), so it's easy to check.

export const MAX_VERSIONS = 25;

export type Version = { at: number; title: string; body: string };
export type History = Record<string, Version[]>;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const isVersion = (v: unknown): v is Version => isRecord(v) && typeof v.at === 'number' && typeof v.title === 'string' && typeof v.body === 'string';

/** Reads saved history, skipping anything that isn't in the expected shape. Unreadable data gives an empty history. */
export function parseHistory(raw: string | null): History {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  const out: History = {};
  for (const [id, list] of Object.entries(parsed)) {
    if (Array.isArray(list)) out[id] = list.filter(isVersion);
  }
  return out;
}

/**
 * Adds versions kept while the saved history was still loading to the saved ones, instead of replacing them.
 * Each prompt's list stays newest first, without repeats, and within MAX_VERSIONS.
 */
export function mergeHistory(saved: History, recent: History): History {
  const all = { ...saved };
  for (const [id, versions] of Object.entries(recent)) {
    const seen = new Set<string>();
    all[id] = [...versions, ...(saved[id] ?? [])]
      .filter((v) => {
        const key = `${v.at}\n${v.title}\n${v.body}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => b.at - a.at)
      .slice(0, MAX_VERSIONS);
  }
  return all;
}

/** Drops the prompts `keep` says no to. Returns the same object when nothing goes, so nothing is saved for nothing. */
export function pruneHistory(history: History, keep: (promptId: string) => boolean): History {
  const ids = Object.keys(history);
  const kept = ids.filter(keep);
  if (kept.length === ids.length) return history;
  return Object.fromEntries(kept.map((id) => [id, history[id]]));
}
