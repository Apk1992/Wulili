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
  characterHeightScale?: number;    // 人物高度（基于屏幕高度缩放，用于控制下半身裁切）
  characterVerticalBias?: number;   // 人物顶部距屏顶比例（0 贴顶，1 贴底）
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
  characterSizeRatio = 0.9,      // 默认稍微收窄，显得人物修长
  characterHeightScale = 1.3,    // 默认放大 1.3 倍高度
  characterVerticalBias = 0.35,  // 默认偏上一点，避免脚露太多
  characterBottomOffset = 0,
}: WuliliAvatarProps): React.JSX.Element {
  const { isDark } = useTheme();
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const token = getGitHubToken();

  // === 1. 处理人物 URI ===
  const avatarFile = AVATAR_FILES[mood];
  // 把 token 拼接到 URL 后面，让原生 Image 能走本地缓存，避免每次都下载
  const avatarUri =
    useRemoteImages && avatarFile && token
      ? `${RAW_BASE}/images/avatar/${avatarFile}?token=${token}`
      : useRemoteImages && avatarFile
      ? `${RAW_BASE}/images/avatar/${avatarFile}`
      : null;

  // === 2. 处理场景 URI ===
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
    useRemoteImages && activeScene && token
      ? `${RAW_BASE}/${activeScene}?token=${token}`
      : useRemoteImages && activeScene
      ? `${RAW_BASE}/${activeScene}`
      : null;

  // === 3. 布局计算 (Galgame 立绘效果) ===
  // 宽度 = 屏宽 * 宽度比例
  const characterWidth = fullScreen ? screenWidth * characterSizeRatio : size;
  // 高度 = 屏高 * 高度缩放（这决定了人物有多大，以及脚被裁掉多少）
  const characterHeight = fullScreen ? screenHeight * characterHeightScale : size;
  // 顶部偏移 = (屏高 - 人物高度) * 垂直偏移比例
  const topOffset = (screenHeight - characterHeight) * characterVerticalBias;

  const character = hideCharacter ? null : (
    <RemoteImage
      uri={avatarUri}
      width={characterWidth}
      height={characterHeight}
      resizeMode="contain" // 保证人物比例不变形
      fallbackIcon="person"
      className="bg-transparent dark:bg-transparent"
    />
  );

  // === 4. 渲染场景 + 人物 ===
  if (fullScreen && sceneUri) {
    return (
      <ImageBackground
        source={{ uri: sceneUri }} // 这里去掉了 headers，因为 token 已经在 URL 里了
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => {
          if (fallbackPath && activeScene !== fallbackPath) {
            setActiveScene(fallbackPath);
          } else {
            setActiveScene(null); // 找不到场景就用纯色背景
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

  // === 5. 纯色 Fallback (场景加载失败时) ===
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

  // === 6. 小尺寸头像渲染 (非全屏) ===
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
