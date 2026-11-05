import Ionicons from '@expo/vector-icons/Ionicons';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';

import { Tap } from '@/components/Tap';
import { Text } from '@/components/AppText';
import { AppBadge } from '@/components/AppBadge';
import { ImageThumb } from '@/components/ImageThumb';
import type { AiApp } from '@/lib/ai';
import { formatStamp, stripMarkdown } from '@/lib/format';
import { extractVariables } from '@/lib/templates';
import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';
import type { Folder, Prompt } from '@/store/types';

type Props = {
  prompt: Prompt;
  folder?: Folder;
  theme: Theme;
  variant: 'list' | 'grid';
  previewLines: number;
  /** Set for prompts in an AI app's category: shows a button that copies and opens that app. */
  launchApp?: AiApp;
  onLaunch?: (prompt: Prompt, app: AiApp) => void;
  /** Multi-select mode: taps select instead of opening, and copy/launch buttons are hidden. */
  selecting?: boolean;
  selected?: boolean;
  onOpen: (prompt: Prompt) => void;
  onCopy: (prompt: Prompt) => void;
  onLongPress: (prompt: Prompt) => void;
};

export const PromptCard = memo(function PromptCard({
  prompt,
  folder,
  theme,
  variant,
  previewLines,
  launchApp,
  onLaunch,
  selecting = false,
  selected = false,
  onOpen,
  onCopy,
  onLongPress,
}: Props) {
  const grid = variant === 'grid';
  const vars = extractVariables(prompt.body).length;
  const extraImages = prompt.images.length - 1;
  // The Card preview setting is 2, 4 or 6: cards show one, two or three lines of the prompt.
  const lines = Math.ceil(previewLines / 2);
  // A plain prompt copies straight away, so its button confirms with a tick; one with blanks opens its sheet.
  const [copied, setCopied] = useState(false);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (tick.current) clearTimeout(tick.current);
  }, []);
  const copy = () => {
    onCopy(prompt);
    if (vars > 0) return;
    setCopied(true);
    if (tick.current) clearTimeout(tick.current);
    tick.current = setTimeout(() => setCopied(false), 1200);
  };

  const actions = selecting ? (
    <View
      accessibilityLabel={selected ? 'Selected' : 'Not selected'}
      style={[styles.check, { borderColor: selected ? theme.accent : theme.textMuted, backgroundColor: selected ? theme.accent : 'transparent' }]}
    >
      {selected && <Ionicons name="checkmark" size={18} color={theme.accentText} />}
    </View>
  ) : (
    <View style={styles.actions}>
      {launchApp && onLaunch && (
        <Tap scale={0.9} onPress={() => onLaunch(prompt, launchApp)} hitSlop={6} accessibilityRole="button" accessibilityLabel={`Copy and open in ${launchApp.label}`}>
          <AppBadge app={launchApp} size={36} />
        </Tap>
      )}
      <Tap
        scale={0.9}
        onPress={copy}
        hitSlop={6}
        accessibilityRole="button"
        accessibilityLabel={`Copy ${prompt.title || 'prompt'}`}
        style={[styles.copyBtn, { backgroundColor: copied ? theme.accent : theme.accentSoft }]}
      >
        {copied ? (
          <Animated.View entering={ZoomIn.duration(140)}>
            <Ionicons name="checkmark" size={20} color={theme.accentText} />
          </Animated.View>
        ) : (
          <Ionicons name="copy-outline" size={18} color={theme.text} />
        )}
      </Tap>
    </View>
  );

  return (
    <Pressable
      onPress={() => onOpen(prompt)}
      onLongPress={() => onLongPress(prompt)}
      delayLongPress={300}
      style={({ pressed }) => [
        styles.card,
        grid && styles.gridCard,
        {
          backgroundColor: prompt.pinned ? theme.cardPinned : theme.card,
          borderColor: selected ? theme.accent : prompt.pinned ? theme.accent + '55' : theme.border,
          borderWidth: selected ? 2 : StyleSheet.hairlineWidth,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {grid && prompt.images.length > 0 && (
        <View>
          <ImageThumb id={prompt.images[0]} theme={theme} size={1000} radius={10} style={styles.gridImage} />
          {extraImages > 0 && (
            <View style={[styles.moreBadge, { backgroundColor: theme.overlay }]}>
              <Text style={styles.moreText}>+{extraImages}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.row}>
        {!grid && prompt.images.length > 0 && (
          <View>
            <ImageThumb id={prompt.images[0]} theme={theme} size={72} radius={12} />
            {extraImages > 0 && (
              <View style={[styles.moreBadge, { backgroundColor: theme.overlay }]}>
                <Text style={styles.moreText}>+{extraImages}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.text}>
          <View style={styles.titleRow}>
            {prompt.pinned && <Ionicons name="pin" size={14} color={theme.accent} style={styles.pin} />}
            <Text style={[styles.title, { color: theme.text }]} numberOfLines={grid ? 6 : 4}>
              {prompt.title || 'Untitled'}
            </Text>
          </View>
          <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
            {formatStamp(prompt.updatedAt)}
          </Text>
          {!!prompt.body && (
            <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={lines}>
              {stripMarkdown(prompt.body)}
            </Text>
          )}
          {(folder || vars > 0) && (
            <View style={styles.meta}>
              {folder && (
                <View style={styles.metaItem}>
                  <View style={[styles.dot, { backgroundColor: folder.color }]} />
                  <Text style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
                    {folder.name}
                  </Text>
                </View>
              )}
              {vars > 0 && (
                <Text style={[styles.metaText, { color: theme.textMuted }]}>
                  {vars} {vars === 1 ? 'blank' : 'blanks'}
                </Text>
              )}
            </View>
          )}
        </View>

        {!grid && actions}
      </View>
      {grid && <View style={styles.gridActions}>{actions}</View>}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, padding: 12, paddingLeft: 14, gap: 8, overflow: 'hidden' },
  gridCard: { flex: 1, maxWidth: '48.5%' },
  gridImage: { width: '100%', height: 128 },
  gridActions: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 'auto' },
  moreBadge: { position: 'absolute', right: 6, bottom: 6, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  moreText: { color: '#fff', fontSize: font.caption, fontWeight: '800' },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  text: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 5 },
  pin: { marginTop: 4 },
  title: { flex: 1, fontSize: font.headline, fontWeight: '700', letterSpacing: -0.2 },
  body: { fontSize: font.body, lineHeight: 22 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', columnGap: 12, rowGap: 2, marginTop: 2 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6, flexShrink: 1 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: font.footnote, fontWeight: '600', flexShrink: 1 },
  actions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  copyBtn: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  check: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
});
