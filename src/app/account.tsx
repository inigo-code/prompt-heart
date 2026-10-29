import Ionicons from '@expo/vector-icons/Ionicons';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { KeyboardSafe } from '@/components/KeyboardSafe';
import { SignOutSheet } from '@/components/SignOutSheet';
import { font, useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import { SYNC_AMBER } from '@/sync/statusColors';
import { useSync } from '@/sync/SyncProvider';
import type { SyncStatus } from '@/sync/SyncProvider';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

export default function AccountScreen() {
  const theme = useTheme();
  const sync = useSync();

  return (
    <KeyboardSafe style={{ backgroundColor: theme.bg }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {sync.status === 'unconfigured' ? (
          <Card theme={theme}>
            <Text style={[styles.h, { color: theme.text }]}>Cloud sync isn&apos;t set up</Text>
            <Text style={[styles.p, { color: theme.textMuted }]}>
              Add your Supabase project URL and publishable key to app/.env.local, then restart the app. The README
              explains the steps. Until then, your prompts are saved on this device only.
            </Text>
          </Card>
        ) : sync.status === 'signed-out' ? (
          <SignIn theme={theme} />
        ) : (
          <SignedIn theme={theme} />
        )}
      </ScrollView>
    </KeyboardSafe>
  );
}

function Card({ theme, children }: { theme: Theme; children: React.ReactNode }) {
  return <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>{children}</View>;
}

function Button({ theme, label, onPress, busy, disabled, kind = 'primary' }: {
  theme: Theme;
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  kind?: 'primary' | 'secondary' | 'danger';
}) {
  const bg = kind === 'primary' ? theme.accent : theme.chip;
  const fg = kind === 'primary' ? theme.accentText : kind === 'danger' ? theme.danger : theme.text;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: disabled || busy, busy }}
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const MIN_PASSWORD = 6; // Supabase's default minimum
const RESEND_WAIT_S = 60; // Supabase allows one code email per address per minute

type Mode = 'sign-in' | 'sign-up' | 'confirm' | 'forgot' | 'reset';

const TITLES: Record<Mode, string> = {
  'sign-in': 'Sync your prompts',
  'sign-up': 'Create an account',
  confirm: 'Confirm your email',
  forgot: 'Reset your password',
  reset: 'Choose a new password',
};

/** Friendlier wording for the auth errors people actually hit. */
function authError(e: unknown) {
  const text = errorText(e);
  if (/rate limit|too many|for security purposes/i.test(text)) return 'Too many emails in a short time. Wait a minute and try again.';
  if (/expired|invalid.*(otp|token)|token.*(invalid|expired)/i.test(text)) return "That code didn't work or has expired. Check it, or send a new one.";
  if (/invalid login credentials/i.test(text)) return 'Wrong email or password.';
  if (/email not confirmed/i.test(text)) return 'Confirm your email first: enter the code we sent you.';
  return text;
}

function SignIn({ theme }: { theme: Theme }) {
  const { signIn, signUp, confirmSignUp, resendSignUpCode, sendPasswordReset, resetPassword } = useSync();
  const [mode, setMode] = useState<Mode>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [resendAt, setResendAt] = useState(0);
  const resendIn = useSecondsUntil(resendAt > 0 ? resendAt : null) ?? 0;

  const go = (next: Mode, message: string | null = null) => {
    setMode(next);
    setError(null);
    setNotice(message);
    if (next === 'confirm' || next === 'reset') setCode('');
  };

  const emailOk = email.includes('@');
  const codeOk = /^\d{6,8}$/.test(code.trim());
  const valid =
    mode === 'sign-in' || mode === 'sign-up'
      ? emailOk && password.length >= MIN_PASSWORD
      : mode === 'forgot'
        ? emailOk
        : mode === 'confirm'
          ? codeOk
          : codeOk && password.length >= MIN_PASSWORD;

  const run = async (fn: () => Promise<void>) => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await fn();
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const submit = () =>
    run(async () => {
      if (mode === 'sign-in') await signIn(email, password);
      else if (mode === 'sign-up') {
        if (!(await signUp(email, password))) {
          setResendAt(Date.now() + RESEND_WAIT_S * 1000);
          go('confirm', `We emailed a 6-digit code to ${email.trim()}. Enter it to finish creating your account.`);
        }
      } else if (mode === 'confirm') await confirmSignUp(email, code);
      else if (mode === 'forgot') {
        await sendPasswordReset(email);
        setResendAt(Date.now() + RESEND_WAIT_S * 1000);
        setPassword('');
        go('reset', `If an account exists for ${email.trim()}, we've emailed it a 6-digit code.`);
      } else await resetPassword(email, code, password);
    });

  const resend = async () => {
    if (busy || resendIn > 0) return;
    setBusy(true);
    setError(null);
    try {
      if (mode === 'confirm') await resendSignUpCode(email);
      else await sendPasswordReset(email);
      setResendAt(Date.now() + RESEND_WAIT_S * 1000);
      setNotice(`New code sent to ${email.trim()}.`);
    } catch (e) {
      setError(authError(e));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }];
  const needsEmail = mode === 'sign-in' || mode === 'sign-up' || mode === 'forgot';
  const needsPassword = mode === 'sign-in' || mode === 'sign-up' || mode === 'reset';
  const needsCode = mode === 'confirm' || mode === 'reset';
  const newPassword = mode === 'sign-up' || mode === 'reset';
  const label: Record<Mode, string> = {
    'sign-in': 'Sign in',
    'sign-up': 'Create account',
    confirm: 'Confirm email',
    forgot: 'Send code',
    reset: 'Set new password',
  };

  return (
    <Card theme={theme}>
      <Ionicons
        name={mode === 'forgot' || mode === 'reset' ? 'key-outline' : mode === 'confirm' ? 'mail-unread-outline' : 'cloud-upload-outline'}
        size={32}
        color={theme.accent}
      />
      <Text style={[styles.h, { color: theme.text }]}>{TITLES[mode]}</Text>
      <Text style={[styles.p, { color: theme.textMuted }]}>
        {mode === 'forgot'
          ? "Enter your account's email and we'll send you a code to choose a new password."
          : mode === 'confirm' || mode === 'reset'
            ? `Enter the code from the email we sent to ${email.trim()}.`
            : 'Sign in to back up your prompts and keep them in sync across your devices.'}
      </Text>

      {needsEmail && (
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={theme.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          autoCorrect={false}
          onSubmitEditing={mode === 'forgot' ? submit : undefined}
          style={inputStyle}
        />
      )}
      {needsCode && (
        <TextInput
          value={code}
          onChangeText={(t) => setCode(t.replace(/\D/g, '').slice(0, 8))}
          placeholder="6-digit code"
          placeholderTextColor={theme.textMuted}
          keyboardType="number-pad"
          autoComplete="one-time-code"
          textContentType="oneTimeCode"
          accessibilityLabel="Code from the email"
          onSubmitEditing={mode === 'confirm' ? submit : undefined}
          style={[inputStyle, code ? styles.code : styles.codeEmpty]}
        />
      )}
      {needsPassword && (
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder={newPassword ? `${mode === 'reset' ? 'New password' : 'Password'} (at least ${MIN_PASSWORD} characters)` : 'Password'}
          placeholderTextColor={theme.textMuted}
          secureTextEntry
          autoCapitalize="none"
          autoComplete={newPassword ? 'new-password' : 'current-password'}
          textContentType={newPassword ? 'newPassword' : 'password'}
          onSubmitEditing={submit}
          style={inputStyle}
        />
      )}
      <Button theme={theme} label={label[mode]} busy={busy} disabled={!valid} onPress={submit} />

      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
      {notice && <Text style={[styles.p, { color: theme.text }]}>{notice}</Text>}

      {mode === 'sign-in' && (
        <Pressable onPress={() => go('forgot')} accessibilityRole="button">
          <Text style={[styles.switch, { color: theme.accent, fontWeight: '700' }]}>Forgot password?</Text>
        </Pressable>
      )}
      {needsCode && (
        <Pressable onPress={resend} disabled={resendIn > 0 || busy} accessibilityRole="button">
          <Text style={[styles.switch, { color: resendIn > 0 ? theme.textMuted : theme.accent, fontWeight: '700' }]}>
            {resendIn > 0 ? `Resend code in ${resendIn} s` : 'Resend code'}
          </Text>
        </Pressable>
      )}
      <Pressable
        onPress={() => go(mode === 'sign-in' ? 'sign-up' : 'sign-in')}
        accessibilityRole="button"
      >
        <Text style={[styles.switch, { color: theme.textMuted }]}>
          {mode === 'sign-in' ? 'New here? ' : mode === 'sign-up' ? 'Already have an account? ' : ''}
          <Text style={{ color: theme.accent, fontWeight: '700' }}>{mode === 'sign-in' ? 'Create an account' : mode === 'sign-up' ? 'Sign in' : 'Back to sign in'}</Text>
        </Text>
      </Pressable>
    </Card>
  );
}

const STATUS: Record<SyncStatus, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  unconfigured: { icon: 'cloud-offline-outline', label: 'Not set up' },
  'signed-out': { icon: 'cloud-offline-outline', label: 'Signed out' },
  idle: { icon: 'cloud-outline', label: 'Waiting to sync' },
  syncing: { icon: 'sync', label: 'Syncing…' },
  waiting: { icon: 'time-outline', label: 'Changes waiting to sync' },
  synced: { icon: 'cloud-done-outline', label: 'Up to date' },
  error: { icon: 'cloud-offline-outline', label: "Couldn't sync, retrying soon" },
};

/** Whole seconds until `at`, ticking every second; null when nothing is planned. */
function useSecondsUntil(at: number | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (at === null) return;
    const tick = () => setNow(Date.now());
    const first = setTimeout(tick, 0); // catch up straight away when a new time is planned
    const every = setInterval(tick, 1000);
    return () => {
      clearTimeout(first);
      clearInterval(every);
    };
  }, [at]);
  return at === null ? null : Math.max(0, Math.ceil((at - now) / 1000));
}

