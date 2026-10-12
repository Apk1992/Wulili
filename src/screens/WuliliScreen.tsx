import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import WuliliAvatar from '@/components/WuliliAvatar';
import DialogueBubble from '@/components/DialogueBubble';
import Button from '@/components/Button';
import { useDialogue } from '@/hooks/useDialogue';
import { useTheme } from '@/hooks/useTheme';
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

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const { speak } = useDialogue();
  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const [mood, setMood] = useState<Mood>(() => computeMood());

  const timeOfDay = getTimeOfDay();
  const illness = useWuliliStore((s) => s.state.illness);
  const coins = useWuliliStore((s) => s.state.coins);
  const updateLoginStreak = useWuliliStore((s) => s.updateLoginStreak);

  const isStreaming = useStreamStore((s) => s.state.isStreaming);
  const streamStartedAt = useStreamStore((s) => s.state.startedAt);

  const scene = useMemo(
    () => getCurrentScene(timeOfDay),
    [timeOfDay],
  );
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

  const handleRefresh = async () => {
    setRefreshing(true);
    useWuliliStore.getState().applyTimeDecay();
    setMood(computeMood());
    const line = speak({ forceCategory: 'idle' });
    if (line) setDialogue(line);
    setRefreshing(false);
  };

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

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View style={{ flex: 1 }}>
        <WuliliAvatar
          mood={mood}
          fullScreen
          sceneImage={sceneImage}
        />

        <View
          className="absolute inset-0 px-4"
          pointerEvents="box-none"
          style={{ paddingTop: 12, paddingBottom: 12 }}
        >
          {/* 顶部信息栏 */}
          <View className="flex-row items-center justify-between mb-2">
            <View className="rounded-full bg-black/40 px-3 py-1">
              <Text className="text-xs text-white font-medium">
                {getTimeOfDayLabel(timeOfDay)} · {season}季 · {levelLabel}
              </Text>
            </View>
            <View className="rounded-full bg-black/40 px-3 py-1 flex-row items-center">
              <Ionicons name="cash-outline" size={12} color="#FFFFFF" />
              <Text className="ml-1 text-xs text-white font-medium">
                {formatNumber(coins)}
              </Text>
            </View>
          </View>

          {/* 直播横幅 */}
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

          {/* 病症提示 */}
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

          {/* 中间空白区，让出人物显示空间 */}
          <View className="flex-1" pointerEvents="none" />

          {/* 台词气泡 */}
          {dialogue ? (
            <View className="mb-3">
              <DialogueBubble
                dialogue={dialogue}
                onDismiss={() => setDialogue(null)}
                autoDismissMs={10000}
              />
            </View>
          ) : null}

          {/* 左右按钮区 */}
          <View className="flex-row justify-between mb-3">
            <View className="space-y-3">
              {leftButtons.map((btn) => (
                <CircleButton
                  key={btn.label}
                  icon={btn.icon}
                  label={btn.label}
                  onPress={btn.onPress}
                />
              ))}
            </View>

            <View className="space-y-3">
              {rightButtons.map((btn) => (
                <CircleButton
                  key={btn.label}
                  icon={btn.icon}
                  label={btn.label}
                  onPress={btn.onPress}
                />
              ))}
            </View>
          </View>

          {/* 底部大按钮 */}
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
      <Ionicons name={icon} size={26} color="#FFFFFF" />
      <Text className="text-[10px] text-white mt-0.5 font-medium">{label}</Text>
    </Pressable>
  );
}

export default WuliliScreen;