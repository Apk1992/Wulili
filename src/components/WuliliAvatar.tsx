import React, { useEffect, useState } from 'react';
import { View, ImageBackground, useWindowDimensions } from 'react-native';
import RemoteImage from './RemoteImage';
import { useSettingsStore } from '@/store/useSettingsStore';
import { getGitHubToken } from '@/api/githubClient';
import type { Mood } from '@/types/wulili';
import { AVATAR_FILES } from './constants';

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
  characterHorizontalOffset?: number;
}

const RAW_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function WuliliAvatar({
  mood = 'calm',
  size = 200,
  className = '',
  sceneImage = null,
  fullScreen = false,
  hideCharacter = false,
  characterSizeRatio = 1.2,
  characterVerticalBias = 0.25,
  characterHeightOverflow = 1.5,
  characterHorizontalOffset = 0,
}: WuliliAvatarProps): React.JSX.Element {
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const token = getGitHubToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  // 🔥 核心防护：防止 AVATAR_FILES[mood] 为 undefined 引发连锁崩溃
  const avatarFile = (AVATAR_FILES && mood && AVATAR_FILES[mood]) || 'calm.png';
  const avatarUri = useRemoteImages && avatarFile ? `${RAW_BASE}/images/avatar/${avatarFile}` : null;

  const primaryPath = typeof sceneImage === 'string' ? sceneImage : sceneImage?.primary;
  const fallbackPath = typeof sceneImage === 'object' ? sceneImage?.fallback : null;
  const [activeScene, setActiveScene] = useState<string | null>(primaryPath || null);

  useEffect(() => {
    setActiveScene(primaryPath || null);
  }, [primaryPath]);

  let sceneUri = null;
  if (useRemoteImages && activeScene) {
    const cleanPath = activeScene.replace(/^\/+/, '');
    sceneUri = `${RAW_BASE}/${cleanPath}`;
  }

  const topOffset = screenHeight * characterVerticalBias;
  const characterWidth = fullScreen ? screenWidth * characterSizeRatio : size;
  const characterHeight = fullScreen ? (screenHeight - topOffset) * characterHeightOverflow : size;

  const character = hideCharacter ? null : (
    <View
      style={{
        transform: [{ translateX: characterHorizontalOffset }],
      }}
    >
      <RemoteImage
        uri={avatarUri}
        width={characterWidth}
        height={characterHeight}
        resizeMode="cover" 
        fallbackIcon="person"
        className="bg-transparent dark:bg-transparent"
      />
    </View>
  );

  if (fullScreen && sceneUri) {
    return (
      <ImageBackground
        source={{ uri: sceneUri, headers }}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={() => {
          if (fallbackPath && activeScene !== fallbackPath) setActiveScene(fallbackPath);
          else setActiveScene(null);
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

  return (
    <View className={['flex-1 items-center justify-center bg-card dark:bg-dark-card', className].join(' ')}>
      {character}
    </View>
  );
}

export default WuliliAvatar;
