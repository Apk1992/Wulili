import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration } from '@/utils/time';
import type { PlaybackState } from '@/types/memory';

export interface MediaPlayerBarProps {
  playback: PlaybackState;
  onTogglePlay: () => void;
  onStop?: () => void;
  className?: string;
}

export function MediaPlayerBar({
  playback,
  onTogglePlay,
  onStop,
  className = '',
}: MediaPlayerBarProps): React.JSX.Element | null {
  const { isDark } = useTheme();
  if (!playback.current) return null;

  const iconColor = isDark ? '#F1F5F9' : '#0F172A';
  const progress =
    playback.duration > 0
      ? Math.min(1, playback.position / playback.duration)
      : 0;

  const statusText = resolveStatusText(playback.status, playback.error);

  return (
    <View
      className={[
        'rounded-2xl p-3',
        'bg-card dark:bg-dark-card border border-border dark:border-dark-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="flex-row items-center">
        <Pressable
          onPress={onTogglePlay}
          className="p-2 rounded-full active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel={playback.status === 'playing' ? '暂停' : '播放'}
        >
          <Ionicons
            name={playback.status === 'playing' ? 'pause' : 'play'}
            size={22}
            color={iconColor}
          />
        </Pressable>

        <View className="flex-1 ml-2">
          <Text
            className="text-sm font-medium text-text dark:text-dark-text"
            numberOfLines={1}
          >
            {playback.current.displayName}
          </Text>
          <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
            {formatDuration(playback.position)} / {formatDuration(playback.duration)}{' '}
            · {statusText}
          </Text>
        </View>

        {onStop ? (
          <Pressable
            onPress={onStop}
            className="p-2 rounded-full active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="停止"
          >
            <Ionicons name="close" size={20} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      <View className="mt-2 w-full rounded-full overflow-hidden h-1 bg-border dark:bg-dark-border">
        <View
          className="h-1 bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
      </View>
    </View>
  );
}

function resolveStatusText(
  status: PlaybackState['status'],
  error: string | null,
): string {
  if (status === 'error') return error ?? '播放失败';
  if (status === 'loading') return '缓冲中';
  if (status === 'paused') return '已暂停';
  if (status === 'playing') return '播放中';
  if (status === 'ended') return '已结束';
  return '待播放';
}

export default MediaPlayerBar;