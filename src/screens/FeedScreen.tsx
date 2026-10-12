import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Pressable,
  RefreshControl,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import FoodItem from '@/components/FoodItem';
import DialogueBubble from '@/components/DialogueBubble';
import EmptyView from '@/components/EmptyView';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAffinity } from '@/hooks/useAffinity';
import { formatCoins } from '@/utils/format';
import type { Food, FoodCategory } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

interface FoodTab {
  key: FoodCategory;
  label: string;
  icon: string;
  activeColor: string;
  inactiveColor: string;
}

const FOOD_TABS: FoodTab[] = [
  {
    key: 'healthy',
    label: '营养',
    icon: 'leaf',
    activeColor: '#10B981',
    inactiveColor: '#94A3B8',
  },
  {
    key: 'junk',
    label: '放纵',
    icon: 'fast-food',
    activeColor: '#EF4444',
    inactiveColor: '#94A3B8',
  },
];

export function FeedScreen({}: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FoodCategory>('healthy');

  const foods = useAppConfigStore((s) => s.config.foods);
  const coins = useWuliliStore((s) => s.state.coins);
  const recordFoodCategory = useWuliliStore((s) => s.recordFoodCategory);
  const markInteraction = useWuliliStore((s) => s.markInteraction);
  const addStats = useWuliliStore((s) => s.addStats);
  const addCoins = useWuliliStore((s) => s.addCoins);

  const healthyCount = useMemo(
    () => foods.filter((f) => f.category === 'healthy').length,
    [foods],
  );
  const junkCount = useMemo(
    () => foods.filter((f) => f.category === 'junk').length,
    [foods],
  );

  const visibleFoods = useMemo(
    () => foods.filter((f) => f.category === activeTab),
    [foods, activeTab],
  );

  useEffect(() => {
    if (foods.length === 0) {
      const line = speak({ forceCategory: 'idle' });
      if (line) setDialogue(line);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods.length]);

  const handleFeed = useCallback(
    (food: Food) => {
      const currentCoins = useWuliliStore.getState().state.coins;
      if (currentCoins < food.price) {
        Alert.alert('金币不足', '先带雾璃去直播赚点钱吧。');
        return;
      }

      addCoins(-food.price);
      addStats({
        hunger: food.effect.hunger,
        mood: food.effect.mood,
        health: food.effect.health,
        energy: food.effect.energy,
        weight: food.effect.weight,
      });
      markInteraction('feed');
      recordFoodCategory(food.category);
      gain(food.category === 'healthy' ? 1 : 0.5);

      const line = speak({
        action: 'feed',
        foodCategory: food.category,
      });
      if (line) setDialogue(line);

      if (food.effect.health < 0) {
        const risk = Math.abs(food.effect.health) * 0.02;
        if (Math.random() < risk) {
          useWuliliStore.getState().setIllness('rhinitis', 1);
          setTimeout(() => {
            Alert.alert('注意', '雾璃的鼻炎好像又犯了……');
          }, 800);
        }
      }
    },
    [addCoins, addStats, gain, markInteraction, recordFoodCategory, speak],
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    useWuliliStore.getState().applyTimeDecay();
    setRefreshing(false);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-sm text-muted dark:text-dark-muted">当前金币</Text>
        <Text className="text-base font-bold text-text dark:text-dark-text">
          {formatCoins(coins)}
        </Text>
      </View>

      <View className="px-4 mb-2">
        <View className="flex-row rounded-2xl p-1 bg-border dark:bg-dark-border">
          {FOOD_TABS.map((tab) => {
            const isActive = tab.key === activeTab;
            const count = tab.key === 'healthy' ? healthyCount : junkCount;
            const iconColor = isActive ? tab.activeColor : tab.inactiveColor;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                className={[
                  'flex-1 flex-row items-center justify-center py-2 rounded-xl',
                  isActive ? 'bg-card dark:bg-dark-card' : 'bg-transparent',
                ].join(' ')}
              >
                <Ionicons name={tab.icon} size={14} color={iconColor} />
                <Text
                  className={[
                    'ml-1 text-xs font-medium',
                    isActive
                      ? 'text-text dark:text-dark-text'
                      : 'text-muted dark:text-dark-muted',
                  ].join(' ')}
                >
                  {tab.label} · {count}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {foods.length === 0 ? (
        <EmptyView
          title="暂无食物"
          message="配置还没有加载完成，请检查网络或稍后再试。"
          icon="restaurant-outline"
          fullScreen
        />
      ) : visibleFoods.length === 0 ? (
        <EmptyView
          title={activeTab === 'healthy' ? '暂无营养食物' : '暂无放纵食物'}
          message="去开发者控制台添加一些吧。"
          icon="restaurant-outline"
          fullScreen
        />
      ) : (
        <FlatList
          data={visibleFoods}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <FoodItem
              food={item}
              affordable={coins >= item.price}
              onPress={handleFeed}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}

      <View className="px-4 pb-3">
        {dialogue ? (
          <DialogueBubble
            dialogue={dialogue}
            onDismiss={() => setDialogue(null)}
            autoDismissMs={9000}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

export default FeedScreen;