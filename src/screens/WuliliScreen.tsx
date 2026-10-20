// src/screens/WuliliScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions, Modal, TouchableWithoutFeedback } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import WuliliAvatar from '@/components/WuliliAvatar';
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
let dismissedEventType: string | null = null;

// 🔥 Cloudflare R2 基础路径（供远端动态场景或音效扩展使用）
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  useBgm();

  const { speak } = useDialogue();
  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [now, setNow] = useState<number>(Date.now());
  const [mood, setMood] = useState<Mood>(() => computeMood());
  const [activeModal, setActiveModal] = useState<'none' | 'dialogue' | 'event'>('none');
  const [eventConfig, setEventConfig] = useState<{ title: string; msg: string; type: string } | null>(null);
  const [dialogueText, setDialogueText] = useState<string>('');

  const timeOfDay = getTimeOfDay();
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
        if (isSleeping || activeModal !== 'none') return;

        if (illness && illness.type !== 'none' && dismissedEventType !== 'sick') {
          setEventConfig({ title: '雾璃生病了', msg: '她看起来很难受，一直咳嗽。需要带她去药房吗？', type: 'sick' });
          setActiveModal('event');
          return;
        }

        if (isInPeriod && !menstrualInfo.isMedicineActive && dismissedEventType !== 'period') {
          setEventConfig({ title: '经期不适', msg: '雾璃捂着肚子，脸色有点苍白，可能需要吃点布洛芬。', type: 'period' });
          setActiveModal('event');
          return;
        }

        if (satiety < 30 && dismissedEventType !== 'hungry') {
          setEventConfig({ title: '她饿了', msg: '肚子发出了咕咕的声音... 要给她弄点吃的吗？', type: 'hungry' });
          setActiveModal('event');
          return;
        }

        if (energy < 20 && dismissedEventType !== 'sleepy') {
          setEventConfig({ title: '非常疲惫', msg: '雾璃的眼皮在打架，看来今天真的累坏了。', type: 'sleepy' });
          setActiveModal('event');
          return;
        }

        const greeting = speak({ forceCategory: 'greeting' });
        if (greeting) {
          const text = typeof greeting === 'string' ? greeting : (greeting as any).text;
          if (typeof text === 'string') {
            setDialogueText(text);
            setActiveModal('dialogue');
          }
        }
      } catch (err) {
        console.warn('触发主页事件失败:', err);
      }
    }, [illness, isInPeriod, menstrualInfo.isMedicineActive, satiety, energy, isSleeping, speak, updateLoginStreak, activeModal])
  );

  const handleModalDismiss = () => {
    if (eventConfig) dismissedEventType = eventConfig.type;
    setActiveModal('none');
    setEventConfig(null);
  };

  const getEventActions = () => {
    if (!eventConfig) return [];
    const dismissAction = { label: '暂时不理她', icon: '', onPress: handleModalDismiss };

    switch (eventConfig.type) {
      case 'sick':
      case 'period':
        return [
          { label: '马上带她去药房', icon: '', primary: true, onPress: () => { setActiveModal('none'); navigation.navigate('Medicine'); } },
          dismissAction
        ];
      case 'hungry':
        return [
          { label: '去厨房投喂', icon: '', primary: true, onPress: () => { setActiveModal('none'); navigation.navigate('Feed'); } },
          { label: '让她先饿着', icon: '', onPress: handleModalDismiss }
        ];
      case 'sleepy':
        return [
          { label: '哄她睡觉', icon: '', primary: true, onPress: () => { setActiveModal('none'); startSleep(); useWuliliStore.getState().markInteraction('sleep'); } },
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
    const sleepElapsedMs = isSleeping && sleepStartedAt ? Date.now() - sleepStartedAt : 0;
    Alert.alert('已起床', `雾璃睡了 ${formatSleepDuration(sleepTotalSeconds + sleepElapsedMs / 1000)}，精力恢复了一些。`);
  };

  const streamElapsedMs = isStreaming && streamStartedAt ? now - streamStartedAt : 0;
  const sleepElapsedMs = isSleeping && sleepStartedAt ? now - sleepStartedAt : 0;
  const canSleep = canStartSleep(energy);
  const displayMood: Mood = isSleeping ? 'sleepy' : isInPeriod ? 'sad' : mood;

  const actionButtons = [
    { label: '投喂', onPress: () => navigation.navigate('Feed') },
    { label: '娱乐', onPress: () => navigation.navigate('Entertain') },
    { label: '直播', onPress: () => navigation.navigate('Stream') },
    { label: '运动', onPress: () => navigation.navigate('Exercise') },
    { label: '药房', onPress: () => navigation.navigate('Medicine') },
    { label: '衣柜', onPress: () => navigation.navigate('Shop') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ flex: 1, overflow: 'hidden' }}>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
          <WuliliAvatar mood={displayMood} fullScreen sceneImage={sceneImage} hideCharacter={isSleeping} characterSizeRatio={1.1} characterVerticalBias={0.25} characterHeightOverflow={1.15} characterHorizontalOffset={90} />
        </View>
        
        <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 12, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>{getTimeOfDayLabel(timeOfDay)} · {SEASON_LABELS[season] ?? ''}季 · {levelLabel}</Text>
            </View>
            <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4, flexDirection: 'row', alignItems: 'center' }}>
              <Text style={{ marginLeft: 4, fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>💰 {formatNumber(coins)}</Text>
            </View>
          </View>
          {isStreaming && (
            <Pressable onPress={() => navigation.navigate('Stream')} style={{ marginBottom: 8, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(239,68,68,0.9)' }}>
              <View style={{ marginLeft: 8, flex: 1 }}><Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>🔴 正在直播中</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>已播 {formatDuration(streamElapsedMs)} · 点此查看</Text></View>
            </Pressable>
          )}
          {isSleeping && (
            <View style={{ marginBottom: 8, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(99,102,241,0.9)' }}>
              <View style={{ marginLeft: 8, flex: 1 }}><Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>💤 雾璃正在睡觉</Text><Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>已睡 {formatSleepDuration(sleepElapsedMs / 1000)}</Text></View>
            </View>
          )}
        </View>
        
        {!isSleeping && (
          <View style={{ position: 'absolute', left: 16, top: screenHeight * 0.15 }}>
            {actionButtons.map((btn) => (
              <View key={btn.label} style={{ marginBottom: 10 }}>
                <Pressable onPress={btn.onPress} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(15,23,42,0.7)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ fontSize: 14, color: '#FFFFFF', fontWeight: 'bold' }}>{btn.label}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        )}
        
        {!isSleeping && (
          <Pressable onPress={handleSleepPress} disabled={!canSleep} style={{ position: 'absolute', right: 16, top: screenHeight * 0.15, width: 56, height: 56, borderRadius: 28, backgroundColor: !canSleep ? 'rgba(100,116,139,0.8)' : '#EF4444', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 24 }}>🌙</Text>
          </Pressable>
        )}
        
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}>
          {isSleeping ? (
            <Pressable onPress={handleWakeUp} style={{ backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>叫醒她</Text>
            </Pressable>
          ) : (
            <Pressable onPress={() => navigation.navigate('Status')} style={{ backgroundColor: '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>查看雾璃的状态</Text>
            </Pressable>
          )}
        </View>

        <Modal visible={activeModal === 'event'} transparent animationType="fade">
          <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
            <View style={{ width: '85%', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', textAlign: 'center', marginBottom: 16 }}>{eventConfig?.title}</Text>
              <Text style={{ fontSize: 16, textAlign: 'center', color: '#CBD5E1', lineHeight: 24, marginBottom: 24 }}>{eventConfig?.msg}</Text>
              <View>
                {getEventActions().map((act, idx) => (
                  <Pressable key={idx} onPress={act.onPress} style={[{ paddingVertical: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12, alignItems: 'center' }, act.primary ? { backgroundColor: '#2563EB', borderColor: '#2563EB' } : { backgroundColor: 'transparent', borderColor: '#334155' }]}>
                    <Text style={[{ fontWeight: '600' }, act.primary ? { color: '#FFFFFF' } : { color: '#CBD5E1' }]}>{act.label}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        <Modal visible={activeModal === 'dialogue'} transparent animationType="fade">
          <TouchableWithoutFeedback onPress={() => setActiveModal('none')}>
            <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
              <View style={{ width: '85%', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' }}>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC', textAlign: 'center', marginBottom: 16 }}>雾璃</Text>
                <Text style={{ fontSize: 16, textAlign: 'center', color: '#CBD5E1', lineHeight: 24, marginBottom: 16 }}>{dialogueText}</Text>
                <Text style={{ fontSize: 12, textAlign: 'center', color: '#64748B' }}>点击空白处继续...</Text>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      </View>
    </View>
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

export default WuliliScreen;
