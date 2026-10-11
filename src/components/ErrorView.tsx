import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from './Button';
import { useTheme } from '@/hooks/useTheme';

export interface ErrorViewProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  fullScreen?: boolean;
  className?: string;
}

export function ErrorView({
  title = '出错了',
  message = '发生了一些问题，请稍后再试。',
  onRetry,
  retryLabel = '重试',
  fullScreen = false,
  className = '',
}: ErrorViewProps): React.JSX.Element {
  const { isDark } = useTheme();

  const container = [
    'items-center justify-center px-6',
    fullScreen ? 'flex-1' : 'py-10',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <View className={container}>
      <Ionicons
        name="alert-circle-outline"
        size={48}
        color={isDark ? '#EF4444' : '#EF4444'}
      />
      <Text className="mt-4 text-lg font-semibold text-text dark:text-dark-text">
        {title}
      </Text>
      <Text className="mt-2 text-center text-sm text-muted dark:text-dark-muted">
        {message}
      </Text>
      {onRetry ? (
        <View className="mt-5 w-40">
          <Button label={retryLabel} variant="primary" size="md" onPress={onRetry} />
        </View>
      ) : null}
    </View>
  );
}

export default ErrorView;