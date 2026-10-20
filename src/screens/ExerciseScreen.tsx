// src/screens/ExerciseScreen.tsx
import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DialogueBubble from '@/components/DialogueBubble';
import EmptyView from '@/components/EmptyView';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAffinity } from '@/hooks/useAffinity';
import { formatWeight } from '@/utils/format';
import { chance, clamp } from '@/utils/random';
import type { ExerciseOption } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Exercise'>;

// 🔥 Cloudflare R2 基础公开域名（供运动资源或贴图预留使用）
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function ExerciseScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  const exercises = useAppConfigStore((s) => s.config.exercises);
  const energy = useWuliliStore((s) => s.state.stats.energy);
  const health = useWuliliStore((s) => s.state.stats.health);
  const weight = useWuliliStore((s) => s.state.stats.weight);

  const handleExercise = (option: ExerciseOption) => {
    if (energy < option.energyCost) {
      Alert.alert('精力不足', '雾璃现在太累了，先休息一下再运动吧。');
      return;
    }

    useWuliliStore.getState().addStats({
      energy: -option.energyCost,
      health: option.healthGain,
      weight: -option.weightLoss,
      mood: option.moodEffect,
    });
    useWuliliStore.getState().markInteraction('exercise');
    gain(1);

    const line = speak({ action: 'exercise' });
    if (line) setDialogue(line);

    if (chance(0.06) && health < 60) {
      useWuliliStore.getState().setIllness('rhinitis', 1);
      setTimeout(() => {
        Alert.alert('身体不适', '运动后雾璃的鼻炎好像犯了……给她吃点药吧。');
      }, 800);
    }
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <View>
          <Text className="text-sm text-muted dark:text-dark-muted">当前体重</Text>
          <Text className="text-base font-bold text-text dark:text-dark-text">
            {formatWeight(weight)}
          </Text>
        </View>
        <View className="items-end">
          <Text className="text-sm text-muted dark:text-dark-muted">精力 / 健康</Text>
          <Text className="text-base font-bold text-text dark:text-dark-text">
            {Math.round(energy)} / {Math.round(health)}
          </Text>
        </View>
      </View>

      {exercises.length === 0 ? (
        <EmptyView
          title="暂无运动"
          message="配置里还没有运动选项。"
          icon="bicycle-outline"
          fullScreen
        />
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <Card className="mb-3">
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-xl bg-secondary/15 items-center justify-center mr-3">
                  <Ionicons name={item.icon || 'fitness-outline'} size={20} color="#8B5CF6" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text dark:text-dark-text">
                    {item.name}
                  </Text>
                  <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">
                    {item.description}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center mt-3 justify-between">
                <View className="flex-row items-center flex-wrap">
                  <StatChip icon="flash" label={`-${item.energyCost} 精力`} color="#F59E0B" />
                  <StatChip icon="heart" label={`+${item.healthGain} 健康`} color="#EF4444" />
                  <StatChip icon="scale" label={`-${item.weightLoss} kg`} color="#10B981" />
                  <StatChip icon="happy" label={`+${item.moodEffect} 心情`} color="#2563EB" />
                </View>
                <View style={{ width: 76 }}>
                  <Button
                    label="开始"
                    size="sm"
                    variant={energy >= item.energyCost ? 'primary' : 'ghost'}
                    disabled={energy < item.energyCost}
                    onPress={() => handleExercise(item)}
                  />
                </View>
              </View>
            </Card>
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View className="px-4 pb-3">
        {dialogue ? (
          <DialogueBubble
            dialogue={dialogue}
            onDismiss={() => setDialogue(null)}
            autoDismissMs={8000}
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

function StatChip({
  icon,
  label,
  color,
}: {
  icon: string;
  label: string;
  color: string;
}): React.JSX.Element {
  return (
    <View className="flex-row items-center mr-2 mb-1">
      <Ionicons name={icon} size={11} color={color} />
      <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">{label}</Text>
    </View>
  );
}

void clamp;

export default ExerciseScreen;
