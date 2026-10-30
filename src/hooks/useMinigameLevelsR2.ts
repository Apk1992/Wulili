// src/hooks/useMinigameIndexR2.ts
import { useCallback, useEffect, useRef, useState } from 'react';
import type { MinigameIndexEntry } from '@/types/config';
import { fetchMinigameIndex } from '@/services/minigameService';

export interface UseMinigameIndexR2Result {
  isLoading: boolean;
  isError: boolean;
  data: MinigameIndexEntry[] | undefined;
  refetch: () => void;
}

export function useMinigameIndexR2(enabled: boolean = true): UseMinigameIndexR2Result {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [data, setData] = useState<MinigameIndexEntry[] | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState<number>(0);

  const mountedRef = useRef<boolean>(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refetch = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);

    (async () => {
      const list = await fetchMinigameIndex();
      if (cancelled || !mountedRef.current) return;
      if (list === null) {
        setIsError(true);
        setData(undefined);
      } else {
        // 只保留 enabled 的，按 order 排序
        const visible = list
          .filter((g) => g.enabled !== false)
          .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
        setIsError(false);
        setData(visible);
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [enabled, reloadToken]);

  return { isLoading, isError, data, refetch };
}

export default useMinigameIndexR2;
