import React, { useEffect, useRef, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DialogueBubble from '@/components/DialogueBubble';
import { useDialogue } from '@/hooks/useDialogue';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAffinity } from '@/hooks/useAffinity';
import { formatCoins, formatNumber } from '@/utils/format';
import { formatDuration } from '@/utils/time';
import { clamp } from '@/utils/random';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Stream'>;

const TICK_MS = 1000;

const ENERGY_COST_PER_SEC = 0.5;
const MOOD_COST_PER_SEC = 0.2;

const MIN_ENERGY_TO_START = 15;
const MIN_HEALTH_TO_START = 20;

const AUTO_STOP_ENERGY = 5;

export function StreamScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [elapsedMs, setElapsedMs] = useState<number>(0);
  const [earnedCoins, setEarnedCoins] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);

  const energy = useWuliliStore((s) => s.state.stats.energy);
  const health = useWuliliStore((s) => s.state.stats.health);
  const mood = useWuliliStore((s) => s.state.stats.mood);
  const coins = useWuliliStore((s) => s.state.coins);

  const addCoins = useWuliliStore((s) => s.addCoins);
  const addStats = useWuliliStore((s) => s.addStats);
  const markInteraction = useWuliliStore((s) => s.markInteraction);

  const canStart = energy >= MIN_ENERGY_TO_START && health >= MIN_HEALTH_TO_START;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const startStream = () => {
    if (!canStart) {
      Alert.alert('无法直播', '雾璃现在的状态不太适合直播，先照顾一下她吧。');
      return;
    }

    const startLine = speak({ action: 'stream' });
    if (startLine) setDialogue(startLine);

    setStreaming(true);
    setElapsedMs(0);
    setEarnedCoins(0);
    accumulatedRef.current = 0;
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now();
      const elapsed = now - startRef.current;
      setElapsedMs(elapsed);

      const earnings = computePerSecondEarnings(mood, health);
      accumulatedRef.current += earnings;
      setEarnedCoins(accumulatedRef.current);

      addStats({
        energy: -ENERGY_COST_PER_SEC,
        mood: -MOOD_COST_PER_SEC,
      });

      if (Math.random() < 0.02) {
        const midLine = speak({ action: 'stream' });
        if (midLine) setDialogue(midLine);
      }

      const state = useWuliliStore.getState().state;
      if (state.stats.energy < AUTO_STOP_ENERGY || state.stats.health < 10) {
        endStream(true);
      }
    }, TICK_MS);
  };

  const endStream = (auto: boolean) => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const durationSec = Math.max(
      1,
      Math.round((Date.now() - startRef.current) / 1000),
    );
    const totalEarnings = Math.round(accumulatedRef.current);

    addCoins(totalEarnings);

    const endLine = speak({ action: 'stream' });
    if (endLine) setDialogue(endLine);

    markInteraction('stream');
    gain(Math.min(3, Math.max(1, durationSec / 60)));

    setStreaming(false);
    setElapsedMs(0);

    const title = auto ? '直播自动结束' : '直播结束';
    const reason = auto
      ? '\n（雾璃太累了，她撑不住了）'
      : '';
    Alert.alert(
      title,
      `这次直播 ${formatDuration(durationSec * 1000)}，赚到了 ${formatNumber(totalEarnings)} 金币。${reason}`,
      [{ text: '好', onPress: () => navigation.goBack() }],
    );
  };

  const requestStop = () => {
    Alert.alert('结束直播', '确定要下播吗？', [
      { text: '继续', style: 'cancel' },
      {
        text: '下播',
        style: 'destructive',
        onPress: () => endStream(false),
      },
    ]);
  };

  return (
    <ScreenContainer edges={['bottom']}>
      <Card className="items-center py-6">
        <View
          className={[
            'w-24 h-24 rounded-full items-center justify-center',
            streaming ? 'bg-danger' : 'bg-primary',
          ].join(' ')}
        >
          <Ionicons
            name={streaming ? 'radio' : 'videocam'}
            size={40}
            color="#FFFFFF"
          />
        </View>

        <Text className="mt-4 text-lg font-bold text-text dark:text-dark-text">
          {streaming ? '正在直播中' : '准备开播'}
        </Text>

        {streaming ? (
          <>
            <Text className="text-xs text-muted dark:text-dark-muted mt-1">
              已播 {formatDuration(elapsedMs)}
            </Text>
            <View className="flex-row items-center mt-3">
              <Ionicons name="cash" size={18} color="#2563EB" />
              <Text className="ml-1 text-2xl font-bold text-primary">
                {formatNumber(Math.round(earnedCoins))}
              </Text>
            </View>
            <View className="flex-row items-center mt-2">
              <Ionicons name="flash" size={12} color="#F59E0B" />
              <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">
                精力 {Math.round(energy)}
              </Text>
              <Ionicons
                name="happy"
                size={12}
                color="#10B981"
                style={{ marginLeft: 10 }}
              />
              <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">
                心情 {Math.round(mood)}
              </Text>
            </View>
          </>
        ) : (
          <Text className="text-xs text-muted dark:text-dark-muted mt-1">
            想播多久就播多久 · 精力耗尽会自动结束
          </Text>
        )}

        <View className="flex-row items-center mt-5 w-full">
          {!streaming ? (
            <Button
              label="开始直播"
              icon="videocam"
              variant="primary"
              onPress={startStream}
              disabled={!canStart}
            />
          ) : (
            <Button
              label="下播"
              icon="stop"
              variant="danger"
              onPress={requestStop}
            />
          )}
        </View>
      </Card>

      <View className="mt-3">
        <Card>
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
            直播间状态
          </Text>
          <InfoRow label="精力" value={`${Math.round(energy)}/100`} />
          <InfoRow label="健康" value={`${Math.round(health)}/100`} />
          <InfoRow label="心情" value={`${Math.round(mood)}/100`} />
          <InfoRow label="当前金币" value={formatCoins(coins)} />
          {streaming ? (
            <InfoRow
              label="预计收入速率"
              value={`约 ${computePerSecondEarnings(mood, health).toFixed(2)} 金币/秒`}
            />
          ) : null}
        </Card>
      </View>

      <View className="mt-3">
        {dialogue ? (
          <DialogueBubble
            dialogue={dialogue}
            onDismiss={() => setDialogue(null)}
            autoDismissMs={8000}
          />
        ) : null}
      </View>

      {!streaming ? (
        <View className="mt-3">
          <Button
            label="返回"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function computePerSecondEarnings(mood: number, health: number): number {
  const moodFactor = clamp(mood / 100, 0.2, 1);
  const healthFactor = clamp(health / 100, 0.3, 1);
  const base = 0.5;
  const perSecond = base * moodFactor * healthFactor;
  return Math.max(0.05, perSecond);
}

function InfoRow({
  label,
  value,
}: {
  label: string;
  value: string;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-muted dark:text-dark-muted">{label}</Text>
      <Text className="text-xs font-medium text-text dark:text-dark-text">
        {value}
      </Text>
    </View>
  );
}

export default StreamScreen;