function SignedIn({ theme }: { theme: Theme }) {
  const { status, email, lastSyncedAt, unsentCount, nextSyncAt, error, syncNow, imageUsage } = useSync();
  const secondsLeft = useSecondsUntil(status === 'waiting' ? nextSyncAt : null);
  const [busy, setBusy] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const s = STATUS[status];

  return (
    <>
      <Card theme={theme}>
        <Text style={[styles.label, { color: theme.textMuted }]}>Signed in as</Text>
        <Text style={[styles.h, { color: theme.text }]}>{email}</Text>
      </Card>

      <Card theme={theme}>
        <View style={styles.statusRow}>
          <Ionicons name={s.icon} size={22} color={status === 'error' ? theme.danger : status === 'waiting' ? SYNC_AMBER : theme.accent} />
          <Text style={[styles.statusText, { color: theme.text }]}>{s.label}</Text>
        </View>
        <Text style={[styles.p, { color: theme.textMuted }]}>
          {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Not synced yet this session'}
          {unsentCount > 0 ? ` · ${unsentCount} change${unsentCount === 1 ? '' : 's'} waiting` : ''}
        </Text>
        {status === 'waiting' && (
          <Text style={[styles.p, styles.countdown, { color: theme.text }]}>{secondsLeft ? `Syncs in ${secondsLeft} s` : 'Syncing soon'}</Text>
        )}
        {status === 'waiting' && (
          <Text style={[styles.p, { color: theme.textMuted }]}>
            To save data, the app syncs at most once a minute. Tap Sync now to send changes straight away.
          </Text>
        )}
        {status === 'error' && error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
        {imageUsage && (
          <Text style={[styles.p, { color: imageUsage.waiting ? theme.text : theme.textMuted }]}>
            Images in cloud: {imageUsage.used} of {imageUsage.limit}
            {imageUsage.waiting
              ? `. ${imageUsage.waiting} more ${imageUsage.waiting === 1 ? 'is' : 'are'} saved on this phone only; remove some cloud images to sync them.`
              : ''}
            {imageUsage.failed
              ? `. ${imageUsage.failed} ${imageUsage.failed === 1 ? 'image' : 'images'} couldn’t upload and will try again next sync.`
              : ''}
          </Text>
        )}
        <Button theme={theme} kind="secondary" label="Sync now" busy={status === 'syncing'} onPress={() => void syncNow()} />
      </Card>

      <Button
        theme={theme}
        kind="danger"
        label="Sign out"
        busy={busy}
        onPress={() => setSignOutOpen(true)}
      />
      <Text style={[styles.hint, { color: theme.textMuted }]}>
        When you sign out you can remove your data from this phone or keep your prompts here. Your account keeps everything either way.
      </Text>
      <SignOutSheet visible={signOutOpen} onClose={() => setSignOutOpen(false)} onBusy={setBusy} />
    </>
  );
}

const styles = StyleSheet.create({
  countdown: { fontWeight: '700' },
  code: { fontSize: font.title, letterSpacing: 6, textAlign: 'center', fontWeight: '700' },
  codeEmpty: { textAlign: 'center' },
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  h: { fontSize: font.headline, fontWeight: '800' },
  p: { fontSize: font.body, lineHeight: 20 },
  label: { fontSize: font.caption, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -8 },
  input: { fontSize: font.headline, height: 48, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 16 },
  switch: { fontSize: font.body, textAlign: 'center', paddingVertical: 4 },
  btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: font.body, fontWeight: '700' },
  error: { fontSize: font.footnote },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: font.headline, fontWeight: '700' },
  hint: { fontSize: font.caption, textAlign: 'center', paddingHorizontal: 12 },
});
