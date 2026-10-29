import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// 引入所有 Store
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

const queryClient = new QueryClient();

function AppInner() {
  const [logs, setLogs] = useState<string[]>([]);
  const [ready, setReady] = useState(false);

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

  return (
    <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold' }}>
        所有数据加载完毕！
      </Text>
    </View>
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
