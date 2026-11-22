// What a failure says on screen (the Heart Apps rule: no technical text, ever). A lost connection shows up
// in many wordings depending on the phone and the library ("Network request failed", "fetch failed:
// java.net.UnknownHostException…", "Failed to fetch", a timeout), and none of them reach the screen as they are.
// Same helper as Watch Heart's src/lib/errors.ts; keep the two in step.

export const NO_CONNECTION = 'No connection. Check your internet and try again.';

const NETWORK =
  /network request failed|fetch failed|failed to fetch|load failed|network ?error|unknownhost|unable to resolve host|no address associated|connectexception|failed to connect|connection (?:refused|reset|abort|closed)|sockettimeout|timed? ?out|econn|enotfound|enetunreach|ssl|unreachable|internet connection appears to be offline/i;

// Words from code, not for people: exceptions, JavaScript errors, database codes, raw JSON, addresses,
// server set-up notes and status codes.
const TECHNICAL =
  /exception|\bjava\.|\bkotlin\.|\bandroid\.|\b(?:Type|Syntax|Reference|Range)Error\b|JSON Parse|JSON\.parse|in JSON at|unexpected token|undefined|\bnull\b|is not a function|cannot read|\bat \S+ \(|PGRST|\bJWT\b|violates|duplicate key|relation .* does not exist|status code|\bERR_|[{}[\]<>]|https?:\/\/|\.sql\b|supabase|row-level|policy|\(\d{3}\)|\\n/i;
/** Longer than this, a message isn't one of ours. */
const MOST_LETTERS = 160;

/** The text of anything thrown. */
export function errorText(e: unknown): string {
  if (e instanceof Error) return e.message;
  const message = (e as { message?: unknown } | null)?.message;
  return typeof message === 'string' ? message : String(e);
}

/** True when the failure is the connection, not the answer. */
export const isOffline = (e: unknown) => NETWORK.test(errorText(e));

/** True when a message reads like code, not something written for people. */
export const isTechnical = (text: string) => text.length > MOST_LETTERS || TECHNICAL.test(text);

/**
 * The words to show for a failure: plain words for a lost connection, the app's own message otherwise
 * (they're written for people), or `fallback` when there's nothing readable. Nothing technical ever
 * reaches the screen.
 */
export function shownError(e: unknown, fallback: string, offline = NO_CONNECTION): string {
  if (isOffline(e)) return offline;
  const text = errorText(e).trim();
  return text && !isTechnical(text) && text !== '[object Object]' ? text : fallback;
}
