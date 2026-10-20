// src/screens/FeedScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
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
import EmptyView from '@/components/EmptyView';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { formatCoins } from '@/utils/format';
import type { Food, FoodCategory } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

// 🔥 Cloudflare R2 基础公开地址
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

interface FoodTab {
  key: FoodCategory;
  label: string;
  icon: string;
  activeColor: string;
}

const FOOD_TABS: FoodTab[] = [
  { key: 'healthy', label: '营养', icon: 'leaf', activeColor: '#10B981' },
  { key: 'junk', label: '放纵', icon: 'fast-food', activeColor: '#EF4444' },
];

export function FeedScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<FoodCategory>('healthy');

  const foods = useAppConfigStore((s) => s.config.foods);
  const coins = useWuliliStore((s) => s.state.coins);

  const healthyCount = useMemo(
    () => foods.filter((f) => f.category === 'healthy').length,
    [foods],
  );
  const junkCount = useMemo(
    () => foods.filter((f) => f.category === 'junk').length,
    [foods],
  );

  // 🔥 处理食物列表，自动补全贴图相对路径为 Cloudflare R2 绝对路径
  const visibleFoods = useMemo(() => {
    return foods
      .filter((f) => f.category === activeTab)
      .map((food) => {
        if (!food.image) return food;
        if (food.image.startsWith('http://') || food.image.startsWith('https://')) {
          return food;
        }
        const folder = food.category === 'healthy' ? 'images/food/healthy' : 'images/food/junk';
        const cleanPath = food.image.startsWith('images/')
          ? food.image
          : `${folder}/${food.image.replace(/^\/+/, '')}`;

        return {
          ...food,
          image: `${R2_BASE_URL}/${cleanPath}`,
        };
      });
  }, [foods, activeTab]);

  useEffect(() => {
    if (foods.length === 0) {
      void speak({ forceCategory: 'idle' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [foods.length]);

  const handleSelect = useCallback(
    (food: Food) => {
      navigation.navigate('FoodDetail', { foodId: food.id });
    },
    [navigation],
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
            const iconColor = isActive ? tab.activeColor : '#94A3B8';
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
              onPress={handleSelect}
            />
          )}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

export default FeedScreen;
