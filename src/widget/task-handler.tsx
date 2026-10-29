import * as Clipboard from 'expo-clipboard';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { queueWidgetCopy, readWidgetData } from './data';
import { promptsWidget } from './PromptsWidget';

const COPIED_FOR_MS = 1800;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs in the background whenever the widget is added, resized, updated or tapped. */
export async function widgetTaskHandler({ widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === 'WIDGET_DELETED') return;
  const data = await readWidgetData();
  const prompt = clickAction === 'COPY' ? data.prompts.find((p) => p.id === clickActionData?.id) : undefined;
  if (widgetAction !== 'WIDGET_CLICK' || !prompt || data.appLock) {
    renderWidget(promptsWidget(data));
    return;
  }
  // Copy straight from the home screen, mark the row for a moment, and let the app count it later.
  await Clipboard.setStringAsync(prompt.body);
  await queueWidgetCopy(prompt.id);
  renderWidget(promptsWidget(data, prompt.id));
  await wait(COPIED_FOR_MS);
  renderWidget(promptsWidget(data));
}
