import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import RemoteImage from '@/components/RemoteImage';
import Button from '@/components/Button';
import DialogueBubble from '@/components/DialogueBubble';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogue } from '@/hooks/useDialogue';
import { useAffinity } from '@/hooks/useAffinity';
import { useGitHubImage } from '@/hooks/useGitHubImage';
import { ILLNESS_LABELS } from '@/components/constants';
import { computeMenstrualInfo } from '@/data/menstrualConfig';
import { formatCoins } from '@/utils/format';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MedicineDetail'>;

export function MedicineDetailScreen({
  route,
  navigation,
}: Props): React.JSX.Element {
  const { medicineId } = route.params;
  const { height: screenHeight } = useWindowDimensions();

  const medicine = useAppConfigStore((s) => s.getMedicineById(medicineId));
  const coins = useWuliliStore((s) => s.state.coins);
  const illness = useWuliliStore((s) => s.state.illness);
  const menstrual = useWuliliStore((s) => s.state.menstrual);
  const addCoins = useWuliliStore((s) => s.addCoins);
  const addStats = useWuliliStore((s) => s.addStats);
  const markInteraction = useWuliliStore((s) => s.markInteraction);

  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const menstrualInfo = useMemo(
    () => computeMenstrualInfo(menstrual),
    [menstrual],
  );
  const isInPeriod = menstrualInfo.phase === 'period';
  const isMedicineActive = menstrualInfo.isMedicineActive;

  const imagePath = useMemo(
    () => (medicine ? `images/medicine/${medicine.image}` : null),
    [medicine],
  );
  const { url } = useGitHubImage(imagePath, true);

  if (!medicine) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <Text className="text-muted dark:text-dark-muted">
            找不到这种药
          </Text>
          <View className="mt-4 w-40">
            <Button label="返回" variant="ghost" onPress={() => navigation.goBack()} />
          </View>
        </View>
      </ScreenContainer>
    );
  }

  // 二次校验：当前状态是否适合吃这个药
  let blockReason: string | null = null;
  if (medicine.relievesMenstrual) {
    if (!isInPeriod) {
      blockReason = '她肚子不痛，不需要吃这个。';
    } else if (isMedicineActive) {
      blockReason = '布洛芬还在生效中，不需要重复吃。';
    }
  } else if (medicine.isTreatment) {
    if (illness.type === 'none') {
      blockReason = '她没有生病，不需要吃药。';
    } else if (!medicine.cures.includes(illness.type)) {
      blockReason = '这不对症，吃了没用。';
    }
  }

  const affordable = coins >= medicine.price;
  const canTake = !blockReason;

  const handleConfirm = async () => {
    if (submitting) return;
    if (!affordable) {
      Alert.alert('金币不足', '先带雾璃去直播赚点钱吧。');
      return;
    }
    if (!canTake) {
      Alert.alert('不需要吃', blockReason ?? '');
      return;
    }

    setSubmitting(true);
    try {
      addCoins(-medicine.price);
      addStats({
        health: medicine.healthRestore,
        mood: medicine.moodRestore,
      });
      markInteraction('medicine');
      gain(2);

      if (medicine.relievesMenstrual) {
        useWuliliStore.getState().takeMenstrualMedicine();
      }

      const curesCurrent =
        illness.type !== 'none' && medicine.cures.includes(illness.type);
      if (curesCurrent) {
        useWuliliStore.getState().clearIllness();
      }

      const line = speak({ action: 'medicine' });
      if (line) setDialogue(line);

      if (curesCurrent) {
        setTimeout(() => {
          Alert.alert(
            '康复了',
            `雾璃的${ILLNESS_LABELS[illness.type]}好多了。`,
          );
        }, 600);
      } else if (medicine.relievesMenstrual) {
        setTimeout(() => {
          Alert.alert('好了点', '布洛芬生效 12 小时，不适感减轻。');
        }, 600);
      }

      setTimeout(() => {
        navigation.goBack();
      }, line ? 600 : 100);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          className="w-full bg-card dark:bg-dark-card items-center justify-center"
          style={{ height: screenHeight * 0.55 }}
        >
          <RemoteImage
            uri={url}
            width={screenHeight * 0.45}
            height={screenHeight * 0.45}
            resizeMode="contain"
            fallbackIcon="medkit"
            className="bg-transparent dark:bg-transparent"
          />
        </View>

        <View className="px-4 pt-4">
          <Text className="text-2xl font-bold text-text dark:text-dark-text">
            {medicine.name}
          </Text>
          <Text className="text-sm text-muted dark:text-dark-muted mt-2 leading-5">
            {medicine.description}
          </Text>

          <View className="mt-3 flex-row items-center">
            <Ionicons name="cash" size={16} color="#2563EB" />
            <Text className="ml-1 text-base font-bold text-primary">
              {formatCoins(medicine.price)}
            </Text>
            <Text className="ml-3 text-xs text-muted dark:text-dark-muted">
              当前金币 {formatCoins(coins)}
            </Text>
          </View>
        </View>

        {medicine.cures.length > 0 ? (
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
              治疗病症
            </Text>
            <View className="flex-row flex-wrap">
              {medicine.cures.map((cure) => {
                const active = illness.type === cure;
                return (
                  <View
                    key={cure}
                    className={[
                      'px-3 py-1 mr-2 mb-2 rounded-full',
                      active ? 'bg-danger' : 'bg-danger/15',
                    ].join(' ')}
                  >
                    <Text
                      className={[
                        'text-xs font-medium',
                        active ? 'text-white' : 'text-danger',
                      ].join(' ')}
                    >
                      {ILLNESS_LABELS[cure]}
                      {active ? ' · 当前' : ''}
                    </Text>
                  </View>
                );
              })}
            </View>
          </View>
        ) : medicine.relievesMenstrual ? (
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
              用途
            </Text>
            <Text className="text-xs text-muted dark:text-dark-muted">
              缓解经期不适，药效持续 12 小时。
            </Text>
          </View>
        ) : (
          <View className="px-4 mt-4">
            <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
              用途
            </Text>
            <Text className="text-xs text-muted dark:text-dark-muted">
              日常保健。
            </Text>
          </View>
        )}

        <View className="px-4 mt-4">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
            效果
          </Text>
          <View className="rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border p-3">
            <EffectRow
              icon="heart"
              label="恢复健康"
              value={medicine.healthRestore}
              color="#EF4444"
            />
            <EffectRow
              icon="happy"
              label="恢复心情"
              value={medicine.moodRestore}
              color="#10B981"
            />
          </View>
        </View>

        {blockReason ? (
          <View className="px-4 mt-3">
            <View className="rounded-2xl bg-warning/15 px-3 py-2 flex-row items-center">
              <Ionicons name="alert-circle" size={16} color="#F59E0B" />
              <Text className="ml-2 text-xs text-warning flex-1">
                {blockReason}
              </Text>
            </View>
          </View>
        ) : null}

        <View className="px-4 mt-5">
          {dialogue ? (
            <View className="mb-3">
              <DialogueBubble
                dialogue={dialogue}
                onDismiss={() => setDialogue(null)}
                autoDismissMs={10000}
              />
            </View>
          ) : null}

          <Button
            label={submitting ? '服用中…' : '确认服用'}
            icon="checkmark"
            variant={affordable && canTake ? 'primary' : 'ghost'}
            size="lg"
            loading={submitting}
            onPress={handleConfirm}
            disabled={!affordable || !canTake}
          />
          <View className="mt-2">
            <Button
              label="取消"
              variant="ghost"
              size="md"
              onPress={() => navigation.goBack()}
            />
          </View>
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

interface EffectRowProps {
  icon: string;
  label: string;
  value: number;
  color: string;
}

function EffectRow({
  icon,
  label,
  value,
  color,
}: EffectRowProps): React.JSX.Element {
  const sign = value > 0 ? '+' : '';
  return (
    <View className="flex-row items-center justify-between py-1.5">
      <View className="flex-row items-center">
        <Ionicons name={icon} size={14} color={color} />
        <Text className="ml-2 text-xs text-muted dark:text-dark-muted">
          {label}
        </Text>
      </View>
      <Text className="text-xs font-semibold" style={{ color }}>
        {sign}
        {value}
      </Text>
    </View>
  );
}

export default MedicineDetailScreen;