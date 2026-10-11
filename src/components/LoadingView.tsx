import React from 'react';
import { ActivityIndicator, Text, View } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface LoadingViewProps {
  message?: string;
  size?: 'small' | 'large';
  fullScreen?: boolean;
  className?: string;
}

export function LoadingView({
  message = '加载中…',
  size = 'large',
  fullScreen = false,
  className = '',
}: LoadingViewProps): React.JSX.Element {
  const { isDark } = useTheme();

  const container = [
    'items-center justify-center',
    fullScreen ? 'flex-1' : 'py-10',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={container}>
      <ActivityIndicator size={size} color={isDark ? '#F1F5F9' : '#2563EB'} />
      {message.length > 0 ? (
        <Text className="mt-3 text-sm text-muted dark:text-dark-muted">{message}</Text>
      ) : null}
    </View>
  );
}

export default LoadingView;