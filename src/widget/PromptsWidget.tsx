import { FlexWidget, ImageWidget, ListWidget, TextWidget } from 'react-native-android-widget';
import type { ColorProp, WidgetRepresentation } from 'react-native-android-widget';

import { buildTheme } from '@/lib/theme';

import type { WidgetData, WidgetPrompt } from './data';

const NEW_PROMPT = 'promptnotes://prompt/new';
// A prompt with blanks opens its fill-in sheet in the app; the rest copy right from the widget.
const fillUri = (id: string) => `promptnotes://prompt/${id}?copy=1`;
const hex = (c: string) => c as ColorProp;

type Props = { data: WidgetData; dark: boolean; copiedId?: string };

function Row({ prompt, theme, copied }: { prompt: WidgetPrompt; theme: ReturnType<typeof buildTheme>; copied: boolean }) {
  const action = prompt.blanks
    ? { clickAction: 'OPEN_URI', clickActionData: { uri: fillUri(prompt.id) } }
    : { clickAction: 'COPY', clickActionData: { id: prompt.id } };
  return (
    <FlexWidget
      {...action}
      accessibilityLabel={prompt.blanks ? `Fill in and copy ${prompt.title}` : `Copy ${prompt.title}`}
      style={{
        width: 'match_parent',
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6,
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
export function PromptsWidget({ data, dark, copiedId }: Props) {
  const theme = buildTheme(dark, data.accent);
  const locked = data.appLock;
  return (
    <FlexWidget
      style={{ height: 'match_parent', width: 'match_parent', flexDirection: 'column', padding: 12, borderRadius: 24, backgroundColor: hex(theme.card) }}
    >
      <FlexWidget style={{ width: 'match_parent', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingLeft: 4 }}>
        <FlexWidget clickAction="OPEN_APP" accessibilityLabel="Open Prompt Heart" style={{ flexDirection: 'row', alignItems: 'center' }}>
          <ImageWidget image={require('../../assets/widget-icon.png')} imageWidth={24} imageHeight={24} radius={7} />
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
        <ListWidget style={{ height: 'match_parent', width: 'match_parent' }}>
          {data.prompts.map((p) => (
            <Row key={p.id} prompt={p} theme={theme} copied={p.id === copiedId} />
          ))}
        </ListWidget>
      )}
    </FlexWidget>
  );
}

/** Light and dark versions when the app follows the system, otherwise the app's own look. */
export function promptsWidget(data: WidgetData, copiedId?: string): WidgetRepresentation {
  if (data.themeMode === 'light') return <PromptsWidget data={data} dark={false} copiedId={copiedId} />;
  if (data.themeMode === 'dark') return <PromptsWidget data={data} dark copiedId={copiedId} />;
  return { light: <PromptsWidget data={data} dark={false} copiedId={copiedId} />, dark: <PromptsWidget data={data} dark copiedId={copiedId} /> };
}
