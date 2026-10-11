import React from 'react';
import { Pressable, Switch, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export interface SettingRowProps {
  icon: string;
  label: string;
  value?: string;
  onPress?: () => void;
  showChevron?: boolean;
  variant?: 'default' | 'danger';
  toggle?: {
    value: boolean;
    onValueChange: (value: boolean) => void;
  };
  disabled?: boolean;
  className?: string;
}

export function SettingRow({
  icon,
  label,
  value,
  onPress,
  showChevron = true,
  variant = 'default',
  toggle,
  disabled = false,
  className = '',
}: SettingRowProps): React.JSX.Element {
  const { isDark } = useTheme();

  const isDanger = variant === 'danger';
  const iconColor = isDanger ? '#EF4444' : isDark ? '#F1F5F9' : '#2563EB';
  const labelColor = isDanger
    ? 'text-danger'
    : 'text-text dark:text-dark-text';

  const content = (
    <View
      className={[
        'flex-row items-center p-4',
        'bg-card dark:bg-dark-card',
        'border-b border-border dark:border-dark-border',
        disabled ? 'opacity-50' : '',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View
        className={[
          'w-8 h-8 items-center justify-center rounded-lg mr-3',
          isDanger ? 'bg-danger/10' : 'bg-primary/10 dark:bg-primary/20',
        ].join(' ')}
      >
        <Ionicons name={icon} size={18} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text className={['text-sm font-medium', labelColor].join(' ')}>
          {label}
        </Text>
        {value ? (
          <Text
            className="text-xs text-muted dark:text-dark-muted mt-0.5"
            numberOfLines={1}
          >
            {value}
          </Text>
        ) : null}
      </View>

      {toggle ? (
        <Switch
          value={toggle.value}
          onValueChange={toggle.onValueChange}
          disabled={disabled}
          trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
          thumbColor="#FFFFFF"
        />
      ) : showChevron && onPress ? (
        <Ionicons
          name="chevron-forward"
          size={18}
          color={isDark ? '#64748B' : '#94A3B8'}
        />
      ) : null}
    </View>
  );

  if (onPress && !toggle) {
    return (
      <Pressable onPress={disabled ? undefined : onPress} disabled={disabled}>
        {content}
      </Pressable>
    );
  }

  return content;
}

export default SettingRow;