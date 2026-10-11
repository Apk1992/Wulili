import React from 'react';
import { Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { clamp } from '@/utils/random';

export type StatColor = 'primary' | 'success' | 'danger' | 'warning' | 'secondary';

export interface StatBarProps {
  icon: string;
  label: string;
  value: number;
  max?: number;
  color: StatColor;
  unit?: string;
  showValue?: boolean;
  compact?: boolean;
  className?: string;
}

export function StatBar({
  icon,
  label,
  value,
  max = 100,
  color,
  unit = '',
  showValue = true,
  compact = false,
  className = '',
}: StatBarProps): React.JSX.Element {
  const percent = clamp((value / max) * 100, 0, 100);
  const fillColor = colorToHex(color);
  const iconColor = colorToIconHex(color);

  return (
    <View className={['w-full', className].filter(Boolean).join(' ')}>
      <View className="flex-row items-center justify-between mb-1">
        <View className="flex-row items-center flex-1">
          <Ionicons name={icon} size={compact ? 12 : 14} color={iconColor} />
          <Text
            className={[
              'ml-1.5 font-medium text-text dark:text-dark-text',
              compact ? 'text-[10px]' : 'text-xs',
            ].join(' ')}
            numberOfLines={1}
          >
            {label}
          </Text>
        </View>
        {showValue ? (
          <Text
            className={[
              'font-semibold',
              compact ? 'text-[10px]' : 'text-xs',
              'text-muted dark:text-dark-muted',
            ].join(' ')}
          >
            {Math.round(value)}
            {unit}
          </Text>
        ) : null}
      </View>
      <View
        className={[
          'w-full rounded-full overflow-hidden bg-border dark:bg-dark-border',
          compact ? 'h-1' : 'h-1.5',
        ].join(' ')}
      >
        <View
          style={{ width: `${percent}%`, backgroundColor: fillColor }}
          className={compact ? 'h-1' : 'h-1.5'}
        />
      </View>
    </View>
  );
}

function colorToHex(color: StatColor): string {
  switch (color) {
    case 'primary':
      return '#2563EB';
    case 'success':
      return '#10B981';
    case 'danger':
      return '#EF4444';
    case 'warning':
      return '#F59E0B';
    case 'secondary':
    default:
      return '#64748B';
  }
}

function colorToIconHex(color: StatColor): string {
  return colorToHex(color);
}

export default StatBar;