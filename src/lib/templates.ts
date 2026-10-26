// Placeholders look like {{name}}; names may contain spaces, e.g. {{target audience}}.
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

/** Unique placeholder names, in the order they first appear. */
export function extractVariables(body: string): string[] {
  const names = [...body.matchAll(PLACEHOLDER)].map((m) => m[1]);
  return [...new Set(names)];
}

/** Replaces each placeholder with its value. Placeholders left blank stay as {{name}}. */
export function fillTemplate(body: string, values: Record<string, string>): string {
  return body.replace(PLACEHOLDER, (match, name: string) => (values[name]?.length ? values[name] : match));
}
