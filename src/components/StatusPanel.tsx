import React from 'react';
import { Text, View } from 'react-native';
import StatBar from './StatBar';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAffinity } from '@/hooks/useAffinity';
import { formatNumber, formatWeight } from '@/utils/format';
import { ILLNESS_LABELS } from './constants';
import type { IllnessType } from '@/types/wulili';

export interface StatusPanelProps {
  className?: string;
}

export function StatusPanel({ className = '' }: StatusPanelProps): React.JSX.Element {
  const stats = useWuliliStore((s) => s.state.stats);
  const coins = useWuliliStore((s) => s.state.coins);
  const illness = useWuliliStore((s) => s.state.illness);
  const { affinity, levelLabel, progressToNext } = useAffinity();

  return (
    <View
      className={[
        'rounded-2xl p-4 bg-card dark:bg-dark-card',
        'border border-border dark:border-dark-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="flex-row items-center justify-between mb-3">
        <View className="flex-row items-center">
          <Text className="text-xs text-muted dark:text-dark-muted">金币</Text>
          <Text className="ml-2 text-base font-bold text-text dark:text-dark-text">
            {formatNumber(coins)}
          </Text>
        </View>
        <View className="flex-row items-center">
          <Text className="text-xs text-muted dark:text-dark-muted">体重</Text>
          <Text className="ml-2 text-base font-bold text-text dark:text-dark-text">
            {formatWeight(stats.weight)}
          </Text>
        </View>
      </View>

      <View className="space-y-2">
        <StatBar icon="restaurant" label="饱食" value={stats.hunger} color="primary" />
        <StatBar icon="happy" label="心情" value={stats.mood} color="success" />
        <StatBar icon="heart" label="健康" value={stats.health} color="danger" />
        <StatBar icon="flash" label="精力" value={stats.energy} color="warning" />
      </View>

      <View className="mt-4">
        <View className="flex-row items-center justify-between mb-1">
          <Text className="text-xs text-muted dark:text-dark-muted">
            亲密度 · {levelLabel}
          </Text>
          <Text className="text-xs font-semibold text-muted dark:text-dark-muted">
            {Math.round(affinity)}
          </Text>
        </View>
        <View className="w-full rounded-full overflow-hidden h-1.5 bg-border dark:bg-dark-border">
          <View
            className="h-1.5"
            style={{
              width: `${Math.round(progressToNext * 100)}%`,
              backgroundColor: '#2563EB',
            }}
          />
        </View>
      </View>

      {illness.type !== 'none' ? (
        <View className="mt-3 flex-row items-center rounded-xl px-3 py-2 bg-danger/10 dark:bg-danger/20">
          <Text className="text-xs font-medium text-danger">
            身体不适 · {ILLNESS_LABELS[illness.type as IllnessType]}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default StatusPanel;