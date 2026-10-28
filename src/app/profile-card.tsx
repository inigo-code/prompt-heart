import Ionicons from '@expo/vector-icons/Ionicons';
import { useRef, useState } from 'react';
import type { ComponentRef } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { CARD_H, CARD_W, ProfileCard } from '@/components/profile/ProfileCard';
import { Segmented } from '@/components/SettingsUI';
import { useToast } from '@/components/Toast';
import { shareViewAsImage } from '@/lib/shareImage';
import { buildTheme, font, useTheme } from '@/lib/theme';
import { useProfile } from '@/profile/ProfileProvider';
import { useInsights } from '@/profile/useInsights';
import { useSettings } from '@/settings/SettingsProvider';

type Look = 'light' | 'dark';

/** Your profile as a story-sized card, in light or dark, to share anywhere. */
export default function ProfileCardScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const toast = useToast();
  const { settings } = useSettings();
  const profile = useProfile();
  const stats = useInsights();
  const ref = useRef<ComponentRef<typeof View>>(null);
  const [look, setLook] = useState<Look>(theme.dark ? 'dark' : 'light');
  const [busy, setBusy] = useState(false);
  const cardTheme = buildTheme(look === 'dark', settings.accent);
  const scale = Math.min(1, (width - 48) / CARD_W);

  const share = async () => {
    setBusy(true);
    try {
      await shareViewAsImage(ref, CARD_W * 3, CARD_H * 3);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScrollView style={{ backgroundColor: theme.bg }} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 32 }]}>
      <View style={[styles.frame, { width: CARD_W * scale, height: CARD_H * scale, borderColor: theme.border }]} accessibilityLabel="Preview of your profile card">
        <View style={{ width: CARD_W, height: CARD_H, transform: [{ scale }], transformOrigin: 'top left' }}>
          <ProfileCard ref={ref} theme={cardTheme} name={profile.displayName} bio={profile.bio} photo={profile.avatarUri} stats={stats} />
        </View>
      </View>

      <View style={styles.looks}>
        <Segmented<Look>
          theme={theme}
          value={look}
          onChange={setLook}
          options={[
            { value: 'light', label: 'Light', icon: 'sunny-outline' },
            { value: 'dark', label: 'Dark', icon: 'moon-outline' },
          ]}
        />
      </View>

      <Pressable
        onPress={share}
        disabled={busy}
        accessibilityRole="button"
        style={({ pressed }) => [styles.share, { backgroundColor: theme.accent, opacity: pressed ? 0.85 : 1 }]}
      >
        {busy ? <ActivityIndicator color={theme.accentText} /> : <Ionicons name="share-social-outline" size={20} color={theme.accentText} />}
        <Text style={[styles.shareText, { color: theme.accentText }]}>Share my card</Text>
      </Pressable>
      <Text style={[styles.note, { color: theme.textMuted }]}>
        The card is 1080 × 1920, the size of a story. Choose Instagram and then Story, WhatsApp status, or save it anywhere. It shows your top four titles and your numbers, never the text of your prompts.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 16, alignItems: 'center' },
  looks: { alignSelf: 'stretch' },
  frame: { borderRadius: 20, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth },
  share: { alignSelf: 'stretch', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, height: 52, borderRadius: 26 },
  shareText: { fontSize: font.headline, fontWeight: '800' },
  note: { fontSize: font.footnote, lineHeight: 18, textAlign: 'center', maxWidth: 340 },
});
