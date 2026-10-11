import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RemoteImage from './RemoteImage';
import { useTheme } from '@/hooks/useTheme';
import { useGitHubImage } from '@/hooks/useGitHubImage';
import { formatCoins } from '@/utils/format';
import { ILLNESS_LABELS } from './constants';
import type { Medicine } from '@/types/wulili';

export interface MedicineItemProps {
  medicine: Medicine;
  disabled?: boolean;
  affordable?: boolean;
  onPress?: (medicine: Medicine) => void;
  className?: string;
}

export function MedicineItem({
  medicine,
  disabled = false,
  affordable = true,
  onPress,
  className = '',
}: MedicineItemProps): React.JSX.Element {
  const { isDark } = useTheme();
  const imagePath = `images/medicine/${medicine.image}`;
  const { url } = useGitHubImage(imagePath, true);

  const curesText =
    medicine.cures.length > 0
      ? `治疗 ${medicine.cures.map((c) => ILLNESS_LABELS[c]).join('、')}`
      : '日常保健';

  return (
    <Pressable
      onPress={disabled ? undefined : () => onPress?.(medicine)}
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
        uri={url}
        width={56}
        height={56}
        fallbackIcon="medkit"
        className="mr-3"
      />
      <View className="flex-1">
        <Text
          className="text-sm font-semibold text-text dark:text-dark-text"
          numberOfLines={1}
        >
          {medicine.name}
        </Text>
        <Text
          className="text-xs text-muted dark:text-dark-muted mt-0.5"
          numberOfLines={1}
        >
          {medicine.description}
        </Text>
        <View className="flex-row items-center mt-1">
          <Text className="text-xs text-primary font-semibold">
            {formatCoins(medicine.price)}
          </Text>
          <Text className="ml-2 text-[10px] text-muted dark:text-dark-muted">
            {curesText} · 健康+{medicine.healthRestore}
          </Text>
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

export default MedicineItem;