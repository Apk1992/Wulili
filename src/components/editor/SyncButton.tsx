import React from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export interface SyncButtonProps {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: 'pull' | 'push';
  icon?: string;
  lastSyncedAt?: number | null;
  className?: string;
}

export function SyncButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  variant = 'pull',
  icon,
  lastSyncedAt,
  className = '',
}: SyncButtonProps): React.JSX.Element {
  const { isDark } = useTheme();
  const isDisabled = disabled || loading;
  const defaultIcon = variant === 'push' ? 'cloud-upload' : 'cloud-download';
  const iconName = icon ?? defaultIcon;
  const bgClass =
    variant === 'push'
      ? 'bg-success'
      : 'bg-primary';

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={[
        'rounded-2xl p-3 flex-row items-center',
        bgClass,
        isDisabled ? 'opacity-50' : 'active:opacity-80',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {loading ? (
        <ActivityIndicator size="small" color="#FFFFFF" />
      ) : (
        <Ionicons name={iconName} size={18} color="#FFFFFF" />
      )}
      <View className="ml-2 flex-1">
        <Text className="text-sm font-semibold text-white">{label}</Text>
        {lastSyncedAt !== undefined && lastSyncedAt !== null ? (
          <Text className="text-[10px] text-white/80 mt-0.5">
            上次同步：{formatSyncTime(lastSyncedAt)}
          </Text>
        ) : null}
      </View>
      {!loading ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? '#FFFFFF' : '#FFFFFF'}
        />
      ) : null}
    </Pressable>
  );
}

function formatSyncTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  if (diff < 60 * 1000) return '刚刚';
  if (diff < 60 * 60 * 1000) return `${Math.floor(diff / 60000)} 分钟前`;
  if (diff < 24 * 60 * 60 * 1000) return `${Math.floor(diff / 3600000)} 小时前`;
  return `${Math.floor(diff / 86400000)} 天前`;
}

export default SyncButton;