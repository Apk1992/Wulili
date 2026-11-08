// src/screens/HouseScreen.tsx
import React, { useState, useCallback } from 'react';
import { FlatList, Text, View, Pressable, Image } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import { ActionDialogueModal } from '@/components/ActionDialogueModal';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useSeason } from '@/hooks/useSeason';
import { HOUSES } from '@/data/houseConfig';
import { formatCoins } from '@/utils/format';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'House'>;

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function HouseScreen({ navigation }: Props): React.JSX.Element {
  const coins = useWuliliStore((s) => s.state.coins);
  const currentHouseId = useWuliliStore((s) => s.state.currentHouseId) || 'default_room';
  const buyHouse = useWuliliStore((s) => s.buyHouse);
  const { season } = useSeason();

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogText, setDialogText] = useState<string | null>('');
  const [dialogTitle, setDialogTitle] = useState<string>('雾璃');
  const [dialogIcon, setDialogIcon] = useState<string>('home');
  const [dialogMode, setDialogMode] = useState<'info' | 'buyConfirm'>('info');
  const [pendingHouse, setPendingHouse] = useState<{ id: string; price: number } | null>(null);

  const showInfo = useCallback((text: string, icon: string = 'home', title: string = '雾璃') => {
    setDialogText(text);
    setDialogIcon(icon);
    setDialogTitle(title);
    setDialogMode('info');
    setDialogVisible(true);
  }, []);

  const handleBuyPress = (houseId: string, price: number) => {
    if (coins < price) {
      showInfo('多陪雾璃直播攒点钱吧，我们现在的金币不够呢。', 'cash', '金币不足');
      return;
    }
    setPendingHouse({ id: houseId, price });
    setDialogText(`确定要花 ${formatCoins(price)} 搬到这里吗？\n雾璃会很喜欢新家的。`);
    setDialogIcon('home');
    setDialogTitle('确认搬家');
    setDialogMode('buyConfirm');
    setDialogVisible(true);
  };

  const handleBuyConfirm = () => {
    if (!pendingHouse) {
      setDialogVisible(false);
      return;
    }
    const ok = buyHouse(pendingHouse.id, pendingHouse.price);
    setPendingHouse(null);
    setDialogVisible(false);
    if (ok) {
      setTimeout(() => {
        showInfo('雾璃很喜欢这个新家！', 'heart', '搬家成功');
      }, 200);
    }
  };

  const handleBuyCancel = () => {
    setPendingHouse(null);
    setDialogVisible(false);
  };

  // 🔥 终极暴力获取图片 URL：不管有没有配置，都强行拼出正确的地址
  const getHouseImageUri = (item: any) => {
    const seasonStr = season ?? 'autumn';
    const h = new Date().getHours();
    const isNight = h >= 18 || h < 6;
    const nightSuffix = isNight ? '_night' : '';

    // 如果是默认出租屋，直接拼 living 背景图
    if (item.id === 'default_room') {
      return `${R2_BASE}/images/scenes/living_${seasonStr}${nightSuffix}.png`;
    }

    // 如果是其他房子
    let baseName = item.image || `images/scenes/${item.id}`;
    // 去掉后缀
    baseName = baseName.replace(/\.(png|jpg|jpeg|webp)$/i, '');
    return `${R2_BASE}/${baseName}_${seasonStr}${nightSuffix}.png`;
  };

  const renderDialog = () => (
    <ActionDialogueModal
      visible={dialogVisible}
      text={dialogText}
      title={dialogTitle}
      iconName={dialogIcon as any}
      onClose={() => {
        if (dialogMode === 'buyConfirm') handleBuyCancel();
        else setDialogVisible(false);
      }}
      confirmText={dialogMode === 'buyConfirm' ? '买下' : undefined}
      cancelText={dialogMode === 'buyConfirm' ? '再想想' : undefined}
      onConfirm={dialogMode === 'buyConfirm' ? handleBuyConfirm : undefined}
      onCancel={dialogMode === 'buyConfirm' ? handleBuyCancel : undefined}
    />
  );

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }}>
        <Text style={{ fontSize: 14, color: '#94A3B8' }}>当前金币</Text>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#3B82F6' }}>{formatCoins(coins)}</Text>
      </View>

      <FlatList
        data={HOUSES}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
        renderItem={({ item }) => {
          const isOwned = currentHouseId === item.id;
          const affordable = coins >= item.price;
          const imageUri = getHouseImageUri(item);

          return (
            <View style={{
              backgroundColor: '#1E293B',
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#334155',
              overflow: 'hidden',
            }}>
              {/* 房屋预览图 */}
              <View style={{ height: 180, width: '100%', backgroundColor: '#0F172A', justifyContent: 'center', alignItems: 'center' }}>
                <Image
                  source={{ uri: imageUri }}
                  style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
                  resizeMode="cover"
                />
                {/* 如果你依然看不到图，这行调试字会告诉你到底去哪找图了 */}
                <View style={{ position: 'absolute', top: 10, left: 10, backgroundColor: 'rgba(0,0,0,0.8)', padding: 4, borderRadius: 4, maxWidth: '80%' }}>
                  <Text style={{ color: '#00FF00', fontSize: 10 }} numberOfLines={2}>
                    {imageUri}
                  </Text>
                </View>

                <View style={{ position: 'absolute', top: 10, right: 10 }}>
                  {isOwned ? (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#2563EB' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>当前居住</Text>
                    </View>
                  ) : (
                    <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, backgroundColor: '#F59E0B' }}>
                      <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>未拥有</Text>
                    </View>
                  )}
                </View>
              </View>

              {/* 卡片内容 */}
              <View style={{ padding: 16 }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#F8FAFC' }}>{item.name}</Text>
                  <View style={{ backgroundColor: 'rgba(139,92,246,0.15)', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                    <Text style={{ fontSize: 11, fontWeight: '700', color: '#A78BFA' }}>
                      每月物业费: {formatCoins(item.rentPrice)}
                    </Text>
                  </View>
                </View>

                <Text style={{ fontSize: 13, color: '#94A3B8', lineHeight: 20, marginBottom: 12 }}>
                  {item.description}
                </Text>

                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Ionicons name="cash" size={16} color="#F59E0B" />
                    <Text style={{ marginLeft: 4, fontSize: 16, fontWeight: '700', color: '#F59E0B' }}>
                      {item.price === 0 ? '免费' : formatCoins(item.price)}
                    </Text>
                  </View>

                  {/* 🔥 修复按钮颜色：金币不足时用红色边框和浅红字，购买时用高亮蓝色 */}
                  {!isOwned && (
                    <Pressable
                      onPress={() => handleBuyPress(item.id, item.price)}
                      disabled={!affordable}
                      style={({ pressed }) => ({
                        width: 100, 
                        paddingVertical: 8, 
                        borderRadius: 8,
                        backgroundColor: !affordable ? 'rgba(239,68,68,0.2)' : (pressed ? '#1D4ED8' : '#2563EB'),
                        borderWidth: !affordable ? 1 : 0,
                        borderColor: '#EF4444',
                        alignItems: 'center', 
                        justifyContent: 'center',
                      })}
                    >
                      <Text style={{ 
                        color: !affordable ? '#F87171' : '#FFFFFF', 
                        fontSize: 14, 
                        fontWeight: '700' 
                      }}>
                        {affordable ? '购买搬家' : '金币不足'}
                      </Text>
                    </Pressable>
                  )}
                </View>
              </View>
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      {renderDialog()}
    </ScreenContainer>
  );
}

export default HouseScreen;
