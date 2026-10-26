import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { ToastProvider } from '@/components/Toast';
import { useTheme } from '@/lib/theme';
import { CopyPromptProvider } from '@/lib/useCopyPrompt';
import { PromptStoreProvider } from '@/store/PromptStore';
import { SyncProvider } from '@/sync/SyncProvider';

export default function RootLayout() {
  const theme = useTheme();

  return (
    <PromptStoreProvider>
      <SyncProvider>
        <ToastProvider>
          <CopyPromptProvider>
            <StatusBar style="auto" />
            <Stack
              screenOptions={{
                headerStyle: { backgroundColor: theme.bg },
                headerTintColor: theme.text,
                headerShadowVisible: false,
                contentStyle: { backgroundColor: theme.bg },
              }}
            >
              <Stack.Screen name="index" options={{ title: 'Prompts' }} />
              <Stack.Screen name="prompt/[id]" options={{ title: '' }} />
              <Stack.Screen name="categories" options={{ title: 'Categories', presentation: 'modal' }} />
              <Stack.Screen name="account" options={{ title: 'Cloud sync', presentation: 'modal' }} />
            </Stack>
          </CopyPromptProvider>
        </ToastProvider>
      </SyncProvider>
    </PromptStoreProvider>
  );
}
