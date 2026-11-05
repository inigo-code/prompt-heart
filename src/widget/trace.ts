import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState } from 'react-native';

import { WIDGET_BOOT_KEY } from './data';

// Notes the time whenever the app's code starts without the app on screen, which is how the widget draws
// with the app closed. Shown under About in test builds, to tell "never started" from "started and failed".
if (AppState.currentState !== 'active') AsyncStorage.setItem(WIDGET_BOOT_KEY, String(Date.now())).catch(() => {});
