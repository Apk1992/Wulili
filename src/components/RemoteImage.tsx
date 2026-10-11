import React, { useState } from 'react';
import { Image, View, type ImageStyle, type StyleProp } from 'react-native';
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
      <View
        className={containerClasses}
        style={[{ width, height }]}
      >
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

  return (
    <View className={containerClasses} style={[{ width, height }]}>
      <Image
        source={{ uri, headers }}
        style={[{ width, height }, style]}
        resizeMode={resizeMode}
        onError={() => setHasError(true)}
      />
    </View>
  );
}

export default RemoteImage;