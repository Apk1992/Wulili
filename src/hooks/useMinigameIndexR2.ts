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

/**
 * R2 版小游戏索引加载 hook
 * - 数据源：R2 minigames/index.json（{ minigames: [...] } 或裸数组）
 * - 网络失败：service 内部回退缓存；都失败 → isError
 * - 卸载守卫，避免 setState 警告
 */
export function useMinigameIndexR2(enabled: boolean = true): UseMinigameIndexR2Result {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isError, setIsError] = useState<boolean>(false);
  const [data, setData] = useState<MinigameIndexEntry[] | undefined>(undefined);
  const [reloadToken, setReloadToken] = useState<number>(0);

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
        // 不做 enabled/order 过滤（你的类型里没有这两个字段）
        // R2 上删掉条目即下架；数组顺序即展示顺序
        setIsError(false);
        setData(list);
      }
      setIsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, reloadToken]);

  return { isLoading, isError, data, refetch };
}

export default useMinigameIndexR2;
