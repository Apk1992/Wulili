// src/components/MiniGameLoader.tsx
import React, { useState, useCallback } from 'react';
import { Text, View, Pressable } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
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

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogText, setDialogText] = useState<string | null>('');
  const [dialogIcon, setDialogIcon] = useState<string>('game-controller');
  const [dialogTitle, setDialogTitle] = useState<string | undefined>('雾璃');
  const [dialogMode, setDialogMode] = useState<'info' | 'quitConfirm'>('info');

  const showDialog = useCallback((text: string, icon: string = 'game-controller', title: string = '雾璃') => {
      if (!text) return;
      setDialogText(text);
      setDialogIcon(icon);
      setDialogTitle(title);
      setDialogMode('info');
      setDialogVisible(true);
    }, [],
  );

  const showQuitConfirm = useCallback(() => {
    setDialogText('确定要退出吗？本局进度不会保存。');
    setDialogIcon('exit-outline');
    setDialogTitle('退出游戏');
    setDialogMode('quitConfirm');
    setDialogVisible(true);
  }, []);

  if (levelsQuery.isLoading) return <LoadingView message="加载中…" fullScreen />;
  if (levelsQuery.isError) return <ErrorView title="加载失败" message="网络错误" onRetry={() => levelsQuery.refetch()} fullScreen />;
  
  const levels = levelsQuery.data ?? [];
  if (levels.length === 0) return <EmptyView title="暂无关卡" message="暂无数据" icon="game-controller-outline" actionLabel="返回" onAction={onExit} fullScreen />;

  const handleStart = (level: MinigameLevelConfig) => {
    const ok = startSession(entry.id, level.id, level.energyCost);
    if (!ok) return showDialog('雾璃现在太累了，先让她休息一下吧。', 'battery-half');
    setActiveLevel(level);
  };

  const handleComplete = (outcome: MinigameOutcome) => {
    finishSession(outcome);
    setActiveLevel(null);
    onExit();
  };

  const handleQuitConfirm = () => {
    setDialogVisible(false);
    abortSession();
    setActiveLevel(null);
    onExit();
  };

  const renderDialog = () => (
    <ActionDialogueModal
      visible={dialogVisible}
      text={dialogText}
      iconName={dialogIcon as any}
      title={dialogTitle}
      onClose={() => setDialogVisible(false)}
      confirmText={dialogMode === 'quitConfirm' ? '退出' : undefined}
      cancelText={dialogMode === 'quitConfirm' ? '继续玩' : undefined}
      onConfirm={dialogMode === 'quitConfirm' ? handleQuitConfirm : undefined}
      onCancel={dialogMode === 'quitConfirm' ? () => setDialogVisible(false) : undefined}
    />
  );

  if (activeLevel) {
    return (
      <View style={{ flex: 1 }}>
        {isMemoryLevel(activeLevel) && <MemoryGame level={activeLevel} minigameId={entry.id} assetFolder={entry.assetFolder} onComplete={handleComplete} onQuit={showQuitConfirm} />}
        {isRhythmLevel(activeLevel) && <RhythmGame level={activeLevel} minigameId={entry.id} onComplete={handleComplete} onQuit={showQuitConfirm} />}
        {isTetrisLevel(activeLevel) && <TetrisGame level={activeLevel} minigameId={entry.id} onComplete={handleComplete} onQuit={showQuitConfirm} />}
        {renderDialog()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A', paddingTop: 60 }}>
      {/* 头部栏 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, marginBottom: 20 }}>
        <Pressable onPress={onExit} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={24} color="#FFF" />
        </Pressable>
        <Text style={{ color: '#FFF', fontSize: 20, fontWeight: '700', marginLeft: 8, lineHeight: 28 }}>
          {entry.name} - 选择关卡
        </Text>
      </View>

      {/* 关卡列表 */}
      <View style={{ paddingHorizontal: 20 }}>
        {levels.map((level) => (
          <Pressable
            key={level.id}
            onPress={() => handleStart(level)}
            style={({ pressed }) => ({
              // 🔥 强制覆盖全局背景色，不再变成蓝色药丸
              backgroundColor: pressed ? 'rgba(51, 65, 85, 0.8)' : 'rgba(30, 41, 59, 0.8)', 
              padding: 16,
              borderRadius: 16,
              marginBottom: 12,
              borderWidth: 1,
              borderColor: pressed ? '#475569' : '#334155',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              minHeight: 80, // 🔥 强制给高度，防止文字塌陷
            })}
          >
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: '700', marginBottom: 4, lineHeight: 22 }}>
                {level.title}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 13, lineHeight: 18 }}>
                {level.description}
              </Text>
            </View>
            <View style={{ backgroundColor: '#2563EB', padding: 10, borderRadius: 20 }}>
              <Ionicons name="play" size={20} color="#FFF" />
            </View>
          </Pressable>
        ))}
      </View>

      {renderDialog()}
    </View>
  );
}

export default MiniGameLoader;
