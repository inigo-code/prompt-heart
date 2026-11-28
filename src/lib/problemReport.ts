// "Report a problem": opens an email to Inigo with the app's version, the phone's model and the last few errors
// (problemLog.ts). The person sees all of it in their email app and nothing is sent until they tap Send. No
// tracking, no prompts, notes or other things people wrote.
//
// MASTER COPY: Heart Apps\Tools\expo\problem-report\. Change it there, then run sync_problem_report.py, which copies
// it into every Heart Apps Expo app's src/lib/.

import Constants from 'expo-constants';
import { File, Paths } from 'expo-file-system';
import * as Updates from 'expo-updates';
import { Linking, Platform } from 'react-native';

import { noteError, recentErrors, restoreErrors, type NotedError } from './problemLog';

export const PROBLEM_EMAIL = 'inigo@tosstheworld.org';

type ErrorUtilsLike = {
  getGlobalHandler: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler: (handler: (error: unknown, isFatal?: boolean) => void) => void;
};

const logFile = () => new File(Paths.document, 'problem-log.json');

function save(notes: NotedError[]) {
  try {
    const file = logFile();
    if (!file.exists) file.create();
    file.writeSync(JSON.stringify(notes));
  } catch {
    // Keeping notes must never cause a problem of its own.
  }
}

let started = false;

/** Call once when the app starts (the root layout): keeps the notes across restarts, and notes crashes. */
export function startProblemLog() {
  if (started) return;
  started = true;
  if (Platform.OS !== 'web') {
    let saved: unknown = [];
    try {
      const file = logFile();
      if (file.exists) saved = JSON.parse(file.textSync());
    } catch {
      // Unreadable: start again.
    }
    restoreErrors(saved, save);
  }
  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;
  if (errorUtils) {
    const previous = errorUtils.getGlobalHandler();
    errorUtils.setGlobalHandler((error, isFatal) => {
      noteError(error, isFatal ? 'crash' : 'uncaught', !!isFatal);
      previous(error, isFatal);
    });
  }
}

const two = (n: number) => String(n).padStart(2, '0');
const when = (at: number) => {
  const d = new Date(at);
  return `${d.getFullYear()}-${two(d.getMonth() + 1)}-${two(d.getDate())} ${two(d.getHours())}:${two(d.getMinutes())}`;
};

function phone(): string {
  if (Platform.OS === 'web') return 'Web browser';
  const c = Platform.constants as { Manufacturer?: string; Brand?: string; Model?: string; Release?: string };
  if (Platform.OS !== 'android') return `${Platform.OS} ${Platform.Version}`;
  const maker = (c.Manufacturer || c.Brand || '').replace(/^./, (x) => x.toUpperCase());
  return `${maker} ${c.Model ?? ''}`.trim() + `, Android ${c.Release ?? Platform.Version}`;
}

/** The email's text: room to write first, then the details, all visible before sending. */
export function problemReportBody(intro = 'What happened, and what did you expect?'): string {
  const config = Constants.expoConfig;
  const build = Updates.isEmbeddedLaunch || !Updates.updateId ? 'as installed' : `update ${Updates.updateId.slice(0, 8)}`;
  const errors = recentErrors().map((n) => `${when(n.at)} ${n.where ? `${n.where}: ` : ''}${n.text}`);
  return [
    intro,
    '',
    '',
    '',
    '———',
    `${config?.name ?? 'App'} ${config?.version ?? ''} (${build}${Updates.channel ? `, ${Updates.channel}` : ''})`,
    `Phone: ${phone()}`,
    'Recent errors:',
    ...(errors.length ? errors : ['None noted']),
    '',
    'This email holds only what you see here. Nothing is sent until you tap Send.',
  ].join('\n');
}

/** Opens the email. Resolves false when the phone has no email app to open it with. */
export async function reportProblem(intro?: string): Promise<boolean> {
  const name = Constants.expoConfig?.name ?? 'Heart Apps';
  const url = `mailto:${PROBLEM_EMAIL}?subject=${encodeURIComponent(`${name}: a problem`)}&body=${encodeURIComponent(problemReportBody(intro))}`;
  try {
    await Linking.openURL(url);
    return true;
  } catch {
    return false;
  }
}
