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
import { useDialogue } from '@/hooks/useDialogue';
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
  const { speak } = useDialogue();

  const finishSession = useMinigameStore((s) => s.finishSession);
  const abortSession = useMinigameStore((s) => s.abortSession);
  const startSession = useMinigameStore((s) => s.startSession);

  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogText, setDialogText] = useState<string | null>('');
  const [dialogIcon, setDialogIcon] = useState<string>('game-controller');
  const [dialogTitle, setDialogTitle] = useState<string | undefined>('雾璃');
  const [dialogMode, setDialogMode] = useState<'info' | 'quitConfirm' | 'result'>('info');

  const showDialog = useCallback(
    (text: string, icon: string = 'game-controller', title: string = '雾璃') => {
      if (!text) return;
      setDialogText(text);
      setDialogIcon(icon);
      setDialogTitle(title);
      setDialogMode('info');
      setDialogVisible(true);
    }, [],
  );

  const showQuitConfirm = useCallback(() => {
    setDialogText('确定要退出吗？本局进度不会保存，且会消耗对应精力。');
    setDialogIcon('exit-outline');
    setDialogTitle('退出游戏');
    setDialogMode('quitConfirm');
    setDialogVisible(true);
  }, []);

  if (levelsQuery.isLoading) return <LoadingView message="正在加载关卡数据…" fullScreen />;
  if (levelsQuery.isError) return <ErrorView title="加载失败" message="网络错误" onRetry={() => levelsQuery.refetch()} fullScreen />;
  
  const levels = levelsQuery.data ?? [];
  if (levels.length === 0) return <EmptyView title="暂无关卡" message="暂无数据" icon="game-controller-outline" actionLabel="返回" onAction={onExit} fullScreen />;

  const handleStart = (level: MinigameLevelConfig) => {
    const ok = startSession(entry.id, level.id, level.energyCost);
    if (!ok) {
      showDialog('雾璃现在太累了，先让她休息一下吧。', 'battery-half');
      return;
    }
    setActiveLevel(level);
  };

  // 🔥 核心：收益结算与防刷机制
  const handleComplete = (outcome: MinigameOutcome) => {
    const isWin = outcome.result === 'victory';
    
    // 1. 基础收益判定：失败（非通关）只拿 10%
    let finalMood = isWin ? outcome.moodGain : Math.round(outcome.moodGain * 0.1);
    let finalCoins = isWin ? outcome.coinReward : Math.round(outcome.coinReward * 0.1);

    // 2. 针对俄罗斯方块的防刷分机制
    if (outcome.engine === 'tetris') {
      if (outcome.score < 50) {
        // 秒退惩罚：分数极低，金币归零
        finalCoins = 0;
        finalMood = Math.round(outcome.moodGain * 0.1);
      } else {
        // 按分数比例发钱：假设 1000 分拿满额
        const scoreRatio = Math.min(1, outcome.score / 1000);
        finalCoins = Math.max(1, Math.round(outcome.coinReward * scoreRatio));
        finalMood = outcome.moodGain;
      }
    }

    // 真实写入底层 Store
    finishSession({
      ...outcome,
      moodGain: finalMood,
      coinReward: finalCoins,
    });

    setActiveLevel(null);

    let wuliliLine = isWin ? '玩得很开心，谢谢你陪我。' : '唔……这次没发挥好，下次再来吧。';
    try {
      const line = speak({ action: 'entertain' });
      if (line) {
        const text = typeof line === 'string' ? line : (line as any)?.text;
        if (text) wuliliLine = text;
      }
    } catch (e) {}

    // 弹窗显示
    const isTetrisBail = outcome.engine === 'tetris' && outcome.score < 50;
    setDialogTitle(isTetrisBail ? '游戏结束 (秒退)' : (isWin ? '游戏胜利！' : '游戏结束'));
    setDialogIcon(isWin ? 'trophy' : 'game-controller');
    setDialogText(
      `“${wuliliLine}”\n\n【本局结算】\n消耗精力：${outcome.energyCost}\n心情变化：+${finalMood}\n金币收益：+${finalCoins}\n最终得分：${outcome.score}`
    );
    setDialogMode('result');
    setDialogVisible(true);
  };

  const handleQuitConfirm = () => {
    setDialogVisible(false);
    abortSession();
    setActiveLevel(null);
    onExit();
  };

  const handleResultClose = () => {
    setDialogVisible(false);
    onExit();
  };

  const renderDialog = () => (
    <ActionDialogueModal
      visible={dialogVisible}
      text={dialogText}
      iconName={dialogIcon as any}
      title={dialogTitle}
      onClose={() => {
        if (dialogMode === 'result') handleResultClose();
        else if (dialogMode === 'quitConfirm') handleQuitConfirm(); 
        else setDialogVisible(false);
      }}
      confirmText={dialogMode === 'quitConfirm' || dialogMode === 'result' ? '确定' : undefined}
      cancelText={dialogMode === 'quitConfirm' ? '继续玩' : undefined}
      onConfirm={
        dialogMode === 'quitConfirm' ? handleQuitConfirm : 
        dialogMode === 'result' ? handleResultClose : undefined
      }
      onCancel={dialogMode === 'quitConfirm' ? () => setDialogVisible(false) : undefined}
    />
  );

  if (activeLevel) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
        {isMemoryLevel(activeLevel) && <MemoryGame level={activeLevel} minigameId={entry.id} assetFolder={entry.assetFolder} onComplete={handleComplete} onQuit={showQuitConfirm} />}
        {isRhythmLevel(activeLevel) && <RhythmGame level={activeLevel} minigameId={entry.id} onComplete={handleComplete} onQuit={showQuitConfirm} />}
        {isTetrisLevel(activeLevel) && <TetrisGame level={activeLevel} minigameId={entry.id} onComplete={handleComplete} onQuit={showQuitConfirm} />}
        {renderDialog()}
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F172A' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 }}>
        <Pressable onPress={onExit} style={{ padding: 8, marginLeft: -8 }}>
          <Ionicons name="arrow-back" size={26} color="#F8FAFC" />
        </Pressable>
        <Text style={{ color: '#F8FAFC', fontSize: 22, fontWeight: '700', marginLeft: 8 }}>
          {entry.name}
        </Text>
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 40 }}>
        <Text style={{ color: '#94A3B8', fontSize: 14, marginBottom: 16 }}>
          选择一个关卡开始游戏
        </Text>
        
        {levels.map((level) => (
          <View
            key={level.id}
            style={{
              backgroundColor: '#1E293B',
              borderRadius: 16,
              marginBottom: 16,
              borderWidth: 1,
              borderColor: '#334155',
              padding: 16,
            }}
          >
            <View style={{ marginBottom: 12 }}>
              <Text style={{ color: '#F8FAFC', fontSize: 18, fontWeight: '700', marginBottom: 6 }}>
                {level.title}
              </Text>
              <Text style={{ color: '#94A3B8', fontSize: 14, lineHeight: 20 }}>
                {level.description}
              </Text>
            </View>

            <View style={{ height: 1, backgroundColor: '#334155', marginBottom: 12 }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ color: '#F59E0B', fontSize: 13, marginRight: 12 }}>
                  ⚡ 消耗 {level.energyCost}
                </Text>
                <Text style={{ color: '#10B981', fontSize: 13 }}>
                  😊 心情 +{level.moodGain}
                </Text>
              </View>

              <Pressable
                onPress={() => handleStart(level)}
                style={({ pressed }) => ({
                  backgroundColor: pressed ? '#1D4ED8' : '#2563EB',
                  paddingHorizontal: 24,
                  paddingVertical: 10,
                  borderRadius: 10,
                  minWidth: 88,
                  alignItems: 'center',
                })}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '700' }}>开始</Text>
              </Pressable>
            </View>
          </View>
        ))}
      </ScrollView>

      {renderDialog()}
    </View>
  );
}

export default MiniGameLoader;
