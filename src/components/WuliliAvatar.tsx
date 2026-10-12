import React from 'react';
import { View, Text, ImageBackground } from 'react-native';
import RemoteImage from './RemoteImage';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/hooks/useTheme';
import { getGitHubToken } from '@/api/githubClient';
import type { Mood } from '@/types/wulili';
import { AVATAR_FILES, MOOD_LABELS } from './constants';

export interface WuliliAvatarProps {
  mood?: Mood;
  size?: number;
  showLabel?: boolean;
  className?: string;
  sceneImage?: string | null;
  fullScreen?: boolean;
}

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function WuliliAvatar({
  mood = 'calm',
  size = 200,
  showLabel = false,
  className = '',
  sceneImage = null,
  fullScreen = false,
}: WuliliAvatarProps): React.JSX.Element {
  const { isDark } = useTheme();
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);

  const avatarFile = AVATAR_FILES[mood];
  const avatarUri =
    useRemoteImages && avatarFile
      ? `${RAW_BASE}/images/avatar/${avatarFile}`
      : null;

  const token = getGitHubToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const sceneUri =
    useRemoteImages && sceneImage ? `${RAW_BASE}/${sceneImage}` : null;

  const content = (
    <View className="flex-1 items-center justify-center">
      <RemoteImage
        uri={avatarUri}
        width={fullScreen ? 320 : size}
        height={fullScreen ? 480 : size}
        resizeMode="contain"
        fallbackIcon="person"
        className="bg-transparent dark:bg-transparent"
      />
      {showLabel ? (
        <Text className="mt-2 text-xs text-white/80">
          当前心情 · {MOOD_LABELS[mood]}
        </Text>
      ) : null}
    </View>
  );

  if (fullScreen && sceneUri) {
    return (
      <ImageBackground
        source={{ uri: sceneUri, headers }}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        <View className="flex-1 bg-black/10">{content}</View>
      </ImageBackground>
    );
  }

  if (fullScreen) {
    return (
      <View
        className={[
          'flex-1 items-center justify-center',
          isDark ? 'bg-dark-card' : 'bg-card',
          className,
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {content}
      </View>
    );
  }

  return (
    <View className={['items-center', className].filter(Boolean).join(' ')}>
      <View
        className="items-center justify-center rounded-3xl bg-card dark:bg-dark-card border border-border dark:border-dark-border overflow-hidden"
        style={{ width: size, height: size }}
      >
        {content}
      </View>
    </View>
  );
}

export default WuliliAvatar;