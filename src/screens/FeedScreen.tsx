import React, { useCallback, useEffect, useState } from 'react';
import { Alert, RefreshControl, SectionList, Text, View } from 'react-native';
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
import type { Food } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Feed'>;

export function FeedScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const foods = useAppConfigStore((s) => s.config.foods);
  const coins = useWuliliStore((s) => s.state.coins);
  const recordFoodCategory = useWuliliStore((s) => s.recordFoodCategory);
  const markInteraction = useWuliliStore((s) => s.markInteraction);
  const addStats = useWuliliStore((s) => s.addStats);
  const addCoins = useWuliliStore((s) => s.addCoins);

  const healthyFoods = foods.filter((f) => f.category === 'healthy');
  const junkFoods = foods.filter((f) => f.category === 'junk');

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
          useWuliliStore
            .getState()
            .setIllness('rhinitis', 1);
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

  const sections = [
    { title: '营养 · 养身体', data: healthyFoods },
    { title: '放纵 · 好心情', data: junkFoods },
  ].filter((section) => section.data.length > 0);

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-sm text-muted dark:text-dark-muted">
          当前金币
        </Text>
        <Text className="text-base font-bold text-text dark:text-dark-text">
          {formatCoins(coins)}
        </Text>
      </View>

      {foods.length === 0 ? (
        <EmptyView
          title="暂无食物"
          message="配置还没有加载完成，请检查网络或稍后再试。"
          icon="restaurant-outline"
          fullScreen
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
          renderSectionHeader={({ section }) => (
            <View className="py-2 mt-2 flex-row items-center">
              <Ionicons
                name={section.title.startsWith('营养') ? 'leaf' : 'fast-food'}
                size={14}
                color={section.title.startsWith('营养') ? '#10B981' : '#EF4444'}
              />
              <Text className="ml-1.5 text-xs font-semibold text-muted dark:text-dark-muted">
                {section.title}
              </Text>
            </View>
          )}
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
          stickySectionHeadersEnabled={false}
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