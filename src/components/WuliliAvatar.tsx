import React from 'react';
import { View, Text } from 'react-native';
import RemoteImage from './RemoteImage';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { buildImagePath } from '@/hooks/useGitHubImage';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { Mood } from '@/types/wulili';
import { AVATAR_FILES, MOOD_LABELS } from './constants';

export interface WuliliAvatarProps {
  mood?: Mood;
  size?: number;
  showLabel?: boolean;
  className?: string;
}

export function WuliliAvatar({
  mood = 'calm',
  size = 200,
  showLabel = false,
  className = '',
}: WuliliAvatarProps): React.JSX.Element {
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);
  const currentOutfit = useWuliliStore((s) => s.state.currentOutfit);
  const currentAccessory = useWuliliStore((s) => s.state.currentAccessory);
  const getOutfitById = useAppConfigStore((s) => s.getOutfitById);
  const getAccessoryById = useAppConfigStore((s) => s.getAccessoryById);

  const avatarFile = AVATAR_FILES[mood];
  const avatarPath = buildImagePath('imagesAvatar', avatarFile);
  const avatarUri =
    useRemoteImages && avatarPath.length > 0
      ? `https://raw.githubusercontent.com/yukee520/Wulili_assets/main/${avatarPath}`
      : null;

  const outfit = currentOutfit ? getOutfitById(currentOutfit) : null;
  const accessory = currentAccessory ? getAccessoryById(currentAccessory) : null;

  return (
    <View className={['items-center', className].filter(Boolean).join(' ')}>
      <View
        className="items-center justify-center rounded-3xl bg-card dark:bg-dark-card border border-border dark:border-dark-border overflow-hidden"
        style={{ width: size, height: size }}
      >
        <RemoteImage
          uri={avatarUri}
          width={size}
          height={size}
          resizeMode="contain"
          fallbackIcon="person"
          className="bg-transparent dark:bg-transparent"
        />
      </View>

      {outfit || accessory ? (
        <View className="flex-row mt-2">
          {outfit ? (
            <View className="px-2 py-0.5 mr-1 rounded-full bg-primary/10 dark:bg-primary/20">
              <Text className="text-[10px] text-primary">{outfit.name}</Text>
            </View>
          ) : null}
          {accessory ? (
            <View className="px-2 py-0.5 rounded-full bg-secondary/10 dark:bg-secondary/20">
              <Text className="text-[10px] text-secondary">{accessory.name}</Text>
            </View>
          ) : null}
        </View>
      ) : null}

      {showLabel ? (
        <Text className="mt-2 text-xs text-muted dark:text-dark-muted">
          当前心情 · {MOOD_LABELS[mood]}
        </Text>
      ) : null}
    </View>
  );
}

export default WuliliAvatar;