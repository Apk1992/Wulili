import React, { useMemo } from 'react';
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
import { computeMenstrualInfo } from '@/data/menstrualConfig';
import { formatCoins } from '@/utils/format';
import type { Medicine } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Medicine'>;

export function MedicineScreen({ navigation }: Props): React.JSX.Element {
  const medicines = useAppConfigStore((s) => s.config.medicines);
  const coins = useWuliliStore((s) => s.state.coins);
  const illness = useWuliliStore((s) => s.state.illness);
  const menstrual = useWuliliStore((s) => s.state.menstrual);

  const menstrualInfo = useMemo(
    () => computeMenstrualInfo(menstrual),
    [menstrual],
  );
  const isInPeriod = menstrualInfo.phase === 'period';

  // 过滤规则：
  // 1. 治病药：只在生病时显示；且只显示对症的药
  // 2. 布洛芬：只在经期显示
  // 3. 其它（维生素软糖）：总是显示
  const visibleMedicines = useMemo(() => {
    return medicines.filter((med) => {
      if (med.relievesMenstrual) {
        return isInPeriod;
      }
      if (med.isTreatment) {
        return illness.type !== 'none' && med.cures.includes(illness.type);
      }
      return true;
    });
  }, [medicines, illness.type, isInPeriod]);

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
                  ? '没有生病，只需日常保健。'
                  : `严重程度 ${illness.severity.toFixed(1)} / 5`}
              </Text>
            </View>
          </View>
          {isInPeriod ? (
            <View className="mt-2 flex-row items-center">
              <Ionicons name="water" size={14} color="#A855F7" />
              <Text className="ml-1.5 text-xs text-[#A855F7] font-medium">
                经期第 {menstrualInfo.dayInCycle} 天
                {menstrualInfo.isMedicineActive ? ' · 布洛芬生效中' : ' · 可以吃布洛芬'}
              </Text>
            </View>
          ) : null}
          <View className="flex-row items-center justify-between mt-3">
            <Text className="text-xs text-muted dark:text-dark-muted">当前金币</Text>
            <Text className="text-sm font-semibold text-text dark:text-dark-text">
              {formatCoins(coins)}
            </Text>
          </View>
        </Card>
      </View>

      {visibleMedicines.length === 0 ? (
        <EmptyView
          title="暂时不需要用药"
          message={
            illness.type === 'none' && !isInPeriod
              ? '雾璃现在很健康，也没有经期不适。'
              : '没有合适的药物。'
          }
          icon="medkit-outline"
          fullScreen
        />
      ) : (
        <FlatList
          data={visibleMedicines}
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