import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import WuliliAvatar from '@/components/WuliliAvatar';
import DialogueBubble from '@/components/DialogueBubble';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useDialogue } from '@/hooks/useDialogue';
import { useTheme } from '@/hooks/useTheme';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useAffinity } from '@/hooks/useAffinity';
import { getTimeOfDayLabel, getTimeOfDay } from '@/utils/time';
import { formatDuration } from '@/utils/time';
import { formatNumber } from '@/utils/format';
import type { Mood } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

export function WuliliScreen({ navigation }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const { speak } = useDialogue();
  const { levelLabel } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());

  const mood = computeMood();
  const timeOfDay = getTimeOfDay();
  const illness = useWuliliStore((s) => s.state.illness);
  const coins = useWuliliStore((s) => s.state.coins);
  const updateLoginStreak = useWuliliStore((s) => s.updateLoginStreak);

  const isStreaming = useStreamStore((s) => s.state.isStreaming);
  const streamStartedAt = useStreamStore((s) => s.state.startedAt);

  useEffect(() => {
    if (!isStreaming) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [isStreaming]);

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

  const streamElapsedMs =
    isStreaming && streamStartedAt ? now - streamStartedAt : 0;

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
              {getTimeOfDayLabel(timeOfDay)} · {levelLabel}
            </Text>
          </View>
          <View className="flex-row items-center">
            <Ionicons name="cash-outline" size={14} color={isDark ? '#94A3B8' : '#64748B'} />
            <Text className="ml-1 text-sm font-semibold text-text dark:text-dark-text">
              {formatNumber(coins)}
            </Text>
          </View>
        </View>

        {isStreaming ? (
          <Pressable
            onPress={() => navigation.navigate('Stream')}
            className="mb-3 rounded-2xl p-3 flex-row items-center active:opacity-80"
            style={{ backgroundColor: '#EF4444' }}
          >
            <Ionicons name="radio" size={20} color="#FFFFFF" />
            <View className="ml-2 flex-1">
              <Text className="text-white text-sm font-semibold">
                正在直播中
              </Text>
              <Text className="text-white/80 text-[10px] mt-0.5">
                已播 {formatDuration(streamElapsedMs)} · 点此查看
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#FFFFFF" />
          </Pressable>
        ) : null}

        <WuliliAvatar mood={mood} size={220} className="my-3" />

        {dialogue ? (
          <DialogueBubble
            dialogue={dialogue}
            onDismiss={() => setDialogue(null)}
            autoDismissMs={10000}
          />
        ) : null}

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
            onPress={() => navigation.navigate('Feed')}
          />
          <ActionButton
            icon="game-controller"
            label="娱乐"
            onPress={() => navigation.navigate('Entertain')}
          />
          <ActionButton
            icon="videocam"
            label="直播"
            onPress={() => navigation.navigate('Stream')}
          />
          <ActionButton
            icon="bicycle"
            label="运动"
            onPress={() => navigation.navigate('Exercise')}
          />
          <ActionButton
            icon="medkit"
            label="药房"
            onPress={() => navigation.navigate('Medicine')}
          />
          <ActionButton
            icon="shirt"
            label="衣柜"
            onPress={() => navigation.navigate('Shop')}
          />
        </View>

        <View className="mt-5">
          <Button
            label="查看雾璃的状态"
            icon="heart-circle"
            variant="primary"
            size="lg"
            onPress={() => navigation.navigate('Status')}
          />
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
  onPress: () => void;
}

function ActionButton({
  icon,
  label,
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

export default WuliliScreen;