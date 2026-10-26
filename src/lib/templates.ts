// Placeholders look like {{name}} or {{name|default}}; names may contain spaces, e.g. {{target audience}}.
const PLACEHOLDER = /\{\{\s*([^{}|]+?)\s*(?:\|\s*([^{}]*?)\s*)?\}\}/g;

/** Unique placeholder names, in the order they first appear. */
export function extractVariables(body: string): string[] {
  return [...new Set([...body.matchAll(PLACEHOLDER)].map((m) => m[1]))];
}

/** Default values written as {{name|default}}; the first default given for a name wins. */
export function extractDefaults(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of body.matchAll(PLACEHOLDER)) if (m[2] && !(m[1] in out)) out[m[1]] = m[2];
  return out;
}

/** Replaces each placeholder with its value, falling back to its default. Blanks with no default stay as {{name}}. */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(PLACEHOLDER, (match, name: string, fallback?: string) => values[name]?.length ? values[name] : fallback || match);
}

/** Rough token estimate (~4 characters per token for English), good enough to gauge prompt length. */
export const estimateTokens = (text: string) => Math.ceil(text.trim().length / 4);
