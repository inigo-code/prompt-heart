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
  privacy: 'https://heartapps.github.io/prompt-heart/privacy.html',
  deleteAccount: 'https://heartapps.github.io/prompt-heart/delete-account.html',
};

/** Prompt Heart is one of the Heart Apps. Wording matches the Heart Apps site and Watch Heart (~/.claude/heart-apps.md). */
export const HEART_APPS = {
  name: 'Heart Apps',
  line: 'Free Android apps by Inigo. No ads, no tracking, nothing to buy.',
  home: 'https://heartapps.github.io/',
  others: [{ name: 'Watch Heart', tagline: 'A diary for films, series and anime', url: 'https://heartapps.github.io/watch-heart/' }],
};
export const SUPPORT_EMAIL = 'inigo@tosstheworld.org';

/**
 * Shown once after an update installs. Every update, whether a new build or an over-the-air one, gets a
 * new id and its own lines, so people always see what changed. A fresh install never shows it.
 */
export const WHATS_NEW = {
  id: '2026-11-27-unlock',
  items: [
    'Unlock always answers now: sometimes the fingerprint check went missing as you came back to the app, and Unlock stayed greyed out until Prompt Heart was closed',
  ],
};
