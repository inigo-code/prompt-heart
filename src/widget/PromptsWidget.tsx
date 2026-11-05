import { FlexWidget, ImageWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp, WidgetRepresentation } from 'react-native-android-widget';

import { buildTheme } from '@/lib/theme';

import type { WidgetData, WidgetPrompt } from './data';
import { WIDGET_LOGO } from './logo';

const NEW_PROMPT = 'promptnotes://prompt/new';
// A prompt with blanks opens its fill-in sheet in the app; the rest copy right from the widget.
const fillUri = (id: string) => `promptnotes://prompt/${id}?copy=1`;
const hex = (c: string) => c as ColorProp;

// In dp: a row with its gap, and the header and padding around the rows.
const ROW = 64;
const FRAME = 62;

// The rows are part of the card rather than a scrolling ListWidget. A list is placed separately over the card,
// so it slides over the header on launchers where the widget's slot is taller than the size they report.
const rowsThatFit = (height: number) => Math.max(1, Math.floor((height - FRAME) / ROW));

type Props = { data: WidgetData; height: number; dark: boolean; copiedId?: string };

function Row({ prompt, theme, copied, stretch, last }: { prompt: WidgetPrompt; theme: ReturnType<typeof buildTheme>; copied: boolean; stretch: boolean; last: boolean }) {
  const action = prompt.blanks
    ? { clickAction: 'OPEN_URI', clickActionData: { uri: fillUri(prompt.id) } }
    : { clickAction: 'COPY', clickActionData: { id: prompt.id } };
  return (
    <FlexWidget
      {...action}
      accessibilityLabel={prompt.blanks ? `Fill in and copy ${prompt.title}` : `Copy ${prompt.title}`}
      style={{
        width: 'match_parent',
        ...(stretch ? { flex: 1 } : {}),
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: last ? 0 : 6,
        paddingVertical: 10,
        paddingHorizontal: 14,
        borderRadius: 16,
        backgroundColor: hex(copied ? theme.accentSoft : theme.chip),
      }}
    >
      <FlexWidget style={{ flex: 1, flexDirection: 'column' }}>
        <FlexWidget style={{ flexDirection: 'row', alignItems: 'center' }}>
          {prompt.color ? <FlexWidget style={{ width: 8, height: 8, borderRadius: 4, marginRight: 7, backgroundColor: hex(prompt.color) }} /> : null}
          <TextWidget text={prompt.title} maxLines={1} truncate="END" style={{ fontSize: 15, fontWeight: '700', color: hex(theme.text) }} />
        </FlexWidget>
        <TextWidget text={prompt.note} maxLines={1} truncate="END" style={{ fontSize: 12, marginTop: 2, color: hex(theme.textMuted) }} />
      </FlexWidget>
      <TextWidget
        text={copied ? 'Copied' : prompt.blanks ? 'Fill' : 'Copy'}
        style={{ fontSize: 13, fontWeight: '700', marginLeft: 10, color: hex(copied ? theme.text : theme.textMuted) }}
      />
    </FlexWidget>
  );
}

function Message({ title, line, theme }: { title: string; line: string; theme: ReturnType<typeof buildTheme> }) {
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      style={{ flex: 1, width: 'match_parent', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: hex(theme.chip) }}
    >
      <TextWidget text={title} style={{ fontSize: 15, fontWeight: '700', color: hex(theme.text) }} />
      <TextWidget text={line} style={{ fontSize: 13, marginTop: 4, color: hex(theme.textMuted) }} />
    </FlexWidget>
  );
}

/** The Prompts widget: pinned prompts first, one tap to copy. Hides everything while App lock is on. */
export function PromptsWidget({ data, height, dark, copiedId }: Props) {
  const theme = buildTheme(dark, data.accent);
  const locked = data.appLock;
  const fit = rowsThatFit(height);
  const shown = data.prompts.slice(0, fit);
  return (
    <FlexWidget
      clickAction="OPEN_APP"
      accessibilityLabel="Open Prompt Heart"
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', padding: 12, borderRadius: 24, backgroundColor: hex(theme.card) }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 4 }}>
        <FlexWidget clickAction="OPEN_APP" accessibilityLabel="Open Prompt Heart" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ImageWidget image={WIDGET_LOGO as `data:image${string}`} imageWidth={24} imageHeight={24} radius={7} />
          <TextWidget text="Prompt Heart" style={{ fontSize: 15, fontWeight: '700', marginLeft: 8, color: hex(theme.text) }} />
        </FlexWidget>
        {locked ? null : (
          <FlexWidget
            clickAction="OPEN_URI"
            clickActionData={{ uri: NEW_PROMPT }}
            accessibilityLabel="New prompt"
            style={{ width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center', backgroundColor: hex(theme.accent) }}
          >
            <TextWidget text="+" style={{ fontSize: 22, fontWeight: '700', color: hex(theme.accentText) }} />
          </FlexWidget>
        )}
      </FlexWidget>
      {locked ? (
        <Message title="Prompt Heart is locked" line="Tap to unlock" theme={theme} />
      ) : data.prompts.length === 0 ? (
        <Message title="No prompts yet" line="Tap + to write your first" theme={theme} />
      ) : (
        <FlexWidget style={{ flex: 1, width: 'match_parent', flexDirection: 'column' }}>
          {shown.map((p, i) => (
            <Row key={p.id} prompt={p} theme={theme} copied={p.id === copiedId} stretch={shown.length === fit} last={i === shown.length - 1} />
          ))}
        </FlexWidget>
      )}
    </FlexWidget>
  );
}

/** Light and dark versions when the app follows the system, otherwise the app's own look. */
export function promptsWidget(data: WidgetData, height: number, copiedId?: string): WidgetRepresentation {
  const shared = { data, height, copiedId };
  if (data.themeMode === 'light') return <PromptsWidget {...shared} dark={false} />;
  if (data.themeMode === 'dark') return <PromptsWidget {...shared} dark />;
  return { light: <PromptsWidget {...shared} dark={false} />, dark: <PromptsWidget {...shared} dark /> };
}
