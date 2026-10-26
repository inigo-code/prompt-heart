import Ionicons from '@expo/vector-icons/Ionicons';
import * as WebBrowser from 'expo-web-browser';
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AboutCard } from '@/components/AboutCard';
import { BrandTitle } from '@/components/BrandTitle';
import { Row, Section } from '@/components/SettingsUI';
import { APP_NAME, APP_TAGLINE, DEVELOPER } from '@/lib/app';
import { useTheme } from '@/lib/theme';

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

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={styles.hero}>
        <Image source={require('../../assets/icon.png')} style={styles.icon} />
        <BrandTitle theme={theme} size={28} align="center" />
        <Text style={[styles.tagline, { color: theme.textMuted }]}>{APP_TAGLINE}</Text>
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

      <Pressable onPress={() => WebBrowser.openBrowserAsync(DEVELOPER.github)}>
        <Text style={[styles.credit, { color: theme.textMuted }]}>
          {APP_NAME} © {new Date().getFullYear()} {DEVELOPER.name}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 24 },
  hero: { alignItems: 'center', gap: 6, paddingTop: 12 },
  icon: { width: 96, height: 96, borderRadius: 22, marginBottom: 8 },
  tagline: { fontSize: 15 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 14, paddingVertical: 13 },
  featureText: { flex: 1, fontSize: 14, lineHeight: 19 },
  credit: { textAlign: 'center', fontSize: 12 },
});
