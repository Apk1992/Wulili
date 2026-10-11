import React, { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import StatusPanel from '@/components/StatusPanel';
import WuliliAvatar from '@/components/WuliliAvatar';
import DialogueBubble from '@/components/DialogueBubble';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useDialogue } from '@/hooks/useDialogue';
import { useTheme } from '@/hooks/useTheme';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { getTimeOfDayLabel } from '@/utils/time';
import { getTimeOfDay } from '@/utils/time';
import type { Mood } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const { speak } = useDialogue();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const mood = computeMood();
  const timeOfDay = getTimeOfDay();
  const stats = useWuliliStore((s) => s.state.stats);
  const illness = useWuliliStore((s) => s.state.illness);
  const updateLoginStreak = useWuliliStore((s) => s.updateLoginStreak);

  useFocusEffect(
    useCallback(() => {
      updateLoginStreak();
      const greeting = speak({ forceCategory: 'greeting' });
      if (greeting) setDialogue(greeting);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []),
  );

  useEffect(() => {
    if (!dialogue) {
      const lastText = useDialogueStore.getState().lastText;
      if (lastText) {
        setDialogue({
          id: 'restored',
          text: lastText,
          category: 'idle',
          emotion: 'calm',
          triggers: [],
          weight: 1,
          cooldownHours: 0,
          once: false,
          source: 'default',
        });
      }
    }
  }, [dialogue]);

  const handleRefresh = async () => {
    setRefreshing(true);
    useWuliliStore.getState().applyTimeDecay();
    const line = speak({ forceCategory: 'idle' });
    if (line) setDialogue(line);
    setRefreshing(false);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerClassName="px-4 pb-8"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View className="mt-4 mb-2 flex-row items-center justify-between">
          <View>
            <Text className="text-2xl font-bold text-text dark:text-dark-text">
              雾璃
            </Text>
            <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">
              {getTimeOfDayLabel(timeOfDay)} · INFJ 主播
            </Text>
          </View>
        </View>

        <WuliliAvatar mood={mood} size={220} className="my-3" />

        {dialogue ? (
          <DialogueBubble
            dialogue={dialogue}
            onDismiss={() => setDialogue(null)}
            autoDismissMs={10000}
          />
        ) : null}

        <View className="mt-4">
          <StatusPanel />
        </View>

        {illness.type !== 'none' ? (
          <Card className="mt-3">
            <View className="flex-row items-center">
              <Ionicons name="medkit" size={20} color="#EF4444" />
              <Text className="ml-2 text-sm text-danger font-medium">
                雾璃现在身体不舒服，考虑给她吃点药。
              </Text>
            </View>
            <View className="mt-3">
              <Button
                label="去药房"
                variant="danger"
                size="sm"
                icon="medkit-outline"
                onPress={() => navigation.navigate('Medicine')}
              />
            </View>
          </Card>
        ) : null}

        <View className="mt-4 flex-row flex-wrap" style={{ marginHorizontal: -4 }}>
          <ActionButton
            icon="restaurant"
            label="投喂"
            color="#2563EB"
            onPress={() => navigation.navigate('Feed')}
          />
          <ActionButton
            icon="game-controller"
            label="娱乐"
            color="#10B981"
            onPress={() => navigation.navigate('Entertain')}
          />
          <ActionButton
            icon="videocam"
            label="直播"
            color="#F59E0B"
            onPress={() => navigation.navigate('Stream')}
          />
          <ActionButton
            icon="bicycle"
            label="运动"
            color="#8B5CF6"
            onPress={() => navigation.navigate('Exercise')}
          />
          <ActionButton
            icon="medkit"
            label="药房"
            color="#EF4444"
            onPress={() => navigation.navigate('Medicine')}
          />
          <ActionButton
            icon="shirt"
            label="衣柜"
            color="#EC4899"
            onPress={() => navigation.navigate('Shop')}
          />
        </View>

        <View className="mt-4">
          <Card>
            <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
              今日状态
            </Text>
            <SummaryLine icon="restaurant-outline" label="饱食度" value={`${Math.round(stats.hunger)}/100`} isDark={isDark} />
            <SummaryLine icon="happy-outline" label="心情" value={`${Math.round(stats.mood)}/100`} isDark={isDark} />
            <SummaryLine icon="heart-outline" label="健康" value={`${Math.round(stats.health)}/100`} isDark={isDark} />
            <SummaryLine icon="flash-outline" label="精力" value={`${Math.round(stats.energy)}/100`} isDark={isDark} />
            <SummaryLine icon="scale-outline" label="体重" value={`${stats.weight.toFixed(1)} kg`} isDark={isDark} />
          </Card>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function computeMood(): Mood {
  const s = useWuliliStore.getState().state;
  if (s.illness.type !== 'none') return 'sick';
  if (s.stats.energy < 15) return 'sleepy';
  if (s.stats.mood < 30) return 'sad';
  if (s.stats.mood >= 80) return 'happy';
  if (s.affinity >= 60) return 'shy';
  return 'calm';
}

interface ActionButtonProps {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}

function ActionButton({
  icon,
  label,
  color,
  onPress,
}: ActionButtonProps): React.JSX.Element {
  return (
    <View className="w-1/3 p-1">
      <Button
        label={label}
        icon={icon}
        variant="ghost"
        size="md"
        onPress={onPress}
      />
    </View>
  );
}

interface SummaryLineProps {
  icon: string;
  label: string;
  value: string;
  isDark: boolean;
}

function SummaryLine({
  icon,
  label,
  value,
  isDark,
}: SummaryLineProps): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-1.5 border-b border-border dark:border-dark-border">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color={isDark ? '#94A3B8' : '#64748B'} />
        <Text className="ml-2 text-xs text-muted dark:text-dark-muted">{label}</Text>
      </View>
      <Text className="text-xs font-medium text-text dark:text-dark-text">{value}</Text>
    </View>
  );
}

export default WuliliScreen;