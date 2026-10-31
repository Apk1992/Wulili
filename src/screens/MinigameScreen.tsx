// src/screens/MinigameScreen.tsx
import React from 'react';
import { View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import MiniGameLoader from '@/components/MiniGameLoader';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Minigame'>;

export function MinigameScreen({ route, navigation }: Props): React.JSX.Element {
  const { entry } = route.params;

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <MiniGameLoader
        entry={entry}
        onExit={() => navigation.goBack()}
      />
    </View>
  );
}

export default MinigameScreen;
