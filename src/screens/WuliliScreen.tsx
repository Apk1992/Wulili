// src/screens/WuliliScreen.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  Image,
  ImageBackground,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useSeason } from '@/hooks/useSeason';
import { useBgm } from '@/hooks/useBgm';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAffinity } from '@/hooks/useAffinity';
import { getTimeOfDayLabel, getTimeOfDay, formatDuration } from '@/utils/time';
import { formatNumber } from '@/utils/format';
import { canStartSleep, formatSleepDuration } from '@/data/sleepConfig';
import type { Mood, Season } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const SEASON_LABELS: Record<Season, string> = {
  spring: '春',
  summer: '夏',
  autumn: '秋',
  winter: '冬',
};

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

// ⚠️ R2 实际文件：angry / blush / happy / normal / sad / sick / sleepy
// 无 calm.png → 用 normal.png
// 无 shy.png  → 用 blush.png
const AVATAR_FILE_MAP: Record<Mood, string> = {
  calm:   'normal.png',
  happy:  'happy.png',
  sad:    'sad.png',
  sick:   'sick.png',
  sleepy: 'sleepy.png',
  shy:    'blush.png',
};

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  useBgm();

  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [now, setNow] = useState<number>(Date.now());

  const timeOfDay = getTimeOfDay();
  const energy = useWuliliStore((s) => s.state?.stats?.energy) ?? 100;
  const satiety = useWuliliStore((s) => s.state?.stats?.satiety) ?? 100;
  const moodVal = useWuliliStore((s) => s.state?.stats?.mood) ?? 80;
  const coins = useWuliliStore((s) => s.state?.coins) ?? 0;
  const illness = useWuliliStore((s) => s.state?.illness);
  const affinity = useWuliliStore((s) => s.affinity) ?? 0;

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

  const sceneUri = useMemo(() => {
    if (isSleeping) return `${R2_BASE}/images/scenes/bedroom_sleep.png`;
    const seasonStr = season ?? 'autumn';
    const h = new Date().getHours();
    const isNight = h >= 18 || h < 6;
    return `${R2_BASE}/images/scenes/living_${seasonStr}${isNight ? '_night' : ''}.png`;
  }, [isSleeping, season]);

  const mood: Mood = useMemo(() => {
    if (illness?.type && illness.type !== 'none') return 'sick';
    if (energy < 15) return 'sleepy';
    if (moodVal < 30) return 'sad';
    if (moodVal >= 80) return 'happy';
    if (affinity >= 60) return 'shy';
    return 'calm';
  }, [illness, energy, moodVal, affinity]);

  const displayMood: Mood = isSleeping ? 'sleepy' : mood;
  const avatarUri = `${R2_BASE}/images/avatar/${AVATAR_FILE_MAP[displayMood]}`;

  const handleSleepPress = () => {
    if (isStreaming) {
      Alert.alert('正在直播', '要先下播才能睡觉哦。');
      return;
    }
    if (isSleeping) {
      handleWakeUp();
      return;
    }
    if (!canStartSleep(energy)) {
      Alert.alert('还不困', '雾璃现在精力充沛，不需要睡觉。');
      return;
    }
    startSleep();
    useWuliliStore.getState().markInteraction('sleep');
  };

  const handleWakeUp = () => {
    stopSleep();
    const sleepElapsedMs =
      isSleeping && sleepStartedAt ? Date.now() - sleepStartedAt : 0;
    Alert.alert(
      '已起床',
      `雾璃睡了 ${formatSleepDuration(
        sleepTotalSeconds + sleepElapsedMs / 1000
      )}，精力恢复了一些。`
    );
  };

  const streamElapsedMs =
    isStreaming && streamStartedAt ? now - streamStartedAt : 0;
  const sleepElapsedMs =
    isSleeping && sleepStartedAt ? now - sleepStartedAt : 0;
  const canSleep = canStartSleep(energy);

  const AVATAR_SCALE = 1.0;   // 想大就 1.0，想小就 0.7
  
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
      <ImageBackground
        source={{ uri: sceneUri }}
        style={{ flex: 1, width: '100%', height: '100%' }}
        resizeMode="cover"
      >
        {/* ====== 人物立绘（最底层） ====== */}
        <Image
          source={{ uri: avatarUri }}
          style={{
            position: 'absolute',
            width:  screenWidth  * AVATAR_SCALE,
            height: screenHeight * (AVATAR_SCALE * 0.7),   // 0.60 / 0.85 ≈ 0.706
            left: (screenWidth - screenWidth * 0.85) / 2+50,
            top: screenHeight * 0.30,
          }}
          resizeMode="contain"
        />

        {/* ====== 顶部状态栏 ====== */}
        <View
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: insets.top + 12,
            paddingHorizontal: 16,
          }}
        >
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 8,
            }}
          >
            <View
              style={{
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>
                {getTimeOfDayLabel(timeOfDay)} · {SEASON_LABELS[season] ?? ''}季 · {levelLabel ?? '新手'}
              </Text>
            </View>
            <View
              style={{
                borderRadius: 999,
                backgroundColor: 'rgba(0,0,0,0.5)',
                paddingHorizontal: 12,
                paddingVertical: 4,
              }}
            >
              <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>
                💰 {formatNumber(coins)}
              </Text>
            </View>
          </View>

          {isStreaming && (
            <View
              style={{
                marginBottom: 8,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: 'rgba(239,68,68,0.9)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                🔴 正在直播中
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>
                已播 {formatDuration(streamElapsedMs)}
              </Text>
            </View>
          )}

          {isSleeping && (
            <View
              style={{
                marginBottom: 8,
                borderRadius: 16,
                paddingHorizontal: 12,
                paddingVertical: 8,
                backgroundColor: 'rgba(99,102,241,0.9)',
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>
                💤 雾璃正在睡觉
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>
                已睡 {formatSleepDuration(sleepElapsedMs / 1000)}
              </Text>
            </View>
          )}
        </View>

        {/* ====== 左侧操作按钮 ====== */}
        {!isSleeping && (
          <View style={{ position: 'absolute', left: 16, top: screenHeight * 0.10 }}>
            {actionButtons.map((btn) =>
              <View key={btn.label} style={{ marginBottom: 12, alignItems: 'center' }}>
                <Pressable
                  onPress={btn.onPress}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: 32,
                    backgroundColor: 'rgba(15,23,42,0.6)',
                    borderWidth: 2,
                    borderColor: 'rgba(255,255,255,0.2)',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  <Image
                    source={{ uri: `${R2_BASE}/${btn.img}` }}
                    style={{ width: 64, height: 64 }}
                    resizeMode="contain"
                  />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* ====== 睡觉按钮 ====== */}
        {!isSleeping && (
          <Pressable
            onPress={handleSleepPress}
            disabled={!canSleep}
            style={{
              position: 'absolute',
              right: 16,
              top: screenHeight * 0.25,
              width: 56,
              height: 56,
              borderRadius: 28,
              backgroundColor: !canSleep ? 'rgba(100,116,139,0.8)' : '#EF4444',
              borderWidth: 2,
              borderColor: 'rgba(255,255,255,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Text style={{ fontSize: 24 }}>🌙</Text>
          </Pressable>
        )}

        {/* ====== 底部按钮 ====== */}
        <View style={{ position: 'absolute', left: 16, right: 16, top: screenHeight * 0.10 }}>
          {isSleeping ? (
            <Pressable
              onPress={handleWakeUp}
              style={{
                backgroundColor: '#EF4444',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>叫醒她</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={() => navigation.navigate('Status')}
              style={{
                backgroundColor: '#2563EB',
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>
                查看雾璃的状态
              </Text>
            </Pressable>
          )}
        </View>
      </ImageBackground>
    </View>
  );
}

export default WuliliScreen;
