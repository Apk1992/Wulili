import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import RemoteImage from './RemoteImage';
import { useGitHubImage } from '@/hooks/useGitHubImage';
import { formatCoins } from '@/utils/format';
import type { Accessory, Outfit } from '@/types/wulili';

export type WardrobeKind = 'outfit' | 'accessory';

export interface OutfitItemProps {
  item: Outfit | Accessory;
  kind: WardrobeKind;
  owned: boolean;
  equipped: boolean;
  affordable: boolean;
  onPress: (item: Outfit | Accessory, kind: WardrobeKind) => void;
  className?: string;
}

export function OutfitItem({
  item,
  kind,
  owned,
  equipped,
  affordable,
  onPress,
  className = '',
}: OutfitItemProps): React.JSX.Element {
  const folder = kind === 'outfit' ? 'images/outfit' : 'images/accessory';
  const imagePath = `${folder}/${item.image}`;
  const { url } = useGitHubImage(imagePath, true);

  const borderHighlight = equipped
    ? 'border-primary dark:border-primary'
    : 'border-border dark:border-dark-border';

  return (
    <Pressable
      onPress={() => onPress(item, kind)}
      className={[
        'rounded-2xl p-3 mr-3 mb-3',
        'bg-card dark:bg-dark-card border',
        borderHighlight,
        'active:opacity-90',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
      style={{ width: 140 }}
    >
      <RemoteImage
        uri={url}
        width={116}
        height={116}
        fallbackIcon="shirt"
        className="mb-2"
      />
      <Text
        className="text-xs font-semibold text-text dark:text-dark-text"
        numberOfLines={1}
      >
        {item.name}
      </Text>
      <View className="flex-row items-center justify-between mt-1">
        {owned ? (
          <Text className="text-[10px] text-success font-medium">
            {equipped ? '已穿戴' : '已拥有'}
          </Text>
        ) : (
          <Text
            className={[
              'text-[10px] font-medium',
              affordable ? 'text-primary' : 'text-danger',
            ].join(' ')}
          >
            {formatCoins(item.price)}
          </Text>
        )}
        {equipped ? (
          <Ionicons name="checkmark-circle" size={14} color="#2563EB" />
        ) : null}
      </View>
    </Pressable>
  );
}

export default OutfitItem;