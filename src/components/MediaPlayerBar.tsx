import React, { useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Slider from '@react-native-community/slider';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { formatDuration } from '@/utils/time';
import type { PlaybackState } from '@/types/memory';

export interface MediaPlayerBarProps {
  playback: PlaybackState;
  onTogglePlay: () => void;
  onSeekStart?: (seconds: number) => void;
  onSeekChange?: (seconds: number) => void;
  onSeekComplete: (seconds: number) => void;
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
  onSeekStart,
  onSeekChange,
  onSeekComplete,
  onPrevious,
  onNext,
  onStop,
  hasPrevious = true,
  hasNext = true,
  className = '',
}: MediaPlayerBarProps): React.JSX.Element | null {
  const { isDark } = useTheme();
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number>(0);
  const lastEmittedRef = useRef<number>(0);

  if (!playback.current) return null;

  const iconColor = isDark ? '#F1F5F9' : '#0F172A';
  const disabledColor = isDark ? '#475569' : '#CBD5E1';
  const statusText = resolveStatusText(playback.status, playback.error);

  const duration = playback.duration > 0 ? playback.duration : 1;
  const liveValue = Math.min(playback.position, playback.duration || 0);
  const displayValue = isDragging ? dragValue : liveValue;

  // 当前显示时间（拖动中显示拖动位置）
  const displayTimeText = formatDuration(displayValue * 1000);

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
          <Text
            className={[
              'text-[10px] mt-0.5',
              playback.status === 'error'
                ? 'text-danger'
                : 'text-muted dark:text-dark-muted',
            ].join(' ')}
          >
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
        <Text className="text-[10px] text-muted dark:text-dark-muted w-12">
          {displayTimeText}
        </Text>
        <View style={{ flex: 1, height: 40, justifyContent: 'center' }}>
          <Slider
            style={{ width: '100%', height: 40 }}
            minimumValue={0}
            maximumValue={duration}
            value={displayValue}
            step={0.5}
            minimumTrackTintColor="#2563EB"
            maximumTrackTintColor={isDark ? '#334155' : '#E2E8F0'}
            thumbTintColor="#2563EB"
            onSlidingStart={(v) => {
              setIsDragging(true);
              setDragValue(v);
              lastEmittedRef.current = v;
              if (onSeekStart) onSeekStart(v);
            }}
            onValueChange={(v) => {
              setDragValue(v);
              if (onSeekChange) onSeekChange(v);
            }}
            onSlidingComplete={(v) => {
              setIsDragging(false);
              onSeekComplete(v);
            }}
          />
        </View>
        <Text className="text-[10px] text-muted dark:text-dark-muted w-12 text-right">
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
  if (status === 'loading') return '缓冲中…';
  if (status === 'paused') return '已暂停';
  if (status === 'playing') return '播放中';
  if (status === 'ended') return '已结束';
  return '待播放';
}

export default MediaPlayerBar;