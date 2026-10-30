// src/utils/minigameGuards.ts
import type {
  MemoryLevelConfig,
  RhythmLevelConfig,
  TetrisLevelConfig,
  MinigameLevelConfig,
} from '@/types/minigame';

export function isMemoryLevel(level: MinigameLevelConfig): level is MemoryLevelConfig {
  return 'cards' in level && Array.isArray((level as MemoryLevelConfig).cards);
}

export function isRhythmLevel(level: MinigameLevelConfig): level is RhythmLevelConfig {
  return 'beats' in level && Array.isArray((level as RhythmLevelConfig).beats);
}

export function isTetrisLevel(level: MinigameLevelConfig): level is TetrisLevelConfig {
  return (
    'dropIntervalMs' in level &&
    typeof (level as TetrisLevelConfig).dropIntervalMs === 'number' &&
    'targetLines' in level &&
    typeof (level as TetrisLevelConfig).targetLines === 'number'
  );
}

/** 校验任意对象是否是合法关卡（service 的 normalize 用） */
export function isValidLevelConfig(input: unknown): input is MinigameLevelConfig {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return false;
  if (Array.isArray(obj.cards)) return true;
  if (Array.isArray(obj.beats)) return true;
  if (typeof obj.dropIntervalMs === 'number' && typeof obj.targetLines === 'number') return true;
  return false;
}
