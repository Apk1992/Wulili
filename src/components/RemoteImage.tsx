import React, { useState } from 'react';
import {
  View,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import FastImage from 'react-native-fast-image'; // 👈 引入 FastImage
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { getGitHubToken } from '@/api/githubClient';

export interface RemoteImageProps {
  uri: string | null;
  fallbackIcon?: string;
  width?: number;
  height?: number;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
  className?: string;
  style?: StyleProp<ImageStyle>;
  circular?: boolean;
}

export function RemoteImage({
  uri,
  fallbackIcon = 'image-outline',
  width,
  height,
  resizeMode = 'cover',
  className = '',
  style,
  circular = false,
}: RemoteImageProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [hasError, setHasError] = useState<boolean>(false);

  const containerClasses = [
    'items-center justify-center overflow-hidden',
    circular ? 'rounded-full' : 'rounded-2xl',
    'bg-border dark:bg-dark-border',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (!uri || hasError) {
    return (
      <View className={containerClasses} style={[{ width, height }]}>
        <Ionicons
          name={fallbackIcon}
          size={Math.max(16, Math.min(width ?? 48, height ?? 48) * 0.5)}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      </View>
    );
  }

  const headers: Record<string, string> = {};
  const token = getGitHubToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  // 将 FastImage 的模式映射一下
  const fastResizeMode = 
    resizeMode === 'cover' ? FastImage.resizeMode.cover :
    resizeMode === 'contain' ? FastImage.resizeMode.contain :
    resizeMode === 'stretch' ? FastImage.resizeMode.stretch :
    FastImage.resizeMode.center;

  return (
    <View className={containerClasses} style={[{ width, height }]}>
      <FastImage
        style={[{ width, height }, style]}
        source={{
          uri,
          headers,
          priority: FastImage.priority.normal,
          cache: FastImage.cacheControl.immutable, // 👈 核心：设置不可变缓存，只要有图就永远读本地
        }}
        resizeMode={fastResizeMode}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

export default RemoteImage;
