// src/components/MiniGameLoader.tsx
import React, { useState, useCallback } from 'react';
import { Text, View } from 'react-native';
import Button from './Button';
import LoadingView from './LoadingView';
import ErrorView from './ErrorView';
import EmptyView from './EmptyView';
import MemoryGame from './minigames/MemoryGame';
import RhythmGame from './minigames/RhythmGame';
import { ActionDialogueModal } from './ActionDialogueModal';
import { useMinigameLevelsR2 as useMinigameLevels } from '@/hooks/useMinigameLevelsR2';
import { useMinigameStore } from '@/store/useMinigameStore';
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

  // ===== 统一弹窗状态 =====
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

  // ===== 加载态 =====
  if (levelsQuery.isLoading) {
    return <LoadingView message="正在加载小游戏…" fullScreen />;
  }

  // ===== 错误态 =====
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

  // ===== 空态 =====
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

  // ===== 开始关卡 =====
  const handleStart = (level: MinigameLevelConfig) => {
    const ok = startSession(entry.id, level.id);
    if (!ok) {
      showDialog('雾璃现在太累了，先让她休息一下吧。', 'battery-half');
      return;
    }
    setActiveLevel(level);
  };

  // ===== 完成关卡 =====
  const handleComplete = (outcome: MinigameOutcome) => {
    finishSession(outcome);
    setActiveLevel(null);
    onExit();
  };

  // ===== 退出（第一步：弹确认） =====
  const handleQuit = () => {
    showQuitConfirm();
  };

  // ===== 退出确认：确认 =====
  const handleQuitConfirm = () => {
    setDialogVisible(false);
    abortSession();
    setActiveLevel(null);
    onExit();
  };

  // ===== 退出确认：继续玩 =====
  const handleQuitCancel = () => {
    setDialogVisible(false);
  };

  // ===== 普通提示弹窗关闭 =====
  const handleInfoClose = () => {
    setDialogVisible(false);
  };

  // ===== 统一的弹窗渲染（三处共用） =====
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
    if (isMemoryLevel(activeLevel)) {
      return (
        <View style={{ flex: 1 }}>
          <MemoryGame
            level={activeLevel}
            minigameId={entry.id}
            assetFolder={entry.assetFolder}
            onComplete={handleComplete}
            onQuit={handleQuit}
          />
          {renderDialog()}
        </View>
      );
    }
    if (isRhythmLevel(activeLevel)) {
      return (
        <View style={{ flex: 1 }}>
          <RhythmGame
            level={activeLevel}
            minigameId={entry.id}
            onComplete={handleComplete}
            onQuit={handleQuit}
          />
          {renderDialog()}
        </View>
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

  // ===== 关卡选择列表 =====
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

      {renderDialog()}
    </View>
  );
}

export default MiniGameLoader;
