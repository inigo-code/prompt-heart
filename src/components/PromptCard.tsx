import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { AppBadge } from '@/components/AppBadge';
import { ImageThumb } from '@/components/ImageThumb';
import type { AiApp } from '@/lib/ai';
import { estimateTokens, extractVariables } from '@/lib/templates';
import type { Theme } from '@/lib/theme';
import type { Folder, Prompt } from '@/store/types';

type Props = {
  prompt: Prompt;
  folder?: Folder;
  theme: Theme;
  variant: 'list' | 'grid';
  previewLines: number;
  showTokens: boolean;
  /** Set for prompts in an AI app's category: shows a button that copies and opens that app. */
  launchApp?: AiApp;
  onLaunch?: (prompt: Prompt, app: AiApp) => void;
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
  showTokens,
  launchApp,
  onLaunch,
  onOpen,
  onCopy,
  onLongPress,
}: Props) {
  const grid = variant === 'grid';
  const vars = extractVariables(prompt.body).length;
  const extraImages = prompt.images.length - 1;

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
          borderColor: prompt.pinned ? theme.accent + '55' : theme.border,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
      ]}
    >
      {folder && <View style={[styles.folderBar, { backgroundColor: folder.color }]} />}

      {prompt.images.length > 0 && (
        <View style={grid ? styles.gridImage : styles.listImages}>
          <ImageThumb id={prompt.images[0]} theme={theme} size={grid ? 1000 : 48} radius={grid ? 10 : 8} style={grid ? styles.gridImageInner : undefined} />
          {extraImages > 0 && (
            <View style={[styles.moreBadge, { backgroundColor: theme.overlay }]}>
              <Text style={styles.moreText}>+{extraImages}</Text>
            </View>
          )}
        </View>
      )}

      <View style={styles.header}>
        <View style={styles.titleRow}>
          {prompt.pinned && <Ionicons name="pin" size={13} color={theme.accent} style={styles.pin} />}
          <Text style={[styles.title, { color: theme.text }]} numberOfLines={grid ? 2 : 1}>
            {prompt.title || 'Untitled'}
          </Text>
        </View>
        <Pressable
          onPress={() => onCopy(prompt)}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={`Copy ${prompt.title || 'prompt'}`}
          style={({ pressed }) => [styles.copyBtn, { backgroundColor: pressed ? theme.accent : theme.accentSoft }]}
        >
          <Ionicons name="copy-outline" size={17} color={theme.text} />
        </Pressable>
      </View>

      {!!prompt.body && (
        <Text style={[styles.body, { color: theme.textMuted }]} numberOfLines={previewLines}>
          {prompt.body}
        </Text>
      )}

      <View style={styles.meta}>
        {folder && (
          <View style={[styles.pill, { backgroundColor: folder.color + '2E' }]}>
            {launchApp ? <AppBadge app={launchApp} size={14} /> : <View style={[styles.dot, { backgroundColor: folder.color }]} />}
            <Text style={[styles.metaText, { color: theme.text }]} numberOfLines={1}>
              {folder.name}
            </Text>
          </View>
        )}
        {vars > 0 && (
          <View style={[styles.pill, { backgroundColor: theme.chip }]}>
            <Ionicons name="code-slash" size={11} color={theme.textMuted} />
            <Text style={[styles.metaText, { color: theme.textMuted }]}>{vars}</Text>
          </View>
        )}
        {prompt.tags.slice(0, grid ? 2 : 4).map((t) => (
          <Text key={t} style={[styles.metaText, { color: theme.textMuted }]} numberOfLines={1}>
            #{t}
          </Text>
        ))}
        {showTokens && !!prompt.body && (
          <Text style={[styles.metaText, styles.tokens, { color: theme.textMuted }]}>~{estimateTokens(prompt.body)} tok</Text>
        )}
      </View>

      {launchApp && onLaunch && (
        <Pressable
          onPress={() => onLaunch(prompt, launchApp)}
          accessibilityRole="button"
          accessibilityLabel={`Copy and open in ${launchApp.label}`}
          style={({ pressed }) => [
            styles.launchBtn,
            { backgroundColor: launchApp.color + (theme.dark ? '33' : '1F'), borderColor: launchApp.color + '66', opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <AppBadge app={launchApp} size={22} />
          <Text style={[styles.launchText, { color: theme.text }]} numberOfLines={1}>
            {grid ? 'Open' : `Open in ${launchApp.label}`}
          </Text>
          <Ionicons name="arrow-forward" size={14} color={theme.text} />
        </Pressable>
      )}
    </Pressable>
  );
});

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    padding: 14,
    paddingLeft: 16,
    gap: 8,
    overflow: 'hidden',
  },
  gridCard: { flex: 1, padding: 12, paddingLeft: 14 },
  folderBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  listImages: { flexDirection: 'row' },
  gridImage: { height: 110, marginBottom: 2 },
  gridImageInner: { width: '100%', height: 110 },
  moreBadge: { position: 'absolute', right: 6, bottom: 6, borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  moreText: { color: '#fff', fontSize: 11, fontWeight: '800' },
  header: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  titleRow: { flex: 1, flexDirection: 'row', alignItems: 'center', minHeight: 34 },
  pin: { marginRight: 5 },
  title: { flex: 1, fontSize: 16, fontWeight: '700', letterSpacing: -0.2 },
  launchBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 7,
    paddingLeft: 5,
    paddingRight: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: 2,
  },
  launchText: { fontSize: 13, fontWeight: '700', flexShrink: 1 },
  copyBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  body: { fontSize: 14, lineHeight: 20 },
  meta: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, maxWidth: 140 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  metaText: { fontSize: 12, fontWeight: '500' },
  tokens: { marginLeft: 'auto' },
});
