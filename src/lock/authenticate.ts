import * as LocalAuthentication from 'expo-local-authentication';
import { AppState, Platform } from 'react-native';

export type LockSupport = 'ok' | 'no-screen-lock' | 'unsupported';

/** Whether App lock can work here: it needs the phone to have a screen lock (PIN, pattern, password) or biometrics. */
export async function lockSupport(): Promise<LockSupport> {
  // The web build is only a development preview; it can't prompt, so allow it there for testing only.
  if (Platform.OS === 'web') return __DEV__ ? 'ok' : 'unsupported';
  try {
    const level = await LocalAuthentication.getEnrolledLevelAsync();
    return level === LocalAuthentication.SecurityLevel.NONE ? 'no-screen-lock' : 'ok';
  } catch {
    return 'unsupported';
  }
}

export type AuthResult = 'ok' | 'cancelled' | 'locked-out' | 'failed';

// Prompts asked for and not yet answered. Android can lose a prompt asked for while the app is going to or coming from
// the background: it never shows it and never answers, yet refuses every later one at once ('app_cancel') until it is
// cleared, so Unlock seemed to do nothing. A prompt that is showing covers the screen, so a new request while one is
// open means the open one was lost: clear it first.
let open = 0;

async function ask(reason: string) {
  if (open > 0) await LocalAuthentication.cancelAuthenticate().catch(() => {});
  open++;
  try {
    const opts = { promptMessage: reason, disableDeviceFallback: false, biometricsSecurityLevel: 'weak' } as const;
    let r = await LocalAuthentication.authenticateAsync(opts);
    if (!r.success && r.error === 'app_cancel' && AppState.currentState === 'active') {
      await LocalAuthentication.cancelAuthenticate().catch(() => {});
      r = await LocalAuthentication.authenticateAsync(opts);
    }
    return r;
  } finally {
    open--;
  }
}

/**
 * Asks Android for fingerprint or face, falling back to the phone's PIN, pattern or password.
 * The app never sees any of these; Android only tells it whether the person passed.
 */
export async function authenticate(reason: string): Promise<AuthResult> {
  if (Platform.OS === 'web') return __DEV__ ? 'ok' : 'failed'; // development preview only
  const result = await ask(reason);
  if (result.success) return 'ok';
  if (result.error === 'lockout') return 'locked-out';
  if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') return 'cancelled';
  return 'failed';
}
