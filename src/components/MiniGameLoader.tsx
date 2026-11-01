// src/components/MiniGameLoader.tsx
import React, { useState, useCallback } from 'react';
import { Text, View, Pressable, ScrollView } from 'react-native';
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

  // ===== 状态处理 =====
  if (levelsQuery.isLoading) {
    return <LoadingView message="正在加载关卡数据…" fullScreen />;
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
        message="这个游戏还没有可玩的关卡，请先在小游戏的 levels.json 中添加。"
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

  // ===== 渲染当前关卡（全屏） =====
  if (activeLevel) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {isMemoryLevel(activeLevel) && (
          <MemoryGame
            level={activeLevel}
            minigameId={entry.id}
            assetFolder={entry.assetFolder}
            onComplete={handleComplete}
            onQuit={showQuitConfirm}
          />
        )}
        {isRhythmLevel(activeLevel) && (
          <RhythmGame
            level={activeLevel}
            minigameId={entry.id}
            onComplete={handleComplete}
            onQuit={showQuitConfirm}
          />
        )}
        {isTetrisLevel(activeLevel) && (
          <TetrisGame
            level={activeLevel}
            minigameId={entry.id}
            onComplete={handleComplete}
            onQuit={showQuitConfirm}
          />
        )}
        
        {/* 兜底，防止引擎没匹配上白屏 */}
        {!isMemoryLevel(activeLevel) && !isRhythmLevel(activeLevel) && !isTetrisLevel(activeLevel) && (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: '#FFF' }}>关卡类型不支持</Text>
            <Pressable onPress={onExit} style={{ marginTop: 20 }}>
              <Text style={{ color: '#2563EB' }}>返回</Text>
            </Pressable>
          </View>
        )}

        {renderDialog()}
      </View>
    );
  }

  // ===== 关卡选择列表 =====
  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      {/* 顶部导航 */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 }}>
        <Pressable onPress={onExit} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={26} color="#F8FAFC" />
        </Pressable>
        <Text style={{ color: '#F8FAFC', fontSize: 22, fontWeight: '700', marginLeft: 8 }}>
          {entry.name}
        </Text>
      </View>

      {/* 关卡卡片列表 */}
      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ color: '#94A3B8', fontSize: 14, marginBottom: 16 }}>
          选择一个关卡开始游戏
        </Text>
        
        {levels.map((level) => (
          <Pressable
            key={level.id}
            onPress={() => handleStart(level)}
            style={({ pressed }) => ({
              backgroundColor: pressed ? '#334155' : '#1E293B',
              padding: 20,
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: pressed ? '#475569' : '#334155',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            })}
          >
            <View style={{ flex: 1, paddingRight: 16 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
                {level.title}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 14, lineHeight: 20 }}>
                {level.description}
              </Text>
              
              {/* 额外信息展示 */}
              <View style={{ flexDirection: 'row', marginTop: 12 }}>
                <Text style={{ color: '#F59E0B', fontSize: 12, marginRight: 12 }}>
                  ⚡ 消耗 {level.energyCost} 精力
                </Text>
                <Text style={{ color: '#10B981', fontSize: 12 }}>
                  😊 心情 +{level.moodGain}
                </Text>
              </View>
            </View>
            
            <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: 'rgba(37,99,235,0.2)', alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="play" size={24} color="#3B82F6" style={{ marginLeft: 4 }} />
            </View>
          </Pressable>
        ))}
      </ScrollView>

      {renderDialog()}
    </View>
  );
}

export default MiniGameLoader;
