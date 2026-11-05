import * as Clipboard from 'expo-clipboard';
import type { WidgetTaskHandlerProps } from 'react-native-android-widget';

import { logWidgetRun, queueWidgetCopy, readWidgetData } from './data';
import { promptsWidget } from './PromptsWidget';

const COPIED_FOR_MS = 1800;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Runs in the background whenever the widget is added, resized, updated or tapped. */
export async function widgetTaskHandler(props: WidgetTaskHandlerProps) {
  const { widgetAction, widgetInfo } = props;
  if (widgetAction === 'WIDGET_DELETED') return;
  const entry = { at: Date.now(), action: widgetAction, height: widgetInfo.height };
  await logWidgetRun({ ...entry, action: `${widgetAction} started` });
  try {
    await draw(props);
    await logWidgetRun(entry);
  } catch (e) {
    await logWidgetRun({ ...entry, error: e instanceof Error ? e.message : String(e) });
    throw e;
  }
}

async function draw({ widgetInfo, widgetAction, clickAction, clickActionData, renderWidget }: WidgetTaskHandlerProps) {
  const data = await readWidgetData();
  const prompt = clickAction === 'COPY' ? data.prompts.find((p) => p.id === clickActionData?.id) : undefined;
  if (widgetAction !== 'WIDGET_CLICK' || !prompt || data.appLock) {
    renderWidget(promptsWidget(data, widgetInfo.height));
    return;
  }
  // Copy straight from the home screen, mark the row for a moment, and let the app count it later.
  await Clipboard.setStringAsync(prompt.body);
  await queueWidgetCopy(prompt.id);
  renderWidget(promptsWidget(data, widgetInfo.height, prompt.id));
  await wait(COPIED_FOR_MS);
  renderWidget(promptsWidget(data, widgetInfo.height));
}
