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
export const SUPPORT_EMAIL = 'inigo@tosstheworld.org';

/**
 * Shown once after an update installs. Change the id and the lines with each update worth telling
 * people about; an update that leaves it alone shows nothing. A fresh install never shows it.
 */
export const WHATS_NEW = {
  id: '2026-10-29-fixes',
  items: [
    'Long prompts stay above the keyboard while you type, so you can see the last line',
    'The fill-in sheet and tags stay above the keyboard too',
    'About you shows your name and bio, with Edit to change them; Save closes it again',
    'New in 1.7.0, if you missed it: your profile, imports from other apps, CSV export, and Edit for formatting',
  ],
};
