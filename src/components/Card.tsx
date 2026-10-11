import React from 'react';
import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/hooks/useTheme';

export interface CardProps extends ViewProps {
  children: React.ReactNode;
  padded?: boolean;
  pressable?: boolean;
  onPress?: () => void;
  className?: string;
}

export function Card({
  children,
  padded = true,
  pressable = false,
  onPress,
  className = '',
  style,
  ...rest
}: CardProps): React.JSX.Element {
  const base = [
    'rounded-2xl bg-card dark:bg-dark-card',
    'border border-border dark:border-dark-border',
    padded ? 'p-4' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  if (pressable) {
    return (
      <Pressable
        onPress={onPress}
        className={base}
        style={({ pressed }) => {
          const s: ViewStyle = {};
          if (pressed) s.opacity = 0.9;
          return s;
        }}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View className={base} style={style} {...rest}>
      {children}
    </View>
  );
}

export default Card;