import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ActionSheet } from '@/components/ActionSheet';
import { Avatar } from '@/components/Avatar';
import { InsightsSection } from '@/components/profile/InsightsSection';
import { SignOutSheet } from '@/components/SignOutSheet';
import { Row, Section } from '@/components/SettingsUI';
import { useToast } from '@/components/Toast';
import { greeting, useHour } from '@/lib/greeting';
import { deleteLocalImage } from '@/lib/images';
import type { Theme } from '@/lib/theme';
import { font, useTheme } from '@/lib/theme';
import { useActivity } from '@/profile/ActivityProvider';
import { BIO_MAX, useProfile } from '@/profile/ProfileProvider';
import { useHistory } from '@/store/HistoryProvider';
import { usePromptStore } from '@/store/PromptStore';
import { useSync } from '@/sync/SyncProvider';

const errorText = (e: unknown) => (e instanceof Error ? e.message : String((e as { message?: string })?.message ?? e));

const SYNC_LABEL = {
  unconfigured: 'Not set up',
  'signed-out': 'Signed out',
  idle: 'On',
  syncing: 'Syncing…',
  waiting: 'Changes waiting',
  synced: 'Up to date',
  error: 'Needs attention',
} as const;

export default function ProfileScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const hour = useHour();
  const profile = useProfile();
  const sync = useSync();
  const store = usePromptStore();
  const signedIn = !!sync.user;

  const activity = useActivity();
  const history = useHistory();
  const [name, setName] = useState(profile.name);
  const [bio, setBio] = useState(profile.bio);
  const [synced, setSynced] = useState({ name: profile.name, bio: profile.bio });
  // Pick up a name or bio that arrives from the account (another device) while this screen is open.
  if (profile.name !== synced.name || profile.bio !== synced.bio) {
    if (profile.name !== synced.name) setName(profile.name);
    if (profile.bio !== synced.bio) setBio(profile.bio);
    setSynced({ name: profile.name, bio: profile.bio });
  }
  const aboutChanged = name.trim() !== profile.name || bio.trim() !== profile.bio;

  const [editing, setEditing] = useState<'email' | 'password' | null>(null);
  const [photoMenu, setPhotoMenu] = useState(false);
  const [deleteMenu, setDeleteMenu] = useState(false);
  const [signOutOpen, setSignOutOpen] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);

  const run = async (key: string, fn: () => Promise<string | void>) => {
    setBusy(key);
    try {
      const msg = await fn();
      if (msg) toast(msg);
    } catch (e) {
      toast(errorText(e));
    } finally {
      setBusy(null);
    }
  };

  const saveAbout = () => {
    if (!aboutChanged) return;
    run('name', async () => {
      if (name.trim() !== profile.name) await profile.setName(name);
      if (bio.trim() !== profile.bio) await profile.setBio(bio);
      return 'Saved';
    });
  };

  const deleteAccount = (eraseDevice: boolean) =>
    run('delete', async () => {
      await sync.deleteAccount();
      profile.clear();
      if (eraseDevice) {
        store.eraseAll().forEach(deleteLocalImage);
        history.clearAll();
        activity.clear();
      }
      router.replace('/');
      return eraseDevice ? 'Account deleted and this device erased' : 'Account deleted. Your prompts are still on this device.';
    });

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.bg }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.hero}>
          <Pressable
            onPress={() => (profile.canChangePhoto ? setPhotoMenu(true) : toast('Photos can be changed in the phone app.'))}
            accessibilityRole="button"
            accessibilityLabel="Change profile photo"
            style={({ pressed }) => [{ opacity: pressed ? 0.8 : 1 }]}
          >
            <Avatar theme={theme} uri={profile.avatarUri} name={profile.displayName} size={104} />
            <View style={[styles.camera, { backgroundColor: theme.accent, borderColor: theme.bg }]}>
              {busy === 'photo' ? <ActivityIndicator size="small" color={theme.accentText} /> : <Ionicons name="camera" size={16} color={theme.accentText} />}
            </View>
          </Pressable>
          <Text style={[styles.hello, { color: theme.text }]}>{greeting(hour, profile.displayName)}</Text>
          {!!profile.bio && <Text style={[styles.bio, { color: theme.text }]}>{profile.bio}</Text>}
          {sync.user?.email && <Text style={[styles.email, { color: theme.textMuted }]}>{sync.user.email}</Text>}
        </View>

        <Section theme={theme} title="About you" footer="Your name is used in your welcome message. Both are saved to your account when you're signed in, so they follow you to your other phones.">
          <TextInput
            value={name}
            onChangeText={setName}
            onSubmitEditing={saveAbout}
            placeholder="What should we call you?"
            placeholderTextColor={theme.textMuted}
            autoCapitalize="words"
            autoComplete="name"
            textContentType="name"
            returnKeyType="done"
            accessibilityLabel="Your name"
            style={[styles.input, { color: theme.text, borderBottomColor: theme.border }]}
          />
          <TextInput
            value={bio}
            onChangeText={(t) => setBio(t.slice(0, BIO_MAX))}
            placeholder="A line about you, e.g. Writes prompts for a design studio"
            placeholderTextColor={theme.textMuted}
            multiline
            maxLength={BIO_MAX}
            accessibilityLabel="Your bio"
            style={[styles.bioInput, { color: theme.text }]}
          />
          <View style={styles.aboutFoot}>
            <Text style={[styles.count, { color: theme.textMuted }]}>
              {bio.length} / {BIO_MAX}
            </Text>
            {busy === 'name' ? (
              <ActivityIndicator color={theme.textMuted} />
            ) : (
              aboutChanged && (
                <Pressable
                  onPress={saveAbout}
                  accessibilityRole="button"
                  accessibilityLabel="Save name and bio"
                  style={({ pressed }) => [styles.nameSave, { backgroundColor: theme.accent, opacity: pressed ? 0.8 : 1 }]}
                >
                  <Text style={[styles.nameSaveText, { color: theme.accentText }]}>Save</Text>
                </Pressable>
              )
            )}
          </View>
        </Section>

        <InsightsSection theme={theme} />

        {signedIn ? (
          <Section theme={theme} title="Account">
            <Row theme={theme} icon="mail-outline" label="Email" value={sync.user?.email ?? ''} onPress={() => setEditing(editing === 'email' ? null : 'email')} />
            {editing === 'email' && (
              <EmailForm
                theme={theme}
                current={sync.user?.email ?? ''}
                busy={busy === 'email'}
                onSave={(email) =>
                  run('email', async () => {
                    const result = await sync.updateEmail(email);
                    setEditing(null);
                    return result === 'changed'
                      ? 'Email updated'
                      : 'Check your inbox (and your old one) to confirm the change';
                  })
                }
              />
            )}
            <Row theme={theme} icon="key-outline" label="Password" value="••••••••" onPress={() => setEditing(editing === 'password' ? null : 'password')} />
            {editing === 'password' && (
              <PasswordForm
                theme={theme}
                busy={busy === 'password'}
                onSave={(pw) =>
                  run('password', async () => {
                    await sync.updatePassword(pw);
                    setEditing(null);
                    return 'Password changed';
                  })
                }
              />
            )}
            <Row theme={theme} icon="cloud-outline" label="Cloud sync" value={SYNC_LABEL[sync.status]} onPress={() => router.push('/account')} />
            <Row
              theme={theme}
              icon="log-out-outline"
              label="Sign out"
              busy={busy === 'signout'}
              last
              onPress={() => setSignOutOpen(true)}
            />
          </Section>
        ) : (
          <Section theme={theme} title="Account" footer="Sign in to back up your prompts, keep them in sync across devices, and save your name and photo to your account.">
            <Row
              theme={theme}
              icon="cloud-upload-outline"
              label={sync.status === 'unconfigured' ? 'Cloud sync isn’t set up' : 'Sign in or create an account'}
              onPress={() => router.push('/account')}
              last
            />
          </Section>
        )}

        {signedIn && (
          <Section
            theme={theme}
            title="Danger zone"
            footer="Deleting your account permanently removes it and all your prompts, categories and images from the cloud, on every device. This can't be undone."
          >
            <Row theme={theme} icon="trash-outline" label="Delete account" destructive busy={busy === 'delete'} last onPress={() => setDeleteMenu(true)} />
          </Section>
        )}
      </ScrollView>

      <SignOutSheet visible={signOutOpen} onClose={() => setSignOutOpen(false)} onBusy={(b) => setBusy(b ? 'signout' : null)} />

      <ActionSheet
        visible={photoMenu}
        title="Profile photo"
        onClose={() => setPhotoMenu(false)}
        actions={[
          { label: profile.avatarUri ? 'Choose a new photo' : 'Choose a photo', icon: 'image-outline', onPress: () => run('photo', async () => ((await profile.pickAvatar()) ? 'Photo updated' : undefined)) },
          ...(profile.avatarUri ? [{ label: 'Remove photo', icon: 'trash-outline' as const, destructive: true, onPress: () => run('photo', async () => (await profile.removeAvatar(), 'Photo removed')) }] : []),
        ]}
      />

      <ActionSheet
        visible={deleteMenu}
        title={`Delete the account ${sync.user?.email ?? ''} for good? Your prompts, categories and images are removed from the cloud. This can't be undone.`}
        onClose={() => setDeleteMenu(false)}
        actions={[
          { label: 'Delete account, keep prompts on this phone', icon: 'cloud-offline-outline', destructive: true, onPress: () => deleteAccount(false) },
          { label: 'Delete account and erase this phone', icon: 'trash-outline', destructive: true, onPress: () => deleteAccount(true) },
        ]}
      />
    </KeyboardAvoidingView>
  );
}

