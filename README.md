<p align="center">
  <img src="docs/hero.png" alt="Prompt Heart: your AI prompts, one tap away" width="100%" />
</p>

<p align="center">
  <a href="../../releases/latest"><img alt="Download APK" src="https://img.shields.io/badge/Download-Android%20APK-F2B84B?style=for-the-badge&logo=android&logoColor=white&labelColor=1C1A17"></a>
  <a href="https://inigo-code.github.io/prompt-heart-site/fdroid.html"><img alt="Get it with F-Droid" src="https://img.shields.io/badge/Get%20it%20with-F--Droid-1976D2?style=for-the-badge&logo=f-droid&logoColor=white&labelColor=1C1A17"></a>
  <img alt="Version" src="https://img.shields.io/badge/version-1.4.0-F2B84B?style=for-the-badge&labelColor=1C1A17">
  <img alt="Expo SDK 58" src="https://img.shields.io/badge/Expo-SDK%2058-000020?style=for-the-badge&logo=expo&logoColor=white">
  <img alt="React Native" src="https://img.shields.io/badge/React%20Native-0.88-61DAFB?style=for-the-badge&logo=react&logoColor=black">
  <img alt="Supabase" src="https://img.shields.io/badge/Sync-Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white">
</p>

<h3 align="center">Stop losing your best prompts.</h3>

<p align="center">
<b>Prompt Heart</b> is a notes-style home for the prompts that actually work.<br/>
Save them in seconds, fill in the blanks when you need them, and copy or launch them in<br/>
<b>ChatGPT, Claude, Gemini, Grok, Perplexity</b> and more, with a single tap.
</p>

<br/>

## ✨ Highlights

<table>
  <tr>
    <td width="33%" valign="top">
      <h4>⚡ One-tap copy</h4>
      Every prompt has its own copy button. Copying takes the text only; reference images never come along.
    </td>
    <td width="33%" valign="top">
      <h4>🧩 Smart templates</h4>
      Write <code>{{topic}}</code> and fill it in when you copy, with a live preview. <code>{{tone|friendly}}</code> sets a default.
    </td>
    <td width="33%" valign="top">
      <h4>🚀 Launch in your AI app</h4>
      Every AI app gets its own folder. Tap <b>Open in Claude</b>: your prompt is copied and the Claude app opens, ready to paste.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>🗂️ Organise anything</h4>
      Categories, #tags, pins, search, grid or list, a Recently copied view, and <b>bulk select</b> to move, tag or delete many at once.
    </td>
    <td valign="top">
      <h4>🕘 Version history</h4>
      Every editing session is saved. Preview, copy or restore any earlier version, so a good prompt is never lost.
    </td>
    <td valign="top">
      <h4>☁️ Sync &amp; backup</h4>
      Cloud sync across devices that works offline and stays light on data, plus JSON and Markdown export.
    </td>
  </tr>
  <tr>
    <td valign="top">
      <h4>📥 Save from any app</h4>
      Share text, links or screenshots to Prompt Heart from Chrome, ChatGPT or Photos.
    </td>
    <td valign="top">
      <h4>🎨 Made to feel yours</h4>
      Light and dark themes, five accent colours, and a smiling heart that greets you by name, morning to midnight.
    </td>
    <td valign="top">
      <h4>🔔 Always up to date</h4>
      Improvements arrive automatically, and a friendly pop-up tells you when an update is ready.
    </td>
  </tr>
  <tr>
    <td colspan="3" valign="top">
      <h4>📚 Prompt library</h4>
      51 ready-made prompts for image generation, productivity, business, marketing, writing, coding, learning and careers. Copy one as it is, or save it to your prompts and make it your own.
    </td>
  </tr>
</table>

<br/>

<p align="center">
  <img src="docs/gallery.png" alt="Screens: home, templates, launch in AI app, bulk select, version history, AI apps" width="100%" />
</p>

## ⬇️ Install

### With F-Droid (recommended, updates automatically)

