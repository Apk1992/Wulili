import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { getFileRaw, getFileJson } from '@/api/githubContents';
import { GITHUB_CACHE_TTL } from '@/api/githubConfig';

export interface RawFileResult {
  path: string;
  raw: string;
  htmlUrl: string;
  size: number;
}

export function useGitHubRawFile(
  path: string | null,
  enabled: boolean = true,
): UseQueryResult<RawFileResult, Error> {
  return useQuery<RawFileResult, Error>({
    queryKey: ['github', 'raw', path],
    queryFn: async () => {
      if (!path) throw new Error('路径为空');
      const result = await getFileRaw(path);
      return {
        path: result.path,
        raw: result.raw,
        htmlUrl: result.htmlUrl,
        size: result.size,
      };
    },
    enabled: enabled && !!path,
    staleTime: GITHUB_CACHE_TTL.repoListing,
    retry: 1,
  });
}

export function useGitHubJsonFile<T>(
  path: string | null,
  enabled: boolean = true,
): UseQueryResult<T, Error> {
  return useQuery<T, Error>({
    queryKey: ['github', 'json', path],
    queryFn: async () => {
      if (!path) throw new Error('路径为空');
      const result = await getFileJson<T>(path);
      return result.data;
    },
    enabled: enabled && !!path,
    staleTime: GITHUB_CACHE_TTL.repoListing,
    retry: 1,
  });
}