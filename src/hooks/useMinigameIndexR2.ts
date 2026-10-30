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
        // 🔥 你的 MinigameIndexEntry 没有 enabled/order 字段
        // 不过滤、不排序，R2 数组顺序即展示顺序
        setIsError(false);
        setData(list);
      }
      setIsLoading(false);
    })();

    return () => { cancelled = true; };
  }, [enabled, reloadToken]);

  return { isLoading, isError, data, refetch };
}

export default useMinigameIndexR2;
