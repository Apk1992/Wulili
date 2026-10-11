import type { MinigameIndexEntry } from './config';

export type MinigameEngine = 'memory' | 'rhythm';

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

export type MinigameLevelConfig = MemoryLevelConfig | RhythmLevelConfig;

export interface MinigameLoadResult {
  entry: MinigameIndexEntry;
  levels: MinigameLevelConfig[];
  fromCache: boolean;
  fetchedAt: number;
}

export type MinigameResult =
  | 'victory'
  | 'defeat'
  | 'quit';

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