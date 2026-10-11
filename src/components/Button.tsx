import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  Text,
  View,
  type PressableProps,
  type ViewStyle,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';

export type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'success';
export type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends Omit<PressableProps, 'children'> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: string;
  iconPosition?: 'left' | 'right';
  fullWidth?: boolean;
  className?: string;
}

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  iconPosition = 'left',
  fullWidth = true,
  className = '',
  onPress,
  ...rest
}: ButtonProps): React.JSX.Element {
  const { isDark } = useTheme();
  const isDisabled = disabled || loading;

  const containerClasses = [
    'flex-row items-center justify-center rounded-2xl',
    sizeClasses(size),
    variantClasses(variant),
    fullWidth ? 'w-full' : '',
    isDisabled ? 'opacity-50' : 'active:opacity-80',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  const textClasses = [
    'font-semibold',
    sizeTextClasses(size),
    variantTextClasses(variant),
  ]
    .filter(Boolean)
    .join(' ');

  const iconColor = resolveIconColor(variant, isDark);
  const iconSize = size === 'sm' ? 16 : size === 'lg' ? 22 : 18;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      disabled={isDisabled}
      className={containerClasses}
      style={({ pressed }) => {
        const style: ViewStyle = {};
        if (pressed && !isDisabled) style.opacity = 0.85;
        return style;
      }}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === 'ghost' ? (isDark ? '#F1F5F9' : '#0F172A') : '#FFFFFF'}
        />
      ) : (
        <View className="flex-row items-center justify-center">
          {icon && iconPosition === 'left' ? (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text className={textClasses}>{label}</Text>
          {icon && iconPosition === 'right' ? (
            <Ionicons
              name={icon}
              size={iconSize}
              color={iconColor}
              style={{ marginLeft: 8 }}
            />
          ) : null}
        </View>
      )}
    </Pressable>
  );
}

function sizeClasses(size: ButtonSize): string {
  switch (size) {
    case 'sm':
      return 'px-3 py-2';
    case 'lg':
      return 'px-6 py-4';
    case 'md':
    default:
      return 'px-4 py-3';
  }
}

function sizeTextClasses(size: ButtonSize): string {
  switch (size) {
    case 'sm':
      return 'text-sm';
    case 'lg':
      return 'text-lg';
    case 'md':
    default:
      return 'text-base';
  }
}

function variantClasses(variant: ButtonVariant): string {
  switch (variant) {
    case 'primary':
      return 'bg-primary dark:bg-primary';
    case 'secondary':
      return 'bg-secondary dark:bg-secondary';
    case 'danger':
      return 'bg-danger dark:bg-danger';
    case 'success':
      return 'bg-success dark:bg-success';
    case 'ghost':
    default:
      return 'bg-transparent border border-border dark:border-dark-border';
  }
}

function variantTextClasses(variant: ButtonVariant): string {
  switch (variant) {
    case 'ghost':
      return 'text-text dark:text-dark-text';
    default:
      return 'text-white';
  }
}

function resolveIconColor(variant: ButtonVariant, isDark: boolean): string {
  if (variant === 'ghost') {
    return isDark ? '#F1F5F9' : '#0F172A';
  }
  return '#FFFFFF';
}

export default Button;