import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import Button from './Button';
import LoadingView from './LoadingView';
import ErrorView from './ErrorView';
import EmptyView from './EmptyView';
import MemoryGame from './minigames/MemoryGame';
import RhythmGame from './minigames/RhythmGame';
import { useMinigameLevels } from '@/hooks/useGitHubMinigames';
import { useMinigameStore } from '@/store/useMinigameStore';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { isMemoryLevel, isRhythmLevel } from '@/api/githubMinigames';
import type { MinigameIndexEntry } from '@/types/config';
import type { MinigameLevelConfig, MinigameOutcome } from '@/types/minigame';

export interface MiniGameLoaderProps {
  entry: MinigameIndexEntry;
  onExit: () => void;
}

export function MiniGameLoader({
  entry,
  onExit,
}: MiniGameLoaderProps): React.JSX.Element {
  const levelsQuery = useMinigameLevels(entry, true);
  const [activeLevel, setActiveLevel] = useState<MinigameLevelConfig | null>(null);
  const finishSession = useMinigameStore((s) => s.finishSession);
  const abortSession = useMinigameStore((s) => s.abortSession);
  const startSession = useMinigameStore((s) => s.startSession);

  if (levelsQuery.isLoading) {
    return <LoadingView message="正在加载小游戏…" fullScreen />;
  }

  if (levelsQuery.isError) {
    return (
      <ErrorView
        title="加载失败"
        message="无法获取小游戏的关卡数据"
        onRetry={() => levelsQuery.refetch()}
        fullScreen
      />
    );
  }

  const levels = levelsQuery.data ?? [];

  if (levels.length === 0) {
    return (
      <EmptyView
        title="暂无关卡"
        message="这个游戏还没有可玩的关卡，请先在小游戏编辑器里添加。"
        icon="game-controller-outline"
        actionLabel="返回"
        onAction={onExit}
        fullScreen
      />
    );
  }

  const handleStart = (level: MinigameLevelConfig) => {
    const ok = startSession(entry.id, level.id);
    if (!ok) {
      Alert.alert('精力不足', '雾璃现在太累了，先让她休息一下吧。');
      return;
    }
    setActiveLevel(level);
  };

  const handleComplete = (outcome: MinigameOutcome) => {
    finishSession(outcome);
    void useDialogueStore.getState();
    setActiveLevel(null);
    onExit();
  };

  const handleQuit = () => {
    Alert.alert('退出游戏', '确定要退出吗？本局进度不会保存。', [
      { text: '继续玩', style: 'cancel' },
      {
        text: '退出',
        style: 'destructive',
        onPress: () => {
          abortSession();
          setActiveLevel(null);
          onExit();
        },
      },
    ]);
  };

  if (activeLevel) {
    if (isMemoryLevel(activeLevel)) {
      return (
        <MemoryGame
          level={activeLevel}
          minigameId={entry.id}
          assetFolder={entry.assetFolder}
          onComplete={handleComplete}
          onQuit={handleQuit}
        />
      );
    }
    if (isRhythmLevel(activeLevel)) {
      return (
        <RhythmGame
          level={activeLevel}
          minigameId={entry.id}
          onComplete={handleComplete}
          onQuit={handleQuit}
        />
      );
    }
    return (
      <EmptyView
        title="暂不支持"
        message="这个关卡类型尚未支持"
        actionLabel="返回"
        onAction={onExit}
        fullScreen
      />
    );
  }

  return (
    <View className="flex-1">
      <Text className="text-base font-semibold text-text dark:text-dark-text mb-3">
        选择关卡
      </Text>
      {levels.map((level) => (
        <View
          key={level.id}
          className="mb-3 p-3 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border"
        >
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            {level.title}
          </Text>
          <Text className="text-xs text-muted dark:text-dark-muted mt-1">
            {level.description}
          </Text>
          <View className="mt-3">
            <Button
              label="开始"
              variant="primary"
              size="sm"
              icon="play"
              onPress={() => handleStart(level)}
            />
          </View>
        </View>
      ))}
      <View className="mt-2">
        <Button label="返回" variant="ghost" onPress={onExit} />
      </View>
    </View>
  );
}

export default MiniGameLoader;