import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

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
import { useTheme } from '@/hooks/useTheme';
import { storageGet, storageSet } from '@/utils/storage';

const queryClient = new QueryClient();
const PERMISSIONS_ASKED_KEY = '@wulili/permissions-asked';

function AppInner() {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [showPermissionGate, setShowPermissionGate] = useState(false);

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

  // 1. 基础数据水合
  useEffect(() => {
    let mounted = true;
    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        if (mounted) setLogs((prev) => [...prev, `准备加载: ${name}`]);
        await fn();
        if (mounted) setLogs((prev) => [...prev, `✅ 成功: ${name}`]);
      } catch (e: any) {
        if (mounted) setLogs((prev) => [...prev, `❌ 失败: ${name} - ${e.message}`]);
      }
    };

    void (async () => {
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
      
      if (mounted) setReady(true);
    })();

    return () => { mounted = false; };
  }, []);

  // 2. 权限弹窗检查 (不依赖网络)
  useEffect(() => {
    if (!ready) return;
    void (async () => {
      const asked = await storageGet<boolean>(PERMISSIONS_ASKED_KEY);
      if (!asked) setShowPermissionGate(true);
    })();
  }, [ready]);

  const handlePermissionComplete = () => {
    setShowPermissionGate(false);
    void storageSet(PERMISSIONS_ASKED_KEY, true);
  };

  // 加载中页面
  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E293B', padding: 20, paddingTop: 60 }}>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>初始化测试中...</Text>
        <ScrollView>
          {logs.map((log, i) => (
            <Text key={i} style={{ color: log.includes('❌') ? '#EF4444' : '#10B981', fontSize: 14, marginBottom: 8 }}>
              {log}
            </Text>
          ))}
        </ScrollView>
      </View>
    );
  }

  // 核心渲染：这里极其容易报错导致白屏
  return (
    <NavigationContainer>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={isDark ? '#0F172A' : '#F8FAFC'} />
      {/* 如果你去掉 RootNavigator 换成一个简单的 Text 能看到字，说明是页面组件的问题 */}
      <RootNavigator />
      <Toast />
      <PermissionGateModal visible={showPermissionGate} onComplete={handlePermissionComplete} />
    </NavigationContainer>
  );
}

export default function App() {
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
