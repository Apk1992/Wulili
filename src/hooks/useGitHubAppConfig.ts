import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { fetchRemoteAppConfig } from '@/api/githubAppConfig';
import { GITHUB_CACHE_TTL } from '@/api/githubConfig';
import type { AppConfig } from '@/types/config';

export interface RemoteAppConfigResult {
  config: AppConfig;
  sha: string;
}

export function useGitHubAppConfig(
  enabled: boolean = true,
): UseQueryResult<RemoteAppConfigResult, Error> {
  return useQuery<RemoteAppConfigResult, Error>({
    queryKey: ['github', 'app-config'],
    queryFn: () => fetchRemoteAppConfig(),
    enabled,
    staleTime: GITHUB_CACHE_TTL.appConfig,
    retry: 1,
  });
}