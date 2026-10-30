// src/types/minigame.ts
import type { MinigameIndexEntry } from './config';

export type MinigameEngine = 'memory' | 'rhythm' | 'tetris';

// ===== Memory =====
export interface MemoryCardDef {
  id: string;
  pairKey: string;
  image: string;
}

export interface MemoryLevelConfig {
  id: string;
  title: string;
  description: string;
  timeLimitSeconds: number;
  columns: number;
  cards: MemoryCardDef[];
  moodGain: number;
  energyCost: number;
  coinReward: number;
}

// ===== Rhythm =====
export interface RhythmBeat {
  timeMs: number;
  lane: number;
}

export interface RhythmLevelConfig {
  id: string;
  title: string;
  description: string;
  durationMs: number;
  lanes: number;
  beats: RhythmBeat[];
  audioUrl: string | null;
  moodGain: number;
  energyCost: number;
  coinReward: number;
}

// ===== Tetris =====
export interface TetrisLevelConfig {
  id: string;
  title: string;
  description: string;
  dropIntervalMs: number;
  targetLines: number;
  timeLimitSeconds: number;
  moodGain: number;
  energyCost: number;
  coinReward: number;
}

// ===== 联合 =====
export type MinigameLevelConfig =
  | MemoryLevelConfig
  | RhythmLevelConfig
  | TetrisLevelConfig;

// ===== 加载结果 =====
export interface MinigameLoadResult {
  entry: MinigameIndexEntry;
  levels: MinigameLevelConfig[];
  fromCache: boolean;
  fetchedAt: number;
}

// ===== 结算 =====
export type MinigameResult = 'victory' | 'defeat' | 'quit';

export interface MinigameOutcome {
  minigameId: string;
  levelId: string;
  engine: MinigameEngine;
  result: MinigameResult;
  score: number;
  maxCombo: number;
  durationMs: number;
  moodGain: number;
  coinReward: number;
  energyCost: number;
}
