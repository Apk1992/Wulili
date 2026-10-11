import React from 'react';
import { Pressable, Text, View } from 'react-native';

export type WardrobeTabKey = 'outfit' | 'accessory';

export interface WardrobeTabsProps {
  active: WardrobeTabKey;
  onChange: (key: WardrobeTabKey) => void;
  outfitCount: number;
  accessoryCount: number;
  className?: string;
}

const TABS: Array<{ key: WardrobeTabKey; label: string; icon: string }> = [
  { key: 'outfit', label: '服装', icon: 'shirt' },
  { key: 'accessory', label: '配饰', icon: 'glasses' },
];

export function WardrobeTabs({
  active,
  onChange,
  outfitCount,
  accessoryCount,
  className = '',
}: WardrobeTabsProps): React.JSX.Element {
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
        const count = tab.key === 'outfit' ? outfitCount : accessoryCount;
        return (
          <Pressable
            key={tab.key}
            onPress={() => onChange(tab.key)}
            className={[
              'flex-1 items-center justify-center py-2 rounded-xl',
              isActive ? 'bg-card dark:bg-dark-card' : 'bg-transparent',
            ].join(' ')}
          >
            <Text
              className={[
                'text-sm font-medium',
                isActive
                  ? 'text-text dark:text-dark-text'
                  : 'text-muted dark:text-dark-muted',
              ].join(' ')}
            >
              {tab.label} · {count}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export default WardrobeTabs;