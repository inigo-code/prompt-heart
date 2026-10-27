# Play Console answers

Answers for the forms under Play Console → Policy → App content, based on what the app actually does.
If the app changes (new data, a new SDK, ads), update these and the [privacy policy](https://inigo-code.github.io/prompt-heart-site/privacy.html).

## Before you start

- **New personal developer accounts must run a closed test first.** At least 12 testers have to opt in and stay opted in for 14 days in a row before you can apply for production access. Start the closed test as early as possible.
- **Package name:** `com.inigocode.promptheart`. It's permanent once uploaded. Sideloaded GitHub builds up to 1.4.0 use `com.inigocode.promptnotes`, so the Play version installs as a separate app. Sign in on the Play version to bring your prompts over.
- **Signing:** EAS holds the upload key; turn on Play App Signing (the default) when you create the app.
- **First upload is manual.** Build with `npx eas-cli@latest build --platform android --profile production`, download the `.aab`, and upload it in Play Console. After that, `eas submit` can upload builds for you once a Google service account is set up.

## Privacy policy

https://inigo-code.github.io/prompt-heart-site/privacy.html

## App access

Choose **All or some functionality is restricted** and add instructions:

> The app works fully without an account. An optional account (Settings → Cloud sync) enables sync. Reviewers can sign in with the test account below, or create one in the app with any email and password.

Then add a test account's email and password. Create one in the app with an address you control, and keep it for reviews. Don't use your personal account.

## Ads

**No**, the app doesn't contain ads.

## Content rating

Category: **Utility, Productivity, Communication, or Other**.

- Violence, sexual content, profanity, drugs, gambling: **No**
- Can users interact or exchange content with each other? **No** (each account only sees its own data)
- Does the app share the user's location with others? **No**
- Can users buy digital goods? **No**
- Is it a web browser or search engine? **No**

Expected rating: Everyone / PEGI 3.

## Target audience and content

- Age groups: **13–15, 16–17 and 18+** (don't select any group under 13, which would bring in the Families policy)
- Could the app unintentionally appeal to children? **No**

## News app / Government app / Financial features / Health

**No** to all.

## Data safety

**Does your app collect or share any of the required user data types?** Yes.
**Is all of the user data collected by your app encrypted in transit?** Yes.
**Do you provide a way for users to request that their data is deleted?** Yes. In the app (Settings → Profile → Delete account), and at https://inigo-code.github.io/prompt-heart-site/delete-account.html

**Account creation:** "My app allows users to create an account": username and password (email + password). Account deletion URL: https://inigo-code.github.io/prompt-heart-site/delete-account.html

Data types. For each one: **Collected: yes. Shared: no.** (Supabase and Expo are service providers processing data on your behalf, which Google doesn't count as sharing.) **Processed ephemerally: no.**

| Data type (Play's category) | Required or optional | Purposes |
|---|---|---|
| Personal info → Email address | Optional (only with an account) | App functionality, Account management |
| Personal info → Name | Optional | App functionality, Account management |
| Personal info → User IDs | Optional (only with an account) | App functionality, Account management |
| Photos and videos → Photos | Optional | App functionality |
| App activity → Other user-generated content (prompts, categories, tags) | Optional (only with an account) | App functionality |
| Device or other IDs (random install ID sent to Expo's update service) | Required | App functionality |

Everything else (location, contacts, messages, financial, health, audio, files, calendar, web history, app interactions, crash logs, diagnostics, other device info): **not collected**.

Why "Device or other IDs" is listed: the update service (Expo EAS Update) receives a random installation ID with each update check. It isn't used for tracking, but listing it is the safe reading of Google's rules.

## Permissions declarations

None needed. The app uses Internet, network state, vibrate and biometric (USE_BIOMETRIC, for the optional App lock), and Android's photo picker (which doesn't need a permission). Biometric data isn't collected: Android checks the fingerprint, face or PIN itself and only tells the app whether it passed, so nothing goes in the Data safety form for it. It declares the specific AI apps it can open with `<queries>`, not the broad `QUERY_ALL_PACKAGES`.
