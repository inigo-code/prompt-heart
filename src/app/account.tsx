import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { SignOutSheet } from '@/components/SignOutSheet';
import { useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import { useSync } from '@/sync/SyncProvider';
import type { SyncStatus } from '@/sync/SyncProvider';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

export default function AccountScreen() {
  const theme = useTheme();
  const sync = useSync();

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
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
    </KeyboardAvoidingView>
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
      style={[styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{label}</Text>}
    </Pressable>
  );
}

const MIN_PASSWORD = 6; // Supabase's default minimum

function SignIn({ theme }: { theme: Theme }) {
  const { signIn, signUp } = useSync();
  const [mode, setMode] = useState<'sign-in' | 'sign-up'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const isSignUp = mode === 'sign-up';
  const valid = email.includes('@') && password.length >= MIN_PASSWORD;

  const submit = async () => {
    if (!valid || busy) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      if (!isSignUp) await signIn(email, password);
      else if (!(await signUp(email, password)))
        setNotice('Account created. Check your email to confirm it, then sign in. (To skip this, turn off "Confirm email" in Supabase.)');
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  };

  const inputStyle = [styles.input, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }];

  return (
    <Card theme={theme}>
      <Ionicons name="cloud-upload-outline" size={32} color={theme.accent} />
      <Text style={[styles.h, { color: theme.text }]}>{isSignUp ? 'Create an account' : 'Sync your prompts'}</Text>
      <Text style={[styles.p, { color: theme.textMuted }]}>
        Sign in to back up your prompts and keep them in sync across your devices.
      </Text>

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
        style={inputStyle}
      />
      <TextInput
        value={password}
        onChangeText={setPassword}
        placeholder={isSignUp ? `Password (at least ${MIN_PASSWORD} characters)` : 'Password'}
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={isSignUp ? 'new-password' : 'current-password'}
        textContentType={isSignUp ? 'newPassword' : 'password'}
        onSubmitEditing={submit}
        style={inputStyle}
      />
      <Button theme={theme} label={isSignUp ? 'Create account' : 'Sign in'} busy={busy} disabled={!valid} onPress={submit} />

      {error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
      {notice && <Text style={[styles.p, { color: theme.text }]}>{notice}</Text>}

      <Pressable
        onPress={() => {
          setMode(isSignUp ? 'sign-in' : 'sign-up');
          setError(null);
          setNotice(null);
        }}
      >
        <Text style={[styles.switch, { color: theme.textMuted }]}>
          {isSignUp ? 'Already have an account? ' : 'New here? '}
          <Text style={{ color: theme.accent, fontWeight: '700' }}>{isSignUp ? 'Sign in' : 'Create an account'}</Text>
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
  synced: { icon: 'cloud-done-outline', label: 'Up to date' },
  error: { icon: 'cloud-offline-outline', label: "Couldn't sync, retrying soon" },
};

function SignedIn({ theme }: { theme: Theme }) {
  const { status, email, lastSyncedAt, pendingCount, error, syncNow } = useSync();
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
          <Ionicons name={s.icon} size={22} color={status === 'error' ? theme.danger : theme.accent} />
          <Text style={[styles.statusText, { color: theme.text }]}>{s.label}</Text>
        </View>
        <Text style={[styles.p, { color: theme.textMuted }]}>
          {lastSyncedAt ? `Last synced ${new Date(lastSyncedAt).toLocaleTimeString()}` : 'Not synced yet this session'}
          {pendingCount > 0 ? ` · ${pendingCount} change${pendingCount === 1 ? '' : 's'} waiting` : ''}
        </Text>
        {status === 'error' && error && <Text style={[styles.error, { color: theme.danger }]}>{error}</Text>}
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
  content: { padding: 16, gap: 12 },
  card: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, gap: 12 },
  h: { fontSize: 18, fontWeight: '800' },
  p: { fontSize: 14, lineHeight: 20 },
  label: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: -8 },
  input: { fontSize: 16, height: 48, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14 },
  switch: { fontSize: 14, textAlign: 'center', paddingVertical: 4 },
  btn: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  btnText: { fontSize: 15, fontWeight: '700' },
  error: { fontSize: 13 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  statusText: { fontSize: 16, fontWeight: '700' },
  hint: { fontSize: 12, textAlign: 'center', paddingHorizontal: 12 },
});
