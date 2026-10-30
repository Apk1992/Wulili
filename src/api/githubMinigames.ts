// src/api/githubMinigames.ts
// ⚠️ 遗留文件：GitHub 时代。新代码请用：
//   - 数据拉取 → @/services/minigameService
//   - 类型守卫 → @/utils/minigameGuards
// 此文件保留仅为向后兼容，确认无引用后可整文件删除。

import { GITHUB_PATHS } from './githubConfig';
import { getFileJson } from './githubContents';
import type { MinigameIndexEntry } from '@/types/config';
import type { MinigameLevelConfig } from '@/types/minigame';
import { isTetrisLevel, isValidLevelConfig } from '@/utils/minigameGuards';

// ===== 兼容旧调用：仍可拉 GitHub（建议尽快迁移到 minigameService）=====
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
    return levels.filter(isValidLevelConfig);
  } catch {
    return [];
  }
}

function isValidIndexEntry(input: unknown): input is MinigameIndexEntry {
  if (typeof input !== 'object' || input === null) return false;
  const obj = input as Record<string, unknown>;
  return (
    typeof obj.id === 'string' &&
    (obj.engine === 'memory' || obj.engine === 'rhythm' || obj.engine === 'tetris') &&
    typeof obj.name === 'string' &&
    typeof obj.dataPath === 'string'
  );
}

// ===== 类型守卫 re-export（保持旧 import 路径可用）=====
export { isMemoryLevel, isRhythmLevel, isTetrisLevel, isValidLevelConfig } from '@/utils/minigameGuards';

// 防止 tree-shake 报警（保留 isTetrisLevel 使用痕迹）
void isTetrisLevel;
