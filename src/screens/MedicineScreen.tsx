import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import MedicineItem from '@/components/MedicineItem';
import DialogueBubble from '@/components/DialogueBubble';
import EmptyView from '@/components/EmptyView';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAffinity } from '@/hooks/useAffinity';
import { ILLNESS_LABELS } from '@/components/constants';
import { formatCoins } from '@/utils/format';
import type { Medicine } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Medicine'>;

export function MedicineScreen({}: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  const medicines = useAppConfigStore((s) => s.config.medicines);
  const coins = useWuliliStore((s) => s.state.coins);
  const illness = useWuliliStore((s) => s.state.illness);

  const handleTake = (medicine: Medicine) => {
    const currentCoins = useWuliliStore.getState().state.coins;
    if (currentCoins < medicine.price) {
      Alert.alert('金币不足', '先带雾璃去直播赚点钱吧。');
      return;
    }

    const currentIllness = useWuliliStore.getState().state.illness;
    const curesCurrent =
      currentIllness.type !== 'none' && medicine.cures.includes(currentIllness.type);

    useWuliliStore.getState().addCoins(-medicine.price);
    useWuliliStore.getState().addStats({
      health: medicine.healthRestore,
      mood: medicine.moodRestore,
    });
    useWuliliStore.getState().markInteraction('medicine');
    gain(2);

    if (curesCurrent) {
      useWuliliStore.getState().clearIllness();
    }

    const line = speak({ action: 'medicine' });
    if (line) setDialogue(line);

    if (curesCurrent) {
      setTimeout(() => {
        Alert.alert('康复了', `雾璃的${ILLNESS_LABELS[currentIllness.type]}好多了。`);
      }, 600);
    }
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2">
        <Card>
          <View className="flex-row items-center">
            <Ionicons
              name={illness.type === 'none' ? 'happy' : 'medkit'}
              size={20}
              color={illness.type === 'none' ? '#10B981' : '#EF4444'}
            />
            <View className="ml-2 flex-1">
              <Text className="text-sm font-semibold text-text dark:text-dark-text">
                {illness.type === 'none'
                  ? '雾璃现在很健康'
                  : `当前症状 · ${ILLNESS_LABELS[illness.type]}`}
              </Text>
              <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">
                {illness.type === 'none'
                  ? '不需要吃药，但也可以补充一些营养。'
                  : `严重程度 ${illness.severity.toFixed(1)} / 5`}
              </Text>
            </View>
          </View>
          <View className="flex-row items-center justify-between mt-3">
            <Text className="text-xs text-muted dark:text-dark-muted">当前金币</Text>
            <Text className="text-sm font-semibold text-text dark:text-dark-text">
              {formatCoins(coins)}
            </Text>
          </View>
        </Card>
      </View>

      {medicines.length === 0 ? (
        <EmptyView
          title="暂无药品"
          message="配置里还没有药品。"
          icon="medkit-outline"
          fullScreen
        />
      ) : (
        <FlatList
          data={medicines}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          renderItem={({ item }) => (
            <MedicineItem
              medicine={item}
              affordable={coins >= item.price}
              onPress={handleTake}
            />
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

export default MedicineScreen;