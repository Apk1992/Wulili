import React, { useEffect, useState } from 'react';
import { View, Text, ImageBackground, useWindowDimensions } from 'react-native';
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
  characterSizeRatio?: number;
  characterVerticalBias?: number;
  characterHeightOverflow?: number;
  characterBottomOffset?: number;
}

// 🔥 强制使用原始 raw 路径，防止 refs/heads 的跳转问题
const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function WuliliAvatar({
  mood = 'calm',
  size = 200,
  showLabel = false,
  className = '',
  sceneImage = null,
  fullScreen = false,
  hideCharacter = false,
  characterSizeRatio = 1.2,
  characterVerticalBias = 0.25,
  characterHeightOverflow = 1.5,
  characterBottomOffset = 0,
}: WuliliAvatarProps): React.JSX.Element {
  const { isDark } = useTheme();
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const token = getGitHubToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // 1. 人物图
  const avatarFile = AVATAR_FILES[mood];
  const avatarUri = useRemoteImages && avatarFile ? `${RAW_BASE}/images/avatar/${avatarFile}` : null;

  // 2. 场景图
  const primaryPath = typeof sceneImage === 'string' ? sceneImage : sceneImage?.primary;
  const fallbackPath = typeof sceneImage === 'object' ? sceneImage?.fallback : null;
  const [activeScene, setActiveScene] = useState<string | null>(primaryPath || null);

  useEffect(() => {
    setActiveScene(primaryPath || null);
  }, [primaryPath]);

  let sceneUri = null;
  if (useRemoteImages && activeScene) {
    // 清洗路径，去掉多余的斜杠
    const cleanPath = activeScene.replace(/^\/+/, '').replace(/\/+$/, '');
    sceneUri = `${RAW_BASE}/${cleanPath}`;
  }

  // 3. 布局计算
  const topOffset = screenHeight * characterVerticalBias;
  const characterWidth = fullScreen ? screenWidth * characterSizeRatio : size;
  const characterHeight = fullScreen ? (screenHeight - topOffset) * characterHeightOverflow : size;

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

  // 4. 渲染
  if (fullScreen && sceneUri) {
    return (
      <ImageBackground
        source={{ uri: sceneUri, headers }} // 👈 用最稳的 headers 鉴权
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => {
          console.log('❌ 场景图加载失败:', sceneUri);
          if (fallbackPath && activeScene !== fallbackPath) {
            setActiveScene(fallbackPath);
          } else {
            setActiveScene(null);
          }
        }}
      >
        <View style={{ flex: 1 }} pointerEvents="none">
          <View style={{ position: 'absolute', left: 0, right: 0, top: topOffset, height: characterHeight, alignItems: 'center' }}>
            {character}
          </View>
        </View>
      </ImageBackground>
    );
  }

  // 场景图失败时的背景
  return (
    <View className={['flex-1 items-center justify-center', isDark ? 'bg-dark-card' : 'bg-card', className].join(' ')}>
      {character}
    </View>
  );
}

export default WuliliAvatar;
