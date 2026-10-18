import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import ScreenContainer from '@/components/ScreenContainer';
import WuliliAvatar from '@/components/WuliliAvatar';
import Button from '@/components/Button';
import EventModal from '@/components/EventModal';
import { useDialogue } from '@/hooks/useDialogue';
import { useSeason } from '@/hooks/useSeason';
import { useBgm } from '@/hooks/useBgm';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAffinity } from '@/hooks/useAffinity';
import { getTimeOfDayLabel, getTimeOfDay, formatDuration } from '@/utils/time';
import { formatNumber } from '@/utils/format';
import { SLEEP_CONFIG, canStartSleep, formatSleepDuration } from '@/data/sleepConfig';
import { computeMenstrualInfo } from '@/data/menstrualConfig';
import type { Mood, Season } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const SEASON_LABELS: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  useBgm();

  const { speak } = useDialogue();
  const affinityData = useAffinity();
  const levelLabel = affinityData?.levelLabel || '初识';
  const { season } = useSeason();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [now, setNow] = useState<number>(Date.now());
  const [mood, setMood] = useState<Mood>(() => computeMood());

  const [activeModal, setActiveModal] = useState<'none' | 'dialogue' | 'event'>('none');
  const [eventConfig, setEventConfig] = useState<{ title: string; msg: string; type: 'sick' | 'period' | 'hungry' | 'sleepy' } | null>(null);
  const [dialogueText, setDialogueText] = useState<string>('');

  const timeOfDay = getTimeOfDay();
  // 🔥 加上了可选链，防止 state 或 stats 为空时直接崩
  const illness = useWuliliStore((s) => s.state?.illness);
  const menstrual = useWuliliStore((s) => s.state?.menstrual);
  const coins = useWuliliStore((s) => s.state?.coins) ?? 0;
  const energy = useWuliliStore((s) => s.state?.stats?.energy) ?? 100;
  const satiety = useWuliliStore((s) => s.state?.stats?.satiety) ?? 100;
  const updateLoginStreak = useWuliliStore((s) => s.updateLoginStreak);

  const isStreaming = useStreamStore((s) => s.state?.isStreaming) ?? false;
  const streamStartedAt = useStreamStore((s) => s.state?.startedAt);

  const isSleeping = useSleepStore((s) => s.state?.isSleeping) ?? false;
  const sleepStartedAt = useSleepStore((s) => s.state?.startedAt);
  const sleepTotalSeconds = useSleepStore((s) => s.state?.totalSeconds) ?? 0;
  const startSleep = useSleepStore((s) => s.start);
  const stopSleep = useSleepStore((s) => s.stop);

  // 🔥 防御 menstrual 为空的情况
  const menstrualInfo = useMemo(
    () => menstrual ? computeMenstrualInfo(menstrual) : { phase: 'unknown', isMedicineActive: false, dayInCycle: 0 },
    [menstrual, now]
  );
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

  useFocusEffect(
    useCallback(() => {
      try {
        updateLoginStreak();
        setMood(computeMood());

        if (isSleeping) return;

        // 优先级 1：生病
        if (illness && illness.type !== 'none') {
          setEventConfig({ title: '雾璃生病了', msg: '她看起来很难受，一直咳嗽。需要带她去药房吗？', type: 'sick' });
          setActiveModal('event');
          return;
        }

        // 优先级 2：经期不适
        if (isInPeriod && !menstrualInfo.isMedicineActive) {
          setEventConfig({ title: '经期不适', msg: '雾璃捂着肚子，脸色有点苍白，可能需要吃点布洛芬。', type: 'period' });
          setActiveModal('event');
          return;
        }

        // 优先级 3：肚子饿了
        if (satiety < 30) {
          setEventConfig({ title: '她饿了', msg: '肚子发出了咕咕的声音... 要给她弄点吃的吗？', type: 'hungry' });
          setActiveModal('event');
          return;
        }

        // 优先级 4：精力见底
        if (energy < 20) {
          setEventConfig({ title: '非常疲惫', msg: '雾璃的眼皮在打架，看来今天真的累坏了。', type: 'sleepy' });
          setActiveModal('event');
          return;
        }

        // 优先级 5：日常打招呼 (🔥 增加严密防护，防止 greeting 崩溃)
        const greeting = speak({ forceCategory: 'greeting' });
        if (greeting && typeof greeting.text === 'string') {
          setDialogueText(greeting.text);
          setActiveModal('dialogue');
        }
      } catch (err) {
        console.warn('触发主页事件失败:', err);
      }
    }, [illness, isInPeriod, menstrualInfo.isMedicineActive, satiety, energy, isSleeping, speak, updateLoginStreak])
  );

  const handleModalDismiss = () => {
    setActiveModal('none');
    setEventConfig(null);
  };

  const getEventActions = () => {
    if (!eventConfig) return [];
    const dismissAction = { label: '暂时不理她', icon: 'close-circle-outline', onPress: handleModalDismiss };

    switch (eventConfig.type) {
      case 'sick':
      case 'period':
        return [
          { label: '马上带她去药房', icon: 'medkit', primary: true, onPress: () => { handleModalDismiss(); navigation.navigate('Medicine'); } },
          dismissAction
        ];
      case 'hungry':
        return [
          { label: '去厨房投喂', icon: 'restaurant', primary: true, onPress: () => { handleModalDismiss(); navigation.navigate('Feed'); } },
          { label: '让她先饿着', icon: 'time-outline', onPress: handleModalDismiss }
        ];
      case 'sleepy':
        return [
          { label: '哄她睡觉', icon: 'moon', primary: true, onPress: () => { handleModalDismiss(); startSleep(); useWuliliStore.getState().markInteraction('sleep'); } },
          dismissAction
        ];
      default:
        return [dismissAction];
    }
  };

  const handleSleepPress = () => {
    if (isStreaming) return Alert.alert('正在直播', '要先下播才能睡觉哦。');
    if (isSleeping) return handleWakeUp();
    if (!canStartSleep(energy)) return Alert.alert('还不困', '雾璃现在精力充沛，不需要睡觉。');
    startSleep();
    useWuliliStore.getState().markInteraction('sleep');
  };

  const handleWakeUp = () => {
    stopSleep();
    setMood('happy');
    Alert.alert('已起床', `雾璃睡了 ${formatSleepDuration(sleepTotalSeconds + (sleepElapsedMs || 0) / 1000)}，精力恢复了一些。`);
  };

  const actionButtons = [
    { icon: 'restaurant', label: '投喂', onPress: () => navigation.navigate('Feed') },
    { icon: 'game-controller', label: '娱乐', onPress: () => navigation.navigate('Entertain') },
    { icon: 'videocam', label: '直播', onPress: () => navigation.navigate('Stream') },
    { icon: 'bicycle', label: '运动', onPress: () => navigation.navigate('Exercise') },
    { icon: 'medkit', label: '药房', onPress: () => navigation.navigate('Medicine') },
    { icon: 'shirt', label: '衣柜', onPress: () => navigation.navigate('Shop') },
  ];

  const streamElapsedMs = isStreaming && streamStartedAt ? now - streamStartedAt : 0;
  const sleepElapsedMs = isSleeping && sleepStartedAt ? now - sleepStartedAt : 0;
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
            characterHeightOverflow={1.15} 
            characterHorizontalOffset={90} 
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
        </View>

        {!isSleeping ? (
          <View className="absolute" style={{ left: 16, top: screenHeight * 0.1 }} pointerEvents="box-none">
            {actionButtons.map((btn) => (
              <View key={btn.label} style={{ marginBottom: 10 }}>
                <CircleButton icon={btn.icon} label={btn.label} onPress={btn.onPress} />
              </View>
            ))}
          </View>
        ) : null}

        {!isSleeping ? (
          <View style={{ position: 'absolute', right: 16, top: screenHeight * 0.1 }}>
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

        {activeModal === 'event' && eventConfig && (
          <EventModal visible={true} title={eventConfig.title} message={eventConfig.msg} actions={getEventActions()} />
        )}

        {activeModal === 'dialogue' && (
          <EventModal visible={true} title="雾璃" message={dialogueText} actions={[]} onDismiss={handleModalDismiss} />
        )}
      </View>
    </ScreenContainer>
  );
}

function computeMood(): Mood {
  const s = useWuliliStore.getState().state;
  if (!s) return 'calm';
  if (s.illness?.type !== 'none') return 'sick';
  if (s.stats?.energy < 15) return 'sleepy';
  if (s.stats?.mood < 30) return 'sad';
  if (s.stats?.mood >= 80) return 'happy';
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
