import Ionicons from '@expo/vector-icons/Ionicons';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Image, Modal, Platform, Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/AppText';
import { useOpeningGone, useSplashGone } from '@/components/SplashOverlay';
import { font, useTheme } from '@/lib/theme';
import { useSettings } from '@/settings/SettingsProvider';

import { AppPrivacy } from '../../modules/app-privacy';
import { authenticate, lockSupport } from './authenticate';
import type { AuthResult } from './authenticate';
import { shouldLockOnReturn } from './lockTiming';
import { backFromTrip } from './trips';

type AppLockContext = {
  /** Asks for fingerprint, face or the phone's screen lock (e.g. before turning App lock on or off). */
  confirm: (reason: string) => Promise<AuthResult>;
  /** Treat the app as unlocked now, e.g. right after App lock is turned on. */
  markUnlocked: () => void;
  /** True while the app isn't in view yet: the opening is still up, or the lock screen is. */
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
  const { settings, ready, loadFailed } = useSettings();
  // Settings that couldn't be read might have App lock on, so the app stays locked: unlocking with the
  // phone's own lock (or with no screen lock on the phone) opens it as usual.
  const enabled = (ready && settings.appLock) || (!ready && loadFailed);
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
        const now = Date.now();
        if (!backFromTrip(now) && shouldLockOnReturn(settings.lockAfter, backgroundedAt.current, now)) setUnlocked(false);
        backgroundedAt.current = null;
      }
    });
    return () => sub.remove();
  }, [enabled, settings.lockAfter]);

  // Until the settings are read, the opening splash covers the app (it waits for them), so nothing shows
  // unlocked. The lock screen is a window of its own, and opening it while the native splash still held back
  // the app's window left a black gap when it closed, so it also waits for the native splash to go.
  const splashGone = useSplashGone();
  const openingGone = useOpeningGone();
  const showLock = enabled && !unlocked && splashGone;
  const locked = !openingGone || (enabled && !unlocked);
  const value = useMemo(() => ({ confirm, markUnlocked, locked }), [confirm, markUnlocked, locked]);

  return (
    <Ctx.Provider value={value}>
      {children}
      <Modal visible={showLock} animationType="fade" statusBarTranslucent navigationBarTranslucent onRequestClose={() => {}}>
        <LockScreen confirm={confirm} onUnlocked={markUnlocked} unread={!ready} />
      </Modal>
    </Ctx.Provider>
  );
}

export function useAppLock() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useAppLock must be used inside AppLockProvider');
  return ctx;
}

/** `unread`: locked because the settings couldn't be read, not because App lock is known to be on. */
function LockScreen({ confirm, onUnlocked, unread }: { confirm: (reason: string) => Promise<AuthResult>; onUnlocked: () => void; unread: boolean }) {
  const theme = useTheme();
  const [message, setMessage] = useState<string | null>(null);

  // Unlock stays tappable while a prompt is pending: a prompt that is showing covers the screen, so a tap means it was
  // lost, and asking again clears it (see authenticate.ts). Greying the button out until an answer came left it dead.
  const unlock = useCallback(async () => {
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
  }, [confirm, onUnlocked]);

  // Ask straight away when the lock screen appears (on the phone; the web preview waits for Unlock), once the app is
  // on screen: a prompt asked for while it is still coming back gets lost.
  const asked = useRef(false);
  useEffect(() => {
    if (asked.current || Platform.OS === 'web') return;
    const go = () => {
      asked.current = true;
      void unlock();
    };
    if (AppState.currentState === 'active') return go();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active' && !asked.current) go();
    });
    return () => sub.remove();
  }, [unlock]);

  return (
    <View style={[styles.screen, { backgroundColor: theme.bg }]}>
      <Image source={require('../../assets/icon.png')} style={styles.icon} accessibilityIgnoresInvertColors />
      <View style={styles.texts}>
        <Text style={[styles.title, { color: theme.text }]}>Prompt Heart is locked</Text>
        <Text style={[styles.body, { color: theme.textMuted }]}>Unlock with your fingerprint, face or screen lock.</Text>
        {unread && (
          <Text style={[styles.body, { color: theme.textMuted }]}>Your settings couldn’t be read just now, so Prompt Heart stays locked to be safe.</Text>
        )}
      </View>
      <Pressable
        onPress={() => void unlock()}
        accessibilityRole="button"
        accessibilityLabel="Unlock Prompt Heart"
        style={({ pressed }) => [styles.button, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
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
  body: { fontSize: font.body, textAlign: 'center', lineHeight: 22 },
  button: { flexDirection: 'row', alignItems: 'center', gap: 8, height: 48, paddingHorizontal: 28, borderRadius: 24, marginTop: 8 },
  buttonText: { fontSize: font.headline, fontWeight: '700' },
  message: { fontSize: font.body, textAlign: 'center' },
});
