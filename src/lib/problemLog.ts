// The last few errors this phone saw, for "Report a problem" (problemReport.ts). Plain logic with no imports, so the
// website builds can use it too.
//
// MASTER COPY: Heart Apps\Tools\expo\problem-report\. Change it there, then run sync_problem_report.py, which copies
// it into every Heart Apps Expo app's src/lib/.
//
// Only what an error says is kept, cleaned of anything that could be someone's own words or details: email
// addresses, web and file addresses, quoted text and long numbers are replaced. Nothing leaves the phone unless the
// person sends the email themselves.

export type NotedError = { at: number; where: string; text: string; fatal?: boolean };

const MAX = 8;
const LONGEST = 160;
let notes: NotedError[] = [];
let persist: ((notes: NotedError[]) => void) | null = null;

/** What an error says, without personal details. */
export function cleanError(e: unknown): string {
  const message = (e as { message?: unknown } | null)?.message;
  const raw = e instanceof Error || typeof message === 'string' ? String(message) : String(e);
  const name = e instanceof Error && e.name && e.name !== 'Error' && !raw.startsWith(e.name) ? `${e.name}: ` : '';
  return (name + raw)
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .replace(/\b[a-z][\w+.-]*:\/\/\S+/gi, '[address]')
    .replace(/"[^"]*"|“[^”]*”|«[^»]*»/g, '"…"')
    .replace(/(^|[\s(:=])'[^']*'/g, '$1\'…\'')
    .replace(/\d{6,}/g, '#')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, LONGEST);
}

/** Keeps a note of an error (shown or not), for the next problem report. */
export function noteError(e: unknown, where = '', fatal = false) {
  where = cleanError(where).slice(0, 60);
  const text = cleanError(e);
  if (!text || text === 'undefined' || text === '[object Object]') return;
  const last = notes[notes.length - 1];
  if (last && last.text === text && last.where === where) last.at = Date.now();
  else notes = [...notes, { at: Date.now(), where, text, ...(fatal ? { fatal } : {}) }].slice(-MAX);
  persist?.(notes);
}

export const recentErrors = (): NotedError[] => notes.slice();

/** Brings back the notes kept before the app last closed, and how to keep new ones. */
export function restoreErrors(saved: unknown, save: (notes: NotedError[]) => void) {
  const valid = Array.isArray(saved)
    ? saved.filter((n): n is NotedError => !!n && typeof n.at === 'number' && typeof n.text === 'string' && typeof n.where === 'string')
    : [];
  notes = [...valid, ...notes].slice(-MAX);
  persist = save;
}
