import React, { useEffect, useState } from 'react';
import {
  View,
  ImageBackground,
  useWindowDimensions,
} from 'react-native';
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
}

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
  const useRemoteImages = useSettingsStore((s) => s.settings.useRemoteImages);
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const token = getGitHubToken();
  const headers: Record<string, string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;

  const avatarFile = AVATAR_FILES[mood];
  const avatarUri = useRemoteImages && avatarFile ? `${RAW_BASE}/images/avatar/${avatarFile}` : null;

  const primaryPath = typeof sceneImage === 'string' ? sceneImage : sceneImage?.primary;
  const fallbackPath = typeof sceneImage === 'object' ? sceneImage?.fallback : null;
  const [activeScene, setActiveScene] = useState<string | null>(primaryPath || null);

  useEffect(() => {
    setActiveScene(primaryPath || null);
  }, [primaryPath]);

  let sceneUri = null;
  if (useRemoteImages && activeScene) {
    const cleanPath = activeScene.replace(/^\/+/, '').replace(/\/+$/, '');
    sceneUri = `${RAW_BASE}/${cleanPath}`;
  }

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

  if (fullScreen && sceneUri) {
    return (
      <ImageBackground
        source={{ uri: sceneUri, headers }} // 👈 稳如老狗的鉴权方式
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
        onError={(e) => {
          console.log('❌ [场景图加载失败] URL:', sceneUri);
          console.log('❌ [错误原因]:', e.nativeEvent.error);
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

  return (
    <View className={['flex-1 items-center justify-center bg-card dark:bg-dark-card', className].join(' ')}>
      {character}
    </View>
  );
}

export default WuliliAvatar;
