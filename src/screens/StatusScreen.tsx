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
import { formatCoins, formatNumber, formatWeight } from '@/utils/format';
import { formatRelativeTime } from '@/utils/time';
import { ILLNESS_LABELS } from '@/components/constants';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Status'>;

export function StatusScreen({}: Props): React.JSX.Element {
  const state = useWuliliStore((s) => s.state);
  const { affinity, level, levelLabel, progressToNext } = useAffinity();
  const getOutfitById = useAppConfigStore((s) => s.getOutfitById);
  const getAccessoryById = useAppConfigStore((s) => s.getAccessoryById);

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
            财产
          </Text>
          <InfoRow label="金币" value={formatCoins(state.coins)} icon="cash" />
          <InfoRow
            label="累计直播收入"
            value={formatCoins(state.totalStreamEarnings)}
            icon="trending-up"
          />
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-3">
            穿戴
          </Text>
          <InfoRow label="服装" value={currentOutfitName} icon="shirt" />
          <InfoRow label="配饰" value={currentAccessoryName} icon="glasses" />
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
        <Ionicons
          name={icon}
          size={14}
          color="#64748B"
          style={{ marginRight: 8 }}
        />
        <Text className="text-xs text-muted dark:text-dark-muted">{label}</Text>
      </View>
      <Text
        className="text-xs font-medium"
        style={{ color: valueColor ?? '#0F172A' }}
      >
        {value}
      </Text>
    </View>
  );
}

void formatNumber;

export default StatusScreen;