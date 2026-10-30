// src/utils/minigameGuards.ts
import type {
  MemoryLevelConfig,
  RhythmLevelConfig,
  TetrisLevelConfig,
  MinigameLevelConfig,
} from '@/types/minigame';

// ===== 类型守卫 =====

export function isMemoryLevel(level: MinigameLevelConfig): level is MemoryLevelConfig {
  return (
    'cards' in level &&
    Array.isArray((level as MemoryLevelConfig).cards)
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

/**
 * 校验任意输入是否是合法关卡（service 的 normalize 用）
 * - 只做最小必要字段检查，防止脏数据进 Store
 * - 三种引擎任一匹配即可
 */
export function isValidLevelConfig(input: unknown): input is MinigameLevelConfig {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;

  // 公共字段
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return false;

  // Memory
  if (Array.isArray(obj.cards)) return true;

  // Rhythm
  if (Array.isArray(obj.beats)) return true;

  // Tetris
  if (
    typeof obj.dropIntervalMs === 'number' &&
    typeof obj.targetLines === 'number'
  ) {
    return true;
  }

  return false;
}
