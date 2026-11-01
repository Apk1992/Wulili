// src/components/minigames/RhythmGame.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View, Dimensions } from 'react-native';
import type {
  MinigameOutcome,
  RhythmLevelConfig,
} from '@/types/minigame';

const HIT_WINDOW_MS = 180;
const BEAT_FALL_TIME_MS = 1500; // 音符从出现到判定线的时间

export interface RhythmGameProps {
  level: RhythmLevelConfig;
  minigameId: string;
  onComplete: (outcome: MinigameOutcome) => void;
  onQuit: () => void;
}

export function RhythmGame({
  level,
  minigameId,
  onComplete,
  onQuit,
}: RhythmGameProps): React.JSX.Element {
  const startedAtRef = useRef<number>(Date.now());
  const hitBeatsRef = useRef<Set<number>>(new Set());
  const [elapsed, setElapsed] = useState<number>(0);
  const [score, setScore] = useState<number>(0);
  const [combo, setCombo] = useState<number>(0);
  const [maxCombo, setMaxCombo] = useState<number>(0);
  const [missed, setMissed] = useState<number>(0);

  const beats = useMemo(
    () => level.beats.slice().sort((a, b) => a.timeMs - b.timeMs),
    [level.beats],
  );

  useEffect(() => {
    startedAtRef.current = Date.now();
    hitBeatsRef.current.clear();
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMissed(0);
    setElapsed(0);

    const timer = setInterval(() => {
      const now = Date.now() - startedAtRef.current;
      setElapsed(now);

      let autoMissed = 0;
      for (let i = 0; i < beats.length; i += 1) {
        if (hitBeatsRef.current.has(i)) continue;
        const beat = beats[i];
        if (now - beat.timeMs > HIT_WINDOW_MS) {
          hitBeatsRef.current.add(i);
          autoMissed += 1;
        }
      }
      if (autoMissed > 0) {
        setMissed((prev) => prev + autoMissed);
        setCombo(0);
      }

      if (now >= level.durationMs) {
        clearInterval(timer);
        finish();
      }
    }, 50);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [beats, level.durationMs]);

  const finish = () => {
    const totalBeats = beats.length;
    const hits = hitBeatsRef.current.size;
    const accuracy = totalBeats > 0 ? hits / totalBeats : 0;
    const result = accuracy >= 0.6 ? 'victory' : 'defeat';

    onComplete({
      minigameId,
      levelId: level.id,
      engine: 'rhythm',
      result,
      score,
      maxCombo,
      durationMs: level.durationMs,
      moodGain: level.moodGain,
      coinReward: level.coinReward,
      energyCost: level.energyCost,
    });
  };

  const handleTap = (lane: number) => {
    const now = Date.now() - startedAtRef.current;
    let bestIndex = -1;
    let bestDelta = Number.MAX_SAFE_INTEGER;

    for (let i = 0; i < beats.length; i += 1) {
      if (hitBeatsRef.current.has(i)) continue;
      const beat = beats[i];
      if (beat.lane !== lane) continue;
      const delta = Math.abs(beat.timeMs - now);
      if (delta < bestDelta && delta <= HIT_WINDOW_MS) {
        bestDelta = delta;
        bestIndex = i;
      }
    }

    if (bestIndex < 0) {
      setCombo(0);
      return;
    }

    hitBeatsRef.current.add(bestIndex);
    const accuracyBonus = Math.round((1 - bestDelta / HIT_WINDOW_MS) * 10);
    const newCombo = combo + 1;
    setCombo(newCombo);
    setMaxCombo((prev) => Math.max(prev, newCombo));
    setScore((prev) => prev + 10 + accuracyBonus + newCombo);
  };

  const progress = Math.min(1, elapsed / level.durationMs);

  // 🔥 响应式尺寸
  const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
  const TOP_UI_HEIGHT = 120;
  const BOTTOM_UI_HEIGHT = 100; // 底部点击区高度

  // 游戏区宽高
  const GAME_WIDTH = SCREEN_WIDTH;
  const GAME_HEIGHT = SCREEN_HEIGHT - TOP_UI_HEIGHT - BOTTOM_UI_HEIGHT;
  const LANE_WIDTH = GAME_WIDTH / level.lanes;
  
  // 判定线的高度（距离底部）
  const HIT_LINE_Y = GAME_HEIGHT - 20; 

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      
      {/* 顶部信息栏 */}
      <View style={{ position: 'absolute', top: 50, width: SCREEN_WIDTH, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, zIndex: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ color: '#F59E0B', fontSize: 18, fontWeight: '700' }}>
            {Math.max(0, Math.ceil((level.durationMs - elapsed) / 1000))}s
          </Text>
        </View>
        <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700' }}>分数 {score}</Text>
        <Pressable onPress={onQuit} style={{ padding: 4, marginRight: -10 }}>
          <Text style={{ color: '#94A3B8', fontSize: 16 }}>退出</Text>
        </Pressable>
      </View>

      {/* 进度条 */}
      <View style={{ position: 'absolute', top: 90, width: SCREEN_WIDTH, paddingHorizontal: 20 }}>
        <View style={{ height: 4, backgroundColor: '#1E293B', borderRadius: 2 }}>
          <View style={{ width: `${progress * 100}%`, height: 4, backgroundColor: '#2563EB', borderRadius: 2 }} />
        </View>
      </View>

      {/* 🔥 游戏区（接收点击） */}
      <View style={{ marginTop: TOP_UI_HEIGHT, width: GAME_WIDTH, height: GAME_HEIGHT, overflow: 'hidden' }}>
        {/* 轨道 */}
        {Array.from({ length: level.lanes }).map((_, i) => (
          <View key={i} style={{
            position: 'absolute',
            left: i * LANE_WIDTH,
            width: LANE_WIDTH,
            height: '100%',
            borderRightWidth: 1,
            borderColor: '#1E293B',
          }} />
        ))}

        {/* 判定线 */}
        <View style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 40,
          backgroundColor: 'rgba(37,99,235,0.1)',
          borderTopWidth: 2,
          borderColor: '#2563EB',
        }} />

        {/* 音符 */}
        {beats.map((beat, i) => {
          if (hitBeatsRef.current.has(i)) return null;
          const timeToHit = beat.timeMs - elapsed;
          
          // 超出可视范围不渲染
          if (timeToHit > BEAT_FALL_TIME_MS || timeToHit < -HIT_WINDOW_MS) return null;

          const yPos = HIT_LINE_Y - (timeToHit / BEAT_FALL_TIME_MS) * HIT_LINE_Y;

          return (
            <View
              key={`beat-${i}`}
              style={{
                position: 'absolute',
                width: LANE_WIDTH * 0.8,
                height: 24,
                left: beat.lane * LANE_WIDTH + LANE_WIDTH * 0.1,
                top: yPos - 12, // 居中
                backgroundColor: '#38BDF8',
                borderRadius: 12,
              }}
            />
          );
        })}
      </View>

      {/* 🔥 底部点击区（放大判定区，手感更好） */}
      <View style={{ flexDirection: 'row', height: BOTTOM_UI_HEIGHT, backgroundColor: '#1E293B', position: 'absolute', bottom: 0, width: SCREEN_WIDTH }}>
        {Array.from({ length: level.lanes }).map((_, lane) => (
          <Pressable
            key={`btn-${lane}`}
            onPress={() => handleTap(lane)}
            style={({ pressed }) => ({
              flex: 1,
              borderRightWidth: 1,
              borderColor: '#334155',
              backgroundColor: pressed ? 'rgba(37,99,235,0.3)' : 'transparent',
              alignItems: 'center',
              justifyContent: 'center',
            })}
          >
            <Text style={{ color: '#475569', fontSize: 24, fontWeight: 'bold' }}>|</Text>
          </Pressable>
        ))}
      </View>

      {/* 底部连击状态 */}
      <View style={{ position: 'absolute', bottom: BOTTOM_UI_HEIGHT + 10, width: SCREEN_WIDTH, alignItems: 'center' }}>
         <Text style={{ color: '#64748B', fontSize: 14 }}>连击 x{combo} · 失误 {missed}</Text>
      </View>
    </View>
  );
}

export default RhythmGame;
