import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { AppState, Platform, Share } from 'react-native';

import { FillTemplateSheet } from '@/components/FillTemplateSheet';
import { useToast } from '@/components/Toast';
import type { AiApp } from '@/lib/ai';
import { forgetBlanks, parseBlankMemory, rememberBlanks } from '@/lib/blankValues';
import type { BlankMemory } from '@/lib/blankValues';
import { openAiApp } from '@/lib/launch';
import { readWithRetries } from '@/lib/readRetry';
import { BLANKS_STORAGE_KEY } from '@/lib/storageKeys';
import { extractDefaults, extractVariables } from '@/lib/templates';
import { LIBRARY_ID_PREFIX } from '@/library/prompts';
import { useActivity } from '@/profile/ActivityProvider';
import { useSettings } from '@/settings/SettingsProvider';
import { usePromptStore } from '@/store/PromptStore';
import type { Prompt } from '@/store/types';

type CopyOptions = { openIn?: AiApp };
type CopyFn = (prompt: Prompt, options?: CopyOptions) => void;
type ShareFn = (prompt: Prompt) => void;

const CopyCtx = createContext<CopyFn | null>(null);
const ExtrasCtx = createContext<{ share: ShareFn; forgetAllBlanks: () => void } | null>(null);

/** The web preview can only share where the browser offers it; the phone always can. */
export const canShare = Platform.OS !== 'web' || (typeof navigator !== 'undefined' && typeof navigator.share === 'function');

type Pending = { prompt: Prompt; variables: string[]; initialValues: Record<string, string>; options?: CopyOptions; share?: boolean };

