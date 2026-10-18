import React, { useMemo, useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
  Modal,
  Pressable,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import RemoteImage from '@/components/RemoteImage';
import Button from '@/components/Button';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useDialogue } from '@/hooks/useDialogue';
import { useAffinity } from '@/hooks/useAffinity';
import { useGitHubImage } from '@/hooks/useGitHubImage';
import { ILLNESS_LABELS } from '@/components/constants';
import { computeMenstrualInfo } from '@/data/menstrualConfig';
import { formatCoins } from '@/utils/format';
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
  
  // 状态管理
  const [dialogueText, setDialogueText] = useState<string | null>(null);
  const [healModal, setHealModal] = useState<{ title: string; msg: string } | null>(null);
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
          <Text className="text-muted dark:text-dark-muted">找不到这种药</Text>
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
    if (!affordable) return Alert.alert('金币不足', '先带雾璃去直播赚点钱吧。');
    if (!canTake) return Alert.alert('不需要吃', blockReason ?? '');

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

      // 🔥 提取纯文本，触发台词弹窗
      const line = speak({ action: 'medicine' });
      const text = typeof line === 'string' ? line : (line as any)?.text || '感觉好多了...';
      setDialogueText(text);

      // 🔥 关键修改：这里只准备 healModal 的数据，绝不使用 setTimeout 自动关闭
      if (curesCurrent) {
        setHealModal({
          title: '康复了',
          msg: `雾璃的${ILLNESS_LABELS[illness.type]}好多了，脸色恢复了红润。`,
        });
      } else if (medicine.relievesMenstrual) {
        setHealModal({
          title: '好了点',
          msg: '布洛芬生效了，12 小时内不适感都会减轻。',
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 玩家点击台词弹窗时触发
  const handleDialogueDismiss = () => {
    setDialogueText(null);
    // 如果没有需要弹的治愈提示，直接返回上一页
    if (!healModal) {
      navigation.goBack();
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

      {/* 🔥 吃药台词弹窗 */}
      <Modal visible={dialogueText !== null} transparent animationType="fade">
        <Pressable
          onPress={handleDialogueDismiss}
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}
        >
          <View style={{ width: '85%', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(37,99,235,0.2)', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <Ionicons name="heart" size={32} color="#2563EB" />
              </View>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' }}>雾璃</Text>
            </View>
            <Text style={{ fontSize: 16, textAlign: 'center', color: '#CBD5E1', lineHeight: 24, marginBottom: 16 }}>
              {dialogueText}
            </Text>
            <Text style={{ fontSize: 12, textAlign: 'center', color: '#64748B' }}>点击任意位置继续...</Text>
          </View>
        </Pressable>
      </Modal>

      {/* 🔥 治愈成功弹窗（必须在台词关闭后才显示） */}
      <Modal visible={healModal !== null && dialogueText === null} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '85%', backgroundColor: '#1E293B', borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#334155' }}>
            <View style={{ alignItems: 'center', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#F8FAFC' }}>{healModal?.title}</Text>
            </View>
            <Text style={{ fontSize: 16, textAlign: 'center', color: '#CBD5E1', lineHeight: 24, marginBottom: 24 }}>
              {healModal?.msg}
            </Text>
            <Pressable
              onPress={() => {
                setHealModal(null);
                navigation.goBack();
              }}
              style={{ backgroundColor: '#2563EB', paddingVertical: 12, borderRadius: 12, alignItems: 'center' }}
            >
              <Text style={{ color: '#FFF', fontWeight: '600' }}>太好了</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

function EffectRow({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: number;
  color: string;
}): React.JSX.Element {
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
