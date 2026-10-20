// src/components/FoodItem.tsx
import React, { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RemoteImage from './RemoteImage';
import { useTheme } from '@/hooks/useTheme';
import { formatCoins } from '@/utils/format';
import type { Food } from '@/types/wulili';

export interface FoodItemProps {
  food: Food;
  quantity?: number;
  disabled?: boolean;
  affordable?: boolean;
  onPress?: (food: Food) => void;
  className?: string;
}

// 🔥 Cloudflare R2 专属基础公开域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function FoodItem({
  food,
  quantity,
  disabled = false,
  affordable = true,
  onPress,
  className = '',
}: FoodItemProps): React.JSX.Element {
  const { isDark } = useTheme();

  // 🔥 自动解析食物图片路径并直接对接 Cloudflare R2 全球 CDN
  const imageUrl = useMemo(() => {
    if (!food || !food.image) return null;
    // 如果本身已经是完整网络链接
    if (food.image.startsWith('http://') || food.image.startsWith('https://')) {
      return food.image;
    }
    
    // 如果已经包含 images/ 目录
    if (food.image.startsWith('images/')) {
      return `${R2_BASE_URL}/${food.image.replace(/^\/+/, '')}`;
    }

    // 根据类别拼装正确的目录
    const folder = food.category === 'healthy' ? 'images/food/healthy' : 'images/food/junk';
    const cleanImage = food.image.replace(/^\/+/, '');
    return `${R2_BASE_URL}/${folder}/${cleanImage}`;
  }, [food]);

  const effectSummary = summarizeEffect(food);

  return (
    <Pressable
      onPress={disabled ? undefined : () => onPress?.(food)}
      disabled={disabled}
      className={[
        'flex-row items-center p-3 rounded-2xl mb-2',
        'bg-card dark:bg-dark-card',
        'border border-border dark:border-dark-border',
        disabled || !affordable ? 'opacity-60' : 'active:opacity-90',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <RemoteImage
        uri={imageUrl}
        width={56}
        height={56}
        fallbackIcon="restaurant"
        className="mr-3"
      />
      <View className="flex-1">
        <View className="flex-row items-center">
          <Text
            className="text-sm font-semibold text-text dark:text-dark-text"
            numberOfLines={1}
          >
            {food.name}
          </Text>
          <View
            className={[
              'ml-2 px-1.5 py-0.5 rounded-md',
              food.category === 'healthy'
                ? 'bg-success/15'
                : 'bg-danger/15',
            ].join(' ')}
          >
            <Text
              className={[
                'text-[10px] font-medium',
                food.category === 'healthy' ? 'text-success' : 'text-danger',
              ].join(' ')}
            >
              {food.category === 'healthy' ? '营养' : '放纵'}
            </Text>
          </View>
        </View>
        <Text
          className="text-xs text-muted dark:text-dark-muted mt-0.5"
          numberOfLines={1}
        >
          {food.description}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs text-primary font-semibold">
            {formatCoins(food.price)}
          </Text>
          {quantity !== undefined ? (
            <Text className="ml-2 text-xs text-muted dark:text-dark-muted">
              ×{quantity}
            </Text>
          ) : null}
          {effectSummary.length > 0 ? (
            <Text className="ml-2 text-[10px] text-muted dark:text-dark-muted">
              {effectSummary}
            </Text>
          ) : null}
        </View>
      </View>
      {!affordable ? (
        <Ionicons
          name="lock-closed"
          size={16}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      ) : null}
    </Pressable>
  );
}

function summarizeEffect(food: Food): string {
  const parts: string[] = [];
  const e = food.effect;
  if (e.hunger !== 0) parts.push(`饱${sign(e.hunger)}`);
  if (e.mood !== 0) parts.push(`心${sign(e.mood)}`);
  if (e.health !== 0) parts.push(`健${sign(e.health)}`);
  if (e.weight !== 0) parts.push(`重${sign(e.weight)}`);
  return parts.join(' · ');
}

function sign(value: number): string {
  if (value === 0) return '0';
  return value > 0 ? `+${value}` : `${value}`;
}

export default FoodItem;
