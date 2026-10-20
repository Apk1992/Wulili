// src/screens/FoodDetailScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import RemoteImage from '@/components/RemoteImage';
import Button from '@/components/Button';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogue } from '@/hooks/useDialogue';
import { useAffinity } from '@/hooks/useAffinity';
import { formatCoins } from '@/utils/format';
import { FULL_HUNGER_THRESHOLD, MAX_CONSECUTIVE_DESSERT } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'FoodDetail'>;

// 🔥 Cloudflare R2 专属公开存储桶地址
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function FoodDetailScreen({ route, navigation }: Props): React.JSX.Element {
  const { foodId } = route.params;
  const { height: screenHeight } = useWindowDimensions();

  const food = useAppConfigStore((s) => s.getFoodById(foodId));
  const coins = useWuliliStore((s) => s.state.coins);
  const hunger = useWuliliStore((s) => s.state.stats.hunger);
  const consecutiveDessert = useWuliliStore((s) => s.state.consecutiveDessert);
  const addCoins = useWuliliStore((s) => s.addCoins);
  const addStats = useWuliliStore((s) => s.addStats);
  const markInteraction = useWuliliStore((s) => s.markInteraction);
  const recordFoodCategory = useWuliliStore((s) => s.recordFoodCategory);
  const recordDessert = useWuliliStore((s) => s.recordDessert);

  const { speak } = useDialogue();
  const { gain } = useAffinity();
  
  // 🔥 只存纯文本，彻底避免对象引发报错
  const [dialogueText, setDialogueText] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 🔥 自动拼装食物图片指向 Cloudflare R2 节点
  const imageUrl = useMemo(() => {
    if (!food || !food.image) return null;
    if (food.image.startsWith('http://') || food.image.startsWith('https://')) {
      return food.image;
    }
    const folder = food.category === 'healthy' ? 'images/food/healthy' : 'images/food/junk';
    const cleanPath = food.image.startsWith('images/')
      ? food.image
      : `${folder}/${food.image.replace(/^\/+/, '')}`;
    return `${R2_BASE_URL}/${cleanPath}`;
  }, [food]);

  if (!food) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted dark:text-dark-muted">找不到这道食物</Text>
        </View>
      </ScreenContainer>
    );
  }

  const affordable = coins >= food.price;
  const isHealthy = food.category === 'healthy';
  const isDessert = food.isDessert === true;
  const isFull = hunger >= FULL_HUNGER_THRESHOLD;
  const dessertLimitReached = consecutiveDessert >= MAX_CONSECUTIVE_DESSERT;

  let blockReason: string | null = null;
  if (isDessert && dessertLimitReached) {
    blockReason = `她已经连续吃了 ${MAX_CONSECUTIVE_DESSERT} 个甜点，不能再吃了。`;
  } else if (!isDessert && isFull) {
    blockReason = '她已经吃饱了，吃不下正餐了。';
  }

  const canFeed = !blockReason;

  const handleConfirm = async () => {
    if (submitting) return;
    if (!affordable) return Alert.alert('金币不足', '先带雾璃去直播赚点钱吧。');
    if (!canFeed) return Alert.alert('她吃不下了', blockReason ?? '');

    setSubmitting(true);
    try {
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
      if (isDessert) recordDessert();
      gain(food.category === 'healthy' ? 1 : 0.5);

      // 🔥 安全提取字符串，避免对象解析
      const line = speak({ action: 'feed', foodCategory: food.category });
      const text = typeof line === 'string' ? line : (line as any)?.text || '谢谢你的投喂...';
      setDialogueText(text);

      if (food.effect.health < 0) {
        if (Math.random() < Math.abs(food.effect.health) * 0.02) {
          useWuliliStore.getState().setIllness('rhinitis', 1);
          setTimeout(() => Alert.alert('注意', '雾璃的鼻炎好像又犯了……'), 800);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleCloseModal = () => {
    setDialogueText(null);
    navigation.goBack();
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="w-full bg-card dark:bg-dark-card items-center justify-center"
          style={{ height: screenHeight * 0.55 }}
        >
          <RemoteImage
            uri={imageUrl}
            width={screenHeight * 0.45}
            height={screenHeight * 0.45}
            resizeMode="contain"
            fallbackIcon="restaurant"
            className="bg-transparent dark:bg-transparent"
          />
        </View>

        <View className="px-4 pt-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-text dark:text-dark-text flex-1">
              {food.name}
            </Text>
            <View
              className={[
                'px-2 py-0.5 rounded-md mr-1',
                isHealthy ? 'bg-success/15' : 'bg-danger/15',
              ].join(' ')}
            >
              <Text
                className={[
                  'text-[10px] font-semibold',
                  isHealthy ? 'text-success' : 'text-danger',
                ].join(' ')}
              >
                {isHealthy ? '营养' : '放纵'}
              </Text>
            </View>
            {isDessert ? (
              <View className="px-2 py-0.5 rounded-md bg-warning/15">
                <Text className="text-[10px] font-semibold text-warning">甜点</Text>
              </View>
            ) : null}
          </View>

          <Text className="text-sm text-muted dark:text-dark-muted mt-2 leading-5">
            {food.description}
          </Text>

          <View className="mt-3 flex-row items-center">
            <Ionicons name="cash" size={16} color="#2563EB" />
            <Text className="ml-1 text-base font-bold text-primary">
              {formatCoins(food.price)}
            </Text>
            <Text className="ml-3 text-xs text-muted dark:text-dark-muted">
              当前金币 {formatCoins(coins)}
            </Text>
          </View>
        </View>

        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
            效果
          </Text>
          <View className="rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border p-3">
            <EffectRow icon="restaurant" label="饱食" value={food.effect.hunger} color="#2563EB" />
            <EffectRow icon="happy" label="心情" value={food.effect.mood} color="#10B981" />
            <EffectRow icon="heart" label="健康" value={food.effect.health} color="#EF4444" />
            <EffectRow icon="flash" label="精力" value={food.effect.energy} color="#F59E0B" />
            <EffectRow icon="scale" label="体重" value={food.effect.weight} color="#8B5CF6" unit="kg" decimals={2} />
          </View>
        </View>

        {blockReason ? (
          <View className="px-4 mt-3">
            <View className="rounded-2xl bg-warning/15 px-3 py-2 flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#F59E0B" />
              <Text className="ml-2 text-xs text-warning flex-1">{blockReason}</Text>
            </View>
          </View>
        ) : null}

        <View className="px-4 mt-5">
          <Button
            label={submitting ? '投喂中…' : '确认投喂'}
            icon="checkmark"
            variant={affordable && canFeed ? 'primary' : 'ghost'}
            size="lg"
            loading={submitting}
            onPress={handleConfirm}
            disabled={!affordable || !canFeed}
          />
          <View className="mt-2">
            <Button
              label="取消"
              variant="ghost"
              size="md"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      </ScrollView>

      {/* 纯原生防崩弹窗 */}
      <Modal visible={dialogueText !== null} transparent animationType="fade">
        <Pressable
          onPress={handleCloseModal}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ width: '85%', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(37,99,235,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="heart" size={32} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' }}>雾璃</Text>
            </View>
            <Text style={{ fontSize: 16, textAlign: 'center', color: '#CBD5E1', lineHeight: 24, marginBottom: 16 }}>
              {dialogueText}
            </Text>
            <Text style={{ fontSize: 12, textAlign: 'center', color: '#64748B' }}>点击任意位置继续...</Text>
          </View>
        </Pressable>
      </Modal>
    </ScreenContainer>
  );
}

function EffectRow({ icon, label, value, color, unit = '', decimals = 0 }: any): React.JSX.Element {
  const isZero = Math.abs(value) < 0.001;
  const sign = value > 0 ? '+' : '';
  const display = isZero ? '0' : `${sign}${value.toFixed(decimals)}${unit}`;
  const valueColor = isZero ? '#94A3B8' : value > 0 ? color : '#EF4444';

  return (
    <View className="flex-row items-center justify-between py-1.5">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color={color} />
        <Text className="ml-2 text-xs text-muted dark:text-dark-muted">{label}</Text>
      </View>
      <Text className="text-xs font-semibold" style={{ color: valueColor }}>
        {display}
      </Text>
    </View>
  );
}

export default FoodDetailScreen;
