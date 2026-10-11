import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import OutfitItem, { type WardrobeKind } from '@/components/OutfitItem';
import WardrobeTabs, { type WardrobeTabKey } from '@/components/WardrobeTabs';
import DialogueBubble from '@/components/DialogueBubble';
import EmptyView from '@/components/EmptyView';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useShopStore } from '@/store/useShopStore';
import { useAffinity } from '@/hooks/useAffinity';
import { formatCoins } from '@/utils/format';
import type { Accessory, Outfit } from '@/types/wulili';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;

export function ShopScreen({}: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const { gain } = useAffinity();
  const [tab, setTab] = useState<WardrobeTabKey>('outfit');
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);

  const outfits = useAppConfigStore((s) => s.config.outfits);
  const accessories = useAppConfigStore((s) => s.config.accessories);
  const coins = useWuliliStore((s) => s.state.coins);
  const ownedOutfits = useWuliliStore((s) => s.state.ownedOutfits);
  const ownedAccessories = useWuliliStore((s) => s.state.ownedAccessories);
  const currentOutfit = useWuliliStore((s) => s.state.currentOutfit);
  const currentAccessory = useWuliliStore((s) => s.state.currentAccessory);

  const buyOutfit = useShopStore((s) => s.buyOutfit);
  const buyAccessory = useShopStore((s) => s.buyAccessory);

  const data: Array<Outfit | Accessory> =
    tab === 'outfit' ? outfits : accessories;

  const handlePress = (item: Outfit | Accessory, kind: WardrobeKind) => {
    const owned =
      kind === 'outfit'
        ? ownedOutfits.includes(item.id)
        : ownedAccessories.includes(item.id);

    const equipped =
      kind === 'outfit' ? currentOutfit === item.id : currentAccessory === item.id;

    if (owned) {
      if (equipped) {
        if (kind === 'outfit') {
          useWuliliStore.getState().wearOutfit(null);
        } else {
          useWuliliStore.getState().wearAccessory(null);
        }
        setDialogue(null);
        return;
      }
      if (kind === 'outfit') {
        useWuliliStore.getState().wearOutfit(item.id);
      } else {
        useWuliliStore.getState().wearAccessory(item.id);
      }
      useWuliliStore.getState().addStats({
        mood: item.moodBonus,
      });
      gain(item.affinityBonus);
      const line = speak({ forceCategory: 'shop' });
      if (line) setDialogue(line);
      return;
    }

    if (coins < item.price) {
      Alert.alert('金币不足', '要不要先去直播赚一点？');
      return;
    }

    Alert.alert(
      '确认购买',
      `${item.name} · ${formatCoins(item.price)}`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '购买',
          onPress: () => {
            const ok =
              kind === 'outfit' ? buyOutfit(item.id) : buyAccessory(item.id);
            if (!ok) {
              Alert.alert('购买失败', '请稍后再试。');
              return;
            }
            useWuliliStore.getState().addStats({ mood: item.moodBonus });
            gain(item.affinityBonus);
            const line = speak({ forceCategory: 'shop' });
            if (line) setDialogue(line);
          },
        },
      ],
    );
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <Card>
          <View className="flex-row items-center justify-between">
            <Text className="text-xs text-muted dark:text-dark-muted">金币余额</Text>
            <Text className="text-base font-bold text-text dark:text-dark-text">
              {formatCoins(coins)}
            </Text>
          </View>
        </Card>
      </View>

      <View className="px-4 mt-3">
        <WardrobeTabs
          active={tab}
          onChange={setTab}
          outfitCount={outfits.length}
          accessoryCount={accessories.length}
        />
      </View>

      {data.length === 0 ? (
        <EmptyView
          title="暂无商品"
          message="先去开发者控制台里添加一些吧。"
          icon="shirt-outline"
          fullScreen
        />
      ) : (
        <FlatList
          data={data}
          keyExtractor={(item) => item.id}
          numColumns={2}
          contentContainerStyle={{
            paddingHorizontal: 12,
            paddingTop: 12,
            paddingBottom: 24,
          }}
          columnWrapperStyle={{ justifyContent: 'flex-start' }}
          renderItem={({ item }) => {
            const kind: WardrobeKind = tab === 'outfit' ? 'outfit' : 'accessory';
            const owned =
              kind === 'outfit'
                ? ownedOutfits.includes(item.id)
                : ownedAccessories.includes(item.id);
            const equipped =
              kind === 'outfit'
                ? currentOutfit === item.id
                : currentAccessory === item.id;
            return (
              <OutfitItem
                item={item}
                kind={kind}
                owned={owned}
                equipped={equipped}
                affordable={coins >= item.price}
                onPress={handlePress}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
          ListFooterComponent={
            <View className="items-center py-3">
              <Ionicons name="information-circle-outline" size={14} color="#94A3B8" />
              <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
                点击已拥有的物品可以穿戴或脱下
              </Text>
            </View>
          }
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

export default ShopScreen;