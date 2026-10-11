import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import type {
  MinigameOutcome,
  RhythmLevelConfig,
} from '@/types/minigame';

const HIT_WINDOW_MS = 180;

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
  const { isDark } = useTheme();
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
  const laneWidth = 100 / level.lanes;

  return (
    <View className="flex-1">
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Ionicons name="time-outline" size={16} color="#F59E0B" />
          <Text className="ml-1 text-sm font-semibold text-warning">
            {Math.max(0, Math.ceil((level.durationMs - elapsed) / 1000))}s
          </Text>
        </View>
        <Text className="text-sm font-semibold text-text dark:text-dark-text">
          分数 {score}
        </Text>
        <View className="flex-row items-center">
          <Text className="text-xs text-muted dark:text-dark-muted mr-2">
            x{combo}
          </Text>
          <Pressable
            onPress={onQuit}
            className="p-2 rounded-full active:opacity-60"
          >
            <Ionicons name="close" size={20} color="#94A3B8" />
          </Pressable>
        </View>
      </View>

      <View className="w-full h-1.5 rounded-full overflow-hidden bg-border dark:bg-dark-border mb-3">
        <View
          className="h-1.5 bg-primary"
          style={{ width: `${progress * 100}%` }}
        />
      </View>

      <View className="flex-1 rounded-3xl overflow-hidden bg-card dark:bg-dark-card border border-border dark:border-dark-border">
        <View className="flex-1 flex-row">
          {Array.from({ length: level.lanes }).map((_, lane) => (
            <LaneView
              key={`lane-${lane}`}
              lane={lane}
              beats={beats}
              hitBeats={hitBeatsRef.current}
              elapsed={elapsed}
              laneWidth={laneWidth}
              onTap={() => handleTap(lane)}
              isDark={isDark}
            />
          ))}
        </View>
      </View>

      <View className="mt-3 flex-row items-center justify-center">
        <Text className="text-xs text-muted dark:text-dark-muted">
          连击 x{combo} · 失误 {missed}
        </Text>
      </View>
    </View>
  );
}

interface LaneViewProps {
  lane: number;
  beats: RhythmLevelConfig['beats'];
  hitBeats: Set<number>;
  elapsed: number;
  laneWidth: number;
  onTap: () => void;
  isDark: boolean;
}

function LaneView({
  lane,
  beats,
  hitBeats,
  elapsed,
  laneWidth,
  onTap,
  isDark,
}: LaneViewProps): React.JSX.Element {
  const visibleBeats = beats
    .map((b, i) => ({ beat: b, index: i }))
    .filter(
      (entry) =>
        entry.beat.lane === lane &&
        !hitBeats.has(entry.index) &&
        entry.beat.timeMs > elapsed - HIT_WINDOW_MS &&
        entry.beat.timeMs < elapsed + 1500,
    );

  return (
    <Pressable
      onPress={onTap}
      style={{ width: `${laneWidth}%` }}
      className={[
        'flex-1 border-r',
        isDark ? 'border-dark-border' : 'border-border',
      ].join(' ')}
    >
      {visibleBeats.map((entry) => (
        <View
          key={`beat-${entry.index}`}
          className="absolute rounded-full bg-primary"
          style={{
            width: 32,
            height: 32,
            left: '50%',
            marginLeft: -16,
            top: `${(1 - (entry.beat.timeMs - elapsed) / 1500) * 100}%`,
          }}
        />
      ))}
    </Pressable>
  );
}

export default RhythmGame;