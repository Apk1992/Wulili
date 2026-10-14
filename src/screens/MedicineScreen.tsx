import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import MedicineItem from '@/components/MedicineItem';
import EmptyView from '@/components/EmptyView';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { ILLNESS_LABELS } from '@/components/constants';
import { formatCoins } from '@/utils/format';
import type { Medicine } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Medicine'>;

export function MedicineScreen({ navigation }: Props): React.JSX.Element {
  const medicines = useAppConfigStore((s) => s.config.medicines);
  const coins = useWuliliStore((s) => s.state.coins);
  const illness = useWuliliStore((s) => s.state.illness);

  const handleSelect = (medicine: Medicine) => {
    navigation.navigate('MedicineDetail', { medicineId: medicine.id });
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
              onPress={handleSelect}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}
    </ScreenContainer>
  );
}

export default MedicineScreen;