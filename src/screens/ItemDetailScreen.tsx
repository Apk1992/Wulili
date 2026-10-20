// src/screens/ItemDetailScreen.tsx
import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import RemoteImage from '@/components/RemoteImage';
import Button from '@/components/Button';
import DialogueBubble from '@/components/DialogueBubble';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useShopStore } from '@/store/useShopStore';
import { useDialogue } from '@/hooks/useDialogue';
import { useAffinity } from '@/hooks/useAffinity';
import { describeBonus } from '@/utils/equipmentBonus';
import { formatCoins } from '@/utils/format';
import type { Dialogue } from '@/types/dialogue';
import type { Accessory, Outfit } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'ItemDetail'>;

// 🔥 Cloudflare R2 基础公开地址
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function ItemDetailScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { itemId, kind } = route.params;
  const { height: screenHeight } = useWindowDimensions();

  const getOutfitById = useAppConfigStore((s) => s.getOutfitById);
  const getAccessoryById = useAppConfigStore((s) => s.getAccessoryById);

  const item: Outfit | Accessory | null =
    kind === 'outfit' ? getOutfitById(itemId) : getAccessoryById(itemId);

  const coins = useWuliliStore((s) => s.state.coins);
  const ownedOutfits = useWuliliStore((s) => s.state.ownedOutfits);
  const ownedAccessories = useWuliliStore((s) => s.state.ownedAccessories);
  const currentOutfit = useWuliliStore((s) => s.state.currentOutfit);
  const currentAccessory = useWuliliStore((s) => s.state.currentAccessory);
  const wearOutfit = useWuliliStore((s) => s.wearOutfit);
  const wearAccessory = useWuliliStore((s) => s.wearAccessory);
  const addStats = useWuliliStore((s) => s.addStats);

  const buyOutfit = useShopStore((s) => s.buyOutfit);
  const buyAccessory = useShopStore((s) => s.buyAccessory);

  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  // 🔥 自动补全远端图片 URL 链接至 Cloudflare R2 CDN
  const imageUrl = useMemo(() => {
    if (!item) return null;
    const rawImage = item.image || item.icon;
    if (!rawImage) return null;
    if (rawImage.startsWith('http://') || rawImage.startsWith('https://')) {
      return rawImage;
    }
    const folder = kind === 'outfit' ? 'images/outfit' : 'images/accessory';
    const cleanPath = rawImage.startsWith('images/')
      ? rawImage
      : `${folder}/${rawImage.replace(/^\/+/, '')}`;
    return `${R2_BASE_URL}/${cleanPath}`;
  }, [item, kind]);

  if (!item) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted dark:text-dark-muted">
            找不到这件物品
          </Text>
          <View className="mt-4 w-40">
            <Button label="返回" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  const owned =
    kind === 'outfit'
      ? ownedOutfits.includes(item.id)
      : ownedAccessories.includes(item.id);

  const equipped =
    kind === 'outfit'
      ? currentOutfit === item.id
      : currentAccessory === item.id;

  const affordable = coins >= item.price;
  const bonusLines = item.bonus ? describeBonus(item.bonus) : [];

  const handleBuy = () => {
    if (!affordable) {
      Alert.alert('金币不足', '先带雾璃去直播赚点钱吧。');
      return;
    }
    Alert.alert(
      '确认购买',
      `${item.name} · ${formatCoins(item.price)}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '购买',
          onPress: () => {
            const ok =
              kind === 'outfit'
                ? buyOutfit(item.id)
                : buyAccessory(item.id);
            if (!ok) {
              Alert.alert('购买失败', '请稍后再试。');
              return;
            }
            addStats({ mood: item.moodBonus });
            gain(item.affinityBonus);
            const line = speak({ forceCategory: 'shop' });
            if (line) setDialogue(line);
            setTimeout(() => navigation.goBack(), 600);
          },
        },
      ],
    );
  };

  const handleWear = async () => {
    setSubmitting(true);
    try {
      if (kind === 'outfit') {
        if (equipped) {
          wearOutfit(null);
        } else {
          wearOutfit(item.id);
          addStats({ mood: item.moodBonus });
          gain(item.affinityBonus);
        }
      } else {
        if (equipped) {
          wearAccessory(null);
        } else {
          wearAccessory(item.id);
          addStats({ mood: item.moodBonus });
          gain(item.affinityBonus);
        }
      }
      const line = speak({ forceCategory: 'shop' });
      if (line) setDialogue(line);
      setTimeout(() => navigation.goBack(), 600);
    } finally {
      setSubmitting(false);
    }
  };

  const buttonLabel = !owned
    ? `购买 · ${formatCoins(item.price)}`
    : equipped
      ? '脱下'
      : '穿戴';

  const buttonVariant = !owned
    ? affordable
      ? 'primary'
      : 'ghost'
    : equipped
      ? 'danger'
      : 'success';

  const buttonDisabled = !owned && !affordable;

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
            fallbackIcon={kind === 'outfit' ? 'shirt' : 'glasses'}
            className="bg-transparent dark:bg-transparent"
          />
        </View>

        <View className="px-4 pt-4">
          <View className="flex-row items-center">
            <Text className="text-2xl font-bold text-text dark:text-dark-text flex-1">
              {item.name}
            </Text>
            {equipped ? (
              <View className="px-2 py-0.5 rounded-md bg-primary">
                <Text className="text-[10px] font-semibold text-white">
                  已穿戴
                </Text>
              </View>
            ) : owned ? (
              <View className="px-2 py-0.5 rounded-md bg-success/15">
                <Text className="text-[10px] font-semibold text-success">
                  已拥有
                </Text>
              </View>
            ) : null}
          </View>

          <Text className="text-sm text-muted dark:text-dark-muted mt-2 leading-5">
            {item.description}
          </Text>

          <View className="mt-3 flex-row items-center">
            {!owned ? (
              <>
                <Ionicons name="cash" size={16} color="#2563EB" />
                <Text className="ml-1 text-base font-bold text-primary">
                  {formatCoins(item.price)}
                </Text>
              </>
            ) : (
              <>
                <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                <Text className="ml-1 text-base font-bold text-success">
                  已拥有
                </Text>
              </>
            )}
            <Text className="ml-3 text-xs text-muted dark:text-dark-muted">
              当前金币 {formatCoins(coins)}
            </Text>
          </View>
        </View>

        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
            加成
          </Text>
          <View className="rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border p-3">
            {item.moodBonus > 0 ? (
              <BonusRow
                icon="happy"
                label="心情加成"
                value={`+${item.moodBonus}`}
                color="#10B981"
              />
            ) : null}
            {item.affinityBonus > 0 ? (
              <BonusRow
                icon="heart-circle"
                label="亲密度加成"
                value={`+${item.affinityBonus}`}
                color="#EF4444"
              />
            ) : null}
            {bonusLines.length > 0 ? (
              bonusLines.map((line) => (
                <BonusRow
                  key={line}
                  icon="sparkles"
                  label={line}
                  value=""
                  color="#2563EB"
                />
              ))
            ) : null}
            {item.moodBonus === 0 &&
            item.affinityBonus === 0 &&
            bonusLines.length === 0 ? (
              <Text className="text-xs text-muted dark:text-dark-muted">
                无加成
              </Text>
            ) : null}
          </View>
        </View>

        <View className="px-4 mt-5">
          {dialogue ? (
            <View className="mb-3">
              <DialogueBubble
                dialogue={dialogue}
                onDismiss={() => setDialogue(null)}
                autoDismissMs={10000}
              />
            </View>
          ) : null}

          <Button
            label={submitting ? '处理中…' : buttonLabel}
            icon={
              !owned
                ? 'cart'
                : equipped
                  ? 'close-circle'
                  : 'checkmark-circle'
            }
            variant={buttonVariant}
            size="lg"
            loading={submitting}
            onPress={!owned ? handleBuy : () => void handleWear()}
            disabled={buttonDisabled}
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
    </ScreenContainer>
  );
}

interface BonusRowProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function BonusRow({
  icon,
  label,
  value,
  color,
}: BonusRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color={color} />
        <Text className="ml-2 text-xs text-muted dark:text-dark-muted">
          {label}
        </Text>
      </View>
      {value ? (
        <Text className="text-xs font-semibold" style={{ color }}>
          {value}
        </Text>
      ) : null}
    </View>
  );
}

export default ItemDetailScreen;
