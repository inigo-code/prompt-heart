// What you last typed into each prompt's {{blanks}}, so the fill-in sheet can start from it.
// Kept on this phone only and never synced: the answers can be personal.

/** Prompt id -> when the blanks were last used, and the values typed. */
export type BlankMemory = Record<string, { at: number; values: Record<string, string> }>;

/** Only the most recently used prompts are remembered, so the saved value stays small. */
export const MAX_REMEMBERED_PROMPTS = 200;

/** Records a prompt's values, dropping the least recently used prompts beyond the cap. */
export function rememberBlanks(memory: BlankMemory, promptId: string, values: Record<string, string>, at: number): BlankMemory {
  const next: BlankMemory = { ...memory, [promptId]: { at, values: { ...values } } };
  const ids = Object.keys(next);
  if (ids.length <= MAX_REMEMBERED_PROMPTS) return next;
  ids.sort((a, b) => next[b].at - next[a].at);
  return Object.fromEntries(ids.slice(0, MAX_REMEMBERED_PROMPTS).map((id) => [id, next[id]]));
}

/** Forgets the prompts `keep` says no to. Returns the same object when nothing goes, so callers can skip a save. */
export function forgetBlanks(memory: BlankMemory, keep: (promptId: string) => boolean): BlankMemory {
  const ids = Object.keys(memory);
  const kept = ids.filter(keep);
  if (kept.length === ids.length) return memory;
  return Object.fromEntries(kept.map((id) => [id, memory[id]]));
}

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Reads saved memory, skipping anything that isn't in the expected shape. */
export function parseBlankMemory(raw: string | null): BlankMemory {
  if (!raw) return {};
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!isRecord(parsed)) return {};
  const out: BlankMemory = {};
  for (const [id, entry] of Object.entries(parsed)) {
    if (!isRecord(entry) || typeof entry.at !== 'number' || !isRecord(entry.values)) continue;
    const values = Object.fromEntries(Object.entries(entry.values).filter((kv): kv is [string, string] => typeof kv[1] === 'string'));
    out[id] = { at: entry.at, values };
  }
  return out;
}
