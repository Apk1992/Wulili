// src/hooks/useMinigameLevelsR2.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameIndexEntry } from '@/types/config';
import type { MinigameLevelConfig } from '@/types/minigame';
import { fetchMinigameLevels } from '@/services/minigameService';

export interface UseMinigameLevelsR2Result {
  isLoading: boolean;
  isError: boolean;
  data: MinigameLevelConfig[] | undefined;
  fromCache: boolean;
  refetch: () => void;
}

/**
 * R2 版小游戏关卡加载 hook（替代 useGitHubMinigames.useMinigameLevels）
 * - entry 为 null 时不请求
 * - enabled=false 时不请求（懒加载）
 * - 组件卸载后忽略迟到的 setState
 * - 网络失败时 service 内部已回退缓存；两者都没有才算 isError
 */
export function useMinigameLevelsR2(
  entry: MinigameIndexEntry | null,
  enabled: boolean = true,
): UseMinigameLevelsR2Result {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [data, setData] = useState<MinigameLevelConfig[] | undefined>(undefined);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);

  // 卸载守卫
  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const refetch = useCallback(() => {
    setReloadToken((t) => t + 1);
  }, []);

  useEffect(() => {
    if (!entry || !enabled) {
      // 未启用/无 entry：保持初始状态，不请求
      return;
    }

    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    (async () => {
      const result = await fetchMinigameLevels(entry);

      if (cancelled || !mountedRef.current) return;

      const hasAny = Array.isArray(result.levels) && result.levels.length > 0;
      const hasCache = result.fromCache;

      // 空数组且不是缓存命中 → 视为错误（网络挂了且没缓存）
      if (!hasAny && !hasCache) {
        setIsError(true);
        setData(undefined);
      } else {
        setIsError(false);
        setData(result.levels);
      }
      setFromCache(hasCache);
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [entry, enabled, reloadToken]);

  return { isLoading, isError, data, fromCache, refetch };
}

export default useMinigameLevelsR2;
