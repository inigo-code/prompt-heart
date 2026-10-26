// AI apps the user can launch from Promptheart. The prompt is always copied first; apps whose
// web address accepts a prefilled query also get it in the URL. On Android, these addresses open
// the installed app when it's set up to handle its own links, and the browser otherwise.

export type AiApp = {
  key: string;
  label: string;
  /** Short badge text and brand colour for the app's icon chip. */
  badge: string;
  color: string;
  /** Opens the app with nothing typed. */
  home: string;
  /** Opens a new chat; with text when the app supports a prefilled query. */
  url: (text: string) => string;
  /** Whether the prompt lands in the chat box, or the user pastes it. */
  prefills: boolean;
  /** On by default for new installs. */
  defaultOn: boolean;
};

// Long prompts would make the URL too long; those open the app empty and rely on the clipboard.
const MAX_QUERY = 6000;
const withQuery = (base: string, param = 'q') => (text: string) =>
  !text || text.length > MAX_QUERY ? base : `${base}${base.includes('?') ? '&' : '?'}${param}=${encodeURIComponent(text)}`;

export const AI_APPS: AiApp[] = [
  { key: 'chatgpt', label: 'ChatGPT', badge: 'GPT', color: '#10A37F', home: 'https://chatgpt.com/', url: withQuery('https://chatgpt.com/'), prefills: true, defaultOn: true },
  { key: 'claude', label: 'Claude', badge: 'Cl', color: '#D97757', home: 'https://claude.ai/new', url: withQuery('https://claude.ai/new'), prefills: true, defaultOn: true },
  { key: 'gemini', label: 'Gemini', badge: 'Ge', color: '#4285F4', home: 'https://gemini.google.com/app', url: () => 'https://gemini.google.com/app', prefills: false, defaultOn: true },
  { key: 'grok', label: 'Grok', badge: 'Gr', color: '#2B2B2B', home: 'https://grok.com/', url: withQuery('https://grok.com/'), prefills: true, defaultOn: true },
  { key: 'perplexity', label: 'Perplexity', badge: 'Px', color: '#20808D', home: 'https://www.perplexity.ai/', url: withQuery('https://www.perplexity.ai/search'), prefills: true, defaultOn: true },
  { key: 'copilot', label: 'Copilot', badge: 'Co', color: '#0F6CBD', home: 'https://copilot.microsoft.com/', url: () => 'https://copilot.microsoft.com/', prefills: false, defaultOn: false },
  { key: 'deepseek', label: 'DeepSeek', badge: 'DS', color: '#4D6BFE', home: 'https://chat.deepseek.com/', url: () => 'https://chat.deepseek.com/', prefills: false, defaultOn: false },
  { key: 'mistral', label: 'Le Chat', badge: 'LC', color: '#F0560F', home: 'https://chat.mistral.ai/chat', url: () => 'https://chat.mistral.ai/chat', prefills: false, defaultOn: false },
];

export const aiApp = (key: string | null | undefined) => AI_APPS.find((a) => a.key === key);

// Each AI app has a category with a fixed id, so every device creates the same one and sync merges them.
const FOLDER_PREFIX = 'ai-';
export const aiFolderId = (key: string) => `${FOLDER_PREFIX}${key}`;
export const aiAppForFolder = (folderId: string | null | undefined) =>
  folderId?.startsWith(FOLDER_PREFIX) ? aiApp(folderId.slice(FOLDER_PREFIX.length)) : undefined;

export const defaultAiApps = (): Record<string, boolean> => Object.fromEntries(AI_APPS.map((a) => [a.key, a.defaultOn]));
