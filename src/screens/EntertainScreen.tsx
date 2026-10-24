// src/screens/EntertainScreen.tsx
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { ActionDialogueModal } from '@/components/ActionDialogueModal';
import EmptyView from '@/components/EmptyView';
import MiniGameLoader from '@/components/MiniGameLoader';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useTravelStore } from '@/store/useTravelStore';
import { TRAVEL_DESTINATIONS, TravelDestination } from '@/data/travelConfig';
import { formatCoins } from '@/utils/format';
import type { RootStackParamList } from '@/types/navigation';
import type { MinigameIndexEntry } from '@/types/config';

// 🔥 注意这里要接收 navigation
type Props = NativeStackScreenProps<RootStackParamList, 'Entertain'>;

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function EntertainScreen({ navigation }: Props): React.JSX.Element {
  const { speak } = useDialogue();
  
  // Tab 状态
  const [tab, setTab] = useState<'minigame' | 'travel'>('minigame');

  // 弹窗状态
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogText, setDialogText] = useState('');
  const [activeGame, setActiveGame] = useState<MinigameIndexEntry | null>(null);

  const rawMinigames = useAppConfigStore((s) => s.config.minigames);
  const energy = useWuliliStore((s) => s.state.stats.energy);
  const coins = useWuliliStore((s) => s.state.coins);
  
  const travelState = useTravelStore((s) => s.state);
  const startTravel = useTravelStore((s) => s.startTravel);

  // 小游戏 R2 处理
  const minigames = useMemo(() => {
    return rawMinigames.map((game) => {
      if (!game.assetFolder) return game;
      const cleanFolder = game.assetFolder.startsWith('http')
        ? game.assetFolder
        : `${R2_BASE_URL}/${game.assetFolder.replace(/^\/+/, '')}`;
      return { ...game, assetFolder: cleanFolder };
    });
  }, [rawMinigames]);

  // ===== 小游戏逻辑 =====
  const handleEnterGame = (entry: MinigameIndexEntry) => {
    if (energy < entry.energyCost) {
      Alert.alert('精力不足', '雾璃现在太累了，先让她休息一会儿吧。');
      return;
    }
    setActiveGame(entry);
  };

  const handleExitGame = () => {
    const line = speak({ action: 'entertain' });
    if (line) {
      const text = typeof line === 'string' ? line : (line as any)?.text || '玩得很开心，谢谢你。';
      setDialogText(text);
      setDialogVisible(true);
    }
    setActiveGame(null);
  };

  // ===== 旅游逻辑 =====
  const handleStartTravel = (dest: TravelDestination) => {
    if (coins < dest.price) {
      Alert.alert('金币不足', '攒够了钱再带她去这里吧。');
      return;
    }
    
    Alert.alert(
      '确认出行',
      `确定要带雾璃去【${dest.city}】吗？\n花费：${formatCoins(dest.price)}\n时长：约 ${dest.durationHours} 小时`,
      [
        { text: '再想想', style: 'cancel' },
        {
          text: '出发',
          onPress: () => {
            useWuliliStore.getState().addCoins(-dest.price);
            startTravel(dest);
            Alert.alert('出发', `雾璃已经出发去${dest.city}了，记得等她回来哦！`, [
              { text: '好' }
            ]);
          },
        },
      ]
    );
  };

  // 进入小游戏全屏模式
  if (activeGame) {
    return (
      <ScreenContainer edges={['bottom']}>
        <MiniGameLoader entry={activeGame} onExit={handleExitGame} />
      </ScreenContainer>
    );
  }

  const isTraveling = travelState.isTraveling;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      {/* 🔥 顶部 Tab 切换 */}
      <View className="px-4 pt-3 pb-2">
        <View className="flex-row bg-card dark:bg-dark-card rounded-xl p-1 border border-border dark:border-dark-border">
          <Pressable
            onPress={() => setTab('minigame')}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
              tab === 'minigame' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Ionicons name="game-controller" size={16} color={tab === 'minigame' ? '#FFF' : '#94A3B8'} />
            <Text className={`ml-2 text-sm font-semibold ${tab === 'minigame' ? 'text-white' : 'text-muted dark:text-dark-muted'}`}>
              玩游戏
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setTab('travel')}
            className={`flex-1 flex-row items-center justify-center py-2 rounded-lg ${
              tab === 'travel' ? 'bg-primary' : 'bg-transparent'
            }`}
          >
            <Ionicons name="airplane" size={16} color={tab === 'travel' ? '#FFF' : '#94A3B8'} />
            <Text className={`ml-2 text-sm font-semibold ${tab === 'travel' ? 'text-white' : 'text-muted dark:text-dark-muted'}`}>
              出门散心
            </Text>
          </Pressable>
        </View>
      </View>

      {/* 🔥 小游戏列表 */}
      {tab === 'minigame' && (
        <View className="flex-1">
          <View className="px-4 pb-2 flex-row items-center justify-between">
            <Text className="text-sm text-muted dark:text-dark-muted">当前精力</Text>
            <Text className="text-base font-bold text-text dark:text-dark-text">{Math.round(energy)}/100</Text>
          </View>
          
          {minigames.length === 0 ? (
            <EmptyView title="暂无小游戏" message="请确保小游戏索引已成功载入。" icon="game-controller-outline" fullScreen />
          ) : (
            <FlatList
              data={minigames}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => (
                <Card className="mb-3">
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-xl bg-success/15 items-center justify-center mr-3">
                      <Ionicons name={item.icon || 'game-controller'} size={20} color="#10B981" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-sm font-semibold text-text dark:text-dark-text">{item.name}</Text>
                      <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">{item.description}</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center mt-3 justify-between">
                    <View className="flex-row items-center">
                      <Ionicons name="flash" size={12} color="#F59E0B" />
                      <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">消耗 {item.energyCost} 精力</Text>
                      <Ionicons name="happy" size={12} color="#10B981" style={{ marginLeft: 10 }} />
                      <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">心情 +{item.moodGain}</Text>
                    </View>
                    <View style={{ width: 84 }}>
                      <Button
                        label="进入"
                        size="sm"
                        variant={energy >= item.energyCost ? 'primary' : 'ghost'}
                        disabled={energy < item.energyCost}
                        onPress={() => handleEnterGame(item)}
                      />
                    </View>
                  </View>
                </Card>
              )}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* 🔥 旅游列表 */}
      {tab === 'travel' && (
        <View className="flex-1">
          <View className="px-4 pb-2 flex-row items-center justify-between">
            <View className="flex-row items-center">
              <Text className="text-sm text-muted dark:text-dark-muted mr-2">当前金币</Text>
              <Text className="text-base font-bold text-primary">{formatCoins(coins)}</Text>
            </View>
            
            {/* 🔥 相册入口按钮 */}
            <Pressable 
              onPress={() => navigation.navigate('Album')}
              className="flex-row items-center bg-secondary/15 px-3 py-1.5 rounded-full"
            >
              <Ionicons name="images" size={14} color="#8B5CF6" />
              <Text className="ml-1.5 text-xs font-bold text-secondary">旅行相册</Text>
            </Pressable>
          </View>

          {isTraveling ? (
            <EmptyView 
              title="雾璃不在家" 
              message="她正在外面散心呢，等她回来吧。" 
              icon="airplane-outline" 
              fullScreen 
            />
          ) : (
            <FlatList
              data={TRAVEL_DESTINATIONS}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
              renderItem={({ item }) => {
                const affordable = coins >= item.price;
                return (
                  <Card className="mb-3">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1">
                        <View className="w-10 h-10 rounded-xl bg-warning/15 items-center justify-center mr-3">
                          <Ionicons name="map" size={20} color="#F59E0B" />
                        </View>
                        <View className="flex-1">
                          <View className="flex-row items-center">
                            <Text className="text-sm font-semibold text-text dark:text-dark-text mr-2">
                              {item.country} · {item.city}
                            </Text>
                            <View className="px-1.5 py-0.5 rounded-md bg-secondary/15">
                              <Text className="text-[9px] font-bold text-secondary">
                                {item.type === 'nearby' ? '周边散心' : item.type === 'domestic' ? '短途' : '长途'}
                              </Text>
                            </View>
                          </View>
                          <Text className="text-xs text-muted dark:text-dark-muted mt-1 leading-4">
                            {item.description}
                          </Text>
                        </View>
                      </View>
                    </View>
                    
                    <View className="flex-row items-center mt-3 justify-between border-t border-border dark:border-dark-border pt-3">
                      <View>
                        <View className="flex-row items-center">
                          <Ionicons name="cash" size={12} color="#2563EB" />
                          <Text className="ml-1 text-sm font-bold text-primary">{formatCoins(item.price)}</Text>
                        </View>
                        <View className="flex-row items-center mt-1">
                          <Ionicons name="time" size={12} color="#94A3B8" />
                          <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">{item.durationHours} 小时</Text>
                          <Text className="ml-2 text-[10px] text-muted dark:text-dark-muted">照片 x{item.spots.length}</Text>
                        </View>
                      </View>
                      <View style={{ width: 84 }}>
                        <Button
                          label="出发"
                          size="sm"
                          variant={affordable ? 'primary' : 'ghost'}
                          disabled={!affordable}
                          onPress={() => handleStartTravel(item)}
                        />
                      </View>
                    </View>
                  </Card>
                );
              }}
              showsVerticalScrollIndicator={false}
            />
          )}
        </View>
      )}

      {/* 统一弹窗 */}
      <ActionDialogueModal
        visible={dialogVisible}
        text={dialogText}
        onClose={() => setDialogVisible(false)}
        iconName="game-controller"
      />
    </ScreenContainer>
  );
}

export default EntertainScreen;
