import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { Platform } from 'react-native';

import { FillTemplateSheet } from '@/components/FillTemplateSheet';
import { useToast } from '@/components/Toast';
import { extractVariables } from '@/lib/templates';
import { usePromptStore } from '@/store/PromptStore';
import type { Prompt } from '@/store/types';

const CopyCtx = createContext<((prompt: Prompt) => void) | null>(null);

type Pending = { prompt: Prompt; variables: string[]; initialValues: Record<string, string> };

// Copies plain prompts straight away; prompts with {{placeholders}} open a fill-in sheet first.
export function CopyPromptProvider({ children }: { children: ReactNode }) {
  const { recordCopy } = usePromptStore();
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);
  // Last values typed per prompt, so re-copying the same template is quick. Kept for this session only.
  const lastValues = useRef<Record<string, Record<string, string>>>({});

  const writeClipboard = useCallback(
    async (prompt: Prompt, text: string) => {
      await Clipboard.setStringAsync(text);
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      recordCopy(prompt.id);
      toast('Copied to clipboard');
    },
    [recordCopy, toast],
  );

  const copy = useCallback(
    (prompt: Prompt) => {
      const variables = extractVariables(prompt.body);
      if (variables.length === 0) writeClipboard(prompt, prompt.body);
      else setPending({ prompt, variables, initialValues: lastValues.current[prompt.id] ?? {} });
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
          onClose={() => setPending(null)}
          onCopy={(text, values) => {
            lastValues.current[pending.prompt.id] = values;
            setPending(null);
            writeClipboard(pending.prompt, text);
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
