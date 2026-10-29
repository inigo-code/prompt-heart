import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { Image, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AboutCard } from '@/components/AboutCard';
import { BrandTitle } from '@/components/BrandTitle';
import { Row, Section } from '@/components/SettingsUI';
import { APP_NAME, APP_TAGLINE, DEVELOPER, HEART_APPS, LINKS, SUPPORT_EMAIL } from '@/lib/app';
import { font, useTheme } from '@/lib/theme';

const HEART_APPS_TILE = require('../../assets/brand/heart-apps-tile.png');
const WATCH_HEART_ICON = require('../../assets/brand/watch-heart.png');

const FEATURES: { icon: keyof typeof Ionicons.glyphMap; text: string }[] = [
  { icon: 'copy-outline', text: 'One-tap copy from the home screen' },
  { icon: 'code-slash', text: 'Templates with {{placeholders}} and defaults' },
  { icon: 'folder-open-outline', text: 'Categories, tags, pins and search' },
  { icon: 'image-outline', text: 'Reference images that never get copied' },
  { icon: 'share-outline', text: `Share text or images into ${APP_NAME} from any app` },
  { icon: 'cloud-done-outline', text: 'Cloud sync across devices, works offline' },
];

export default function AboutScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  // The Heart Apps chip is gold in both looks; on light paper its text is a deeper gold so it stays readable (5.6:1).
  const gold = theme.dark
    ? { border: '#F2B84B', fill: 'rgba(242, 184, 75, 0.14)', text: '#F2B84B' }
    : { border: '#D99A1E', fill: 'rgba(242, 184, 75, 0.14)', text: '#7A4F00' };

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} />
        <BrandTitle theme={theme} size={28} align="center" />
        <Text style={[styles.tagline, { color: theme.textMuted }]}>{APP_TAGLINE}</Text>
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(HEART_APPS.home)}
          accessibilityRole="link"
          accessibilityLabel="A Heart App. Open the Heart Apps website"
          style={({ pressed }) => [styles.family, { borderColor: gold.border, backgroundColor: gold.fill, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <Image source={HEART_APPS_TILE} style={styles.familyMark} />
          <Text style={[styles.familyText, { color: gold.text }]}>A HEART APP</Text>
        </Pressable>
      </View>

      <AboutCard theme={theme} />

      <Section theme={theme} title="What it does">
        {FEATURES.map((f, i) => (
          <View
            key={f.text}
            style={[styles.feature, i < FEATURES.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.border }]}
          >
            <Ionicons name={f.icon} size={18} color={theme.accent} />
            <Text style={[styles.featureText, { color: theme.text }]}>{f.text}</Text>
          </View>
        ))}
      </Section>

      <View style={[styles.heartApps, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={styles.heartAppsHead}>
          <Image source={HEART_APPS_TILE} style={styles.heartAppsTile} />
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={[styles.heartAppsName, { color: theme.textMuted }]}>{HEART_APPS.name.toUpperCase()}</Text>
            <Text style={[styles.heartAppsLine, { color: theme.text }]}>{HEART_APPS.line}</Text>
          </View>
        </View>
        {HEART_APPS.others.map((app) => (
          <Pressable
            key={app.name}
            onPress={() => WebBrowser.openBrowserAsync(app.url)}
            accessibilityRole="link"
            accessibilityLabel={`${app.name}: ${app.tagline}`}
            style={({ pressed }) => [styles.otherApp, { backgroundColor: pressed ? theme.chip : 'transparent', borderTopColor: theme.border }]}
          >
            <Image source={WATCH_HEART_ICON} style={styles.otherIcon} />
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={[styles.otherName, { color: theme.text }]}>{app.name}</Text>
              <Text style={[styles.otherTagline, { color: theme.textMuted }]}>{app.tagline}</Text>
            </View>
            <Ionicons name="open-outline" size={17} color={theme.textMuted} />
          </Pressable>
        ))}
        <Pressable
          onPress={() => WebBrowser.openBrowserAsync(HEART_APPS.home)}
          accessibilityRole="link"
          style={({ pressed }) => [styles.allApps, { backgroundColor: theme.chip, transform: [{ scale: pressed ? 0.97 : 1 }] }]}
        >
          <Text style={[styles.allAppsText, { color: theme.text }]}>All {HEART_APPS.name}</Text>
        </Pressable>
      </View>

      <Section theme={theme} title="Developer">
        <Row theme={theme} icon="person-outline" label={`Made by ${DEVELOPER.name}`} />
        <Row
          theme={theme}
          icon="logo-github"
          label="GitHub"
          value={DEVELOPER.github.replace('https://', '')}
          onPress={() => WebBrowser.openBrowserAsync(DEVELOPER.github)}
          last
        />
      </Section>

      <Section theme={theme} title="Privacy & support">
        <Row theme={theme} icon="shield-checkmark-outline" label="Privacy policy" onPress={() => WebBrowser.openBrowserAsync(LINKS.privacy)} />
        <Row theme={theme} icon="person-remove-outline" label="Delete your account" onPress={() => WebBrowser.openBrowserAsync(LINKS.deleteAccount)} />
        <Row
          theme={theme}
          icon="mail-outline"
          label="Contact"
          value={SUPPORT_EMAIL}
          onPress={() => Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(APP_NAME)}`)}
          last
        />
      </Section>

      <Pressable
        onPress={() => WebBrowser.openBrowserAsync(DEVELOPER.github)}
        accessibilityRole="link"
        accessibilityLabel={`${DEVELOPER.name} on GitHub`}
        style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
      >
        <Text style={[styles.credit, { color: theme.textMuted }]}>
          {APP_NAME} © {new Date().getFullYear()} {DEVELOPER.name} · {HEART_APPS.name}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  hero: { alignItems: 'center', gap: 6, paddingTop: 12 },
  icon: { width: 96, height: 96, borderRadius: 22, marginBottom: 8 },
  tagline: { fontSize: font.body },
  family: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6, height: 30, paddingLeft: 5, paddingRight: 12, borderRadius: 15, borderWidth: 1 },
  familyMark: { width: 20, height: 20, borderRadius: 5 },
  familyText: { fontSize: font.caption, fontWeight: '800', letterSpacing: 1.5 },
  heartApps: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 12 },
  heartAppsHead: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  heartAppsTile: { width: 48, height: 48, borderRadius: 12 },
  heartAppsName: { fontSize: font.caption, fontWeight: '800', letterSpacing: 0.5 },
  heartAppsLine: { fontSize: font.body, lineHeight: 20 },
  otherApp: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, paddingHorizontal: 4, borderTopWidth: StyleSheet.hairlineWidth, borderRadius: 10 },
  otherIcon: { width: 40, height: 40, borderRadius: 10 },
  otherName: { fontSize: font.body, fontWeight: '700' },
  otherTagline: { fontSize: font.footnote },
  allApps: { alignSelf: 'flex-start', height: 36, paddingHorizontal: 16, borderRadius: 18, justifyContent: 'center' },
  allAppsText: { fontSize: font.footnote, fontWeight: '700' },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  featureText: { flex: 1, fontSize: font.body, lineHeight: 19 },
  credit: { textAlign: 'center', fontSize: font.caption },
});
