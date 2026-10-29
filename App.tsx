import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

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

const queryClient = new QueryClient();

function AppInner() {
  const { isDark } = useTheme();
  const [logs, setLogs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    const run = async (name: string, fn: () => Promise<unknown>) => {
      try {
        if (mounted) setLogs((prev) => [...prev, `准备: ${name}`]);
        await fn();
        if (mounted) setLogs((prev) => [...prev, `✅ 成功: ${name}`]);
      } catch (e: any) {
        if (mounted) setLogs((prev) => [...prev, `❌ 失败: ${name} - ${e?.message || '未知错误'}`]);
      }
    };

    void (async () => {
      await run('settings', useSettingsStore.getState().hydrate);
      await run('wulili', useWuliliStore.getState().hydrate);
      await run('dialogues', useDialogueStore.getState().hydrate);
      await run('config', useAppConfigStore.getState().hydrate);
      await run('inventory', useInventoryStore.getState().hydrate);
      await run('shop', useShopStore.getState().hydrate);
      await run('minigame', useMinigameStore.getState().hydrate);
      await run('update', useUpdateStore.getState().hydrate);
      await run('stream', useStreamStore.getState().hydrate);
      await run('sleep', useSleepStore.getState().hydrate);
      await run('travel', useTravelStore.getState().hydrate);

      if (mounted) {
        setLogs((prev) => [...prev, '🎉 全部加载完成！进入主界面']);
        setReady(true);
      }
    })();

    return () => { mounted = false; };
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E293B', padding: 20, paddingTop: 60 }}>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: 'bold', marginBottom: 20 }}>初始化进度追踪</Text>
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

  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <View style={{ flex: 1, backgroundColor: 'cyan', alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name="game-controller" size={60} color="white" />
        <Text style={{ color: 'white', fontSize: 24, marginTop: 20 }}>主页面框架</Text>
        <Text style={{ color: 'white', fontSize: 16 }}>如果你看到这个，说明页面组件本身没坏</Text>
      </View>
      <Toast />
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
