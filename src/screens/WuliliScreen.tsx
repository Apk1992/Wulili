// src/screens/WuliliScreen.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert, Pressable, Text, View, useWindowDimensions, Image, ImageBackground,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

import { useSeason } from '@/hooks/useSeason';
import { useBgm } from '@/hooks/useBgm';
import { useDialogue } from '@/hooks/useDialogue';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useTravelStore } from '@/store/useTravelStore';
import { useAffinity } from '@/hooks/useAffinity';
import { getTimeOfDayLabel, getTimeOfDay, formatDuration } from '@/utils/time';
import { formatNumber } from '@/utils/format';
import { canStartSleep, formatSleepDuration } from '@/data/sleepConfig';
import { TRAVEL_DESTINATIONS } from '@/data/travelConfig';
import { HOUSES } from '@/data/houseConfig'; // 🔥 引入房屋
import { ActionDialogueModal } from '@/components/ActionDialogueModal';
import type { Mood, Season } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const SEASON_LABELS: Record<Season, string> = { spring: '春', summer: '夏', autumn: '秋', winter: '冬' };
const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const AVATAR_FILE_MAP: Record<Mood, string> = { calm: 'normal.png', happy: 'happy.png', sad: 'sad.png', sick: 'sick.png', sleepy: 'sleepy.png', shy: 'blush.png' };

