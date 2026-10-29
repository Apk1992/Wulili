// src/screens/HouseScreen.tsx
import React from 'react';
import { FlatList, Text, View, Alert } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import RemoteImage from '@/components/RemoteImage';
import { useWuliliStore } from '@/store/useWuliliStore';
import { HOUSES } from '@/data/houseConfig';
import { formatCoins } from '@/utils/format';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'House'>;

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function HouseScreen({ navigation }: Props): React.JSX.Element {
  const coins = useWuliliStore((s) => s.state.coins);
  const currentHouseId = useWuliliStore((s) => s.state.currentHouseId) || 'default_room';
  const buyHouse = useWuliliStore((s) => s.buyHouse);

  const handleBuy = (houseId: string, price: number) => {
    if (coins < price) {
      Alert.alert('金币不足', '多陪雾璃直播攒点钱吧。');
      return;
    }
    Alert.alert(
      '确认搬家',
      `确定要花 ${formatCoins(price)} 搬到这里吗？`,
      [
        { text: '再想想', style: 'cancel' },
        {
          text: '买下',
          onPress: () => {
            const ok = buyHouse(houseId, price);
            if (ok) {
              Alert.alert('搬家成功', '雾璃很喜欢这个新家！');
            }
          },
        },
      ]
    );
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-sm text-muted dark:text-dark-muted">当前金币</Text>
        <Text className="text-base font-bold text-primary">{formatCoins(coins)}</Text>
      </View>

      <FlatList
        data={HOUSES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const isOwned = currentHouseId === item.id;
          const affordable = coins >= item.price;
          
          // 处理图片路径：如果是默认房间（空路径），就不渲染图片，直接用默认季节图
          const imageUrl = item.image ? `${R2_BASE}/${item.image}` : null;

          return (
            <Card className="mb-4 overflow-hidden">
              {/* 房屋预览图 */}
              <View style={{ height: 180, width: '100%' }}>
                {imageUrl ? (
                  <RemoteImage
                    uri={imageUrl}
                    width={undefined as any}
                    height={180}
                    resizeMode="cover"
                    fallbackIcon="home"
                    className="bg-transparent"
                  />
                ) : (
                  <View className="flex-1 items-center justify-center bg-secondary/10">
                    <Ionicons name="home" size={48} color="#94A3B8" />
                  </View>
                )}
                
                {/* 标签 */}
                <View className="absolute top-2 right-2">
                  {isOwned ? (
                    <View className="px-2 py-1 rounded bg-primary">
                      <Text className="text-[10px] font-bold text-white">当前居住</Text>
                    </View>
                  ) : (
                    <View className="px-2 py-1 rounded bg-warning">
                      <Text className="text-[10px] font-bold text-white">未拥有</Text>
                    </View>
                  )}
                </View>
              </View>

              <View className="p-3">
                <View className="flex-row items-center justify-between mb-1">
                  <Text className="text-lg font-bold text-text dark:text-dark-text">{item.name}</Text>
                  {/* 🔥 把月租改为更清晰的“每月物业费” */}
                  <View className="bg-secondary/15 px-2 py-0.5 rounded">
                    <Text className="text-[10px] font-bold text-secondary">
                      每月物业费: {formatCoins(item.rentPrice)}
                    </Text>
                  </View>
                </View>
                
                <Text className="text-xs text-muted dark:text-dark-muted mb-3 leading-4">
                  {item.description}
                </Text>

                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Ionicons name="cash" size={14} color="#F59E0B" />
                    <Text className="ml-1 text-sm font-bold text-warning">
                      {item.price === 0 ? '免费' : formatCoins(item.price)}
                    </Text>
                  </View>
                  
                  {!isOwned && (
                    <View style={{ width: 100 }}>
                      <Button
                        label={affordable ? '购买搬家' : '金币不足'}
                        size="sm"
                        variant={affordable ? 'primary' : 'ghost'}
                        disabled={!affordable}
                        onPress={() => handleBuy(item.id, item.price)}
                      />
                    </View>
                  )}
                </View>
              </View>
            </Card>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

export default HouseScreen;
