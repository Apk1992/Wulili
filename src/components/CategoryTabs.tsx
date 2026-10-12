import React from 'react';
import { Pressable, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useTheme } from '@/hooks/useTheme';
import type { MemoryKind } from '@/types/memory';

export interface CategoryTabsProps {
  active: MemoryKind;
  onChange: (kind: MemoryKind) => void;
  counts?: Partial<Record<MemoryKind, number>>;
  className?: string;
}

const TABS: Array<{ key: MemoryKind; label: string; icon: string }> = [
  { key: 'music', label: '音乐', icon: 'musical-notes' },
  { key: 'video', label: '视频', icon: 'videocam' },
  { key: 'note', label: '读文', icon: 'document-text' },
];

export function CategoryTabs({
  active,
  onChange,
  counts,
  className = '',
}: CategoryTabsProps): React.JSX.Element {
  const { isDark } = useTheme();

  return (
    <View
      className={[
        'flex-row rounded-2xl p-1',
        'bg-border dark:bg-dark-border',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {TABS.map((tab) => {
        const isActive = tab.key === active;
        const count = counts?.[tab.key];
        const iconColor = isActive
          ? isDark
            ? '#F1F5F9'
            : '#0F172A'
          : isDark
            ? '#64748B'
            : '#94A3B8';
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={[
              'flex-1 flex-row items-center justify-center py-2 rounded-xl',
              isActive ? 'bg-card dark:bg-dark-card' : 'bg-transparent',
            ].join(' ')}
          >
            <Ionicons name={tab.icon} size={14} color={iconColor} />
            <Text
              className={[
                'ml-1 text-xs font-medium',
                isActive
                  ? 'text-text dark:text-dark-text'
                  : 'text-muted dark:text-dark-muted',
              ].join(' ')}
            >
              {tab.label}
              {count !== undefined ? ` · ${count}` : ''}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default CategoryTabs;