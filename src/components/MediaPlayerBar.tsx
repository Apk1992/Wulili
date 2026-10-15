import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View, Dimensions } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
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

const TRACK_HEIGHT = 6;
const THUMB_SIZE = 20;
const HIT_HEIGHT = 48;

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

  const [trackWidth, setTrackWidth] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragValueRef = useRef<number>(0);

  // 用 SharedValue 追踪拖动进度（0~1）
  const progressSV = useSharedValue<number>(0);
  const dragStartProgressSV = useSharedValue<number>(0);
  const isDraggingSV = useSharedValue<boolean>(false);

  const duration = playback.duration > 0 ? playback.duration : 1;

  // 播放进度同步到 SharedValue（拖动中不同步）
  useEffect(() => {
    if (isDragging) return;
    const p = Math.min(1, Math.max(0, playback.position / duration));
    progressSV.value = p;
  }, [playback.position, duration, isDragging, progressSV]);

  const handleSeekStartJS = useCallback(
    (progress: number) => {
      setIsDragging(true);
      dragValueRef.current = progress * duration;
      if (onSeekStart) onSeekStart(progress * duration);
    },
    [duration, onSeekStart],
  );

  const handleSeekChangeJS = useCallback(
    (progress: number) => {
      dragValueRef.current = progress * duration;
      if (onSeekChange) onSeekChange(progress * duration);
    },
    [duration, onSeekChange],
  );

  const handleSeekCompleteJS = useCallback(
    (progress: number) => {
      setIsDragging(false);
      onSeekComplete(progress * duration);
    },
    [duration, onSeekComplete],
  );

  const trackWidthSV = useSharedValue<number>(0);

  // 双击跳转（可选）：不用
  const pan = Gesture.Pan()
    .minDistance(0)
    .hitSlop({ top: 0, bottom: 0, left: 0, right: 0 })
    .onBegin((event) => {
      if (trackWidthSV.value <= 0) return;
      const progress = Math.min(
        1,
        Math.max(0, event.x / trackWidthSV.value),
      );
      isDraggingSV.value = true;
      dragStartProgressSV.value = progress;
      progressSV.value = progress;
      runOnJS(handleSeekStartJS)(progress);
    })
    .onUpdate((event) => {
      if (trackWidthSV.value <= 0) return;
      const progress = Math.min(
        1,
        Math.max(0, event.x / trackWidthSV.value),
      );
      progressSV.value = progress;
      runOnJS(handleSeekChangeJS)(progress);
    })
    .onEnd(() => {
      const progress = progressSV.value;
      isDraggingSV.value = false;
      runOnJS(handleSeekCompleteJS)(progress);
    })
    .onFinalize(() => {
      isDraggingSV.value = false;
    });

  const tap = Gesture.Tap().onEnd((event) => {
    if (trackWidthSV.value <= 0) return;
    const progress = Math.min(
      1,
      Math.max(0, event.x / trackWidthSV.value),
    );
    progressSV.value = progress;
    runOnJS(handleSeekCompleteJS)(progress);
  });

  const composed = Gesture.Simultaneous(pan, tap);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${progressSV.value * 100}%`,
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    left: `${progressSV.value * 100}%`,
  }));

  const indicatorStyle = useAnimatedStyle(() => ({
    opacity: isDraggingSV.value ? 1 : 0,
    transform: [{ scale: isDraggingSV.value ? 1 : 0.8 }],
  }));

  if (!playback.current) return null;

  const iconColor = isDark ? '#F1F5F9' : '#0F172A';
  const disabledColor = isDark ? '#475569' : '#CBD5E1';
  const statusText = resolveStatusText(playback.status, playback.error);

  const displaySeconds = isDragging
    ? dragValueRef.current
    : playback.position;
  const displayTimeText = formatDuration(displaySeconds * 1000);

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
      {/* 标题 + 状态 */}
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

      {/* 进度条 */}
      <View
        onLayout={(e) => {
          const w = e.nativeEvent.layout.width;
          setTrackWidth(w);
          trackWidthSV.value = w;
        }}
        style={{
          height: HIT_HEIGHT,
          justifyContent: 'center',
        }}
      >
        <GestureDetector gesture={composed}>
          <View
            style={{
              height: HIT_HEIGHT,
              justifyContent: 'center',
            }}
          >
            {/* 轨道 */}
            <View
              style={{
                height: TRACK_HEIGHT,
                borderRadius: TRACK_HEIGHT / 2,
                backgroundColor: isDark ? '#334155' : '#E2E8F0',
                overflow: 'hidden',
              }}
            >
              {/* 已播放 */}
              <Animated.View
                style={[
                  {
                    height: TRACK_HEIGHT,
                    backgroundColor: '#2563EB',
                  },
                  fillStyle,
                ]}
              />
            </View>

            {/* 拇指 */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: THUMB_SIZE,
                  height: THUMB_SIZE,
                  borderRadius: THUMB_SIZE / 2,
                  backgroundColor: '#2563EB',
                  borderWidth: 2,
                  borderColor: '#FFFFFF',
                  marginLeft: -THUMB_SIZE / 2,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.2,
                  shadowRadius: 2,
                  elevation: 3,
                },
                thumbStyle,
              ]}
            />

            {/* 拖动时的放大指示 */}
            <Animated.View
              pointerEvents="none"
              style={[
                {
                  position: 'absolute',
                  width: THUMB_SIZE + 12,
                  height: THUMB_SIZE + 12,
                  borderRadius: (THUMB_SIZE + 12) / 2,
                  backgroundColor: 'rgba(37,99,235,0.15)',
                  marginLeft: -(THUMB_SIZE + 12) / 2,
                  top: (HIT_HEIGHT - (THUMB_SIZE + 12)) / 2,
                  alignSelf: 'flex-start',
                },
                thumbStyle,
                indicatorStyle,
              ]}
            />
          </View>
        </GestureDetector>

        {/* 时间标签覆盖在进度条上下 */}
        <View
          pointerEvents="none"
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: HIT_HEIGHT / 2 + TRACK_HEIGHT / 2 + 4,
            flexDirection: 'row',
            justifyContent: 'space-between',
          }}
        >
          <Text className="text-[10px] text-muted dark:text-dark-muted">
            {displayTimeText}
          </Text>
          <Text className="text-[10px] text-muted dark:text-dark-muted">
            {formatDuration(playback.duration * 1000)}
          </Text>
        </View>
      </View>

      {/* 按钮栏 */}
      <View className="flex-row items-center justify-center mt-6">
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

void Dimensions;

export default MediaPlayerBar;