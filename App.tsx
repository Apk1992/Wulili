import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import TrackPlayer from 'react-native-track-player';

import RootNavigator from '@/navigation/RootNavigator';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useShopStore } from '@/store/useShopStore';
import { useMinigameStore } from '@/store/useMinigameStore';
import { useUpdateStore } from '@/store/useUpdateStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useTheme } from '@/hooks/useTheme';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useGitHubAppConfig } from '@/hooks/useGitHubAppConfig';
import { fetchRemoteDialogues } from '@/api/githubDialogues';
import { toGitHubApiError } from '@/api/githubClient';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

void TrackPlayer.setupPlayer({
  autoHandleInterruptions: true,
}).catch(() => undefined);

function AppInner(): React.JSX.Element {
  const { isDark } = useTheme();
  const [ready, setReady] = useState<boolean>(false);

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateWulili = useWuliliStore((s) => s.hydrate);
  const hydrateDialogues = useDialogueStore((s) => s.hydrate);
  const hydrateConfig = useAppConfigStore((s) => s.hydrate);
  const hydrateInventory = useInventoryStore((s) => s.hydrate);
  const hydrateShop = useShopStore((s) => s.hydrate);
  const hydrateMinigame = useMinigameStore((s) => s.hydrate);
  const hydrateUpdate = useUpdateStore((s) => s.hydrate);

  const useRemoteConfig = useSettingsStore((s) => s.settings.useRemoteConfig);
  const useRemoteDialogues = useSettingsStore((s) => s.settings.useRemoteDialogues);

  const { loadToken } = useGitHubToken();
  const configQuery = useGitHubAppConfig(false);
  const setRemoteConfig = useAppConfigStore((s) => s.setRemoteConfig);
  const setRemoteDialogues = useDialogueStore((s) => s.setRemoteDialogues);

  const { promptIfAvailable } = useAppUpdate();

  useGameLoop();

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        await Promise.all([
          hydrateSettings(),
          hydrateWulili(),
          hydrateDialogues(),
          hydrateConfig(),
          hydrateInventory(),
          hydrateShop(),
          hydrateMinigame(),
          hydrateUpdate(),
        ]);
        await loadToken();
      } catch {
        // ignore hydrate errors
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    void (async () => {
      try {
        if (useRemoteConfig) {
          const result = await configQuery.refetch();
          if (!cancelled && result.data) {
            setRemoteConfig(result.data.config);
          }
        }
        if (useRemoteDialogues) {
          const dialogueResult = await fetchRemoteDialogues();
          if (!cancelled) {
            setRemoteDialogues(dialogueResult.file.dialogues);
          }
        }
      } catch (error) {
        const apiError = toGitHubApiError(error);
        if (
          !cancelled &&
          apiError.status !== 0 &&
          apiError.status !== 404
        ) {
          Toast.show({
            type: 'error',
            text1: '无法同步线上内容',
            text2: apiError.message,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, useRemoteConfig, useRemoteDialogues]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      void promptIfAvailable();
    }, 2500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!ready) {
    return (
      <View className="flex-1 bg-background dark:bg-dark-bg items-center justify-center">
        <Text className="text-base text-text dark:text-dark-text font-semibold">
          雾璃专属
        </Text>
        <Text className="text-xs text-muted dark:text-dark-muted mt-2">
          正在准备…
        </Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar
        barStyle={isDark ? 'light-content' : 'dark-content'}
        backgroundColor={isDark ? '#0F172A' : '#F8FAFC'}
      />
      <RootNavigator />
      <Toast />
    </NavigationContainer>
  );
}

export default function App(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <AppInner />
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}