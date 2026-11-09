// src/utils/minigameGuards.ts
import type {
  MemoryLevelConfig,
  RhythmLevelConfig,
  TetrisLevelConfig,
  MinigameLevelConfig,
} from '@/types/minigame';

// ===== 类型守卫 =====

export function isMemoryLevel(level: MinigameLevelConfig): level is MemoryLevelConfig {
  // 🔥 兼容老的 cards 数组 和 新的 pairs 动态卡池
  return (
    ('cards' in level && Array.isArray((level as MemoryLevelConfig).cards)) ||
    ('pairs' in level && typeof (level as any).pairs === 'number')
  );
}

export function isRhythmLevel(level: MinigameLevelConfig): level is RhythmLevelConfig {
  return (
    'beats' in level &&
    Array.isArray((level as RhythmLevelConfig).beats)
  );
}

export function isTetrisLevel(level: MinigameLevelConfig): level is TetrisLevelConfig {
  return (
    'dropIntervalMs' in level &&
    typeof (level as TetrisLevelConfig).dropIntervalMs === 'number' &&
    'targetLines' in level &&
    typeof (level as TetrisLevelConfig).targetLines === 'number'
  );
}

// ===== 校验 =====

export function isValidLevelConfig(input: unknown): input is MinigameLevelConfig {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;

  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return false;

  if (typeof obj.pairs === 'number') return true; // 新记忆翻牌
  if (Array.isArray(obj.cards)) return true;      // 老记忆翻牌
  if (Array.isArray(obj.beats)) return true;      // 节奏
  if (typeof obj.dropIntervalMs === 'number' && typeof obj.targetLines === 'number') return true; // 俄罗斯方块

  return false;
}
