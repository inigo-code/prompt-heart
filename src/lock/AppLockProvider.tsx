import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Image, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { font, useTheme } from '@/lib/theme';
import { useSettings } from '@/settings/SettingsProvider';

import { AppPrivacy } from '../../modules/app-privacy';
import { authenticate, lockSupport } from './authenticate';
import type { AuthResult } from './authenticate';
import { shouldLockOnReturn } from './lockTiming';

type AppLockContext = {
  /** Asks for fingerprint, face or the phone's screen lock (e.g. before turning App lock on or off). */
  confirm: (reason: string) => Promise<AuthResult>;
  /** Treat the app as unlocked now, e.g. right after App lock is turned on. */
  markUnlocked: () => void;
  /** True while the lock screen (or the cover before settings load) is showing. */
  locked: boolean;
};

const Ctx = createContext<AppLockContext | null>(null);

// The system unlock screen can briefly send the app to the background; ignore that for this long after it closes.
const AUTH_SETTLE_MS = 1500;

/**
 * Optional App lock. When it's on, the app opens behind a lock screen, locks again after being in the
 * background for the chosen time, and is hidden in the recent-apps switcher. Everything keeps running
 * underneath (sync, shared text waiting to be saved), so unlocking picks up exactly where you were.
 */
export function AppLockProvider({ children }: { children: ReactNode }) {
  const { settings, ready } = useSettings();
  const enabled = ready && settings.appLock;
  const [unlocked, setUnlocked] = useState(false);
  const backgroundedAt = useRef<number | null>(null);
  const authenticating = useRef(false);

  const confirm = useCallback(async (reason: string) => {
    authenticating.current = true;
    try {
      return await authenticate(reason);
    } finally {
      setTimeout(() => {
        authenticating.current = false;
      }, AUTH_SETTLE_MS);
    }
  }, []);

  const markUnlocked = useCallback(() => setUnlocked(true), []);

  // Hidden in the app switcher while App lock is on.
  useEffect(() => {
    AppPrivacy?.setHiddenInRecents(enabled);
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (authenticating.current) return;
      if (state === 'background') {
        backgroundedAt.current = Date.now();
      } else if (state === 'active') {
        AppPrivacy?.setHiddenInRecents(true); // the activity may not have existed at first launch
        if (shouldLockOnReturn(settings.lockAfter, backgroundedAt.current, Date.now())) setUnlocked(false);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled, settings.lockAfter]);

  // Until settings are loaded we don't know whether to lock, so cover the app rather than flash it open.
  const showLock = !ready || (enabled && !unlocked);
  const value = useMemo(() => ({ confirm, markUnlocked, locked: showLock }), [confirm, markUnlocked, showLock]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal visible={showLock} animationType="fade" statusBarTranslucent onRequestClose={() => {}}>
        {ready ? <LockScreen confirm={confirm} onUnlocked={markUnlocked} /> : <Cover />}
      </Modal>
    </Ctx.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppLock must be used inside AppLockProvider');
  return ctx;
}

function Cover() {
  const theme = useTheme();
  return <View style={[styles.screen, { backgroundColor: theme.bg }]} />;
}

function LockScreen({ confirm, onUnlocked }: { confirm: (reason: string) => Promise<AuthResult>; onUnlocked: () => void }) {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = useCallback(async () => {
    setBusy(true);
    try {
      // Without any screen lock on the phone there's nothing to check against; don't lock people out.
      if ((await lockSupport()) === 'no-screen-lock') {
        onUnlocked();
        return;
      }
      const result = await confirm('Unlock Prompt Heart');
      if (result === 'ok') onUnlocked();
      else if (result === 'locked-out') setMessage('Too many tries. Wait a moment, then try again.');
      else if (result === 'failed') setMessage("That didn't work. Try again.");
      else setMessage(null);
    } finally {
      setBusy(false);
    }
  }, [confirm, onUnlocked]);

  // Ask straight away when the lock screen appears (on the phone; the web preview waits for Unlock).
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || Platform.OS === 'web') return;
    asked.current = true;
    void unlock();
  }, [unlock]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Image source={require('../../assets/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.text }]}>Prompt Heart is locked</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>Unlock with your fingerprint, face or screen lock.</Text>
      </View>
      <Pressable
        onPress={() => void unlock()}
        disabled={busy}
        accessibilityRole="button"
        accessibilityLabel="Unlock Prompt Heart"
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: busy ? 0.6 : pressed ? 0.85 : 1 }]}
      >
        <Ionicons name="lock-open-outline" size={18} color={theme.accentText} />
        <Text style={[styles.buttonText, { color: theme.accentText }]}>Unlock</Text>
      </Pressable>
      {message && <Text style={[styles.message, { color: theme.danger }]}>{message}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, gap: 20 },
  icon: { width: 88, height: 88, borderRadius: 22 },
  texts: { alignItems: 'center', gap: 6 },
  title: { fontSize: font.title, fontWeight: '800' },
  body: { fontSize: font.body, textAlign: 'center', lineHeight: 21 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 28, borderRadius: 24, marginTop: 8 },
  buttonText: { fontSize: font.headline, fontWeight: '700' },
  message: { fontSize: font.body, textAlign: 'center' },
});
