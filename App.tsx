import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

// 只引入这一页来测试
import RootNavigator from '@/navigation/RootNavigator'; 
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
    void (async () => {
      await hydrateSettings();
      await hydrateWulili();
      await hydrateDialogues();
      await hydrateConfig();
      await hydrateInventory();
      await hydrateShop();
      await hydrateMinigame();
      await hydrateUpdate();
      await hydrateStream();
      await hydrateSleep();
      await hydrateTravel();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return (
      <View style={{ flex: 1, backgroundColor: '#1E293B', alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: '#FFF' }}>加载中...</Text>
      </View>
    );
  }

  // 🔥 核心替换：把 RootNavigator 暂时替换成纯色，测试是不是路由内部页面白屏
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      
      {/* 把 RootNavigator 换成了下面这个安全的纯色 View */}
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
