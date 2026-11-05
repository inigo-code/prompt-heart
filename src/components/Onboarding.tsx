import Ionicons from '@expo/vector-icons/Ionicons';
import * as Clipboard from 'expo-clipboard';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInLeft, FadeInRight, FadeOut, FadeOutLeft, FadeOutRight, ZoomIn, cubicBezier } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text, TextInput } from '@/components/AppText';
import { AppBadge } from '@/components/AppBadge';
import { BRAND_FONT, HeartMark } from '@/components/BrandTitle';
import { KeyboardSafe } from '@/components/KeyboardSafe';
import { Tap } from '@/components/Tap';
import { AI_APPS } from '@/lib/ai';
import { APP_NAME, APP_TAGLINE } from '@/lib/app';
import { fillTemplate } from '@/lib/templates';
import { font, useTheme } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import { useSettings } from '@/settings/SettingsProvider';
import { useSync } from '@/sync/SyncProvider';

const STEPS = 3;
const EASE_OUT = cubicBezier(0.23, 1, 0.32, 1);
const SAMPLE = 'Write a short, friendly message about {{topic}}. Keep it under 60 words.';

function Dots({ step, theme }: { step: number; theme: Theme }) {
  return (
    <View style={styles.dots} accessibilityLabel={`Step ${step + 1} of ${STEPS}`}>
      {Array.from({ length: STEPS }, (_, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              width: i === step ? 22 : 8,
              backgroundColor: i === step ? theme.accent : theme.border,
              transitionProperty: ['width', 'backgroundColor'],
              transitionDuration: 220,
              transitionTimingFunction: EASE_OUT,
            },
          ]}
        />
      ))}
    </View>
  );
}

function Welcome({ theme }: { theme: Theme }) {
  return (
    <View style={styles.welcome}>
      <Animated.View entering={ZoomIn.springify().damping(14).stiffness(170)}>
        <HeartMark theme={theme} size={132} />
      </Animated.View>
      <Text style={[styles.brand, { color: theme.text }]} accessibilityRole="header">
        {APP_NAME}
      </Text>
      <Text style={[styles.lead, styles.center, { color: theme.textMuted }]}>{APP_TAGLINE}</Text>
      <Text style={[styles.lead, styles.center, { color: theme.text }]}>Save the prompts that work. Use them again in seconds.</Text>
    </View>
  );
}

/** The product in one move: a real blank to fill, and a real copy at the end. */
function FillDemo({ theme }: { theme: Theme }) {
  const [topic, setTopic] = useState('');
  const [copied, setCopied] = useState(false);
  const filled = fillTemplate(SAMPLE, { topic: topic.trim() });
  const [before, after] = SAMPLE.split('{{topic}}');
  const ready = topic.trim().length > 0;

  const copy = async () => {
    await Clipboard.setStringAsync(filled);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };

  return (
    <>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        Write it once, fill in the blanks
      </Text>
      <Text style={[styles.lead, { color: theme.textMuted }]}>Try it. Type what this message is about.</Text>
      <TextInput
        value={topic}
        onChangeText={setTopic}
        placeholder="a team lunch on Friday"
        placeholderTextColor={theme.textMuted}
        accessibilityLabel="Topic"
        returnKeyType="done"
        style={[styles.input, { color: theme.text, backgroundColor: theme.card, borderColor: ready ? theme.accent : theme.border }]}
      />
      <View style={[styles.preview, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.previewText, { color: theme.text }]}>
          {before}
          <Text style={{ fontWeight: '800', color: ready ? theme.text : theme.accentInk }}>{ready ? topic.trim() : '{{topic}}'}</Text>
          {after}
        </Text>
      </View>
      <Tap
        onPress={copy}
        disabled={!ready}
        accessibilityRole="button"
        accessibilityState={{ disabled: !ready }}
        style={[styles.demoCopy, { backgroundColor: ready ? theme.accentSoft : theme.chip, opacity: ready ? 1 : 0.6 }]}
      >
        {copied ? (
          <Animated.View key="done" entering={ZoomIn.duration(160)}>
            <Ionicons name="checkmark" size={18} color={theme.text} />
          </Animated.View>
        ) : (
          <Ionicons name="copy-outline" size={17} color={theme.text} />
        )}
        <Text style={[styles.demoCopyText, { color: theme.text }]}>{copied ? 'Copied, ready to paste' : 'Copy'}</Text>
      </Tap>
    </>
  );
}

