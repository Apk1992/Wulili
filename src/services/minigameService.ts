// src/services/minigameService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MinigameIndexEntry } from '@/types/config';
import type { MinigameLevelConfig, MinigameLoadResult } from '@/types/minigame';
import { isValidLevelConfig } from '@/utils/minigameGuards';

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

const CACHE_INDEX = '@wulili/minigame/index_v1';
const CACHE_LEVELS_PREFIX = '@wulili/minigame/levels_v1_';

// 按段 encodeURIComponent，避免中文/空格导致 R2 404
function encodeR2Url(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${R2_BASE}/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

function levelsCacheKey(entry: MinigameIndexEntry): string {
  const raw = `${entry.id}__${entry.dataPath ?? entry.id}`;
  return CACHE_LEVELS_PREFIX + raw.replace(/[^a-zA-Z0-9_]/g, '_');
}

// ===== index 校验（含 tetris）=====
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

/**
 * 拉取小游戏索引（minigames/index.json）
 * 兼容两种结构：
 *   1) { minigames: [...] }   ← 你现有约定（api/githubMinigames 也是这个）
 *   2) [ ... ]                ← 裸数组
 */
export async function fetchMinigameIndex(): Promise<MinigameIndexEntry[] | null> {
  try {
    const res = await fetch(encodeR2Url('minigames/index.json'));
    if (!res.ok) throw new Error(`index http ${res.status}`);
    const json = await res.json();

    const raw: unknown[] = Array.isArray(json)
      ? json
      : Array.isArray((json as any)?.minigames)
        ? (json as any).minigames
        : Array.isArray((json as any)?.games)
          ? (json as any).games
          : [];

    const list = raw.filter(isValidIndexEntry);

    await AsyncStorage.setItem(CACHE_INDEX, JSON.stringify(list));
    return list;
  } catch {
    const cached = await AsyncStorage.getItem(CACHE_INDEX);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      if (!Array.isArray(parsed)) return null;
      return parsed.filter(isValidIndexEntry);
    } catch {
      return null;
    }
  }
}

/**
 * 拉取某个小游戏的关卡列表
 * - 优先 entry.dataPath（R2 相对路径）
 * - 若缺失，回退 minigames/<id>/levels.json
 * - 兼容 { levels: [...] } 和裸数组
 * - 网络失败回退缓存
 */
export async function fetchMinigameLevels(
  entry: MinigameIndexEntry,
): Promise<MinigameLoadResult> {
  const dataPath = entry.dataPath || `minigames/${entry.id}/levels.json`;
  const cacheKey = levelsCacheKey(entry);

  const normalize = (raw: any): MinigameLevelConfig[] => {
    const arr = Array.isArray(raw)
      ? raw
      : Array.isArray(raw?.levels)
        ? raw.levels
        : [];
    return arr.filter(isValidLevelConfig);
  };

  try {
    const res = await fetch(encodeR2Url(dataPath));
    if (!res.ok) throw new Error(`levels http ${res.status}`);
    const json = await res.json();
    const levels = normalize(json);
    await AsyncStorage.setItem(cacheKey, JSON.stringify(levels));
    return {
      entry,
      levels,
      fromCache: false,
      fetchedAt: Date.now(),
    };
  } catch {
    const cached = await AsyncStorage.getItem(cacheKey);
    if (cached) {
      try {
        const levels = normalize(JSON.parse(cached));
        return {
          entry,
          levels,
          fromCache: true,
          fetchedAt: Date.now(),
        };
      } catch {
        // fallthrough
      }
    }
    return { entry, levels: [], fromCache: false, fetchedAt: Date.now() };
  }
}

/**
 * 把 R2 相对路径解析成完整 URL（中文/空格安全）
 */
export function resolveMinigameAsset(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return encodeR2Url(path);
}

/** 清空小游戏缓存（开发者控制台"清缓存"可调） */
export async function clearMinigameCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const target = keys.filter(
      (k) => k === CACHE_INDEX || k.startsWith(CACHE_LEVELS_PREFIX),
    );
    if (target.length > 0) await AsyncStorage.multiRemove(target);
  } catch {
    // 静默
  }
}
