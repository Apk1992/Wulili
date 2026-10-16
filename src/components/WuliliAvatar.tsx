import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
import RemoteImage from './RemoteImage';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useTheme } from '@/hooks/useTheme';
import { getGitHubToken } from '@/api/githubClient';
import type { Mood } from '@/types/wulili';
import { AVATAR_FILES, MOOD_LABELS } from './constants';

export interface SceneImagePair {
  primary: string;
  fallback: string;
}

export interface WuliliAvatarProps {
  mood?: Mood;
  size?: number;
  showLabel?: boolean;
  className?: string;
  sceneImage?: string | SceneImagePair | null;
  fullScreen?: boolean;
  hideCharacter?: boolean;
  characterSizeRatio?: number;      // 人物宽度占屏宽比例
  characterVerticalBias?: number;   // 人物顶部距屏顶比例
  characterHeightOverflow?: number; // 人物高度 = 屏幕剩余空间 × 此值
  characterBottomOffset?: number;
}

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

function resolveScenePath(
  scene: string | SceneImagePair | null | undefined,
): string | null {
  if (!scene) return null;
  if (typeof scene === 'string') return scene;
  return scene.primary;
}

export function WuliliAvatar({
  mood = 'calm',
  size = 200,
  showLabel = false,
  className = '',
  sceneImage = null,
  fullScreen = false,
  hideCharacter = false,
  characterSizeRatio = 1.0,
  characterVerticalBias = 0.1,
  characterHeightOverflow = 1.0,
  characterBottomOffset = 0,
}: WuliliAvatarProps): React.JSX.Element {
  const { isDark } = useTheme();
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const avatarFile = AVATAR_FILES[mood];
  const avatarUri =
    useRemoteImages && avatarFile
      ? `${RAW_BASE}/images/avatar/${avatarFile}`
      : null;

  const token = getGitHubToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const primaryPath = resolveScenePath(sceneImage);
  const fallbackPath =
    sceneImage && typeof sceneImage === 'object'
      ? sceneImage.fallback
      : null;

  const [activeScene, setActiveScene] = useState<string | null>(primaryPath);

  useEffect(() => {
    setActiveScene(primaryPath);
  }, [primaryPath]);

  const sceneUri =
    useRemoteImages && activeScene ? `${RAW_BASE}/${activeScene}` : null;

  const topOffset = screenHeight * characterVerticalBias;
  const characterWidth = fullScreen
    ? screenWidth * characterSizeRatio
    : size;
  const characterHeight = fullScreen
    ? (screenHeight - topOffset) * characterHeightOverflow
    : size;

  const character = hideCharacter ? null : (
    <RemoteImage
      uri={avatarUri}
      width={characterWidth}
      height={characterHeight}
      resizeMode="cover"
      fallbackIcon="person"
      className="bg-transparent dark:bg-transparent"
    />
  );

  if (fullScreen && sceneUri) {
    return (
      <ImageBackground
        source={{ uri: sceneUri, headers }}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => {
          if (fallbackPath && activeScene !== fallbackPath) {
            setActiveScene(fallbackPath);
          } else {
            setActiveScene(null);
          }
        }}
      >
        <View style={{ flex: 1 }} pointerEvents="none">
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: topOffset,
              height: characterHeight,
              alignItems: 'center',
              justifyContent: 'flex-start',
              paddingBottom: characterBottomOffset,
            }}
          >
            {character}
          </View>

          {showLabel ? (
            <View
              style={{
                position: 'absolute',
                bottom: 80,
                left: 0,
                right: 0,
                alignItems: 'center',
              }}
            >
              <Text className="text-xs text-white/80 bg-black/40 px-3 py-1 rounded-full">
                当前心情 · {MOOD_LABELS[mood]}
              </Text>
            </View>
          ) : null}
        </View>
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
        {character}
        {showLabel ? (
          <Text className="mt-2 text-xs text-muted dark:text-dark-muted">
            当前心情 · {MOOD_LABELS[mood]}
          </Text>
        ) : null}
      </View>
    );
  }

  return (
    <View className={['items-center', className].filter(Boolean).join(' ')}>
      <View
        className="items-center justify-center rounded-3xl bg-card dark:bg-dark-card border border-border dark:border-dark-border overflow-hidden"
        style={{ width: size, height: size }}
      >
        {character}
      </View>
    </View>
  );
}

export default WuliliAvatar;