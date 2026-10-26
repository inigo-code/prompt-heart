import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Linking, Platform } from 'react-native';

import { FillTemplateSheet } from '@/components/FillTemplateSheet';
import { useToast } from '@/components/Toast';
import type { AiTarget } from '@/lib/ai';
import { extractDefaults, extractVariables } from '@/lib/templates';
import { useSettings } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';
import type { Prompt } from '@/store/types';

type CopyOptions = { openIn?: AiTarget };
type CopyFn = (prompt: Prompt, options?: CopyOptions) => void;

const CopyCtx = createContext<CopyFn | null>(null);

type Pending = { prompt: Prompt; variables: string[]; initialValues: Record<string, string>; options?: CopyOptions };

// Copies only the prompt text (never attached images). Plain prompts copy straight away;
// prompts with {{placeholders}} open a fill-in sheet first.
export function CopyPromptProvider({ children }: { children: ReactNode }) {
  const { recordCopy } = usePromptStore();
  const { settings } = useSettings();
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  // Last values typed per prompt, so re-copying the same template is quick. Kept for this session only.
  const lastValues = useRef<Record<string, Record<string, string>>>({});

  const writeClipboard = useCallback(
    async (prompt: Prompt, text: string, options?: CopyOptions) => {
      await Clipboard.setStringAsync(text);
      if (settings.haptics && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      recordCopy(prompt.id);
      if (options?.openIn) {
        toast(`Copied — opening ${options.openIn.label}`);
        Linking.openURL(options.openIn.url(text)).catch(() => toast(`Couldn't open ${options.openIn?.label}`));
      } else {
        toast('Copied to clipboard');
      }
    },
    [recordCopy, toast, settings.haptics],
  );

  const copy = useCallback<CopyFn>(
    (prompt, options) => {
      const variables = extractVariables(prompt.body);
      if (variables.length === 0) {
        writeClipboard(prompt, prompt.body, options);
        return;
      }
      const initialValues = { ...extractDefaults(prompt.body), ...lastValues.current[prompt.id] };
      setPending({ prompt, variables, initialValues, options });
    },
    [writeClipboard],
  );

  return (
    <CopyCtx.Provider value={copy}>
      {children}
      {pending && (
        <FillTemplateSheet
          prompt={pending.prompt}
          variables={pending.variables}
          initialValues={pending.initialValues}
          actionLabel={pending.options?.openIn ? `Copy & open ${pending.options.openIn.label}` : 'Copy'}
          onClose={() => setPending(null)}
          onCopy={(text, values) => {
            lastValues.current[pending.prompt.id] = values;
            setPending(null);
            writeClipboard(pending.prompt, text, pending.options);
          }}
        />
      )}
    </CopyCtx.Provider>
  );
}

export function useCopyPrompt() {
  const ctx = useContext(CopyCtx);
  if (!ctx) throw new Error('useCopyPrompt must be used inside CopyPromptProvider');
  return ctx;
}
