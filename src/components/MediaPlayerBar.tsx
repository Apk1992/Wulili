import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration } from '@/utils/time';
import type { PlaybackState } from '@/types/memory';

export interface MediaPlayerBarProps {
  playback: PlaybackState;
  onTogglePlay: () => void;
  onSeek: (seconds: number) => void;
  onPrevious: () => void;
  onNext: () => void;
  onStop?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  className?: string;
}

export function MediaPlayerBar({
  playback,
  onTogglePlay,
  onSeek,
  onPrevious,
  onNext,
  onStop,
  hasPrevious = true,
  hasNext = true,
  className = '',
}: MediaPlayerBarProps): React.JSX.Element | null {
  const { isDark } = useTheme();
  if (!playback.current) return null;

  const iconColor = isDark ? '#F1F5F9' : '#0F172A';
  const disabledColor = isDark ? '#475569' : '#CBD5E1';
  const statusText = resolveStatusText(playback.status, playback.error);

  const maxDuration = playback.duration > 0 ? playback.duration : 1;
  const currentPos = Math.min(playback.position, playback.duration || 0);

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
      <View className="flex-row items-center justify-between mb-2">
        <View className="flex-1 mr-2">
          <Text
            className="text-sm font-semibold text-text dark:text-dark-text"
            numberOfLines={1}
          >
            {playback.current.displayName}
          </Text>
          <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
            {statusText}
          </Text>
        </View>
        {onStop ? (
          <Pressable
            onPress={onStop}
            className="p-1.5 rounded-full active:opacity-70"
            accessibilityRole="button"
            accessibilityLabel="停止"
          >
            <Ionicons name="close" size={18} color={iconColor} />
          </Pressable>
        ) : null}
      </View>

      <View className="flex-row items-center">
        <Text className="text-[10px] text-muted dark:text-dark-muted w-10">
          {formatDuration(playback.position * 1000)}
        </Text>
        <Slider
          style={{ flex: 1, height: 32 }}
          minimumValue={0}
          maximumValue={maxDuration}
          value={currentPos}
          minimumTrackTintColor="#2563EB"
          maximumTrackTintColor={isDark ? '#334155' : '#E2E8F0'}
          thumbTintColor="#2563EB"
          onSlidingComplete={(value) => onSeek(value)}
        />
        <Text className="text-[10px] text-muted dark:text-dark-muted w-10 text-right">
          {formatDuration(playback.duration * 1000)}
        </Text>
      </View>

      <View className="flex-row items-center justify-center mt-1">
        <Pressable
          onPress={hasPrevious ? onPrevious : undefined}
          disabled={!hasPrevious}
          className="p-2 mx-3 rounded-full active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="上一首"
        >
          <Ionicons
            name="play-skip-back"
            size={22}
            color={hasPrevious ? iconColor : disabledColor}
          />
        </Pressable>

        <Pressable
          onPress={onTogglePlay}
          className="p-3 mx-3 rounded-full bg-primary active:opacity-80"
          accessibilityRole="button"
          accessibilityLabel={playback.status === 'playing' ? '暂停' : '播放'}
        >
          <Ionicons
            name={playback.status === 'playing' ? 'pause' : 'play'}
            size={24}
            color="#FFFFFF"
          />
        </Pressable>

        <Pressable
          onPress={hasNext ? onNext : undefined}
          disabled={!hasNext}
          className="p-2 mx-3 rounded-full active:opacity-70"
          accessibilityRole="button"
          accessibilityLabel="下一首"
        >
          <Ionicons
            name="play-skip-forward"
            size={22}
            color={hasNext ? iconColor : disabledColor}
          />
        </Pressable>
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