1. Install [F-Droid](https://f-droid.org) (or Neo Store / Droid-ify) on your phone.
2. Open the **[Prompt Heart F-Droid page](https://inigo-code.github.io/prompt-heart-site/fdroid.html)** on your phone and tap **Add to F-Droid**, or scan its QR code from another screen.
3. Search for **Prompt Heart** in F-Droid and install it. New versions show up in F-Droid like any other app.

<details>
<summary>Add the repository by hand</summary>

In F-Droid, go to **Settings → Repositories → +** and enter:

- **Address:** `https://inigo-code.github.io/prompt-heart-site/fdroid/repo`
- **Fingerprint (SHA-256):** `7D5DC9786FCF003B861F79C3B3CA0492BEF9BC83BA05A3A8FDB3C972E5105A75`

F-Droid checks the repository against this fingerprint, so you only ever get APKs signed by Prompt Heart.
</details>

> Prompt Heart is in its own F-Droid repository, not the main F-Droid one, so it only shows up in F-Droid's search after you add the repository.

### Direct download

1. Open the **[latest release](../../releases/latest)** on your Android phone and download `promptheart-x.y.z.apk`.
2. Open the file. If Android asks, allow your browser to install apps. If Play Protect warns, choose **Install anyway**.
3. That's it. New versions install over the old one and keep your prompts.

Both ways install the same signed APK, so you can switch between them without losing anything. Smaller updates also arrive by themselves, with a pop-up when they're ready.

> Prompt Heart asks for just two Android permissions: **Internet**, for sync and updates, and **Vibrate**, for copy feedback. Photos are picked with Android's own photo picker, so the app never needs access to your gallery.

## 🔒 Your data

- **Offline first.** Prompts, images and history live on your phone and work without a connection.
- **Private sync.** With an account, your prompts, images, name and photo sync through Supabase. Row Level Security means every account can only read its own rows, and images sit in a private bucket under your own folder.
- **Version history stays on your device**, so sync stays fast and light.
- **Light on the cloud.** Up to 20 images per account sync; any extras stay on your phone. Images are resized to about 100 KB.
- **You're in control.** Change your email or password, export everything, or delete your account and all of its cloud data from **Profile**.

Read the full [privacy policy](https://inigo-code.github.io/prompt-heart-site/privacy.html), or see [how to delete your account](https://inigo-code.github.io/prompt-heart-site/delete-account.html).

## 🗺️ Roadmap

- [x] One-tap copy, templates, categories, tags, search
- [x] Cloud sync, image attachments, save from other apps
- [x] AI app folders and launching, bulk select, version history, update pop-up
- [ ] Google Play release (sign-in emails, password reset, store listing)
- [ ] Home-screen widget for pinned prompts
- [ ] Shared libraries for teams

<details>
<summary><b>🛠️ For developers</b></summary>

### Tech

[Expo](https://expo.dev) SDK 58 · React Native 0.88 · Expo Router · TypeScript · [Supabase](https://supabase.com) (Auth, Postgres, Realtime, Storage) · EAS Build and EAS Update

```
src/
  app/          Screens: home, editor, history, categories, settings, profile, account, about, trash, share
  components/   Cards, chips, sheets, avatar, brand title, update pop-up, settings building blocks
  lib/          Theme, templates, AI apps, images, backups, greetings
  profile/      Name and photo, synced to the account
  settings/     App settings (theme, accent, layout, AI apps…)
  store/        Prompts and categories, merge rules, version history, seed data
  sync/         Supabase client, sync engine, row mapping
supabase/       Database schema, policies, storage bucket, account deletion
docs/           README artwork and screenshots
```

### Run it

```bash
npm install
npx expo start        # press w for web; scan the QR code for Expo Go
npx tsc --noEmit      # typecheck
npx expo lint         # lint
```

Saving from other apps and image attachments need a real build, because Expo Go and the web version don't include those native parts.

### Cloud sync setup

1. Create a project at [supabase.com](https://supabase.com). The free tier is fine.
2. In the **SQL Editor**, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/delete_my_account.sql`](supabase/delete_my_account.sql). Both are safe to re-run.
3. Under **Authentication → Sign In / Providers → Email**, turn off **Confirm email** for testing.
4. Copy `.env.example` to `.env.local` and add your project URL and **publishable** key. For cloud builds, set the same values as EAS environment variables.

**How sync works:** each change gets a timestamp and is queued. A sync uploads the queue (images first), then downloads anything newer on the server. If two devices edit the same prompt, the newest edit wins. Deletes are kept as markers so every device hears about them.

### Releasing

```bash
# Code-only changes: over the air to installed apps
npx eas-cli@latest update --channel preview --environment preview --message "What changed"

# Native changes (modules, permissions, app name or icon): new build, then a GitHub release
npx eas-cli@latest build --platform android --profile preview
gh release create vX.Y.Z promptheart-X.Y.Z.apk
```

The runtime version uses the `fingerprint` policy, so an update only reaches builds whose native code it matches.

</details>

## 💛 Credits

Made with care by **[Inigo](https://github.com/inigo-code)**. The title font is [Fredoka](https://fonts.google.com/specimen/Fredoka), and icons are from [Ionicons](https://ionic.io/ionicons).

## ©️ Copyright

Copyright © 2026 Inigo. All rights reserved.

The source is public so you can see how Prompt Heart works and check what it does with your data. It is not open source: you may not copy, modify or redistribute the code, or publish apps built from it, without written permission. To ask, email inigo@tosstheworld.org.
