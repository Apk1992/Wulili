// src/components/MiniGameLoader.tsx
import React, { useState, useCallback } from 'react';
import { Text, View } from 'react-native';
import Button from './Button';
import LoadingView from './LoadingView';
import ErrorView from './ErrorView';
import EmptyView from './EmptyView';
import MemoryGame from './minigames/MemoryGame';
import RhythmGame from './minigames/RhythmGame';
import TetrisGame from './minigames/TetrisGame';
import { ActionDialogueModal } from './ActionDialogueModal';
import { useMinigameLevelsR2 as useMinigameLevels } from '@/hooks/useMinigameLevelsR2';
import { useMinigameStore } from '@/store/useMinigameStore';
import { isMemoryLevel, isRhythmLevel, isTetrisLevel } from '@/utils/minigameGuards';
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

  // ===== 统一弹窗 =====
  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogText, setDialogText] = useState<string | null>('');
  const [dialogIcon, setDialogIcon] = useState<string>('game-controller');
  const [dialogTitle, setDialogTitle] = useState<string | undefined>('雾璃');
  const [dialogMode, setDialogMode] = useState<'info' | 'quitConfirm'>('info');

  const showDialog = useCallback(
    (text: string, icon: string = 'game-controller', title: string = '雾璃') => {
      if (!text) return;
      setDialogText(text);
      setDialogIcon(icon);
      setDialogTitle(title);
      setDialogMode('info');
      setDialogVisible(true);
    },
    [],
  );

  const showQuitConfirm = useCallback(() => {
    setDialogText('确定要退出吗？本局进度不会保存。');
    setDialogIcon('exit-outline');
    setDialogTitle('退出游戏');
    setDialogMode('quitConfirm');
    setDialogVisible(true);
  }, []);

  if (levelsQuery.isLoading) {
    return <LoadingView message="正在加载小游戏…" fullScreen />;
  }

  if (levelsQuery.isError) {
    return (
      <ErrorView
        title="加载失败"
        message="无法获取小游戏的关卡数据，请检查网络后重试。"
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
    const ok = startSession(entry.id, level.id, level.energyCost);
    if (!ok) {
      showDialog('雾璃现在太累了，先让她休息一下吧。', 'battery-half');
      return;
    }
    setActiveLevel(level);
  };

  const handleComplete = (outcome: MinigameOutcome) => {
    finishSession(outcome);
    setActiveLevel(null);
    onExit();
  };

  const handleQuit = () => {
    showQuitConfirm();
  };

  const handleQuitConfirm = () => {
    setDialogVisible(false);
    abortSession();
    setActiveLevel(null);
    onExit();
  };

  const handleQuitCancel = () => {
    setDialogVisible(false);
  };

  const handleInfoClose = () => {
    setDialogVisible(false);
  };

  const renderDialog = () => (
    <ActionDialogueModal
      visible={dialogVisible}
      text={dialogText}
      iconName={dialogIcon as any}
      title={dialogTitle}
      onClose={handleInfoClose}
      confirmText={dialogMode === 'quitConfirm' ? '退出' : undefined}
      cancelText={dialogMode === 'quitConfirm' ? '继续玩' : undefined}
      onConfirm={dialogMode === 'quitConfirm' ? handleQuitConfirm : undefined}
      onCancel={dialogMode === 'quitConfirm' ? handleQuitCancel : undefined}
    />
  );

  // ===== 渲染当前关卡 =====
  if (activeLevel) {
    return (
      <View style={{ flex: 1 }}>
        {isMemoryLevel(activeLevel) && (
          <MemoryGame
            level={activeLevel}
            minigameId={entry.id}
            assetFolder={entry.assetFolder}
            onComplete={handleComplete}
            onQuit={handleQuit}
          />
        )}
        {isRhythmLevel(activeLevel) && (
          <RhythmGame
            level={activeLevel}
            minigameId={entry.id}
            onComplete={handleComplete}
            onQuit={handleQuit}
          />
        )}
        {isTetrisLevel(activeLevel) && (
          <TetrisGame
            level={activeLevel}
            minigameId={entry.id}
            onComplete={handleComplete}
            onQuit={handleQuit}
          />
        )}
        {/* 兜底防白屏 */}
        {!isMemoryLevel(activeLevel) && !isRhythmLevel(activeLevel) && !isTetrisLevel(activeLevel) && (
          <View style={{ flex: 1, padding: 20, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#FFF', fontSize: 16 }}>关卡识别失败</Text>
            <View style={{ marginTop: 20 }}>
              <Button label="返回" variant="primary" onPress={() => setActiveLevel(null)} />
            </View>
          </View>
        )}
        {renderDialog()}
      </View>
    );
  }

  // ===== 关卡选择列表 =====
  return (
    <View className="flex-1 p-4" style={{ backgroundColor: '#0F172A' }}>
      <Text className="text-base font-semibold text-white mb-3">
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

      {renderDialog()}
    </View>
  );
}

export default MiniGameLoader;
