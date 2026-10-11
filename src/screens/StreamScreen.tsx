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
import { clamp, randomInt } from '@/utils/random';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Stream'>;

const STREAM_DURATION_MS = 30 * 1000;

export function StreamScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [streaming, setStreaming] = useState<boolean>(false);
  const [elapsed, setElapsed] = useState<number>(0);
  const [earnings, setEarnings] = useState<number>(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startRef = useRef<number>(0);

  const energy = useWuliliStore((s) => s.state.stats.energy);
  const health = useWuliliStore((s) => s.state.stats.health);
  const mood = useWuliliStore((s) => s.state.stats.mood);
  const coins = useWuliliStore((s) => s.state.coins);
  const addCoins = useWuliliStore((s) => s.addCoins);
  const addStats = useWuliliStore((s) => s.addStats);
  const markInteraction = useWuliliStore((s) => s.markInteraction);

  const canStream = energy >= 15 && health >= 20;

  useEffect(() => {
    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, []);

  const startStream = () => {
    if (!canStream) {
      Alert.alert('无法直播', '雾璃现在的状态不太适合直播，先照顾一下她吧。');
      return;
    }

    const start = speak({ action: 'stream' });
    if (start) setDialogue(start);

    setStreaming(true);
    setElapsed(0);
    setEarnings(0);
    startRef.current = Date.now();

    timerRef.current = setInterval(() => {
      const now = Date.now() - startRef.current;
      setElapsed(now);

      if (Math.random() < 0.12) {
        const mid = speak({ action: 'stream' });
        if (mid) setDialogue(mid);
      }

      if (now >= STREAM_DURATION_MS) {
        endStream(true);
      }
    }, 1000);
  };

  const endStream = (auto: boolean) => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    const durationSeconds = Math.round((Date.now() - startRef.current) / 1000);
    const moodFactor = mood / 100;
    const healthFactor = health / 100;
    const baseEarning = randomInt(10, 20);
    const total = Math.round(
      baseEarning * (durationSeconds / 5) * clamp(0.4 + moodFactor * 0.6, 0.4, 1.4) * clamp(0.5 + healthFactor * 0.5, 0.5, 1.2),
    );

    addCoins(total);
    addStats({ energy: -15, mood: -4 });
    markInteraction('stream');
    gain(1);

    setEarnings(total);
    setStreaming(false);

    const end = speak({ action: 'stream' });
    if (end) setDialogue(end);

    if (auto) {
      setTimeout(() => {
        Alert.alert(
          '直播结束',
          `这次赚到了 ${formatNumber(total)} 金币。`,
          [{ text: '好', onPress: () => navigation.goBack() }],
        );
      }, 400);
    }
  };

  const cancelStream = () => {
    Alert.alert('结束直播', '确定要提前结束吗？', [
      { text: '继续', style: 'cancel' },
      {
        text: '结束',
        style: 'destructive',
        onPress: () => endStream(false),
      },
    ]);
  };

  const progress = Math.min(1, elapsed / STREAM_DURATION_MS);
  const remaining = Math.max(0, Math.ceil((STREAM_DURATION_MS - elapsed) / 1000));

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
        <Text className="text-xs text-muted dark:text-dark-muted mt-1">
          {streaming
            ? `剩余 ${remaining}s · 预计收入 ${formatNumber(earnings)} 金币`
            : `本次直播约 ${STREAM_DURATION_MS / 1000} 秒`}
        </Text>

        <View className="w-full h-1.5 rounded-full overflow-hidden bg-border dark:bg-dark-border mt-4">
          <View
            className="h-1.5 bg-primary"
            style={{ width: `${progress * 100}%` }}
          />
        </View>

        <View className="flex-row items-center mt-5 w-full">
          {!streaming ? (
            <Button
              label="开始直播"
              icon="videocam"
              variant="primary"
              onPress={startStream}
              disabled={!canStream}
            />
          ) : (
            <Button
              label="结束直播"
              icon="stop"
              variant="danger"
              onPress={cancelStream}
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
          <InfoRow label="累计收入" value={formatCoins(coins)} />
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
          <Button label="返回" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function InfoRow({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <Text className="text-xs text-muted dark:text-dark-muted">{label}</Text>
      <Text className="text-xs font-medium text-text dark:text-dark-text">{value}</Text>
    </View>
  );
}

export default StreamScreen;