import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { fetchMinigameIndex, fetchMinigameLevels } from '@/api/githubMinigames';
import { GITHUB_CACHE_TTL } from '@/api/githubConfig';
import type { MinigameIndexEntry } from '@/types/config';
import type { MinigameLevelConfig } from '@/types/minigame';

export function useMinigameIndex(
  enabled: boolean = true,
): UseQueryResult<MinigameIndexEntry[], Error> {
  return useQuery<MinigameIndexEntry[], Error>({
    queryKey: ['github', 'minigames', 'index'],
    queryFn: () => fetchMinigameIndex(),
    enabled,
    staleTime: GITHUB_CACHE_TTL.minigame,
    retry: 1,
  });
}

export function useMinigameLevels(
  entry: MinigameIndexEntry | null,
  enabled: boolean = true,
): UseQueryResult<MinigameLevelConfig[], Error> {
  return useQuery<MinigameLevelConfig[], Error>({
    queryKey: ['github', 'minigames', 'levels', entry?.id ?? ''],
    queryFn: async () => {
      if (!entry) return [];
      return fetchMinigameLevels(entry);
    },
    enabled: enabled && entry !== null,
    staleTime: GITHUB_CACHE_TTL.minigame,
    retry: 1,
  });
}