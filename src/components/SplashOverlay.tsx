import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Animated, Easing, StyleSheet } from 'react-native';

// The native splash: assets/splash-icon.png at 160 points on this colour (app.json). The overlay draws the same,
// so the hand-over from the native splash to the app can't be seen.
export const SPLASH_BG = '#121110';
const SIZE = 160;
// The longest the app waits on its prompts and settings before letting go anyway.
const WAIT_AT_MOST = 3000;
// How long the native splash takes to fade off the top of this one (Android), and the longest to wait for this
// one to reach the screen before letting the native splash go anyway.
const FADE = 150;
const UNCOVER_AT_MOST = 1500;
// The longest the opening waits for the settings (it stays up until they're read, so App lock can't be skipped).
const HOLD_AT_MOST = 10000;

// Two moments: the native splash has gone, and the whole opening (this overlay too) has gone.
// Until the first, Android holds back drawing the app's own window, and a window opened over it (App lock's
// screen is a Modal, a window of its own) left the screen plain black for a moment when it closed, so App
// lock waits for it. Pop-ups (What's new, an update waiting) wait for the second.
type Moment = { done: boolean; listeners: Set<() => void> };
const nativeGone: Moment = { done: false, listeners: new Set() };
const openingGone: Moment = { done: false, listeners: new Set() };

function mark(m: Moment) {
  if (m.done) return;
  m.done = true;
  m.listeners.forEach((l) => l());
  m.listeners.clear();
}

function useMoment(m: Moment) {
  return useSyncExternalStore(
    (l) => {
      m.listeners.add(l);
      return () => {
        m.listeners.delete(l);
      };
    },
    () => m.done,
    () => m.done,
  );
}

/** True once the native splash has gone. */
export const useSplashGone = () => useMoment(nativeGone);
/** True once the opening has faded away and the app is in view. */
export const useOpeningGone = () => useMoment(openingGone);

/** Lets the native splash go (the safety net, should the opening never draw). */
export function letSplashGo() {
  SplashScreen.hideAsync()
    .catch(() => {})
    .finally(() =>
      setTimeout(() => {
        mark(nativeGone);
        mark(openingGone);
      }, FADE),
    );
}

/**
 * The opening: drawn exactly as the native splash looks, then a quiet fade into the app once the prompts and
 * settings are in (`ready`), or after 3 s at most. While `hold` (the settings not read yet, so whether App lock
 * is on isn't known) it stays up regardless, up to 10 s.
 */
export function SplashOverlay({ ready, hold = false }: { ready: boolean; hold?: boolean }) {
  const [leave] = useState(() => new Animated.Value(0));
  const [probe] = useState(() => new Animated.Value(0));
  const [uncovered, setUncovered] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  const [heldTooLong, setHeldTooLong] = useState(false);
  const [gone, setGone] = useState(false);
  const laidOut = useRef(false);
  const imageIn = useRef(false);
  const released = useRef(false);

  useEffect(() => {
    const timer = setTimeout(() => setHeldTooLong(true), HOLD_AT_MOST);
    return () => clearTimeout(timer);
  }, []);

  // While the native splash is up, Android draws nothing of the app. Letting it go as soon as JavaScript has
  // laid this out was too soon: the native side was still putting the screen together, and the icon (an
  // image, which arrives a moment after the view) wasn't drawn yet, so the logo faded out over plain black.
  // A one-frame animation run by the native side can only finish once this view is on screen, so the native
  // splash goes after that and after the icon has loaded.
  const release = () => {
    if (released.current) return;
    released.current = true;
    try {
      SplashScreen.setOptions({ duration: FADE, fade: true });
    } catch {}
    SplashScreen.hideAsync()
      .catch(() => {})
      .finally(() =>
        setTimeout(() => {
          setUncovered(true);
          mark(nativeGone);
        }, FADE),
      );
  };
  const releaseWhenDrawn = () => {
    if (!laidOut.current || !imageIn.current) return;
    Animated.timing(probe, { toValue: 1, duration: 16, useNativeDriver: true }).start(release);
  };
  const onLayout = () => {
    if (laidOut.current) return;
    laidOut.current = true;
    setTimeout(release, UNCOVER_AT_MOST);
    releaseWhenDrawn();
  };
  const onImage = () => {
    if (imageIn.current) return;
    imageIn.current = true;
    releaseWhenDrawn();
  };

  useEffect(() => {
    if (!uncovered) return;
    const timer = setTimeout(() => setTimedOut(true), WAIT_AT_MOST);
    return () => clearTimeout(timer);
  }, [uncovered]);

  const leaving = uncovered && (ready || timedOut) && (!hold || heldTooLong);
  useEffect(() => {
    if (!leaving) return;
    Animated.timing(leave, { toValue: 1, duration: 280, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() => {
      setGone(true);
      mark(openingGone);
    });
  }, [leaving, leave]);

  if (gone) return null;
  return (
    <Animated.View
      onLayout={onLayout}
      pointerEvents="none"
      style={[styles.wrap, { opacity: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 0] }) }]}
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
    >
      <Animated.Image
        source={require('../../assets/splash-icon.png')}
        onLoad={onImage}
        onError={onImage}
        fadeDuration={0}
        style={[
          styles.icon,
          {
            transform: [
              { translateX: probe.interpolate({ inputRange: [0, 1], outputRange: [0, 0] }) },
              { scale: leave.interpolate({ inputRange: [0, 1], outputRange: [1, 1.06] }) },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { ...StyleSheet.absoluteFill, backgroundColor: SPLASH_BG, alignItems: 'center', justifyContent: 'center', zIndex: 100 },
  icon: { width: SIZE, height: SIZE },
});
