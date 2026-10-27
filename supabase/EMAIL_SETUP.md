# Email setup: password reset and sign-up confirmation

The app's **Forgot password?** and **Confirm your email** screens use a 6-digit code sent by email.
Supabase's built-in email sender only delivers to members of your Supabase team and has a very low
hourly limit, so for real users you need your own email service. Resend's free plan
(3,000 emails a month) is plenty.

## 1. Create a sending domain (Resend)

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add domain** and enter `mail.tosstheworld.org`. Resend recommends a subdomain: it keeps
   the app's emails separate from your own mail, and all its records go on that subdomain.
3. Resend now shows three DNS records. Leave that page open and add them where your DNS is managed
   (see **Adding the records in Netlify DNS** below), then click **Verify DNS Records**.
   Verification usually takes minutes, occasionally a few hours.
4. **API Keys → Create API key** with "Sending access". Copy it; you'll paste it into Supabase once.

### Adding the records in Netlify DNS

The records Resend shows look like this. Copy the exact values from Resend; the MX host and the DKIM
key are specific to your account.

| Type | Name / host | Value | Priority |
|---|---|---|---|
| MX | `send.mail` | `feedback-smtp.<region>.amazonses.com` (from Resend) | 10 |
| TXT | `send.mail` | `v=spf1 include:amazonses.com ~all` | |
| TXT | `resend._domainkey.mail` | the long `p=…` key from Resend | |

> **Leave your existing records alone.** If inigo@tosstheworld.org uses Google Workspace (Gmail), the
> domain already has MX records and an SPF record (`v=spf1 include:_spf.google.com ~all`) on
> `tosstheworld.org` itself. Don't edit or delete them, or your own email stops working. The Resend
> records above are all on the `mail` subdomain, so they don't touch them.

tosstheworld.org's DNS is hosted by **Netlify DNS** (its name servers, `dns1.p05.nsone.net` to
`dns4.p05.nsone.net`, are the ones Netlify assigns). Its mail runs on Google Workspace (the
`aspmx.l.google.com` MX records).

1. Sign in at [app.netlify.com](https://app.netlify.com) and open **Domains** in the team sidebar
   (on older dashboards: **Domains** at the top), then click **tosstheworld.org**.
2. Under **DNS records**, click **Add new record** and add each row of the table above:
   - **Record type:** MX or TXT.
   - **Name:** only the prefix (`send.mail` or `resend._domainkey.mail`). Netlify adds
     `.tosstheworld.org` itself, so don't type the full name.
   - **Value:** paste it from Resend exactly. For the MX record also set **Priority** to 10 (or 20 if 10
     is taken on that name).
3. **Save** each one, then go back to Resend and click **Verify DNS Records**. Netlify's changes are
   usually live within a few minutes.

If Netlify refuses a TXT value for being too long, the DKIM key is over 255 characters: paste it as two
quoted parts on one line, `"first half" "second half"`.

**Worth adding while you're there (optional, for your own Gmail):** the domain has no SPF record on
`tosstheworld.org` itself, so mail from inigo@tosstheworld.org is more likely to land in spam. Add a
TXT record with **Name** `@` and value `v=spf1 include:_spf.google.com ~all`. A domain can only have
one `v=spf1` record on `@`, so skip this if one appears later. Prompt Heart doesn't need it.

## 2. Point Supabase at it

Supabase Dashboard → your project → **Authentication → Emails → SMTP Settings** → turn on
**Enable custom SMTP**, then fill in:

| Field | Value |
|---|---|
| Sender email | `no-reply@mail.tosstheworld.org` (any address on the verified domain) |
| Sender name | `Prompt Heart` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | the Resend API key |

## 3. Put the code in the emails

Still under **Authentication → Emails → Templates**. The app needs `{{ .Token }}` (the code) in two
templates. Branded versions, with the Prompt Heart logo and the code in a large box, are in
[email-templates/](email-templates/). For each one, copy the whole file into **Message body (HTML)**
and set the subject:

| Template | Subject | File |
|---|---|---|
| Confirm signup | `Your Prompt Heart code: {{ .Token }}` | [confirm-signup.html](email-templates/confirm-signup.html) |
| Reset password | `Your Prompt Heart password code: {{ .Token }}` | [reset-password.html](email-templates/reset-password.html) |

The logo is loaded from `https://inigo-code.github.io/prompt-heart-site/email-logo.png`. Some email
apps hide images until you tap "Show images"; the emails still read correctly without them.

The small picture next to a sender in the inbox list isn't part of the email. Gmail only shows one for
Google accounts or for domains set up with BIMI (strict DMARC plus a paid logo certificate), so these
emails show a letter there.

Under **Authentication → Providers → Email** (sometimes listed as **Sign In / Providers**), check that
**Email OTP Length** is 6. The app accepts 6 to 8 digits.

## 4. Turn on email confirmation (optional, recommended for the Play release)

**Authentication → Providers → Email → Confirm email**: on. New accounts then get a code and confirm
it in the app before they're signed in. Existing accounts aren't affected.

## 5. Test it

1. In the app: **Settings → Cloud sync → Forgot password?**, enter your email, and check for the code.
2. Enter the code and a new password; you should be signed in.
3. Optionally create a test account with another address to try the confirmation code.

If an email doesn't arrive, check Resend's **Emails** log and Supabase's **Authentication → Logs**.
Supabase allows one code email per address per minute, which the app's **Resend code** button respects.
