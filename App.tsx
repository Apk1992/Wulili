import React, { useEffect, useState } from 'react';
import { View, Text, StatusBar } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';

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

const queryClient = new QueryClient();

function AppInner() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void (async () => {
      await useSettingsStore.getState().hydrate();
      await useWuliliStore.getState().hydrate();
      await useDialogueStore.getState().hydrate();
      await useAppConfigStore.getState().hydrate();
      await useInventoryStore.getState().hydrate();
      await useShopStore.getState().hydrate();
      await useMinigameStore.getState().hydrate();
      await useUpdateStore.getState().hydrate();
      await useStreamStore.getState().hydrate();
      await useSleepStore.getState().hydrate();
      await useTravelStore.getState().hydrate();
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

  // 🔥 请回 RootNavigator
  return (
    <NavigationContainer>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <RootNavigator />
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
