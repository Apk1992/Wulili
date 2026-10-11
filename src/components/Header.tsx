import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export interface HeaderAction {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
}

export interface HeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  onBack?: () => void;
  actions?: HeaderAction[];
  className?: string;
}

export function Header({
  title,
  subtitle,
  showBack = false,
  onBack,
  actions = [],
  className = '',
}: HeaderProps): React.JSX.Element {
  const { isDark } = useTheme();
  const iconColor = isDark ? '#F1F5F9' : '#0F172A';

  return (
    <View
      className={[
        'flex-row items-center justify-between px-4 py-3',
        'bg-background dark:bg-dark-bg',
        'border-b border-border dark:border-dark-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="flex-row items-center flex-1">
        {showBack ? (
          <Pressable
            onPress={onBack}
            className="mr-2 p-2 rounded-full active:opacity-60"
            accessibilityRole="button"
            accessibilityLabel="返回"
          >
            <Ionicons name="chevron-back" size={24} color={iconColor} />
          </Pressable>
        ) : null}
        <View className="flex-1">
          <Text
            className="text-lg font-bold text-text dark:text-dark-text"
            numberOfLines={1}
          >
            {title}
          </Text>
          {subtitle ? (
            <Text
              className="text-xs text-muted dark:text-dark-muted mt-0.5"
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>

      {actions.length > 0 ? (
        <View className="flex-row items-center">
          {actions.map((action) => (
            <Pressable
              key={action.accessibilityLabel}
              onPress={action.onPress}
              className="ml-1 p-2 rounded-full active:opacity-60"
              accessibilityRole="button"
              accessibilityLabel={action.accessibilityLabel}
            >
              <Ionicons name={action.icon} size={22} color={iconColor} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </View>
  );
}

export default Header;