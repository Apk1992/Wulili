
import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ScrollView, NativeModules } from 'react-native';
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
import { toGitHubApiError, setGitHubToken, getGitHubToken } from '@/api/githubClient';

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

function readEmbeddedToken(): string | null {
  try {
    const buildConfig = NativeModules?.BuildConfig as
      | { WULILI_GH_TOKEN?: string }
      | undefined;
    if (buildConfig?.WULILI_GH_TOKEN && buildConfig.WULILI_GH_TOKEN.length > 0) {
      return buildConfig.WULILI_GH_TOKEN;
    }
  } catch {
    // ignore
  }
  return null;
}

function AppInner(): React.JSX.Element {
  const { isDark } = useTheme();
  const [ready, setReady] = useState<boolean>(false);
  const [bootError, setBootError] = useState<string | null>(null);

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
      const fails: string[] = [];
      const run = async (name: string, fn: () => Promise<unknown>) => {
        try {
          await fn();
        } catch (e) {
          fails.push(`${name}: ${e instanceof Error ? e.message : 'unknown'}`);
        }
      };

      await run('settings', hydrateSettings);
      await run('wulili', hydrateWulili);
      await run('dialogues', hydrateDialogues);
      await run('config', hydrateConfig);
      await run('inventory', hydrateInventory);
      await run('shop', hydrateShop);
      await run('minigame', hydrateMinigame);
      await run('update', hydrateUpdate);

      // Token 优先级：embedded > keychain
      // 1. 先尝试 BuildConfig 里的（打包时注入）
      const embeddedFromBuildConfig = readEmbeddedToken();
      if (embeddedFromBuildConfig) {
        setGitHubToken(embeddedFromBuildConfig);
      } else {
        // 2. embedded.ts 里的（sed 替换后的 JS 常量）
        const embeddedFromJs = getGitHubToken();
        if (embeddedFromJs && embeddedFromJs !== '__WULILI_GH_TOKEN__') {
          // 已经有值（githubClient 初始化时读的 embedded.ts），不用动
        } else {
          // 3. 兜底：读 keychain（用户手动输入过的）
          try {
            await loadToken();
          } catch {
            // ignore
          }
        }
      }

      if (fails.length > 0) {
        setBootError(fails.join('\n'));
      }

      if (mounted) setReady(true);
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
        if (!cancelled && apiError.status !== 404) {
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
        {bootError ? (
          <ScrollView
            style={{ maxHeight: 200, marginTop: 16, paddingHorizontal: 24 }}
          >
            <Text className="text-[10px] text-danger">{bootError}</Text>
          </ScrollView>
        ) : null}
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