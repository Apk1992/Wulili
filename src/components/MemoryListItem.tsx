import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import { getKindIcon, getKindLabel } from '@/utils/mediaType';
import { formatFileSize, formatRelativeTime, humanizeFileName } from '@/utils/format';
import type { MemoryItem } from '@/types/memory';

export interface MemoryListItemProps {
  item: MemoryItem;
  onPress: (item: MemoryItem) => void;
  className?: string;
}

export function MemoryListItem({
  item,
  onPress,
  className = '',
}: MemoryListItemProps): React.JSX.Element {
  const { isDark } = useTheme();

  const iconName = getKindIcon(item.kind);
  const kindLabel = getKindLabel(item.kind);
  const iconColor = isDark ? '#F1F5F9' : '#2563EB';

  return (
    <Pressable
      onPress={() => onPress(item)}
      className={[
        'flex-row items-center p-3 rounded-2xl mb-2',
        'bg-card dark:bg-dark-card border border-border dark:border-dark-border',
        'active:opacity-90',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <View className="w-11 h-11 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 mr-3">
        <Ionicons name={iconName} size={20} color={iconColor} />
      </View>
      <View className="flex-1">
        <Text
          className="text-sm font-semibold text-text dark:text-dark-text"
          numberOfLines={1}
        >
          {humanizeFileName(item.displayName)}
        </Text>
        <Text
          className="text-[11px] text-muted dark:text-dark-muted mt-0.5"
          numberOfLines={1}
        >
          {kindLabel} · {formatFileSize(item.size)} ·{' '}
          {item.updatedAt ? formatRelativeTime(new Date(item.updatedAt).getTime()) : '未知'}
        </Text>
      </View>
      <Ionicons
        name="chevron-forward"
        size={18}
        color={isDark ? '#64748B' : '#94A3B8'}
      />
    </Pressable>
  );
}

export default MemoryListItem;