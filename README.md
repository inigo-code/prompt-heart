# Promptheart

*Your AI prompts, one tap away.* A notes-style app for saving AI prompts and copying them with one tap. Built with Expo (SDK 58), Expo Router and TypeScript. Runs on Android, iOS and web. (Formerly "Prompt Notes".)

## Install

Download the latest Android APK from this repo's **Releases** page, or from the EAS build page. Installed builds update themselves over the air for code-only changes.

## Run it locally

```bash
npm install
npx expo start
```

Press `w` for web, or scan the QR code with Expo Go. Saving from other apps and image attachments need a real build: Expo Go and web don't include those native modules.

## Features

**Prompts**
- **One-tap copy**: every card has a copy button. Only the text is copied, never attached images.
- **Templates**: `{{placeholders}}` open a fill-in sheet with a live preview before copying. `{{tone|friendly}}` sets a default. The app remembers the last values you used.
- **Copy & open in ChatGPT, Claude, Perplexity or Gemini**: copies the prompt and opens the app, prefilled where supported.
- **Image attachments**: attach reference screenshots or photos. They're resized, stored on the device and synced to private cloud storage.
- **Notes-style editor**: autosaves, with categories, tags, pin, word count and a token estimate.

**Organising**
- **Categories** with colours, **#tags**, **pins**, **search**, and a **Recently copied** filter.
- **List or grid** home layout. Sort by recent, most copied or A–Z.
- **Trash**: deleted prompts stay for 30 days, with Undo and Restore.

**Capture and backup**
- **Save from other apps**: use Share → Promptheart from Chrome, ChatGPT, Photos or anywhere else to save text, links or images as a prompt (Android).
- **Export / import**: a JSON backup that includes images, plus a readable Markdown export. Importing merges and never deletes.

**App**
- **Settings**: theme (System, Light or Dark), five accent colours, layout, preview length, vibrate on copy, token estimates.
- **Cloud sync** across devices (Supabase). Works offline and updates live.
- **Over-the-air updates**, plus a Check for updates button in About.
- **About** screen with version and developer info.

## Set up cloud sync

You do this once, and it takes about 5 minutes. Until it's done, the app runs local-only.

