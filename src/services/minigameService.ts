// src/services/minigameService.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MinigameIndexEntry } from '@/types/config';
import type { MinigameLevelConfig, MinigameLoadResult } from '@/types/minigame';
import { isMemoryLevel, isRhythmLevel } from '@/api/githubMinigames';

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

const CACHE_INDEX = '@wulili/minigame/index_v1';
const CACHE_LEVELS_PREFIX = '@wulili/minigame/levels_v1_';

// 按段 encodeURIComponent，避免中文/空格导致 R2 404（对照 MusicPlayerScreen 的写法）
function encodeR2Url(path: string): string {
  const clean = path.replace(/^\/+/, '');
  return `${R2_BASE}/${clean.split('/').map(encodeURIComponent).join('/')}`;
}

function levelsCacheKey(entry: MinigameIndexEntry): string {
  // 用 id + levelsFile 双键，避免不同游戏同 id 冲突
  const raw = `${entry.id}__${entry.levelsFile ?? entry.id}`;
  return CACHE_LEVELS_PREFIX + raw.replace(/[^a-zA-Z0-9_]/g, '_');
}

/**
 * 拉取小游戏索引（minigames/index.json）
 * - 成功：写缓存并返回远程数据
 * - 失败：回退到缓存；缓存也没有返回 null
 */
export async function fetchMinigameIndex(): Promise<MinigameIndexEntry[] | null> {
  try {
    const res = await fetch(encodeR2Url('minigames/index.json'));
    if (!res.ok) throw new Error(`index http ${res.status}`);
    const json = await res.json();

    // 兼容两种结构：裸数组 或 { games: [...] }
    const list: MinigameIndexEntry[] = Array.isArray(json)
      ? json
      : Array.isArray(json?.games)
        ? json.games
        : [];

    await AsyncStorage.setItem(CACHE_INDEX, JSON.stringify(list));
    return list;
  } catch {
    const cached = await AsyncStorage.getItem(CACHE_INDEX);
    if (!cached) return null;
    try {
      const parsed = JSON.parse(cached);
      return Array.isArray(parsed) ? (parsed as MinigameIndexEntry[]) : null;
    } catch {
      return null;
    }
  }
}

/**
 * 拉取某个小游戏的关卡列表
 * - 优先走 entry.levelsFile（R2 相对路径）
 * - 若 entry.levelsFile 缺失，回退 minigames/<id>/levels.json
 * - 网络失败回退缓存
 */
export async function fetchMinigameLevels(
  entry: MinigameIndexEntry,
): Promise<MinigameLoadResult> {
  const levelsFile = entry.levelsFile || `minigames/${entry.id}/levels.json`;
  const cacheKey = levelsCacheKey(entry);

  const normalize = (raw: any): MinigameLevelConfig[] => {
    const arr = Array.isArray(raw) ? raw : Array.isArray(raw?.levels) ? raw.levels : [];
    // 只用类型守卫过滤出合法关卡，丢弃脏数据
    return arr.filter(
      (lv: any): lv is MinigameLevelConfig => isMemoryLevel(lv) || isRhythmLevel(lv),
    );
  };

  try {
    const res = await fetch(encodeR2Url(levelsFile));
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
 * 把 R2 相对路径解析成完整 URL，供 <Image source={{ uri }}> 使用
 * 自动按段编码，中文/空格安全
 */
export function resolveMinigameAsset(path: string): string {
  if (/^https?:\/\//i.test(path)) return path; // 已经是完整 URL 直接返回
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
