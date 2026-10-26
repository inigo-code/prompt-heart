# Prompt Notes

A notes-style mobile app for saving AI prompts and copying them with one tap. Built with Expo (SDK 58), Expo Router and TypeScript. Runs on iOS, Android and web.

## Run it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `w` for the web version, `a` for an Android emulator.

## What's in v1

- **Home screen**: note cards with a **copy button on every card**. Copying gives haptic feedback and shows a "Copied" toast.
- **Template variables**: write `{{code}}` or `{{target audience}}` in a prompt. When you copy it, a sheet asks for each value and shows a live preview, then copies the filled-in text. "Copy as-is" copies the raw template instead. Any blanks you leave stay as `{{name}}`. The app remembers the last values you used for each prompt until it's closed.
- **Notes-style editor**: title and body, autosaves as you type. A new note that's left empty is discarded. It also lists the variables it found in the prompt.
- **Categories**: each prompt belongs to one category, which has a colour. You can create, rename, recolour and delete them. Deleting a category keeps its prompts.
- **Tags**: group prompts across categories (`#email`, `#review`). Type a comma or space to finish a tag.
- **Filter chips**: All, Pinned, each category and each tag.
- **Search**: across titles, bodies and `#tags`.
- **Pin to top**, **duplicate** and **delete**, from a long-press on a card or the editor's ⋯ menu.
- **Sort**: recent or most-copied.
- **Copy stats**: counts how many times each prompt was copied.
- **Light and dark mode** that follow the system setting.
- **Offline-first**: data is stored on the device (AsyncStorage).
- **Cloud sync (Supabase)**: sign in with email and password to keep prompts in sync across devices. Changes upload about 1.5 s after you edit and show up live on your other devices. The app works fully offline and catches up when you're back online. See [Set up cloud sync](#set-up-cloud-sync).

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
