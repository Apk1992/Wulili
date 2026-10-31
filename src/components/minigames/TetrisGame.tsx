// src/components/minigames/TetrisGame.tsx
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import type { TetrisLevelConfig, MinigameOutcome } from '@/types/minigame';

export interface TetrisGameProps {
  level: TetrisLevelConfig;
  minigameId: string;
  onComplete: (outcome: MinigameOutcome) => void;
  onQuit: () => void;
}

export function TetrisGame({
  level,
  minigameId,
  onComplete,
  onQuit,
}: TetrisGameProps): React.JSX.Element {
  // 保留一点点状态，防止有些调试工具报错
  const [startedAt] = useState(Date.now());
  const [finished, setFinished] = useState(false);

  const finish = useCallback(
    (result: 'victory' | 'defeat') => {
      if (finished) return;
      setFinished(true);
      onComplete({
        minigameId,
        levelId: level.id,
        engine: 'tetris',
        result,
        score: 0,
        maxCombo: 0,
        durationMs: Date.now() - startedAt,
        moodGain: result === 'victory' ? level.moodGain : 0,
        coinReward: result === 'victory' ? level.coinReward : 0,
        energyCost: level.energyCost,
      });
    },
    [finished, startedAt, minigameId, level, onComplete],
  );

  return (
    // 🚨 极简测试版：红底 + 蓝块 + 按钮
    <View style={{ flex: 1, backgroundColor: 'red', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ color: 'white', fontSize: 30, fontWeight: 'bold', textAlign: 'center' }}>
        ✅ 看到这段话\n说明高度完全没问题
      </Text>
      
      <Text style={{ color: 'white', fontSize: 20, marginTop: 20 }}>
        当前关卡: {level.title}
      </Text>

      <View style={{ width: 200, height: 200, backgroundColor: 'blue', marginTop: 40 }} />

      <Pressable 
        onPress={onQuit} 
        style={{ marginTop: 40, paddingHorizontal: 40, paddingVertical: 15, backgroundColor: 'white', borderRadius: 10 }}
      >
        <Text style={{ color: 'red', fontSize: 18, fontWeight: 'bold' }}>退出游戏</Text>
      </Pressable>
    </View>
  );
}

export default TetrisGame;
