import React, { useState } from 'react';
import { FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import OutfitItem, { type WardrobeKind } from '@/components/OutfitItem';
import WardrobeTabs, { type WardrobeTabKey } from '@/components/WardrobeTabs';
import EmptyView from '@/components/EmptyView';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { formatCoins } from '@/utils/format';
import type { Accessory, Outfit } from '@/types/wulili';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Shop'>;

export function ShopScreen({ navigation }: Props): React.JSX.Element {
  const [tab, setTab] = useState<WardrobeTabKey>('outfit');

  const outfits = useAppConfigStore((s) => s.config.outfits);
  const accessories = useAppConfigStore((s) => s.config.accessories);
  const coins = useWuliliStore((s) => s.state.coins);
  const ownedOutfits = useWuliliStore((s) => s.state.ownedOutfits);
  const ownedAccessories = useWuliliStore((s) => s.state.ownedAccessories);
  const currentOutfit = useWuliliStore((s) => s.state.currentOutfit);
  const currentAccessory = useWuliliStore((s) => s.state.currentAccessory);

  const data: Array<Outfit | Accessory> =
    tab === 'outfit' ? outfits : accessories;

  const handlePress = (item: Outfit | Accessory, kind: WardrobeKind) => {
    navigation.navigate('ItemDetail', { itemId: item.id, kind });
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
              <Ionicons
                name="information-circle-outline"
                size={14}
                color="#94A3B8"
              />
              <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
                点击物品查看详情
              </Text>
            </View>
          }
        />
      )}
    </ScreenContainer>
  );
}

export default ShopScreen;