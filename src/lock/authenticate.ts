import * as LocalAuthentication from 'expo-local-authentication';
import { Platform } from 'react-native';

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

/**
 * Asks Android for fingerprint or face, falling back to the phone's PIN, pattern or password.
 * The app never sees any of these; Android only tells it whether the person passed.
 */
export async function authenticate(reason: string): Promise<AuthResult> {
  if (Platform.OS === 'web') return __DEV__ ? 'ok' : 'failed'; // development preview only
  const result = await LocalAuthentication.authenticateAsync({
    promptMessage: reason,
    disableDeviceFallback: false,
    biometricsSecurityLevel: 'weak',
  });
  if (result.success) return 'ok';
  if (result.error === 'lockout') return 'locked-out';
  if (result.error === 'user_cancel' || result.error === 'system_cancel' || result.error === 'app_cancel') return 'cancelled';
  return 'failed';
}
