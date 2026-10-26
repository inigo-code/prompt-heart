# Email setup: password reset and sign-up confirmation

The app's **Forgot password?** and **Confirm your email** screens use a 6-digit code sent by email.
Supabase's built-in email sender only delivers to members of your Supabase team and has a very low
hourly limit, so for real users you need your own email service. Resend's free plan
(3,000 emails a month) is plenty.

## 1. Create a sending domain (Resend)

1. Sign up at [resend.com](https://resend.com).
2. **Domains → Add domain**, for example `tosstheworld.org` (or a subdomain like `mail.tosstheworld.org`).
3. Add the DNS records Resend shows (SPF, DKIM) at your domain's DNS provider, then wait for **Verified**.
4. **API Keys → Create API key** with "Sending access". Copy it; you'll paste it into Supabase once.

## 2. Point Supabase at it

Supabase Dashboard → your project → **Authentication → Emails → SMTP Settings** → turn on
**Enable custom SMTP**, then fill in:

| Field | Value |
|---|---|
| Sender email | `no-reply@tosstheworld.org` (any address on the verified domain) |
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