// Copies only the prompt text (never attached images). Plain prompts copy straight away;
// prompts with {{placeholders}} open a fill-in sheet first. Sharing works the same way.
export function CopyPromptProvider({ children }: { children: ReactNode }) {
  const { ready, pruneSafe, prompts, trash, recordCopy } = usePromptStore();
  const { logCopy } = useActivity();
  const { settings } = useSettings();
  const toast = useToast();
  const [pending, setPending] = useState<Pending | null>(null);

  // Last values typed per prompt, so re-copying the same template is quick. Saved on this phone only.
  const blanks = useRef<BlankMemory>({});
  const [blanksLoaded, setBlanksLoaded] = useState(false);
  // Only once the saved values are read: writing before that would put this session's few over them.
  const canSave = useRef(false);
  const writeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const writeBlanks = useCallback(() => {
    if (writeTimer.current) clearTimeout(writeTimer.current);
    writeTimer.current = null;
    AsyncStorage.setItem(BLANKS_STORAGE_KEY, JSON.stringify(blanks.current)).catch(() => {});
  }, []);

  const setBlanks = useCallback(
    (next: BlankMemory) => {
      if (next === blanks.current) return;
      blanks.current = next;
      if (!canSave.current) return;
      if (writeTimer.current) clearTimeout(writeTimer.current);
      writeTimer.current = setTimeout(writeBlanks, 500);
    },
    [writeBlanks],
  );

  useEffect(() => {
    readWithRetries(() => AsyncStorage.getItem(BLANKS_STORAGE_KEY)).then(
      (raw) => {
        if (canSave.current) return; // all forgotten while this was loading
        // Anything typed in the moments before this loaded is newer, so it wins.
        const typed = blanks.current;
        blanks.current = { ...parseBlankMemory(raw), ...typed };
        canSave.current = true;
        if (Object.keys(typed).length > 0) writeBlanks();
        setBlanksLoaded(true);
      },
      // The phone couldn't read them: what's typed now is remembered until the app closes, and not saved.
      () => {},
    );
  }, [writeBlanks]);

  // Android can end the app soon after it leaves the screen (often straight after "Copy & open in").
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state !== 'active' && writeTimer.current) writeBlanks();
    });
    return () => sub.remove();
  }, [writeBlanks]);

  // A prompt deleted for good (here or on another device) takes its typed values with it. Prompts in
  // Trash keep theirs, and so do library prompts, which aren't saved as prompts.
  useEffect(() => {
    if (!ready || !pruneSafe || !blanksLoaded) return;
    const known = new Set([...prompts, ...trash].map((p) => p.id));
    setBlanks(forgetBlanks(blanks.current, (id) => id.startsWith(LIBRARY_ID_PREFIX) || known.has(id)));
  }, [ready, pruneSafe, blanksLoaded, prompts, trash, setBlanks]);

  // Saved even if the saved values couldn't be read, since removing them is the point.
  const forgetAllBlanks = useCallback(() => {
    canSave.current = true;
    blanks.current = {};
    writeBlanks();
    setBlanksLoaded(true);
  }, [writeBlanks]);

  const writeClipboard = useCallback(
    async (prompt: Prompt, text: string, options?: CopyOptions) => {
      await Clipboard.setStringAsync(text);
      if (settings.haptics && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      }
      recordCopy(prompt.id);
      const app = options?.openIn;
      logCopy(app?.key);
      if (app) {
        openAiApp(app, text)
          .then((how) =>
            toast(
              how === 'app'
                ? `Copied — long-press and paste in ${app.label}`
                : how === 'web-prefilled'
                  ? `Copied — opening ${app.label}`
                  : `Copied — paste it in ${app.label}`,
            ),
          )
          .catch(() => toast(`Couldn't open ${app.label}`));
      } else {
        toast('Copied to clipboard');
      }
    },
    [recordCopy, logCopy, toast, settings.haptics],
  );

  // The same text Copy gives; the title goes along as the subject, for apps like email that use one.
  const shareText = useCallback(
    (prompt: Prompt, text: string) => {
      Share.share({ message: text, ...(prompt.title ? { title: prompt.title } : {}) }, { dialogTitle: 'Share prompt' }).catch((e: unknown) => {
        // Closing the browser's share box isn't a failure.
        if ((e as { name?: string } | null)?.name !== 'AbortError') toast("Couldn't share this prompt");
      });
    },
    [toast],
  );

  const start = useCallback(
    (prompt: Prompt, finish: (text: string) => void, extra: Pick<Pending, 'options' | 'share'>) => {
      const variables = extractVariables(prompt.body);
      if (variables.length === 0) {
        finish(prompt.body);
        return;
      }
      const initialValues = { ...extractDefaults(prompt.body), ...blanks.current[prompt.id]?.values };
      setPending({ prompt, variables, initialValues, ...extra });
    },
    [],
  );

  const copy = useCallback<CopyFn>(
    (prompt, options) => start(prompt, (text) => writeClipboard(prompt, text, options), { options }),
    [start, writeClipboard],
  );

  const share = useCallback<ShareFn>((prompt) => start(prompt, (text) => shareText(prompt, text), { share: true }), [start, shareText]);

  const extras = useMemo(() => ({ share, forgetAllBlanks }), [share, forgetAllBlanks]);

  return (
    <CopyCtx.Provider value={copy}>
      <ExtrasCtx.Provider value={extras}>
        {children}
        {pending && (
          <FillTemplateSheet
            prompt={pending.prompt}
            variables={pending.variables}
            initialValues={pending.initialValues}
            verb={pending.share ? 'Share' : 'Copy'}
            actionLabel={pending.options?.openIn ? `Copy & open in ${pending.options.openIn.label}` : undefined}
            onClose={() => setPending(null)}
            onCopy={(text, values) => {
              setBlanks(rememberBlanks(blanks.current, pending.prompt.id, values, Date.now()));
              if (pending.share) shareText(pending.prompt, text);
              else writeClipboard(pending.prompt, text, pending.options);
            }}
          />
        )}
      </ExtrasCtx.Provider>
    </CopyCtx.Provider>
  );
}

export function useCopyPrompt() {
  const ctx = useContext(CopyCtx);
  if (!ctx) throw new Error('useCopyPrompt must be used inside CopyPromptProvider');
  return ctx;
}

function useExtras() {
  const ctx = useContext(ExtrasCtx);
  if (!ctx) throw new Error('useSharePrompt must be used inside CopyPromptProvider');
  return ctx;
}

/** Opens the share sheet with the prompt's text (filling in its blanks first, like Copy). */
export const useSharePrompt = () => useExtras().share;

/** Forgets every value typed into blanks on this phone (used when erasing the device's prompts). */
export const useForgetAllBlanks = () => useExtras().forgetAllBlanks;
