// "Copy & open in…" targets. The prompt is always copied first; apps that accept a prefilled
// query also get it in the URL, so it lands in the chat box ready to send.
export type AiTarget = { key: string; label: string; url: (text: string) => string };

// Long prompts would make the URL too long; those open the app empty and rely on the clipboard.
const MAX_QUERY = 6000;
const withQuery = (base: string, param: string) => (text: string) =>
  text.length > MAX_QUERY ? base : `${base}${base.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(text)}`;

export const AI_TARGETS: AiTarget[] = [
  { key: 'chatgpt', label: 'ChatGPT', url: withQuery('https://chatgpt.com/', 'q') },
  { key: 'claude', label: 'Claude', url: withQuery('https://claude.ai/new', 'q') },
  { key: 'perplexity', label: 'Perplexity', url: withQuery('https://www.perplexity.ai/search', 'q') },
  { key: 'gemini', label: 'Gemini', url: () => 'https://gemini.google.com/app' },
];
