// src/screens/AlbumScreen.tsx
import React from 'react';
import { FlatList, Text, View, useWindowDimensions } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import RemoteImage from '@/components/RemoteImage';
import { useTravelStore } from '@/store/useTravelStore';
import { TRAVEL_DESTINATIONS } from '@/data/travelConfig';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Album'>;

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function AlbumScreen({ navigation }: Props): React.JSX.Element {
  const { width } = useWindowDimensions();
  const unlockedSpots = useTravelStore((s) => s.state.unlockedSpots);

  // 统计总照片数和解锁数
  const totalSpots = TRAVEL_DESTINATIONS.reduce((acc, dest) => acc + dest.spots.length, 0);
  const unlockedCount = unlockedSpots.length;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2">
        <Card>
          <View className="flex-row items-center justify-between">
            <View>
              <Text className="text-sm font-semibold text-text dark:text-dark-text">
                旅行相册
              </Text>
              <Text className="text-xs text-muted dark:text-dark-muted mt-1">
                和雾璃一起看过的风景
              </Text>
            </View>
            <View className="items-end">
              <Text className="text-base font-bold text-primary">
                {unlockedCount} / {totalSpots}
              </Text>
              <Text className="text-[10px] text-muted dark:text-dark-muted">已解锁</Text>
            </View>
          </View>
        </Card>
      </View>

      <FlatList
        data={TRAVEL_DESTINATIONS}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item: dest }) => {
          return (
            <View className="mb-6">
              {/* 城市标题 */}
              <View className="flex-row items-center mb-3">
                <Ionicons name="location" size={16} color="#F59E0B" />
                <Text className="ml-1.5 text-sm font-bold text-text dark:text-dark-text">
                  {dest.country} · {dest.city}
                </Text>
                <View className="ml-2 px-1.5 py-0.5 rounded bg-border dark:bg-dark-border">
                  <Text className="text-[9px] text-muted dark:text-dark-muted">
                    {dest.spots.filter(s => unlockedSpots.includes(s.id)).length} / {dest.spots.length}
                  </Text>
                </View>
              </View>

              {/* 该城市的照片列表（横向滚动或网格） */}
              <View className="flex-row flex-wrap" style={{ gap: 10 }}>
                {dest.spots.map((spot) => {
                  const isUnlocked = unlockedSpots.includes(spot.id);
                  const imageUrl = `${R2_BASE_URL}/${spot.image}`;
                  
                  // 计算卡片宽度 (一行两个)
                  const cardWidth = (width - 32 - 10) / 2;

                  return (
                    <View 
                      key={spot.id} 
                      style={{ width: cardWidth }}
                      className="rounded-2xl overflow-hidden bg-card dark:bg-dark-card border border-border dark:border-dark-border"
                    >
                      <View style={{ height: cardWidth * 0.75, backgroundColor: '#334155' }}>
                        {isUnlocked ? (
                          <RemoteImage
                            uri={imageUrl}
                            width={cardWidth}
                            height={cardWidth * 0.75}
                            resizeMode="cover"
                            fallbackIcon="image"
                            className="bg-transparent dark:bg-transparent"
                          />
                        ) : (
                          <View className="flex-1 items-center justify-center opacity-30">
                            <Ionicons name="lock-closed" size={32} color="#94A3B8" />
                          </View>
                        )}
                      </View>
                      <View className="p-2">
                        <Text 
                          className={`text-xs font-semibold ${isUnlocked ? 'text-text dark:text-dark-text' : 'text-muted dark:text-dark-muted'}`}
                          numberOfLines={1}
                        >
                          {isUnlocked ? spot.name : '???'}
                        </Text>
                        <Text 
                          className="text-[10px] text-muted dark:text-dark-muted mt-0.5"
                          numberOfLines={2}
                        >
                          {isUnlocked ? spot.description : '带她去这里看看吧'}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        ListFooterComponent={
          <View className="items-center py-4">
            <Text className="text-[10px] text-muted dark:text-dark-muted">
              多带雾璃出去走走吧
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

export default AlbumScreen;
