// Applies the branded "Confirm signup" and "Reset password" email templates (email-templates/) to the
// hosted Supabase project through the Management API. Changes only those two templates and subjects.
//
// Needs a personal access token from https://supabase.com/dashboard/account/tokens in the
// SUPABASE_ACCESS_TOKEN environment variable. Run from the app folder:
//   PowerShell:  $env:SUPABASE_ACCESS_TOKEN = "sbp_..."; node supabase/apply-email-templates.mjs
// Revoke the token on that page afterwards if you don't need it.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const PROJECT_REF = 'qhwavloktmgbywcjcxpr';
const here = path.dirname(fileURLToPath(import.meta.url));
const read = (name) =>
  fs
    .readFileSync(path.join(here, 'email-templates', name), 'utf8')
    .replace(/^<!--[\s\S]*?-->\s*/, '') // drop the instructions comment at the top
    .trim();

const changes = {
  mailer_subjects_confirmation: 'Your Prompt Heart code: {{ .Token }}',
  mailer_templates_confirmation_content: read('confirm-signup.html'),
  mailer_subjects_recovery: 'Your Prompt Heart password code: {{ .Token }}',
  mailer_templates_recovery_content: read('reset-password.html'),
};
for (const [key, value] of Object.entries(changes)) {
  if (!value.includes('{{ .Token }}')) throw new Error(`${key} is missing {{ .Token }}`);
}

if (process.argv.includes('--dry-run')) {
  for (const [key, value] of Object.entries(changes)) console.log(`${key}: ${value.length} characters`);
  console.log('Dry run: nothing was sent.');
  process.exit(0);
}

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token) {
  console.error('Set SUPABASE_ACCESS_TOKEN first (see the top of this file).');
  process.exit(1);
}

const url = `https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };

const res = await fetch(url, { method: 'PATCH', headers, body: JSON.stringify(changes) });
if (!res.ok) {
  console.error(`Supabase refused the update (HTTP ${res.status}): ${await res.text()}`);
  process.exit(1);
}

// Read the settings back to confirm they stuck.
const now = await (await fetch(url, { headers })).json();
const ok = Object.entries(changes).every(([key, value]) => now[key] === value);
console.log(ok ? 'Done: both email templates and subjects are updated.' : 'Updated, but the read-back differs; check the dashboard.');
