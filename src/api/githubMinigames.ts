import { GITHUB_PATHS } from './githubConfig';
import { getFileJson } from './githubContents';
import type { MinigameIndexEntry } from '@/types/config';
import type {
  MemoryLevelConfig,
  MinigameLevelConfig,
  RhythmLevelConfig,
} from '@/types/minigame';

export async function fetchMinigameIndex(): Promise<MinigameIndexEntry[]> {
  try {
    const result = await getFileJson<{ minigames: MinigameIndexEntry[] }>(
      `${GITHUB_PATHS.minigames}/index.json`,
    );
    const list = result.data?.minigames;
    if (!Array.isArray(list)) return [];
    return list.filter(isValidIndexEntry);
  } catch {
    return [];
  }
}

export async function fetchMinigameLevels(
  entry: MinigameIndexEntry,
): Promise<MinigameLevelConfig[]> {
  try {
    const result = await getFileJson<{ levels: MinigameLevelConfig[] }>(
      entry.dataPath,
    );
    const levels = result.data?.levels;
    if (!Array.isArray(levels)) return [];
    return levels.filter(isValidLevel);
  } catch {
    return [];
  }
}

function isValidIndexEntry(input: unknown): input is MinigameIndexEntry {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.engine === 'memory' || obj.engine === 'rhythm') &&
    typeof obj.name === 'string' &&
    typeof obj.dataPath === 'string'
  );
}

function isValidLevel(input: unknown): input is MinigameLevelConfig {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  if (typeof obj.id !== 'string' || typeof obj.title !== 'string') return false;
  if (Array.isArray(obj.cards)) return true;
  if (Array.isArray(obj.beats)) return true;
  return false;
}

export function isMemoryLevel(level: MinigameLevelConfig): level is MemoryLevelConfig {
  return 'cards' in level && Array.isArray((level as MemoryLevelConfig).cards);
}

export function isRhythmLevel(level: MinigameLevelConfig): level is RhythmLevelConfig {
  return 'beats' in level && Array.isArray((level as RhythmLevelConfig).beats);
}