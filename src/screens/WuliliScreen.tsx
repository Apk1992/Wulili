import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenContainer from '@/components/ScreenContainer';
import WuliliAvatar from '@/components/WuliliAvatar';
import DialogueBubble from '@/components/DialogueBubble';
import Button from '@/components/Button';
import { useDialogue } from '@/hooks/useDialogue';
import { useSeason } from '@/hooks/useSeason';
import { useBgm } from '@/hooks/useBgm';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAffinity } from '@/hooks/useAffinity';
import { getTimeOfDayLabel, getTimeOfDay, formatDuration } from '@/utils/time';
import { formatNumber } from '@/utils/format';
import { SLEEP_CONFIG, canStartSleep, formatSleepDuration } from '@/data/sleepConfig';
import { computeMenstrualInfo } from '@/data/menstrualConfig';
import type { Mood, Season } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const SEASON_LABELS: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  useBgm();

  const { speak } = useDialogue();
  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [now, setNow] = useState<number>(Date.now());
  const [mood, setMood] = useState<Mood>(() => computeMood());

  const timeOfDay = getTimeOfDay();
  const illness = useWuliliStore((s) => s.state.illness);
  const menstrual = useWuliliStore((s) => s.state.menstrual);
  const coins = useWuliliStore((s) => s.state.coins);
  const energy = useWuliliStore((s) => s.state.stats.energy);
  const updateLoginStreak = useWuliliStore((s) => s.updateLoginStreak);

  const isStreaming = useStreamStore((s) => s.state.isStreaming);
  const streamStartedAt = useStreamStore((s) => s.state.startedAt);

  const isSleeping = useSleepStore((s) => s.state.isSleeping);
  const sleepStartedAt = useSleepStore((s) => s.state.startedAt);
  const sleepTotalSeconds = useSleepStore((s) => s.state.totalSeconds);
  const startSleep = useSleepStore((s) => s.start);
  const stopSleep = useSleepStore((s) => s.stop);

  const menstrualInfo = useMemo(() => computeMenstrualInfo(menstrual), [menstrual, now]);
  const isInPeriod = menstrualInfo.phase === 'period';

  const sceneImage = useMemo(() => {
    if (isSleeping) return 'images/scenes/bedroom_sleep.png';
    const seasonStr = season || 'autumn';
    const currentHour = new Date().getHours();
    const isNight = currentHour >= 18 || currentHour < 6; 
    const suffix = isNight ? '_night' : '';
    return `images/scenes/living_${seasonStr}${suffix}.png`;
  }, [isSleeping, season]);

  useEffect(() => {
    if (!isStreaming && !isSleeping) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isStreaming, isSleeping]);

  useFocusEffect(useCallback(() => {
    updateLoginStreak();
    setMood(computeMood());
    if (!isSleeping) {
      const greeting = speak({ forceCategory: 'greeting' });
      if (greeting) setDialogue(greeting);
    }
  }, []));

  useEffect(() => {
    if (!dialogue && !isSleeping) {
      const lastText = useDialogueStore.getState().lastText;
      if (lastText) {
        setDialogue({ id: 'restored', text: lastText, category: 'idle', emotion: 'calm', triggers: [], weight: 1, cooldownHours: 0, once: false, source: 'default' });
      }
    }
  }, [dialogue, isSleeping]);

  const streamElapsedMs = isStreaming && streamStartedAt ? now - streamStartedAt : 0;
  const sleepElapsedMs = isSleeping && sleepStartedAt ? now - sleepStartedAt : 0;

  const handleSleepPress = () => {
    if (isStreaming) return Alert.alert('正在直播', '要先下播才能睡觉哦。');
    if (isSleeping) return handleWakeUp();
    if (!canStartSleep(energy)) return Alert.alert('还不困', '雾璃现在精力充沛，不需要睡觉。');
    startSleep();
    useWuliliStore.getState().markInteraction('sleep');
    setDialogue(null);
  };

  const handleWakeUp = () => {
    stopSleep();
    setMood('happy');
    Alert.alert('已起床', `雾璃睡了 ${formatSleepDuration(sleepTotalSeconds + sleepElapsedMs / 1000)}，精力恢复了一些。`);
  };

  const actionButtons = [
    { icon: 'restaurant', label: '投喂', onPress: () => navigation.navigate('Feed') },
    { icon: 'game-controller', label: '娱乐', onPress: () => navigation.navigate('Entertain') },
    { icon: 'videocam', label: '直播', onPress: () => navigation.navigate('Stream') },
    { icon: 'bicycle', label: '运动', onPress: () => navigation.navigate('Exercise') },
    { icon: 'medkit', label: '药房', onPress: () => navigation.navigate('Medicine') },
    { icon: 'shirt', label: '衣柜', onPress: () => navigation.navigate('Shop') },
  ];

  const canSleep = canStartSleep(energy);
  const displayMood: Mood = isSleeping ? 'sleepy' : isInPeriod ? 'sad' : mood;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <WuliliAvatar
            mood={displayMood}
            fullScreen
            sceneImage={sceneImage}
            hideCharacter={isSleeping}
            characterSizeRatio={1.1} 
            characterVerticalBias={0.25} 
            characterHeightOverflow={1.1} 
            characterHorizontalOffset={80} // 👈 核心：人物向右平移 40 像素，头发完美出屏
          />
        </View>

        <View className="absolute left-0 right-0 px-4" style={{ top: insets.top + 12 }} pointerEvents="box-none">
          <View className="flex-row items-center justify-between mb-2">
            <View className="rounded-full bg-black/50 px-3 py-1"><Text className="text-xs text-white font-medium">{getTimeOfDayLabel(timeOfDay)} · {SEASON_LABELS[season] ?? ''}季 · {levelLabel}</Text></View>
            <View className="rounded-full bg-black/50 px-3 py-1 flex-row items-center"><Ionicons name="cash-outline" size={12} color="#FFFFFF" /><Text className="ml-1 text-xs text-white font-medium">{formatNumber(coins)}</Text></View>
          </View>

          {isStreaming ? (
            <Pressable onPress={() => navigation.navigate('Stream')} className="mb-2 rounded-2xl px-3 py-2 flex-row items-center active:opacity-80" style={{ backgroundColor: 'rgba(239,68,68,0.9)' }}>
              <Ionicons name="radio" size={18} color="#FFFFFF" />
              <View className="ml-2 flex-1"><Text className="text-white text-sm font-semibold">正在直播中</Text><Text className="text-white/80 text-[10px] mt-0.5">已播 {formatDuration(streamElapsedMs)} · 点此查看</Text></View>
              <Ionicons name="chevron-forward" size={16} color="#FFFFFF" />
            </Pressable>
          ) : null}

          {isSleeping ? (
            <View className="mb-2 rounded-2xl px-3 py-2 flex-row items-center" style={{ backgroundColor: 'rgba(99,102,241,0.9)' }}>
              <Ionicons name="moon" size={18} color="#FFFFFF" />
              <View className="ml-2 flex-1"><Text className="text-white text-sm font-semibold">雾璃正在睡觉</Text><Text className="text-white/80 text-[10px] mt-0.5">已睡 {formatSleepDuration(sleepElapsedMs / 1000)}</Text></View>
            </View>
          ) : null}

          {isInPeriod && !isSleeping ? (
            <Pressable onPress={() => navigation.navigate('Medicine')} className="mb-2 rounded-2xl px-3 py-2 flex-row items-center active:opacity-80" style={{ backgroundColor: 'rgba(168,85,247,0.9)' }}>
              <Ionicons name="water" size={16} color="#FFFFFF" /><View className="ml-2 flex-1"><Text className="text-white text-xs font-semibold">雾璃今天不太舒服 · 经期第 {menstrualInfo.dayInCycle} 天</Text></View><Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
            </Pressable>
          ) : null}

          {illness.type !== 'none' && !isSleeping ? (
            <Pressable onPress={() => navigation.navigate('Medicine')} className="mb-2 rounded-2xl px-3 py-2 flex-row items-center active:opacity-80" style={{ backgroundColor: 'rgba(239,68,68,0.85)' }}>
              <Ionicons name="medkit" size={16} color="#FFFFFF" /><Text className="ml-2 text-white text-xs font-medium">雾璃身体不舒服 · 去药房</Text>
            </Pressable>
          ) : null}

          {dialogue && !isSleeping ? (
            <View style={{ position: 'relative' }}><DialogueBubble dialogue={dialogue} onDismiss={() => setDialogue(null)} autoDismissMs={10000} /></View>
          ) : null}
        </View>

        {/* 🔥 左侧按钮区：top 稍微下移到 0.38，避开对话框 */}
        {!isSleeping ? (
          <View className="absolute" style={{ left: 16, top: screenHeight * 0.25 }} pointerEvents="box-none">
            {actionButtons.map((btn) => (
              <View key={btn.label} style={{ marginBottom: 8 }}>
                <CircleButton icon={btn.icon} label={btn.label} onPress={btn.onPress} />
              </View>
            ))}
          </View>
        ) : null}

        {!isSleeping ? (
          <View style={{ position: 'absolute', right: 16, top: screenHeight * 0.25 }}>
             <SleepButton onPress={handleSleepPress} disabled={!canSleep} isSleeping={false} />
          </View>
        ) : null}

        <View className="absolute left-4 right-4" style={{ bottom: 24 }} pointerEvents="box-none">
          {isSleeping ? (
            <Button label="叫醒她" icon="sunny" variant="danger" size="lg" onPress={handleWakeUp} />
          ) : (
            <Button label="查看雾璃的状态" icon="heart-circle" variant="primary" size="lg" onPress={() => navigation.navigate('Status')} />
          )}
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

function SleepButton({ onPress, disabled, isSleeping }: { onPress: () => void; disabled: boolean; isSleeping: boolean }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} disabled={disabled && !isSleeping} className="items-center justify-center rounded-full active:opacity-70" style={{ width: 56, height: 56, backgroundColor: disabled && !isSleeping ? 'rgba(100,116,139,0.8)' : '#EF4444', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 6, elevation: 8 }}>
      <Ionicons name={isSleeping ? 'sunny' : 'moon'} size={24} color="#FFFFFF" />
    </Pressable>
  );
}

function CircleButton({ icon, label, onPress }: { icon: string; label: string; onPress: () => void }): React.JSX.Element {
  return (
    <Pressable onPress={onPress} className="items-center justify-center rounded-full active:opacity-90" style={{ width: 56, height: 56, backgroundColor: 'rgba(15,23,42,0.7)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)' }}>
      <Ionicons name={icon} size={22} color="#FFFFFF" /><Text className="text-[10px] text-white mt-0.5 font-medium">{label}</Text>
    </Pressable>
  );
}

export default WuliliScreen;