function EmailForm({ theme, current, busy, onSave }: { theme: Theme; current: string; busy: boolean; onSave: (email: string) => void }) {
  const [email, setEmail] = useState(current);
  const valid = /^\S+@\S+\.\S+$/.test(email.trim()) && email.trim().toLowerCase() !== current.toLowerCase();
  return (
    <View style={[styles.form, { borderBottomColor: theme.border }]}>
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="New email"
        placeholderTextColor={theme.textMuted}
        keyboardType="email-address"
        autoCapitalize="none"
        autoComplete="email"
        autoCorrect={false}
        autoFocus
        style={[styles.formInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
      />
      <SaveButton theme={theme} label="Change email" disabled={!valid} busy={busy} onPress={() => onSave(email)} />
    </View>
  );
}

function PasswordForm({ theme, busy, onSave }: { theme: Theme; busy: boolean; onSave: (pw: string) => void }) {
  const [pw, setPw] = useState('');
  const [again, setAgain] = useState('');
  const mismatch = again.length > 0 && pw !== again;
  return (
    <View style={[styles.form, { borderBottomColor: theme.border }]}>
      <TextInput
        value={pw}
        onChangeText={setPw}
        placeholder="New password (at least 6 characters)"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        autoFocus
        style={[styles.formInput, { color: theme.text, backgroundColor: theme.bg, borderColor: theme.border }]}
      />
      <TextInput
        value={again}
        onChangeText={setAgain}
        placeholder="Type it again"
        placeholderTextColor={theme.textMuted}
        secureTextEntry
        autoComplete="new-password"
        textContentType="newPassword"
        style={[styles.formInput, { color: theme.text, backgroundColor: theme.bg, borderColor: mismatch ? theme.danger : theme.border }]}
      />
      {mismatch && <Text style={{ color: theme.danger, fontSize: font.caption }}>Passwords don&apos;t match.</Text>}
      <SaveButton theme={theme} label="Change password" disabled={pw.length < 6 || pw !== again} busy={busy} onPress={() => onSave(pw)} />
    </View>
  );
}

function SaveButton({ theme, label, disabled, busy, onPress }: { theme: Theme; label: string; disabled: boolean; busy: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || busy}
      style={[styles.save, { backgroundColor: theme.accent, opacity: disabled ? 0.5 : 1 }]}
    >
      {busy ? <ActivityIndicator color={theme.accentText} /> : <Text style={[styles.saveText, { color: theme.accentText }]}>{label}</Text>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  hero: { alignItems: 'center', gap: 6, paddingTop: 8 },
  camera: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hello: { fontSize: font.title, fontWeight: '800', marginTop: 8 },
  email: { fontSize: font.body },
  bio: { fontSize: font.body, lineHeight: 21, textAlign: 'center', maxWidth: 320 },
  input: { fontSize: font.headline, height: 52, paddingHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  bioInput: { fontSize: font.body, lineHeight: 21, minHeight: 72, paddingHorizontal: 16, paddingTop: 12, textAlignVertical: 'top' },
  aboutFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 44, paddingHorizontal: 16, paddingBottom: 10 },
  count: { fontSize: font.caption },
  nameSave: { paddingHorizontal: 16, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  nameSaveText: { fontSize: font.body, fontWeight: '800' },
  form: { padding: 16, gap: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  formInput: { fontSize: font.body, height: 46, borderRadius: 12, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
  save: { height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  saveText: { fontSize: font.body, fontWeight: '700' },
});
