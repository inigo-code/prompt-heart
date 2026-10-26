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
   (see **Adding the records with Google-managed DNS** below), then click **Verify DNS Records**.
   Verification usually takes minutes, occasionally a few hours.
4. **API Keys → Create API key** with "Sending access". Copy it; you'll paste it into Supabase once.

### Adding the records with Google-managed DNS

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

**If you bought the domain through Google Domains or Google Workspace** (most likely): since Google
Domains moved to Squarespace in 2023, the DNS is managed at Squarespace Domains.

1. Go to [domains.squarespace.com](https://domains.squarespace.com) and sign in with **Continue with
   Google**, using the Google account that owns the domain. (In the Google Workspace Admin console,
   **Account → Domains → Manage domains** links there too.)
2. Open **tosstheworld.org → DNS → DNS Settings**, and scroll to **Custom records**.
3. **Add record** three times, once for each row above. In **Host** enter just the part shown
   (`send.mail`, `resend._domainkey.mail`), not the full domain: Squarespace adds
   `.tosstheworld.org` itself. Set the MX **Priority** to 10 (use 20 if 10 is taken).
4. Save, then go back to Resend and click **Verify DNS Records**.

**If the domain's DNS is in Google Cloud DNS** (console.cloud.google.com → **Network services →
Cloud DNS**):

1. Open the zone for `tosstheworld.org` and **Add standard** record set three times.
2. In **DNS name** enter the part before the domain (`send.mail`, `resend._domainkey.mail`); the
   console fills in `.tosstheworld.org.`.
3. For the MX record, the data is `10 feedback-smtp.<region>.amazonses.com.` (priority, space, host,
   trailing dot). For the TXT records, paste the value in double quotes. If the DKIM key is longer than
   255 characters, split it into several quoted strings on one line.

**Which one is tosstheworld.org?** Squarespace. Its name servers are `dns1.p05.nsone.net` to
`dns4.p05.nsone.net`, which belong to Squarespace Domains (checked 27 Oct 2026). Its mail runs on
Google Workspace (the `aspmx.l.google.com` MX records). To check another domain, look up its name
servers at [dns.google](https://dns.google/query?name=tosstheworld.org&rr_type=NS):
`*.nsone.net` means Squarespace; `ns-cloud-*.googledomains.com` means Google Cloud DNS.

**Worth adding while you're there (optional, for your own Gmail):** the domain has no SPF record on
`tosstheworld.org` itself, so mail from inigo@tosstheworld.org is more likely to land in spam. Add a
TXT record with Host `@` and value `v=spf1 include:_spf.google.com ~all`. A domain can only have one
`v=spf1` record on `@`, so skip this if one appears later. Prompt Heart doesn't need it.

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
templates. Paste these in:

**Confirm signup**: subject `Your Prompt Heart code: {{ .Token }}`

```html
<h2>Welcome to Prompt Heart</h2>
<p>Enter this code in the app to finish creating your account:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>It expires in 1 hour. If you didn't sign up, you can ignore this email.</p>
```

**Reset password**: subject `Your Prompt Heart password code: {{ .Token }}`

```html
<h2>Reset your Prompt Heart password</h2>
<p>Enter this code in the app, then choose a new password:</p>
<p style="font-size:28px;font-weight:700;letter-spacing:6px">{{ .Token }}</p>
<p>It expires in 1 hour. If you didn't ask for this, you can ignore this email; your password stays the same.</p>
```

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
