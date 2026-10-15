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
  // 🆕 人物位置控制
  characterSizeRatio?: number; // 人物宽度占屏幕宽度的比例（默认 0.75）
  characterBottomOffset?: number; // 底部留白（像素，默认 0）
  characterVerticalBias?: number; // 垂直偏移：0=居中，正数=向下，负数=向上（默认 0.25）
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
  characterSizeRatio = 0.75,
  characterBottomOffset = 0,
  characterVerticalBias = 0.25,
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

  // 人物尺寸按屏幕宽度比例
  const characterWidth = fullScreen
    ? screenWidth * characterSizeRatio
    : size;
  const characterHeight = fullScreen
    ? screenHeight * characterSizeRatio * 1.5
    : size;

  const character = hideCharacter ? null : (
    <RemoteImage
      uri={avatarUri}
      width={characterWidth}
      height={characterHeight}
      resizeMode="contain"
      fallbackIcon="person"
      className="bg-transparent dark:bg-transparent"
    />
  );

  // 完整模式：场景 + 人物
  if (fullScreen && sceneUri) {
    // 计算人物垂直位置
    // characterVerticalBias: 0=居中，正数=向下偏移
    const containerHeight = screenHeight;
    const offsetY = containerHeight * characterVerticalBias;

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
        <View className="flex-1" pointerEvents="none">
          {/* 人物：绝对定位 */}
          <View
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: offsetY,
              alignItems: 'center',
              paddingBottom: characterBottomOffset,
            }}
          >
            {character}
          </View>

          {/* 心情标签 */}
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

  // 完整模式但无场景：兜底
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

  // 小尺寸模式（用于状态页等）
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