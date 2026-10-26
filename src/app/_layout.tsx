import { Fredoka_700Bold } from '@expo-google-fonts/fredoka/700Bold';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useFonts } from 'expo-font';
import { Stack, router, usePathname } from 'expo-router';
import { ShareIntentProvider, useShareIntentContext } from 'expo-share-intent';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform } from 'react-native';

import { ToastProvider } from '@/components/Toast';
import { UpdatePrompt } from '@/components/UpdatePrompt';
import { useTheme } from '@/lib/theme';
import { useEnsureAiFolders } from '@/lib/useAiApps';
import { CopyPromptProvider } from '@/lib/useCopyPrompt';
import { ProfileProvider } from '@/profile/ProfileProvider';
import { SettingsProvider } from '@/settings/SettingsProvider';
import { HistoryProvider } from '@/store/HistoryProvider';
import { PromptStoreProvider } from '@/store/PromptStore';
import { SyncProvider } from '@/sync/SyncProvider';

// Keep the splash up until the title font is ready, so the home title never flashes in the fallback font.
SplashScreen.preventAutoHideAsync().catch(() => {});

// Receiving shares needs the native module, which web and Expo Go don't have.
const shareDisabled = Platform.OS === 'web' || Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({ Fredoka_700Bold });
  useEffect(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  return (
    <ShareIntentProvider options={{ disabled: shareDisabled, resetOnBackground: true }}>
      <SettingsProvider>
        <PromptStoreProvider>
          <SyncProvider>
            <ProfileProvider>
            <HistoryProvider>
            <ToastProvider>
              <CopyPromptProvider>
                <Navigator />
              </CopyPromptProvider>
            </ToastProvider>
            </HistoryProvider>
            </ProfileProvider>
          </SyncProvider>
        </PromptStoreProvider>
      </SettingsProvider>
    </ShareIntentProvider>
  );
}

function Navigator() {
  const theme = useTheme();
  const pathname = usePathname();
  const { hasShareIntent } = useShareIntentContext();
  useEnsureAiFolders();

  // On Android, shared content arrives through the native module rather than a deep link,
  // so open the Share screen whenever something has been shared and not yet handled.
  useEffect(() => {
    if (hasShareIntent && pathname !== '/share') router.push('/share');
  }, [hasShareIntent, pathname]);

  return (
    <>
      <StatusBar style={theme.dark ? 'light' : 'dark'} />
      <UpdatePrompt />
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
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
        <Stack.Screen name="history/[id]" options={{ title: 'Version history' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="about" options={{ title: 'About' }} />
        <Stack.Screen name="trash" options={{ title: 'Trash' }} />
        <Stack.Screen name="share" options={{ title: 'Save prompt' }} />
      </Stack>
    </>
  );
}
