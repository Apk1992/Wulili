// App.tsx
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
import { useTravelStore } from '@/store/useTravelStore';
import { useGameLoop } from '@/hooks/useGameLoop';
import { useTheme } from '@/hooks/useTheme';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { storageGet, storageSet } from '@/utils/storage';
import { APP_KILLED_BEHAVIOR } from '@/services/playbackService';

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: 1, refetchOnWindowFocus: false, staleTime: 60 * 1000 } },
});

const PERMISSIONS_ASKED_KEY = '@wulili/permissions-asked';
const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

// 初始化 TrackPlayer (加上安全防护，防止原生模块未就绪导致白屏)
try {
  void (async () => {
    try {
    await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
    await TrackPlayer.updateOptions({
      android: { appKilledPlaybackBehavior: APP_KILLED_BEHAVIOR },
      capabilities: [Capability.Play, Capability.Pause, Capability.Stop, Capability.SkipToNext, Capability.SkipToPrevious, Capability.SeekTo],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext],
    });
    } catch (e) {
      console.warn('TrackPlayer 初始化跳过:', e);
    }
  })();
} catch (e) {
  console.warn('TrackPlayer 同步抛错:', e);
}

function AppInner(): React.JSX.Element {
  const { isDark } = useTheme();
  const [ready, setReady] = useState<boolean>(false);
  const [bootError, setBootError] = useState<string | null>(null);
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
  const hydrateTravel = useTravelStore((s) => s.hydrate);

  const useRemoteConfig = useSettingsStore((s) => s.settings.useRemoteConfig);
  const useRemoteDialogues = useSettingsStore((s) => s.settings.useRemoteDialogues);

  const setRemoteConfig = useAppConfigStore((s) => s.setRemoteConfig);
  const setRemoteDialogues = useDialogueStore((s) => s.setRemoteDialogues);
  const { promptIfAvailable } = useAppUpdate();

  // 启动全局心跳循环
  useGameLoop();

  // 1. 基础数据水合
  useEffect(() => {
    let mounted = true;
    void (async () => {
      const fails: string[] = [];
      const run = async (name: string, fn: () => Promise<unknown>) => {
        try { await fn(); } catch (e) { fails.push(`${name}: ${e instanceof Error ? e.message : 'unknown'}`); }
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
      await run('travel', hydrateTravel);

      if (fails.length > 0) setBootError(fails.join('\n'));
      if (mounted) setReady(true);
    })();
    return () => { mounted = false; };
  }, []);

  // 2. 权限弹窗检查
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const asked = await storageGet<boolean>(PERMISSIONS_ASKED_KEY);
      if (!asked) setShowPermissionGate(true);
    })();
  }, [ready]);

  // 3. R2 内容同步
  useEffect(() => {
    if (!ready) return;
    let cancelled = false;
    
    void (async () => {
      try {
        if (useRemoteConfig) {
          const res = await fetch(`${R2_BASE}/data/config.json?t=${Date.now()}`);
          if (res.ok) {
            const configData = await res.json();
            if (!cancelled) setRemoteConfig(configData);
          }
        }
        if (useRemoteDialogues) {
          const res = await fetch(`${R2_BASE}/dialogue/dialogues.json?t=${Date.now()}`);
          if (res.ok) {
            const dialogueData = await res.json();
            if (!cancelled && dialogueData.dialogues) {
              setRemoteDialogues(dialogueData.dialogues);
            }
          }
        }
      } catch (error) {
        console.warn('R2 内容同步失败:', error);
        if (!cancelled) Toast.show({ type: 'error', text1: '云端内容拉取失败', text2: '请检查网络' });
      }
    })();
    
    return () => { cancelled = true; };
  }, [ready, useRemoteConfig, useRemoteDialogues, setRemoteConfig, setRemoteDialogues]);

  // 4. 检查 App 版本更新
  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => { void promptIfAvailable(); }, 2500);
    return () => clearTimeout(timer);
  }, [ready]);

  const handlePermissionComplete = () => {
    setShowPermissionGate(false);
    void storageSet(PERMISSIONS_ASKED_KEY, true);
  };

  // 数据加载未完成时的安全界面
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFF', fontSize: 16 }}>雾璃专属 · 准备中…</Text>
        {bootError ? (
          <ScrollView style={{ maxHeight: 200, marginTop: 16 }}>
            <Text style={{ color: '#EF4444', fontSize: 12 }}>{bootError}</Text>
          </ScrollView>
        ) : null}
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F172A' : '#F8FAFC'} />
      <RootNavigator />
      <Toast />
      <PermissionGateModal visible={showPermissionGate} onComplete={handlePermissionComplete} />
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
