import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import WuliliAvatar from '@/components/WuliliAvatar';
import DialogueBubble from '@/components/DialogueBubble';
import Button from '@/components/Button';
import { useDialogue } from '@/hooks/useDialogue';
import { useSeason } from '@/hooks/useSeason';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useAffinity } from '@/hooks/useAffinity';
import { getTimeOfDayLabel, getTimeOfDay } from '@/utils/time';
import { formatDuration } from '@/utils/time';
import { formatNumber } from '@/utils/format';
import { getCurrentScene, getSceneImagePath } from '@/utils/sceneSelector';
import type { Mood } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const SEASON_LABELS: Record<string, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { height: screenHeight } = useWindowDimensions();

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [mood, setMood] = useState<Mood>(() => computeMood());

  const timeOfDay = getTimeOfDay();
  const illness = useWuliliStore((s) => s.state.illness);
  const coins = useWuliliStore((s) => s.state.coins);
  const updateLoginStreak = useWuliliStore((s) => s.updateLoginStreak);

  const isStreaming = useStreamStore((s) => s.state.isStreaming);
  const streamStartedAt = useStreamStore((s) => s.state.startedAt);

  const scene = useMemo(() => getCurrentScene(timeOfDay), [timeOfDay]);
  const sceneImage = useMemo(
    () => getSceneImagePath(scene, season),
    [scene, season],
  );

  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isStreaming]);

  useFocusEffect(
    useCallback(() => {
      updateLoginStreak();
      setMood(computeMood());
      const greeting = speak({ forceCategory: 'greeting' });
      if (greeting) setDialogue(greeting);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    if (!dialogue) {
      const lastText = useDialogueStore.getState().lastText;
      if (lastText) {
        setDialogue({
          id: 'restored',
          text: lastText,
          category: 'idle',
          emotion: 'calm',
          triggers: [],
          weight: 1,
          cooldownHours: 0,
          once: false,
          source: 'default',
        });
      }
    }
  }, [dialogue]);

  const streamElapsedMs =
    isStreaming && streamStartedAt ? now - streamStartedAt : 0;

  const leftButtons: Array<{ icon: string; label: string; onPress: () => void }> = [
    { icon: 'restaurant', label: '投喂', onPress: () => navigation.navigate('Feed') },
    { icon: 'game-controller', label: '娱乐', onPress: () => navigation.navigate('Entertain') },
    { icon: 'videocam', label: '直播', onPress: () => navigation.navigate('Stream') },
  ];
  const rightButtons: Array<{ icon: string; label: string; onPress: () => void }> = [
    { icon: 'bicycle', label: '运动', onPress: () => navigation.navigate('Exercise') },
    { icon: 'medkit', label: '药房', onPress: () => navigation.navigate('Medicine') },
    { icon: 'shirt', label: '衣柜', onPress: () => navigation.navigate('Shop') },
  ];

  // 左右按钮区的纵向中心：屏幕高度的 62%
  const buttonAreaTop = screenHeight * 0.38;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View style={{ flex: 1 }}>
        <WuliliAvatar mood={mood} fullScreen sceneImage={sceneImage} />

        {/* 顶部信息栏 + 台词（绝对定位） */}
        <View
          className="absolute left-0 right-0 px-4"
          style={{ top: 12 }}
          pointerEvents="box-none"
        >
          <View className="flex-row items-center justify-between mb-2">
            <View className="rounded-full bg-black/50 px-3 py-1">
              <Text className="text-xs text-white font-medium">
                {getTimeOfDayLabel(timeOfDay)} · {SEASON_LABELS[season] ?? ''}季 · {levelLabel}
              </Text>
            </View>
            <View className="rounded-full bg-black/50 px-3 py-1 flex-row items-center">
              <Ionicons name="cash-outline" size={12} color="#FFFFFF" />
              <Text className="ml-1 text-xs text-white font-medium">
                {formatNumber(coins)}
              </Text>
            </View>
          </View>

          {isStreaming ? (
            <Pressable
              onPress={() => navigation.navigate('Stream')}
              className="mb-2 rounded-2xl px-3 py-2 flex-row items-center active:opacity-80"
              style={{ backgroundColor: 'rgba(239,68,68,0.9)' }}
            >
              <Ionicons name="radio" size={18} color="#FFFFFF" />
              <View className="ml-2 flex-1">
                <Text className="text-white text-sm font-semibold">正在直播中</Text>
                <Text className="text-white/80 text-[10px] mt-0.5">
                  已播 {formatDuration(streamElapsedMs)} · 点此查看
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}

          {illness.type !== 'none' ? (
            <Pressable
              onPress={() => navigation.navigate('Medicine')}
              className="mb-2 rounded-2xl px-3 py-2 flex-row items-center active:opacity-80"
              style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}
            >
              <Ionicons name="medkit" size={16} color="#FFFFFF" />
              <Text className="ml-2 text-white text-xs font-medium">
                雾璃身体不舒服 · 去药房
              </Text>
            </Pressable>
          ) : null}

          {dialogue ? (
            <DialogueBubble
              dialogue={dialogue}
              onDismiss={() => setDialogue(null)}
              autoDismissMs={10000}
            />
          ) : null}
        </View>

        {/* 左侧按钮 */}
        <View
          className="absolute"
          style={{ left: 16, top: buttonAreaTop }}
          pointerEvents="box-none"
        >
          {leftButtons.map((btn) => (
            <View key={btn.label} style={{ marginBottom: 12 }}>
              <CircleButton
                icon={btn.icon}
                label={btn.label}
                onPress={btn.onPress}
              />
            </View>
          ))}
        </View>

        {/* 右侧按钮 */}
        <View
          className="absolute"
          style={{ right: 16, top: buttonAreaTop }}
          pointerEvents="box-none"
        >
          {rightButtons.map((btn) => (
            <View key={btn.label} style={{ marginBottom: 12 }}>
              <CircleButton
                icon={btn.icon}
                label={btn.label}
                onPress={btn.onPress}
              />
            </View>
          ))}
        </View>

        {/* 底部大按钮 */}
        <View
          className="absolute left-4 right-4"
          style={{ bottom: 20 }}
          pointerEvents="box-none"
        >
          <Button
            label="查看雾璃的状态"
            icon="heart-circle"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Status')}
          />
        </View>
      </View>
    </ScreenContainer>
  );
}

function computeMood(): Mood {
  const s = useWuliliStore.getState().state;
  if (s.illness.type !== 'none') return 'sick';
  if (s.stats.energy < 15) return 'sleepy';
  if (s.stats.mood < 30) return 'sad';
  if (s.stats.mood >= 80) return 'happy';
  if (s.affinity >= 60) return 'shy';
  return 'calm';
}

interface CircleButtonProps {
  icon: string;
  label: string;
  onPress: () => void;
}

function CircleButton({ icon, label, onPress }: CircleButtonProps): React.JSX.Element {
  return (
    <Pressable
      onPress={onPress}
      className="items-center justify-center rounded-full active:opacity-70"
      style={{
        width: 64,
        height: 64,
        backgroundColor: 'rgba(15,23,42,0.7)',
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.25)',
      }}
    >
      <Ionicons name={icon} size={24} color="#FFFFFF" />
      <Text className="text-[10px] text-white mt-0.5 font-medium">
        {label}
      </Text>
    </Pressable>
  );
}

export default WuliliScreen;