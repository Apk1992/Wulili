// src/hooks/useMinigameLevelsR2.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

export function useMinigameLevelsR2(
  entry: MinigameIndexEntry | null,
  enabled: boolean = true,
): UseMinigameLevelsR2Result {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [data, setData] = useState<MinigameLevelConfig[] | undefined>(undefined);
  const [fromCache, setFromCache] = useState<boolean>(false);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    if (!entry || !enabled) return;

    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    (async () => {
      // 🔥 强制清空一次小游戏关卡缓存，确保拉到最新 JSON
      try {
        const keys = await AsyncStorage.getAllKeys();
        const mgKeys = keys.filter(k => k.startsWith('@wulili/minigame/levels_v1_'));
        if (mgKeys.length > 0) await AsyncStorage.multiRemove(mgKeys);
      } catch {}

      const result = await fetchMinigameLevels(entry);
      if (cancelled || !mountedRef.current) return;

      const hasAny = Array.isArray(result.levels) && result.levels.length > 0;
      const hasCache = result.fromCache;

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

    return () => { cancelled = true; };
  }, [entry, enabled, reloadToken]);

  return { isLoading, isError, data, fromCache, refetch };
}

export default useMinigameLevelsR2;
