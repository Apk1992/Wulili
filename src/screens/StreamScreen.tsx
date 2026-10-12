import React, { useEffect, useState } from 'react';
import { Alert, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DialogueBubble from '@/components/DialogueBubble';
import { useDialogue } from '@/hooks/useDialogue';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useAffinity } from '@/hooks/useAffinity';
import { STREAM_CONFIG } from '@/data/streamConfig';
import { formatCoins, formatNumber } from '@/utils/format';
import { formatDuration } from '@/utils/time';
import { clamp } from '@/utils/random';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Stream'>;

export function StreamScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();

  const streamState = useStreamStore((s) => s.state);
  const startStream = useStreamStore((s) => s.start);
  const stopStream = useStreamStore((s) => s.stop);

  const energy = useWuliliStore((s) => s.state.stats.energy);
  const health = useWuliliStore((s) => s.state.stats.health);
  const mood = useWuliliStore((s) => s.state.stats.mood);
  const coins = useWuliliStore((s) => s.state.coins);
  const addCoins = useWuliliStore((s) => s.addCoins);
  const markInteraction = useWuliliStore((s) => s.markInteraction);

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  // 让页面每秒刷新，实时显示"已播时长/已赚金币"
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // 进入页面时，如果当前没在直播，念一句开场白
  useEffect(() => {
    if (!streamState.isStreaming) {
      const startLine = speak({ action: 'stream' });
      if (startLine) setDialogue(startLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canStart =
    energy >= STREAM_CONFIG.minEnergyToStart &&
    health >= STREAM_CONFIG.minHealthToStart;

  const handleStart = () => {
    if (!canStart) {
      Alert.alert('无法直播', '雾璃现在的状态不太适合直播，先照顾一下她吧。');
      return;
    }
    startStream();
    const startLine = speak({ action: 'stream' });
    if (startLine) setDialogue(startLine);
  };

  const handleStop = () => {
    Alert.alert('结束直播', '确定要下播吗？', [
      { text: '继续播', style: 'cancel' },
      {
        text: '下播',
        style: 'destructive',
        onPress: () => {
          const earned = stopStream();
          if (earned > 0) {
            addCoins(earned);
            markInteraction('stream');
            gain(Math.min(5, Math.max(1, streamState.totalSeconds / 1800)));
          }
          const endLine = speak({ action: 'stream' });
          if (endLine) setDialogue(endLine);

          Alert.alert(
            '直播结束',
            `这次直播 ${formatDuration(streamState.totalSeconds * 1000)}，赚到了 ${formatNumber(earned)} 金币。`,
            [{ text: '好', onPress: () => navigation.goBack() }],
          );
        },
      },
    ]);
  };

  const isLive = streamState.isStreaming;

  const elapsedMs = isLive && streamState.startedAt
    ? now - streamState.startedAt
    : 0;

  const displayEarned = isLive
    ? Math.round(streamState.accumulatedCoins)
    : 0;

  const moodFactor = clamp(mood / 100, 0.2, 1);
  const healthFactor = clamp(health / 100, 0.3, 1);
  const earningsPerSecond =
    STREAM_CONFIG.baseEarningPerSecond * moodFactor * healthFactor;

  return (
    <ScreenContainer edges={['bottom']}>
      <Card className="items-center py-6">
        <View
          className={[
            'w-24 h-24 rounded-full items-center justify-center',
            isLive ? 'bg-danger' : 'bg-primary',
          ].join(' ')}
        >
          <Ionicons
            name={isLive ? 'radio' : 'videocam'}
            size={40}
            color="#FFFFFF"
          />
        </View>

        <Text className="mt-4 text-lg font-bold text-text dark:text-dark-text">
          {isLive ? '正在直播中' : '准备开播'}
        </Text>

        {isLive ? (
          <>
            <Text className="text-xs text-muted dark:text-dark-muted mt-1">
              已播 {formatDuration(elapsedMs)}
            </Text>
            <View className="flex-row items-center mt-3">
              <Ionicons name="cash" size={18} color="#2563EB" />
              <Text className="ml-1 text-2xl font-bold text-primary">
                {formatNumber(displayEarned)}
              </Text>
            </View>
            <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
              每小时约 {Math.round(earningsPerSecond * 3600)} 金币
            </Text>
          </>
        ) : (
          <Text className="text-xs text-muted dark:text-dark-muted mt-1">
            想播多久就播多久 · 精力耗尽会自动结束
          </Text>
        )}

        <View className="flex-row items-center mt-5 w-full">
          {!isLive ? (
            <Button
              label="开始直播"
              icon="videocam"
              variant="primary"
              onPress={handleStart}
              disabled={!canStart}
            />
          ) : (
            <Button
              label="下播"
              icon="stop"
              variant="danger"
              onPress={handleStop}
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
          {isLive ? (
            <>
              <InfoRow
                label="收入速率"
                value={`约 ${earningsPerSecond.toFixed(4)} 金币/秒`}
              />
              <InfoRow
                label="精力消耗"
                value={`${STREAM_CONFIG.energyCostPerSecond.toFixed(4)}/秒`}
              />
              <InfoRow
                label="心情消耗"
                value={`${STREAM_CONFIG.moodCostPerSecond.toFixed(4)}/秒`}
              />
            </>
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

      {isLive ? (
        <View className="mt-3">
          <Text className="text-center text-[10px] text-muted dark:text-dark-muted">
            可以随时离开此页面，直播会继续
          </Text>
        </View>
      ) : (
        <View className="mt-3">
          <Button
            label="返回"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      )}
    </ScreenContainer>
  );
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