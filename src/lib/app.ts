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
 * Shown once after an update installs. Change the id and the lines with each update worth telling
 * people about; an update that leaves it alone shows nothing. A fresh install never shows it.
 */
export const WHATS_NEW = {
  id: '2026-10-30-settings',
  items: [
    'Your account comes first in Settings, so signing in to sync is easy to find',
    'Prompt Heart is a Heart App: tap the gold chip in About to see Watch Heart and the rest',
    'Long prompts, the fill-in sheet and tags stay above the keyboard while you type',
    'About you shows your name and bio, with Edit to change them; Save closes it again',
  ],
};
