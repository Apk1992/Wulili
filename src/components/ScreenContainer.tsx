import React from 'react';
import { View, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { Edge } from 'react-native-safe-area-context';

export interface ScreenContainerProps {
  children: React.ReactNode;
  edges?: readonly Edge[];
  scrollable?: boolean;
  className?: string;
  contentClassName?: string;
  padded?: boolean;
}

export function ScreenContainer({
  children,
  edges = ['top', 'bottom'],
  scrollable = false,
  className = '',
  contentClassName = '',
  padded = true,
}: ScreenContainerProps): React.JSX.Element {
  const outer = ['flex-1 bg-background dark:bg-dark-bg', className]
    .filter(Boolean)
    .join(' ');
  const content = [padded ? 'px-4 py-4' : '', contentClassName]
    .filter(Boolean)
    .join(' ');

  return (
    <SafeAreaView className={outer} edges={edges}>
      {scrollable ? (
        <ScrollView
          className="flex-1"
          contentContainerClassName={content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View className={`flex-1 ${content}`}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export default ScreenContainer;