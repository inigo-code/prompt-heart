import { Fragment } from 'react';
import type { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { font } from '@/lib/theme';
import type { Theme } from '@/lib/theme';

type Block =
  | { kind: 'p' | 'h' | 'quote'; text: string }
  | { kind: 'bullet'; text: string }
  | { kind: 'numbered'; n: string; text: string }
  | { kind: 'code'; text: string }
  | { kind: 'gap' };

function parse(body: string): Block[] {
  const blocks: Block[] = [];
  const lines = body.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.startsWith('```')) {
      const code: string[] = [];
      for (i++; i < lines.length && !lines[i].startsWith('```'); i++) code.push(lines[i]);
      blocks.push({ kind: 'code', text: code.join('\n') });
      continue;
    }
    let m: RegExpMatchArray | null;
    if (!line.trim()) blocks.push({ kind: 'gap' });
    else if ((m = line.match(/^#{1,6} (.*)$/))) blocks.push({ kind: 'h', text: m[1] });
    else if ((m = line.match(/^[-*] (.*)$/))) blocks.push({ kind: 'bullet', text: m[1] });
    else if ((m = line.match(/^(\d+)\. (.*)$/))) blocks.push({ kind: 'numbered', n: m[1], text: m[2] });
    else if ((m = line.match(/^> ?(.*)$/))) blocks.push({ kind: 'quote', text: m[1] });
    else blocks.push({ kind: 'p', text: line });
  }
  return blocks;
}

const INLINE = /\*\*[^*\n]+\*\*|`[^`\n]+`|\{\{[^}\n]+\}\}|_[^_\n]+_/g;
const WORD = /\w/;

function inline(text: string, theme: Theme): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(INLINE)) {
    const part = m[0];
    const at = m.index ?? 0;
    // _italic_ only at word edges, so snake_case_names stay as they are.
    if (part.startsWith('_') && (WORD.test(text[at - 1] ?? '') || WORD.test(text[at + part.length] ?? ''))) continue;
    if (at > last) out.push(text.slice(last, at));
    const key = out.length;
    if (part.startsWith('**')) out.push(<Text key={key} style={styles.bold}>{part.slice(2, -2)}</Text>);
    else if (part.startsWith('`')) out.push(<Text key={key} style={[styles.mono, { backgroundColor: theme.chip }]}>{part.slice(1, -1)}</Text>);
    else if (part.startsWith('{{')) out.push(<Text key={key} style={[styles.variable, { backgroundColor: theme.accentSoft }]}>{part}</Text>);
    else out.push(<Text key={key} style={styles.italic}>{part.slice(1, -1)}</Text>);
    last = at + part.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

/** A prompt's text, read-only, with its Markdown shown as formatting. Text stays selectable. */
export function PromptText({ body, theme }: { body: string; theme: Theme }) {
  const blocks = parse(body);
  const text = { color: theme.text };
  return (
    <View style={styles.wrap}>
      {blocks.map((b, i) => (
        <Fragment key={i}>
          {b.kind === 'gap' && <View style={styles.gap} />}
          {b.kind === 'p' && <Text selectable style={[styles.p, text]}>{inline(b.text, theme)}</Text>}
          {b.kind === 'h' && <Text selectable accessibilityRole="header" style={[styles.h, text]}>{inline(b.text, theme)}</Text>}
          {(b.kind === 'bullet' || b.kind === 'numbered') && (
            <View style={styles.item}>
              <Text style={[styles.p, styles.marker, { color: theme.textMuted }]}>{b.kind === 'bullet' ? '•' : `${b.n}.`}</Text>
              <Text selectable style={[styles.p, text, { flex: 1 }]}>{inline(b.text, theme)}</Text>
            </View>
          )}
          {b.kind === 'quote' && (
            <View style={[styles.quote, { borderColor: theme.accent }]}>
              <Text selectable style={[styles.p, { color: theme.textMuted }]}>{inline(b.text, theme)}</Text>
            </View>
          )}
          {b.kind === 'code' && (
            <View style={[styles.code, { backgroundColor: theme.chip }]}>
              <Text selectable style={[styles.mono, styles.codeText, text]}>{b.text}</Text>
            </View>
          )}
        </Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingVertical: 8, minHeight: 120 },
  p: { fontSize: font.headline, lineHeight: 24 },
  h: { fontSize: font.title, lineHeight: 28, fontWeight: '800', marginTop: 4 },
  gap: { height: 12 },
  item: { flexDirection: 'row', gap: 8, paddingLeft: 4 },
  marker: { minWidth: 16, textAlign: 'right' },
  quote: { borderLeftWidth: 3, paddingLeft: 12 },
  code: { borderRadius: 10, padding: 12, marginVertical: 4 },
  codeText: { fontSize: font.body, lineHeight: 21 },
  bold: { fontWeight: '800' },
  italic: { fontStyle: 'italic' },
  mono: { fontFamily: 'monospace', fontSize: font.body },
  variable: { fontWeight: '700' },
});
