import React, { useEffect, useState } from 'react';
import { StatusBar, View, Text, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import TrackPlayer, { Capability } from 'react-native-track-player';

import RootNavigator from '@/navigation/RootNavigator';
import PermissionGateModal from '@/components/PermissionGateModal';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useInventoryStore } from '@/store/useInventoryStore';
import { useShopStore } from '@/store/useShopStore';
import { useMinigameStore } from '@/store/useMinigameStore';
import { useUpdateStore } from '@/store/useUpdateStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useTheme } from '@/hooks/useTheme';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useGitHubAppConfig } from '@/hooks/useGitHubAppConfig';
import { fetchRemoteDialogues } from '@/api/githubDialogues';
import {
  toGitHubApiError,
  setGitHubToken,
} from '@/api/githubClient';
import { EMBEDDED_GH_TOKEN } from '@/config/embedded';
import { storageGet, storageSet } from '@/utils/storage';
import { APP_KILLED_BEHAVIOR } from '@/services/playbackService';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 60 * 1000,
    },
  },
});

const PLACEHOLDER = '__WULILI_GH_TOKEN__';
const PERMISSIONS_ASKED_KEY = '@wulili/permissions-asked';

// TrackPlayer 只在 App 启动时初始化一次
void (async () => {
  try {
    const isSetup = await TrackPlayer.isServiceRunning();
    if (!isSetup) {
      await TrackPlayer.setupPlayer({
        autoHandleInterruptions: true,
      });
      await TrackPlayer.updateOptions({
        android: {
          appKilledPlaybackBehavior: APP_KILLED_BEHAVIOR,
        },
        capabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
          Capability.SeekTo,
        ],
        compactCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.SkipToNext,
        ],
        notificationCapabilities: [
          Capability.Play,
          Capability.Pause,
          Capability.Stop,
          Capability.SkipToNext,
          Capability.SkipToPrevious,
        ],
      });
    }
  } catch (error) {
    console.warn('[App] TrackPlayer setup failed:', error);
  }
})();

function AppInner(): React.JSX.Element {
  const { isDark } = useTheme();
  const [ready, setReady] = useState<boolean>(false);
  const [bootError, setBootError] = useState<string | null>(null);
  const [hasToken, setHasToken] = useState<boolean>(false);
  const [showPermissionGate, setShowPermissionGate] = useState<boolean>(false);

  const hydrateSettings = useSettingsStore((s) => s.hydrate);
  const hydrateWulili = useWuliliStore((s) => s.hydrate);
  const hydrateDialogues = useDialogueStore((s) => s.hydrate);
  const hydrateConfig = useAppConfigStore((s) => s.hydrate);
  const hydrateInventory = useInventoryStore((s) => s.hydrate);
  const hydrateShop = useShopStore((s) => s.hydrate);
  const hydrateMinigame = useMinigameStore((s) => s.hydrate);
  const hydrateUpdate = useUpdateStore((s) => s.hydrate);
  const hydrateStream = useStreamStore((s) => s.hydrate);
  const hydrateSleep = useSleepStore((s) => s.hydrate);

  const useRemoteConfig = useSettingsStore((s) => s.settings.useRemoteConfig);
  const useRemoteDialogues = useSettingsStore(
    (s) => s.settings.useRemoteDialogues,
  );

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
      await run('stream', hydrateStream);
      await run('sleep', hydrateSleep);

      const embedded =
        typeof EMBEDDED_GH_TOKEN === 'string'
          ? EMBEDDED_GH_TOKEN.trim()
          : '';
      const embeddedValid = embedded.length > 0 && embedded !== PLACEHOLDER;

      if (embeddedValid) {
        setGitHubToken(embedded);
        if (mounted) setHasToken(true);
      } else {
        try {
          const fromKeychain = await loadToken();
          if (fromKeychain && fromKeychain.length > 0) {
            setGitHubToken(fromKeychain);
            if (mounted) setHasToken(true);
          }
        } catch {
          // ignore
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

  // 首次启动检查权限
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const asked = await storageGet<boolean>(PERMISSIONS_ASKED_KEY);
      if (!asked) {
        setShowPermissionGate(true);
      }
    })();
  }, [ready]);

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

  const handlePermissionComplete = () => {
    setShowPermissionGate(false);
    void storageSet(PERMISSIONS_ASKED_KEY, true);
  };

  if (!ready) {
    return (
      <View className="flex-1 bg-background dark:bg-dark-bg items-center justify-center px-6">
        <Text className="text-base text-text dark:text-dark-text font-semibold">
          雾璃专属
        </Text>
        <Text className="text-xs text-muted dark:text-dark-muted mt-2">
          正在准备…
        </Text>
        {bootError ? (
          <ScrollView style={{ maxHeight: 200, marginTop: 16 }}>
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
      <PermissionGateModal
        visible={showPermissionGate}
        onComplete={handlePermissionComplete}
      />
      {!hasToken ? (
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            padding: 8,
            backgroundColor: '#EF4444',
          }}
        >
          <Text style={{ color: 'white', fontSize: 11, textAlign: 'center' }}>
            未检测到 GitHub Token · App 将无法读取私有仓库
          </Text>
        </View>
      ) : null}
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