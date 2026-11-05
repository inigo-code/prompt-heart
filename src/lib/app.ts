// Branding and developer details shown in the app. Change them here.
export const APP_NAME = 'Prompt Heart';
/** For file names and other places spaces don't belong. */
export const APP_SLUG = 'promptheart';
export const APP_TAGLINE = 'Your AI prompts, one tap away.';

export const DEVELOPER = {
  name: 'Inigo',
  github: 'https://github.com/inigo-code',
};

/** Public pages (GitHub Pages, repo inigo-code/prompt-heart-site). The Play Store listing links to them too. */
export const LINKS = {
  privacy: 'https://inigo-code.github.io/prompt-heart-site/privacy.html',
  deleteAccount: 'https://inigo-code.github.io/prompt-heart-site/delete-account.html',
};

/** Prompt Heart is one of the Heart Apps. Wording matches the Heart Apps site and Watch Heart (~/.claude/heart-apps.md). */
export const HEART_APPS = {
  name: 'Heart Apps',
  line: 'Free Android apps by Inigo. No ads, no tracking, nothing to buy.',
  home: 'https://inigo-code.github.io/',
  others: [{ name: 'Watch Heart', tagline: 'A diary for films, series and anime', url: 'https://inigo-code.github.io/watch-heart-site/' }],
};
export const SUPPORT_EMAIL = 'inigo@tosstheworld.org';

/**
 * Shown once after an update installs. Every update, whether a new build or an over-the-air one, gets a
 * new id and its own lines, so people always see what changed. A fresh install never shows it.
 */
export const WHATS_NEW = {
  id: '2026-11-05-1.8.1-widget-card',
  items: [
    'The home-screen widget now follows its size: make it taller to see more prompts',
    'Widget buttons keep working after you resize it',
    'A new widget shows a card straight away instead of an empty space',
    'Your images download straight away on a new phone',
    'Copies from the widget always count, on the day you made them',
    'An open prompt now picks up changes from your other devices',
  ],
};