1. **Create a project** at [supabase.com](https://supabase.com). The free tier is fine.
2. **Create the tables.** Open **SQL Editor → New query**, paste in all of [`supabase/schema.sql`](supabase/schema.sql), and click **Run**. It's safe to run again later.
3. **Turn off email confirmation.** Go to **Authentication → Sign In / Providers → Email** and switch off **Confirm email**. New accounts can then sign in straight away, with no emails sent.
4. **Add your keys.** Copy `.env.example` to `.env.local` and fill in your project URL and **publishable** key from **Project Settings → API Keys**.
5. **Restart the dev server** with `npx expo start --clear`. Then tap the cloud icon on the home screen, choose **Create an account**, and use the same email and password on your other devices.

Notes:

- **Before launch**, add your own email sender under **Authentication → Emails → SMTP Settings** (for example Resend). Then turn **Confirm email** back on, so people must own the address they sign up with. You'll also need an email sender to add "Forgot password".
- **First sign-in.** Everything already on the device is uploaded and merged with what's in the account. Records are matched by id, so the sample prompts don't get duplicated.
- **Conflicts.** If the same prompt is edited on two devices, the most recent edit wins (*last write wins*). This is decided per prompt, not per field.
- **Deletes.** A delete is stored as a marker, a *tombstone*, so it reaches your other devices. Deleted rows stay in the database, hidden.
- **Signing out** keeps your prompts on the device. If you then sign in with a *different* account, the device's prompts are uploaded into that account.

### How sync works

| Piece | File |
| --- | --- |
| Tables, last-write-wins trigger, Row Level Security, Realtime | `supabase/schema.sql` |
| Supabase client (session saved in AsyncStorage) | `src/sync/supabase.ts` |
| Upload pending changes, download newer ones, live updates, retry | `src/sync/SyncProvider.tsx` |
| Merge rules and tracking of pending changes | `src/store/merge.ts`, `src/store/PromptStore.tsx` |
| Sign-in and sync status screen | `src/app/account.tsx` |

Each local edit stamps the record with `modifiedAt` and adds it to a list of pending changes. A sync uploads the pending records, then downloads rows whose server timestamp is newer than the last download, and merges them locally. The server ignores any upload that isn't newer than what it already has, so stale writes can't overwrite newer ones and devices can't keep echoing the same change back and forth.

## Project layout

```
src/
  app/                 Screens (Expo Router)
    _layout.tsx        Stack navigator + providers
    index.tsx          Home: search, filter chips, prompt cards, + button
    prompt/[id].tsx    Editor ("new" creates a prompt)
    categories.tsx     Manage categories
  components/          PromptCard, Chip, ActionSheet, Toast
  lib/                 theme, useCopyPrompt
  store/               PromptStore (state + persistence), merge rules, types, seed data
  sync/                Supabase client, sync engine, row mapping
supabase/schema.sql    Database tables, policies and sync trigger
```

All data access goes through `usePromptStore()`. The sync engine (`src/sync/`) sits beside the store, so screens don't know about the network.

## Roadmap: suggested features

### 1. Sync extras

- **Sign in with Apple or Google.** This needs a development build, because it does not work in Expo Go.
- Merge edits **field by field**, so editing the title on one device and the body on another keeps both.
- Periodically clean up old deletion markers (tombstones) on the server.
- Add a "Delete my account and data" option. The App Store requires this once you have sign-in.

### 2. Prompt power features

- **Variable defaults and choices**: e.g. `{{tone|friendly}}` or `{{tone:formal,casual}}` as a dropdown. Also save the last-used values permanently.
- **Version history**: keep earlier versions of a prompt and restore any of them.
- **"Open in…" buttons**: copy and jump straight to the ChatGPT, Claude or Gemini app.
- **Prompt chains**: an ordered set of prompts to run one after another.
- **Markdown preview** of the prompt body.

### 3. Capture and organisation

- **Share sheet extension**: save a prompt from any app (Safari, X, Reddit) using "Share → Prompt Notes".
- **Nested categories / sub-folders**, and drag-to-reorder.
- **Favourites and recently used** sections on home.
- **Grid / masonry view**, like Google Keep.
- **Bulk select**: move, tag or delete many prompts at once.

### 4. Speed

- **Home-screen widget**: copy your pinned prompts without opening the app.
- **iOS Shortcuts / Android quick settings tile**.
- **Keyboard extension**: insert prompts directly into any text field. This is the most powerful option, and the most work.
- **Biometric lock** for private prompts.

### 5. Sharing and community

- **Import and export** as JSON, CSV or Markdown, also useful for backups.
- **Share a prompt** via a link or QR code.
- **Shared team libraries**, which become straightforward once cloud sync exists.
- **A starter pack** of curated prompts on first launch.

### 6. AI assist (optional)

- "Improve this prompt" and "Suggest tags", using the Claude API through your own backend. Never ship an API key inside the app.
- Semantic search ("that prompt about cold emails").

## Next steps to ship

1. Set the app icon and splash screen in `app.json` and `assets/`.
2. `npx eas-cli@latest build --profile preview` builds an installable APK or iOS build.
3. `npx eas-cli@latest submit` submits to the App Store and Play Store.

## Releasing

- **Code-only changes** (screens, logic, styles) can go out over the air, with no reinstall needed:
  ```bash
  npx eas-cli@latest update --channel preview --environment preview --message "What changed"
  ```
- **Native changes** (new native modules or app.json plugins) need a new build. The `fingerprint` runtime policy makes sure old builds never receive an update they can't run.
  ```bash
  npx eas-cli@latest build --platform android --profile preview
  ```
  Then attach the APK to a GitHub release: `gh release create vX.Y.Z promptheart-X.Y.Z.apk`.
