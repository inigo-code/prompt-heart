import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Stack } from 'expo-router';
import { ShareIntentProvider } from 'expo-share-intent';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

import { ToastProvider } from '@/components/Toast';
import { useTheme } from '@/lib/theme';
import { CopyPromptProvider } from '@/lib/useCopyPrompt';
import { SettingsProvider } from '@/settings/SettingsProvider';
import { PromptStoreProvider } from '@/store/PromptStore';
import { SyncProvider } from '@/sync/SyncProvider';

// Receiving shares needs the native module, which web and Expo Go don't have.
const shareDisabled = Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function RootLayout() {
  return (
    <ShareIntentProvider options={{ disabled: shareDisabled, resetOnBackground: true }}>
      <SettingsProvider>
        <PromptStoreProvider>
          <SyncProvider>
            <ToastProvider>
              <CopyPromptProvider>
                <Navigator />
              </CopyPromptProvider>
            </ToastProvider>
          </SyncProvider>
        </PromptStoreProvider>
      </SettingsProvider>
    </ShareIntentProvider>
  );
}

function Navigator() {
  const theme = useTheme();
  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.text,
          headerTitleStyle: { fontWeight: '700' },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ title: '' }} />
        <Stack.Screen name="prompt/[id]" options={{ title: '' }} />
        <Stack.Screen name="categories" options={{ title: 'Categories', presentation: 'modal' }} />
        <Stack.Screen name="account" options={{ title: 'Cloud sync' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen name="trash" options={{ title: 'Trash' }} />
        <Stack.Screen name="share" options={{ title: 'Save prompt' }} />
      </Stack>
    </>
  );
}