function ChooseApps({ theme }: { theme: Theme }) {
  const { settings, update } = useSettings();
  return (
    <>
      <Text style={[styles.title, { color: theme.text }]} accessibilityRole="header">
        Which AI apps do you use?
      </Text>
      <Text style={[styles.lead, { color: theme.textMuted }]}>One tap copies your prompt and opens the app. Change these any time in Settings.</Text>
      <View style={styles.apps}>
        {AI_APPS.map((app) => {
          const on = !!settings.aiApps[app.key];
          return (
            <Tap
              key={app.key}
              onPress={() => update({ aiApps: { ...settings.aiApps, [app.key]: !on } })}
              accessibilityRole="switch"
              accessibilityState={{ checked: on }}
              accessibilityLabel={app.label}
              style={[styles.app, { backgroundColor: on ? theme.accentSoft : theme.card, borderColor: on ? theme.accent : theme.border }]}
            >
              <AppBadge app={app} size={28} />
              <Text style={[styles.appText, { color: theme.text }]} numberOfLines={1}>
                {app.label}
              </Text>
              {on && <Ionicons name="checkmark-circle" size={18} color={theme.text} />}
            </Tap>
          );
        })}
      </View>
    </>
  );
}

/** Shown once on a fresh install, over the home screen. Skippable from the first screen on. */
export function Onboarding() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { update } = useSettings();
  const sync = useSync();
  const [step, setStep] = useState(0);
  const [forward, setForward] = useState(true);
  const last = step === STEPS - 1;

  const finish = () => update({ onboarded: true });
  const go = (next: number) => {
    setForward(next > step);
    setStep(next);
  };

  // Android's back button steps back through the screens instead of leaving the app.
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (step === 0) return false;
      setForward(false);
      setStep(step - 1);
      return true;
    });
    return () => sub.remove();
  }, [step]);

  const Enter = forward ? FadeInRight : FadeInLeft;
  const Exit = forward ? FadeOutLeft : FadeOutRight;

  return (
    <Animated.View exiting={FadeOut.duration(220)} style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: theme.bg }]}>
      <KeyboardSafe>
        <View style={[styles.top, { paddingTop: insets.top + 8 }]}>
          <Dots step={step} theme={theme} />
          <Pressable onPress={finish} hitSlop={12} accessibilityRole="button" style={({ pressed }) => [styles.skip, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.skipText, { color: theme.textMuted }]}>Skip</Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <Animated.View key={step} entering={Enter.duration(280)} exiting={Exit.duration(140)} style={styles.page}>
            {step === 0 && <Welcome theme={theme} />}
            {step === 1 && <FillDemo theme={theme} />}
            {step === 2 && <ChooseApps theme={theme} />}
          </Animated.View>
        </ScrollView>

        <View style={[styles.bottom, { paddingBottom: insets.bottom + 16 }]}>
          <Tap
            onPress={last ? finish : () => go(step + 1)}
            accessibilityRole="button"
            style={[styles.next, { backgroundColor: theme.accent }]}
          >
            <Text style={[styles.nextText, { color: theme.accentText }]}>{step === 0 ? 'Get started' : last ? `Start using ${APP_NAME}` : 'Next'}</Text>
          </Tap>
          {last && sync.status !== 'unconfigured' && (
            <Animated.View entering={FadeIn.duration(220).delay(120)}>
              <Pressable
                onPress={() => {
                  finish();
                  router.push('/account');
                }}
                hitSlop={8}
                accessibilityRole="button"
                style={({ pressed }) => [styles.signIn, { opacity: pressed ? 0.6 : 1 }]}
              >
                <Text style={[styles.signInText, { color: theme.text }]}>I already have an account</Text>
              </Pressable>
            </Animated.View>
          )}
        </View>
      </KeyboardSafe>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  root: { zIndex: 10 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingBottom: 8 },
  dots: { flexDirection: 'row', alignItems: 'center', gap: 6, height: 44 },
  dot: { height: 8, borderRadius: 4 },
  skip: { height: 44, paddingHorizontal: 4, justifyContent: 'center' },
  skipText: { fontSize: font.body, fontWeight: '700' },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 16 },
  page: { gap: 16 },
  welcome: { alignItems: 'center', gap: 12 },
  brand: { fontFamily: BRAND_FONT, fontSize: 40, letterSpacing: -0.4, marginTop: 8 },
  center: { textAlign: 'center', maxWidth: 300 },
  title: { fontFamily: BRAND_FONT, fontSize: 32, lineHeight: 38, letterSpacing: -0.3 },
  lead: { fontSize: font.headline, lineHeight: 24 },
  input: { fontSize: font.headline, height: 56, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1.5, marginTop: 8 },
  preview: { padding: 16, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth },
  previewText: { fontSize: font.body, lineHeight: 22 },
  demoCopy: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 48, borderRadius: 14 },
  demoCopyText: { fontSize: font.body, fontWeight: '700' },
  apps: { gap: 8, marginTop: 8 },
  app: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingHorizontal: 14, borderRadius: 14, borderWidth: 1 },
  appText: { flex: 1, fontSize: font.body, fontWeight: '700' },
  bottom: { paddingHorizontal: 24, paddingTop: 8, gap: 4 },
  next: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center' },
  nextText: { fontSize: font.headline, fontWeight: '800' },
  signIn: { height: 44, alignItems: 'center', justifyContent: 'center' },
  signInText: { fontSize: font.body, fontWeight: '700' },
});
