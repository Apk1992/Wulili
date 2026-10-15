import React, { useMemo } from 'react';
import { ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import StatBar from '@/components/StatBar';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAffinity } from '@/hooks/useAffinity';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useSeason } from '@/hooks/useSeason';
import { computeStreamLevel } from '@/data/streamConfig';
import { computeMenstrualInfo } from '@/data/menstrualConfig';
import { aggregateBonus, describeAggregated } from '@/utils/equipmentBonus';
import { formatCoins, formatWeight } from '@/utils/format';
import { formatRelativeTime, formatDuration } from '@/utils/time';
import { ILLNESS_LABELS } from '@/components/constants';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Status'>;

export function StatusScreen({}: Props): React.JSX.Element {
  const state = useWuliliStore((s) => s.state);
  const { affinity, level, levelLabel, progressToNext } = useAffinity();
  const getOutfitById = useAppConfigStore((s) => s.getOutfitById);
  const getAccessoryById = useAppConfigStore((s) => s.getAccessoryById);
  const {
    season,
    label: seasonLabel,
    emoji: seasonEmoji,
    description: seasonDescription,
  } = useSeason();

  const menstrualInfo = useMemo(
    () => computeMenstrualInfo(state.menstrual),
    [state.menstrual],
  );

  const currentOutfitName = useMemo(() => {
    if (!state.currentOutfit) return '未穿戴';
    const outfit = getOutfitById(state.currentOutfit);
    return outfit ? outfit.name : '未穿戴';
  }, [state.currentOutfit, getOutfitById]);

  const currentAccessoryName = useMemo(() => {
    if (!state.currentAccessory) return '未佩戴';
    const accessory = getAccessoryById(state.currentAccessory);
    return accessory ? accessory.name : '未佩戴';
  }, [state.currentAccessory, getAccessoryById]);

  const equippedBonus = useMemo(() => {
    const outfit = state.currentOutfit
      ? getOutfitById(state.currentOutfit)
      : null;
    const accessory = state.currentAccessory
      ? getAccessoryById(state.currentAccessory)
      : null;
    return aggregateBonus(outfit, accessory);
  }, [state.currentOutfit, state.currentAccessory, getOutfitById, getAccessoryById]);

  const equippedBonusLines = useMemo(
    () => describeAggregated(equippedBonus),
    [equippedBonus],
  );

  const streamLevelInfo = useMemo(
    () => computeStreamLevel(state.totalStreamSeconds),
    [state.totalStreamSeconds],
  );

  const isInPeriod = menstrualInfo.phase === 'period';

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <View className="flex-row items-center justify-between mb-3">
            <Text className="text-sm font-semibold text-text dark:text-dark-text">
              当前状态
            </Text>
            <Text className="text-xs text-muted dark:text-dark-muted">
              {formatRelativeTime(state.lastInteractionAt)}
            </Text>
          </View>
          <View className="space-y-3">
            <StatBar icon="restaurant" label="饱食" value={state.stats.hunger} color="primary" />
            <StatBar icon="happy" label="心情" value={state.stats.mood} color="success" />
            <StatBar icon="heart" label="健康" value={state.stats.health} color="danger" />
            <StatBar icon="flash" label="精力" value={state.stats.energy} color="warning" />
          </View>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            当前季节
          </Text>
          <View className="flex-row items-center mb-2">
            <Text className="text-3xl mr-2">{seasonEmoji}</Text>
            <View className="flex-1">
              <Text className="text-sm font-semibold text-text dark:text-dark-text">
                {seasonLabel} · {season}
              </Text>
              <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
                {seasonDescription}
              </Text>
            </View>
          </View>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            生理周期
          </Text>
          <View className="flex-row items-center mb-2">
            <View
              className="w-10 h-10 rounded-full items-center justify-center mr-3"
              style={{
                backgroundColor: isInPeriod
                  ? 'rgba(168,85,247,0.15)'
                  : 'rgba(148,163,184,0.15)',
              }}
            >
              <Ionicons
                name={isInPeriod ? 'water' : 'calendar'}
                size={20}
                color={isInPeriod ? '#A855F7' : '#94A3B8'}
              />
            </View>
            <View className="flex-1">
              <Text
                className="text-sm font-semibold"
                style={{ color: isInPeriod ? '#A855F7' : undefined }}
              >
                {menstrualInfo.label} · 第 {menstrualInfo.dayInCycle} 天
              </Text>
              <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
                {menstrualInfo.description}
              </Text>
            </View>
          </View>
          {isInPeriod && menstrualInfo.isMedicineActive ? (
            <View className="mt-1 flex-row items-center px-2 py-1 rounded-full bg-success/15">
              <Ionicons name="checkmark-circle" size={12} color="#10B981" />
              <Text className="ml-1 text-[10px] text-success font-medium">
                布洛芬生效中 · 症状减轻
              </Text>
            </View>
          ) : null}
          {!isInPeriod ? (
            <InfoRow
              label="距下次经期"
              value={`${menstrualInfo.daysUntilNextPeriod} 天`}
              icon="time"
              compact
            />
          ) : null}
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            身体数据
          </Text>
          <InfoRow label="体重" value={formatWeight(state.stats.weight)} icon="scale" />
          <InfoRow
            label="病症"
            value={ILLNESS_LABELS[state.illness.type]}
            icon="medkit"
            valueColor={state.illness.type === 'none' ? undefined : '#EF4444'}
          />
          {state.illness.type !== 'none' && state.illness.since ? (
            <InfoRow
              label="发病时间"
              value={formatRelativeTime(state.illness.since)}
              icon="time"
              compact
            />
          ) : null}
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            亲密度
          </Text>
          <View className="flex-row items-center justify-between mb-2">
            <Text className="text-xs text-muted dark:text-dark-muted">
              等级 {level + 1} · {levelLabel}
            </Text>
            <Text className="text-xs font-semibold text-primary">
              {Math.round(affinity)} / 100
            </Text>
          </View>
          <View className="w-full rounded-full overflow-hidden h-2 bg-border dark:bg-dark-border">
            <View
              className="h-2 bg-primary"
              style={{ width: `${Math.round(progressToNext * 100)}%` }}
            />
          </View>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            直播等级 · Lv.{streamLevelInfo.level}
          </Text>
          <View className="w-full rounded-full overflow-hidden h-2 bg-border dark:bg-dark-border">
            <View
              className="h-2 bg-primary"
              style={{ width: `${Math.round(streamLevelInfo.progressToNext * 100)}%` }}
            />
          </View>
          <InfoRow
            label="累计直播"
            value={formatDuration(state.totalStreamSeconds * 1000)}
            icon="time"
            compact
          />
          <InfoRow
            label="累计收入"
            value={formatCoins(state.totalStreamEarnings)}
            icon="trending-up"
            compact
          />
          <InfoRow
            label="收入加成"
            value={`+${Math.round(streamLevelInfo.bonusRate * 100)}%`}
            icon="flash"
            compact
          />
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            穿戴 · 加成
          </Text>
          <InfoRow label="服装" value={currentOutfitName} icon="shirt" />
          <InfoRow label="配饰" value={currentAccessoryName} icon="glasses" />
          {equippedBonusLines.length > 0 ? (
            <View className="mt-2 pt-2 border-t border-border dark:border-dark-border">
              {equippedBonusLines.map((line) => (
                <Text
                  key={line}
                  className="text-xs text-success py-0.5"
                >
                  · {line}
                </Text>
              ))}
            </View>
          ) : (
            <Text className="text-xs text-muted dark:text-dark-muted mt-2">
              无加成
            </Text>
          )}
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            财产
          </Text>
          <InfoRow label="金币" value={formatCoins(state.coins)} icon="cash" />
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            坚持记录
          </Text>
          <InfoRow
            label="连续登录"
            value={`${state.consecutiveDaysLoggedIn} 天`}
            icon="calendar"
          />
          <InfoRow
            label="陪伴天数"
            value={`${Math.max(1, Math.floor((Date.now() - state.createdAt) / (24 * 60 * 60 * 1000)))} 天`}
            icon="heart-circle"
          />
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  icon: string;
  compact?: boolean;
  valueColor?: string;
}

function InfoRow({
  label,
  value,
  icon,
  compact = false,
  valueColor,
}: InfoRowProps): React.JSX.Element {
  return (
    <View
      className={[
        'flex-row items-center justify-between',
        compact ? 'py-1' : 'py-2',
      ].join(' ')}
    >
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color="#64748B" style={{ marginRight: 8 }} />
        <Text className="text-xs text-muted dark:text-dark-muted">{label}</Text>
      </View>
      <Text
        className="text-xs font-medium text-text dark:text-dark-text"
        style={{ color: valueColor }}
      >
        {value}
      </Text>
    </View>
  );
}

export default StatusScreen;