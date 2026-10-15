import React, { useEffect, useMemo, useState } from 'react';
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
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useAffinity } from '@/hooks/useAffinity';
import {
  STREAM_CONFIG,
  computeStreamLevel,
  computeDurationBonus,
} from '@/data/streamConfig';
import { aggregateBonus, describeAggregated } from '@/utils/equipmentBonus';
import { formatCoins } from '@/utils/format';
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

  const wulili = useWuliliStore((s) => s.state);
  const addCoins = useWuliliStore((s) => s.addCoins);
  const markInteraction = useWuliliStore((s) => s.markInteraction);
  const getOutfitById = useAppConfigStore((s) => s.getOutfitById);
  const getAccessoryById = useAppConfigStore((s) => s.getAccessoryById);

  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [now, setNow] = useState<number>(Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!streamState.isStreaming) {
      const startLine = speak({ action: 'stream' });
      if (startLine) setDialogue(startLine);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const outfit = wulili.currentOutfit
    ? getOutfitById(wulili.currentOutfit)
    : null;
  const accessory = wulili.currentAccessory
    ? getAccessoryById(wulili.currentAccessory)
    : null;
  const bonus = useMemo(
    () => aggregateBonus(outfit, accessory),
    [outfit, accessory],
  );
  const bonusLines = useMemo(() => describeAggregated(bonus), [bonus]);

  const levelInfo = useMemo(
    () => computeStreamLevel(wulili.totalStreamSeconds),
    [wulili.totalStreamSeconds],
  );

  const durationInfo = useMemo(
    () => computeDurationBonus(streamState.totalSeconds),
    [streamState.totalSeconds],
  );

  const energy = wulili.stats.energy;
  const health = wulili.stats.health;
  const mood = wulili.stats.mood;
  const coins = wulili.coins;

  const canStart =
    energy >= STREAM_CONFIG.minEnergyToStart &&
    health >= STREAM_CONFIG.minHealthToStart;

  const moodFactor = clamp(mood / 100, 0.2, 1);
  const healthFactor = clamp(health / 100, 0.3, 1);
  const levelMultiplier = 1 + levelInfo.bonusRate;
  const earningsPerSecond =
    STREAM_CONFIG.baseEarningPerSecond *
    moodFactor *
    healthFactor *
    bonus.streamIncomeRate *
    levelMultiplier *
    durationInfo.multiplier;

  const energyCostPerSecond =
    STREAM_CONFIG.energyCostPerSecond * bonus.energyCostRate;
  const moodCostPerSecond =
    STREAM_CONFIG.moodCostPerSecond * bonus.moodDecayRate;

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
          const durationSec = streamState.totalSeconds;
          if (earned > 0) {
            addCoins(earned);
            markInteraction('stream');
            gain(Math.min(5, Math.max(1, durationSec / 1800)));
          }
          const endLine = speak({ action: 'stream' });
          if (endLine) setDialogue(endLine);

          Alert.alert(
            '直播结束',
            `这次直播 ${formatDuration(durationSec * 1000)}，赚到了 ${earned.toFixed(2)} 金币。`,
            [{ text: '好', onPress: () => navigation.goBack() }],
          );
        },
      },
    ]);
  };

  const isLive = streamState.isStreaming;
  const elapsedMs =
    isLive && streamState.startedAt ? now - streamState.startedAt : 0;
  const displayEarned = isLive ? streamState.accumulatedCoins : 0;

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
            <View className="flex-row items-end mt-3">
              <Text className="text-3xl font-bold text-primary">
                {displayEarned.toFixed(2)}
              </Text>
              <Text className="ml-1 text-sm text-muted dark:text-dark-muted mb-1">
                金币
              </Text>
            </View>
            <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
              当前 {earningsPerSecond.toFixed(4)} 金币/秒 · 每小时约 {Math.round(earningsPerSecond * 3600)}
            </Text>
            <View className="mt-2 px-3 py-1 rounded-full bg-primary/10 dark:bg-primary/20">
              <Text className="text-xs font-semibold text-primary">
                时长加成 {durationInfo.label} ×{durationInfo.multiplier.toFixed(2)}
              </Text>
            </View>
          </>
        ) : (
          <Text className="text-xs text-muted dark:text-dark-muted mt-1">
            想播多久就播多久 · 越播越值钱 · 精力耗尽会自动结束
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
            直播等级 · Lv.{levelInfo.level}
          </Text>
          <View className="w-full rounded-full overflow-hidden h-2 bg-border dark:bg-dark-border">
            <View
              className="h-2 bg-primary"
              style={{ width: `${Math.round(levelInfo.progressToNext * 100)}%` }}
            />
          </View>
          <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
            累计直播 {formatDuration(wulili.totalStreamSeconds * 1000)} · 收入加成 +
            {Math.round(levelInfo.bonusRate * 100)}%
          </Text>
        </Card>
      </View>

      {isLive ? (
        <View className="mt-3">
          <Card>
            <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
              时长加成档位
            </Text>
            {STREAM_CONFIG.durationBonusTiers.map((tier) => {
              const isCurrent = tier.multiplier === durationInfo.multiplier;
              const reached =
                streamState.totalSeconds / 3600 >= tier.minHours;
              return (
                <View
                  key={tier.minHours}
                  className="flex-row items-center justify-between py-1"
                >
                  <View className="flex-row items-center">
                    <Ionicons
                      name={
                        isCurrent
                          ? 'radio-button-on'
                          : reached
                            ? 'checkmark-circle'
                            : 'ellipse-outline'
                      }
                      size={12}
                      color={
                        isCurrent ? '#2563EB' : reached ? '#10B981' : '#94A3B8'
                      }
                    />
                    <Text
                      className={[
                        'ml-2 text-xs',
                        isCurrent
                          ? 'text-primary font-semibold'
                          : reached
                            ? 'text-text dark:text-dark-text'
                            : 'text-muted dark:text-dark-muted',
                      ].join(' ')}
                    >
                      {tier.minHours === 0
                        ? '刚开始'
                        : `${tier.minHours} 小时后`}{' '}
                      · {tier.label}
                    </Text>
                  </View>
                  <Text
                    className={[
                      'text-xs font-medium',
                      isCurrent ? 'text-primary' : 'text-muted dark:text-dark-muted',
                    ].join(' ')}
                  >
                    ×{tier.multiplier.toFixed(2)}
                  </Text>
                </View>
              );
            })}
          </Card>
        </View>
      ) : null}

      <View className="mt-3">
        <Card>
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
            当前加成
          </Text>
          {bonusLines.length > 0 ? (
            bonusLines.map((line) => (
              <Text
                key={line}
                className="text-xs text-muted dark:text-dark-muted py-0.5"
              >
                · {line}
              </Text>
            ))
          ) : (
            <Text className="text-xs text-muted dark:text-dark-muted">
              无（去衣柜穿戴服饰/配饰来获得加成）
            </Text>
          )}
        </Card>
      </View>

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
                value={`${earningsPerSecond.toFixed(4)} 金币/秒`}
              />
              <InfoRow
                label="精力消耗"
                value={`${energyCostPerSecond.toFixed(4)}/秒`}
              />
              <InfoRow
                label="心情消耗"
                value={`${moodCostPerSecond.toFixed(4)}/秒`}
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