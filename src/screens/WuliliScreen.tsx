import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Pressable, Text, View, useWindowDimensions, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// 👈 注意：我们暂时移除了 WuliliAvatar 和 EventModal 的引入

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
const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  useBgm();

  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [now, setNow] = useState<number>(Date.now());
  const [mood, setMood] = useState<Mood>(() => computeMood());

  const timeOfDay = getTimeOfDay();
  const energy = useWuliliStore((s) => s.state?.stats?.energy) ?? 100;
  const coins = useWuliliStore((s) => s.state?.coins) ?? 0;

  const isStreaming = useStreamStore((s) => s.state?.isStreaming) ?? false;
  const streamStartedAt = useStreamStore((s) => s.state?.startedAt);

  const isSleeping = useSleepStore((s) => s.state?.isSleeping) ?? false;
  const sleepStartedAt = useSleepStore((s) => s.state?.startedAt);
  const sleepTotalSeconds = useSleepStore((s) => s.state?.totalSeconds) ?? 0;
  const startSleep = useSleepStore((s) => s.start);
  const stopSleep = useSleepStore((s) => s.stop);

  useEffect(() => {
    if (!isStreaming && !isSleeping) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isStreaming, isSleeping]);

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

  const actionButtons = [
    { img: 'images/ui/btn_feed.png', label: '投喂', onPress: () => navigation.navigate('Feed') },
    { img: 'images/ui/btn_game.png', label: '娱乐', onPress: () => navigation.navigate('Entertain') },
    { img: 'images/ui/btn_stream.png', label: '直播', onPress: () => navigation.navigate('Stream') },
    { img: 'images/ui/btn_exercise.png', label: '运动', onPress: () => navigation.navigate('Exercise') },
    { img: 'images/ui/btn_medicine.png', label: '药房', onPress: () => navigation.navigate('Medicine') },
    { img: 'images/ui/btn_wardrobe.png', label: '衣柜', onPress: () => navigation.navigate('Shop') },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: '#1E293B' }}>
      {/* 🔥 纯色背景，无任何场景图 */}
      
      <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 12, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>{getTimeOfDayLabel(timeOfDay)} · {SEASON_LABELS[season] ?? ''}季 · {levelLabel}</Text>
          </View>
          <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4 }}>
            <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>💰 {formatNumber(coins)}</Text>
          </View>
        </View>
        {isStreaming && <Text style={{color: 'red', fontSize: 20}}>正在直播</Text>}
        {isSleeping && <Text style={{color: 'blue', fontSize: 20}}>正在睡觉</Text>}
      </View>

      {/* 按钮区 */}
      {!isSleeping && (
        <View style={{ position: 'absolute', left: 16, top: screenHeight * 0.25 }}>
          {actionButtons.map((btn) => (
            <View key={btn.label} style={{ marginBottom: 12, alignItems: 'center' }}>
              <Pressable onPress={btn.onPress} style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(15,23,42,0.6)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                <Image source={{ uri: `${R2_BASE}/${btn.img}` }} style={{ width: 44, height: 44 }} resizeMode="contain" />
              </Pressable>
              <Text style={{ fontSize: 10, color: '#FFFFFF', marginTop: 4 }}>{btn.label}</Text>
            </View>
          ))}
        </View>
      )}

      {!isSleeping && (
        <Pressable onPress={handleSleepPress} disabled={!canSleep} style={{ position: 'absolute', right: 16, top: screenHeight * 0.25, width: 56, height: 56, borderRadius: 28, backgroundColor: !canSleep ? 'gray' : 'red', alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 24 }}>🌙</Text>
        </Pressable>
      )}

      <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}>
        {isSleeping ? (
          <Pressable onPress={handleWakeUp} style={{ backgroundColor: 'red', padding: 16, alignItems: 'center' }}><Text style={{color: 'white'}}>叫醒她</Text></Pressable>
        ) : (
          <Pressable onPress={() => navigation.navigate('Status')} style={{ backgroundColor: 'blue', padding: 16, alignItems: 'center' }}><Text style={{color: 'white'}}>查看状态</Text></Pressable>
        )}
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