const AVATAR_SCALE = 1.70;
const AVATAR_TOP_RATIO = 0.10;
const AVATAR_RIGHT_ANCHOR = 0.50;
const POKE_DURATION_MS = 3000;

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  useBgm();
  const { speak } = useDialogue();

  const { levelLabel } = useAffinity();
  const { season } = useSeason();
  const { height: screenHeight, width: screenWidth } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [now, setNow] = useState<number>(Date.now());
  const [pokeMood, setPokeMood] = useState<Mood | null>(null);
  const pokeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [photoDialogVisible, setPhotoDialogVisible] = useState(false);
  const [photoDialogText, setPhotoDialogText] = useState('');

  const timeOfDay = getTimeOfDay();
  const energy = useWuliliStore((s) => s.state?.stats?.energy) ?? 100;
  const satiety = useWuliliStore((s) => s.state?.stats?.satiety) ?? 100;
  const moodVal = useWuliliStore((s) => s.state?.stats?.mood) ?? 80;
  const coins = useWuliliStore((s) => s.state?.coins) ?? 0;
  const illness = useWuliliStore((s) => s.state?.illness);
  const affinity = useWuliliStore((s) => s.affinity) ?? 0;
  
  // 🔥 获取当前房子
  const currentHouseId = useWuliliStore((s) => s.state.currentHouseId) || 'default_room';

  const isStreaming = useStreamStore((s) => s.state?.isStreaming) ?? false;
  const streamStartedAt = useStreamStore((s) => s.state?.startedAt);

  const isSleeping = useSleepStore((s) => s.state?.isSleeping) ?? false;
  const sleepStartedAt = useSleepStore((s) => s.state?.startedAt);
  const sleepTotalSeconds = useSleepStore((s) => s.state?.totalSeconds) ?? 0;
  const startSleep = useSleepStore((s) => s.start);
  const stopSleep = useSleepStore((s) => s.stop);

  const travelState = useTravelStore((s) => s.state);
  const isTraveling = travelState.isTraveling;
  // @ts-ignore
  const lastTravelResult = travelState.lastTravelResult as string | null;

  useEffect(() => {
    if (!isStreaming && !isSleeping) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isStreaming, isSleeping]);

  useEffect(() => {
    if (lastTravelResult && !isTraveling) {
      let spotInfo = null;
      for (const dest of TRAVEL_DESTINATIONS) {
        const spot = dest.spots.find((s) => s.id === lastTravelResult);
        if (spot) { spotInfo = { ...spot, city: dest.city }; break; }
      }
      if (spotInfo) {
        setPhotoDialogText(`我从${spotInfo.city}回来了！\n\n我在【${spotInfo.name}】拍了张照片。\n${spotInfo.description}`);
        setPhotoDialogVisible(true);
      }
    }
  }, [lastTravelResult, isTraveling]);

  useEffect(() => {
    return () => { if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current); };
  }, []);

  // ===== 动态背景加载 =====
  const awakeSceneUri = useMemo(() => {
    const currentHouse = HOUSES.find((h) => h.id === currentHouseId) || HOUSES[0];
    
    // 如果这个房子有专门的背景图，就用房子的背景
    if (currentHouse && currentHouse.image) {
      // 如果文件名包含 _night 的逻辑，这里为了简单就直接用房子图
      return `${R2_BASE}/${currentHouse.image}`;
    }
    
    // 否则，默认房子用季节 + 昼夜切换
    const seasonStr = season ?? 'autumn';
    const h = new Date().getHours();
    const isNight = h >= 18 || h < 6;
    return `${R2_BASE}/images/scenes/living_${seasonStr}${isNight ? '_night' : ''}.png`;
  }, [season, currentHouseId]);

  const sleepSceneUri = `${R2_BASE}/images/scenes/bedroom_sleep.png`;
  const sceneUri = isSleeping ? sleepSceneUri : awakeSceneUri;

  const mood: Mood = useMemo(() => {
    if (illness?.type && illness.type !== 'none') return 'sick';
    if (energy < 15) return 'sleepy';
    if (moodVal < 30) return 'sad';
    if (moodVal >= 80) return 'happy';
    if (affinity >= 60) return 'shy';
    return 'calm';
  }, [illness, energy, moodVal, affinity]);

  const displayMood: Mood = pokeMood ?? mood;
  const avatarUri = `${R2_BASE}/images/avatar/${AVATAR_FILE_MAP[displayMood]}`;

  const handlePokeHead = () => {
    if (isSleeping || isTraveling) return;
    setPokeMood('shy');
    useWuliliStore.getState().markInteraction('poke_head');
    try {
      const line = speak({ forceCategory: 'poke' });
      if (line) {
        const text = typeof line === 'string' ? line : (line as any).text;
        if (typeof text === 'string' && text.length > 0) Alert.alert('雾璃', text);
      }
    } catch (e) {}
    if (pokeTimerRef.current) clearTimeout(pokeTimerRef.current);
    pokeTimerRef.current = setTimeout(() => setPokeMood(null), POKE_DURATION_MS);
  };

  const handleSleepPress = () => {
    if (isTraveling) return;
    if (isStreaming) return Alert.alert('正在直播', '要先下播才能睡觉哦。');
    if (isSleeping) return handleWakeUp();
    if (!canStartSleep(energy)) return Alert.alert('还不困', '雾璃现在精力充沛，不需要睡觉。');
    startSleep();
    useWuliliStore.getState().markInteraction('sleep');
  };

  const handleWakeUp = () => {
    stopSleep();
    const sleepElapsedMs = isSleeping && sleepStartedAt ? Date.now() - sleepStartedAt : 0;
    Alert.alert('已起床', `雾璃睡了 ${formatSleepDuration(sleepTotalSeconds + sleepElapsedMs / 1000)}，精力恢复了一些。`);
  };

  const streamElapsedMs = isStreaming && streamStartedAt ? now - streamStartedAt : 0;
  const sleepElapsedMs = isSleeping && sleepStartedAt ? now - sleepStartedAt : 0;
  const canSleep = canStartSleep(energy);
  const travelRemainingMs = isTraveling && travelState.endAt ? travelState.endAt - now : 0;

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
      <ImageBackground key={isSleeping ? 'sleep' : 'awake'} source={{ uri: sceneUri }} style={{ flex: 1 }} resizeMode="cover">
        
        {!isSleeping && !isTraveling && (
          <>
            <Image
              source={{ uri: avatarUri }}
              style={{
                position: 'absolute', width: screenWidth * AVATAR_SCALE, height: screenHeight * (AVATAR_SCALE * 0.7),
                left: screenWidth - screenWidth * AVATAR_SCALE + screenWidth * AVATAR_RIGHT_ANCHOR, top: screenHeight * AVATAR_TOP_RATIO,
              }}
              resizeMode="contain"
            />
            <Pressable
              onPress={handlePokeHead}
              style={{
                position: 'absolute', left: screenWidth - screenWidth * AVATAR_SCALE + screenWidth * AVATAR_RIGHT_ANCHOR,
                top: screenHeight * AVATAR_TOP_RATIO, width: screenWidth * AVATAR_SCALE, height: screenHeight * (AVATAR_SCALE * 0.7) * 0.35,
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </>
        )}

        {/* 顶部状态栏 */}
        <View style={{ position: 'absolute', left: 0, right: 0, top: insets.top + 12, paddingHorizontal: 16 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>{getTimeOfDayLabel(timeOfDay)} · {SEASON_LABELS[season] ?? ''}季 · {levelLabel ?? '新手'}</Text>
            </View>
            <View style={{ borderRadius: 999, backgroundColor: 'rgba(0,0,0,0.5)', paddingHorizontal: 12, paddingVertical: 4 }}>
              <Text style={{ fontSize: 12, color: '#FFFFFF', fontWeight: '500' }}>💰 {formatNumber(coins)}</Text>
            </View>
          </View>

          {isTraveling && (
            <View style={{ marginBottom: 8, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(37,99,235,0.9)', alignItems: 'center' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>✈️ 雾璃正在旅途中...</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, marginTop: 2 }}>还有 {formatDuration(travelRemainingMs)} 回家</Text>
            </View>
          )}

          {isStreaming && (
            <View style={{ marginBottom: 8, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(239,68,68,0.9)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>🔴 正在直播中</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>已播 {formatDuration(streamElapsedMs)}</Text>
            </View>
          )}

          {isSleeping && (
            <View style={{ marginBottom: 8, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, backgroundColor: 'rgba(99,102,241,0.9)' }}>
              <Text style={{ color: '#FFFFFF', fontSize: 14, fontWeight: '600' }}>💤 雾璃正在睡觉</Text>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 10, marginTop: 2 }}>已睡 {formatSleepDuration(sleepElapsedMs / 1000)}</Text>
            </View>
          )}
        </View>

        {/* 左侧操作按钮 */}
        {!isSleeping && (
          <View style={{ position: 'absolute', left: 16, top: screenHeight * 0.15 }}>
            {actionButtons.map((btn) => (
              <View key={btn.label} style={{ marginBottom: 12, alignItems: 'center' }}>
                <Pressable
                  onPress={isTraveling ? undefined : btn.onPress}
                  disabled={isTraveling}
                  style={{
                    width: 64, height: 64, borderRadius: 32,
                    backgroundColor: isTraveling ? 'rgba(100,116,139,0.3)' : 'rgba(15,23,42,0.6)',
                    borderWidth: 2, borderColor: isTraveling ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.2)',
                    alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
                  }}
                >
                  <Image source={{ uri: `${R2_BASE}/${btn.img}` }} style={{ width: 64, height: 64, opacity: isTraveling ? 0.3 : 1 }} resizeMode="contain" />
                </Pressable>
              </View>
            ))}
          </View>
        )}

        {/* 睡觉按钮 */}
        {!isSleeping && (
          <Pressable
            onPress={handleSleepPress} disabled={isTraveling || !canSleep}
            style={{
              position: 'absolute', right: 16, top: screenHeight * 0.15, width: 56, height: 56, borderRadius: 28,
              backgroundColor: isTraveling ? 'rgba(100,116,139,0.3)' : !canSleep ? 'rgba(100,116,139,0.8)' : '#EF4444',
              borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)', alignItems: 'center', justifyContent: 'center', opacity: isTraveling ? 0.5 : 1,
            }}
          >
            <Text style={{ fontSize: 24, opacity: isTraveling ? 0.5 : 1 }}>🌙</Text>
          </Pressable>
        )}

        {/* 🔥 买房按钮 */}
        {!isSleeping && !isTraveling && (
          <Pressable
            onPress={() => navigation.navigate('House')}
            style={{
              position: 'absolute', right: 16, top: screenHeight * 0.15 + 70, width: 56, height: 56, borderRadius: 28,
              backgroundColor: 'rgba(16, 185, 129, 0.9)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.4)',
              alignItems: 'center', justifyContent: 'center',
            }}
          >
            <Ionicons name="home" size={24} color="#FFF" />
          </Pressable>
        )}

        {/* 底部按钮 */}
        <View style={{ position: 'absolute', left: 16, right: 16, bottom: 24 }}>
          {isSleeping ? (
            <Pressable onPress={handleWakeUp} style={{ backgroundColor: '#EF4444', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>叫醒她</Text>
            </Pressable>
          ) : (
            <Pressable
              onPress={isTraveling ? undefined : () => navigation.navigate('Status')} disabled={isTraveling}
              style={{ backgroundColor: isTraveling ? 'rgba(100,116,139,0.5)' : '#2563EB', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center' }}
            >
              <Text style={{ color: '#FFF', fontSize: 16, fontWeight: 'bold' }}>{isTraveling ? '雾璃不在家' : '查看雾璃的状态'}</Text>
            </Pressable>
          )}
        </View>
      </ImageBackground>

      <ActionDialogueModal
        visible={photoDialogVisible} text={photoDialogText}
        onClose={() => {
          setPhotoDialogVisible(false);
          useTravelStore.setState((prev) => ({ state: { ...prev.state, lastTravelResult: null } as any }));
        }}
        iconName="camera"
      />
    </View>
  );
}

export default WuliliScreen;
