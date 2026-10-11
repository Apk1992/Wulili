import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from './Button';
import { useTheme } from '@/hooks/useTheme';

export interface EmptyViewProps {
  title?: string;
  message?: string;
  icon?: string;
  actionLabel?: string;
  onAction?: () => void;
  fullScreen?: boolean;
  className?: string;
}

export function EmptyView({
  title = '这里什么都没有',
  message,
  icon = 'leaf-outline',
  actionLabel,
  onAction,
  fullScreen = false,
  className = '',
}: EmptyViewProps): React.JSX.Element {
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
        name={icon}
        size={48}
        color={isDark ? '#64748B' : '#94A3B8'}
      />
      <Text className="mt-4 text-lg font-semibold text-text dark:text-dark-text">
        {title}
      </Text>
      {message ? (
        <Text className="mt-2 text-center text-sm text-muted dark:text-dark-muted">
          {message}
        </Text>
      ) : null}
      {actionLabel && onAction ? (
        <View className="mt-5 w-40">
          <Button label={actionLabel} variant="primary" onPress={onAction} />
        </View>
      ) : null}
    </View>
  );
}

export default EmptyView;