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
  characterSizeRatio?: number;      // 控制人物基础宽度比例
  characterHeightScale?: number;    // 新增：控制人物高度的整体缩放
  characterVerticalBias?: number;   // 人物中心偏下的比例
  characterHeightOverflow?: number; // 预留，用于微调
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
  characterHeightScale = 1.0, // 默认高度缩放为 1
  characterVerticalBias = 0.5,
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

  // === 核心布局计算 ===
  // 1. 人物宽度 = 屏幕宽度 × 宽度比例
  const characterWidth = fullScreen ? screenWidth * characterSizeRatio : size;
  
  // 2. 人物高度 = 屏幕高度 × 高度缩放（因为原图 1:1，这样高度就是基于屏幕高度的放大）
  // 比如 characterHeightScale = 1.2，人物高度就是屏幕的 1.2 倍
  const characterHeight = fullScreen ? screenHeight * characterHeightScale : size;
  
  // 3. 人物锚点位置：根据比例决定人物中心点在哪（0 为顶部，1 为底部）
  // 如果用 absolute 定位且只设置 top 会导致高度溢出屏幕底部。
  // 我们改用中心点计算：让图片居中在这个位置上。
  const topOffset = (screenHeight - characterHeight) * characterVerticalBias;

  const character = hideCharacter ? null : (
    <RemoteImage
      uri={avatarUri}
      width={characterWidth}
      height={characterHeight}
      resizeMode="contain" // 👈 必须用 contain，保证人物不被拉伸变形
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
