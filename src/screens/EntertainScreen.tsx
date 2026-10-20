// src/screens/EntertainScreen.tsx
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import DialogueBubble from '@/components/DialogueBubble';
import EmptyView from '@/components/EmptyView';
import MiniGameLoader from '@/components/MiniGameLoader';
import { useDialogue } from '@/hooks/useDialogue';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { formatCoins } from '@/utils/format';
import type { Dialogue } from '@/types/dialogue';
import type { RootStackParamList } from '@/types/navigation';
import type { MinigameIndexEntry } from '@/types/config';

type Props = NativeStackScreenProps<RootStackParamList, 'Entertain'>;

// 🔥 Cloudflare R2 专属存储桶公开域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function EntertainScreen({}: Props): React.JSX.Element {
  const { speak } = useDialogue();
  const [dialogue, setDialogue] = useState<Dialogue | null>(null);
  const [activeGame, setActiveGame] = useState<MinigameIndexEntry | null>(null);

  const rawMinigames = useAppConfigStore((s) => s.config.minigames);
  const energy = useWuliliStore((s) => s.state.stats.energy);

  // 🔥 预处理小游戏列表中的资产目录，规范为 R2 路径格式
  const minigames = useMemo(() => {
    return rawMinigames.map((game) => {
      if (!game.assetFolder) return game;
      const cleanFolder = game.assetFolder.startsWith('http')
        ? game.assetFolder
        : `${R2_BASE_URL}/${game.assetFolder.replace(/^\/+/, '')}`;
      return {
        ...game,
        assetFolder: cleanFolder,
      };
    });
  }, [rawMinigames]);

  const handleEnter = (entry: MinigameIndexEntry) => {
    if (energy < entry.energyCost) {
      Alert.alert('精力不足', '雾璃现在太累了，先让她休息一会儿吧。');
      return;
    }
    setActiveGame(entry);
  };

  const handleExit = () => {
    const line = speak({ action: 'entertain' });
    if (line) setDialogue(line);
    setActiveGame(null);
  };

  if (activeGame) {
    return (
      <ScreenContainer edges={['bottom']}>
        <MiniGameLoader entry={activeGame} onExit={handleExit} />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 flex-row items-center justify-between">
        <Text className="text-sm text-muted dark:text-dark-muted">当前精力</Text>
        <Text className="text-base font-bold text-text dark:text-dark-text">
          {Math.round(energy)}/100
        </Text>
      </View>

      {minigames.length === 0 ? (
        <EmptyView
          title="暂无小游戏"
          message="请确保小游戏索引与配置已成功载入。"
          icon="game-controller-outline"
          fullScreen
        />
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
                  <Text className="text-sm font-semibold text-text dark:text-dark-text">
                    {item.name}
                  </Text>
                  <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">
                    {item.description}
                  </Text>
                </View>
              </View>
              <View className="flex-row items-center mt-3 justify-between">
                <View className="flex-row items-center">
                  <Ionicons name="flash" size={12} color="#F59E0B" />
                  <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">
                    消耗 {item.energyCost} 精力
                  </Text>
                  <Ionicons
                    name="happy"
                    size={12}
                    color="#10B981"
                    style={{ marginLeft: 10 }}
                  />
                  <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">
                    心情 +{item.moodGain}
                  </Text>
                  <Ionicons
                    name="cash"
                    size={12}
                    color="#2563EB"
                    style={{ marginLeft: 10 }}
                  />
                  <Text className="ml-1 text-[10px] text-muted dark:text-dark-muted">
                    {formatCoins(item.coinReward)}
                  </Text>
                </View>
                <View style={{ width: 84 }}>
                  <Button
                    label="进入"
                    size="sm"
                    variant={energy >= item.energyCost ? 'primary' : 'ghost'}
                    disabled={energy < item.energyCost}
                    onPress={() => handleEnter(item)}
                  />
                </View>
              </View>
            </Card>
          )}
          showsVerticalScrollIndicator={false}
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

export default EntertainScreen;
