import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import { listAllReleaseAssets, listReleases, getLatestRelease } from '@/api/githubReleases';
import { GITHUB_CACHE_TTL } from '@/api/githubConfig';
import type { GitHubRelease, GitHubReleaseAsset } from '@/types/github';

export function useGitHubReleases(
  perPage: number = 30,
): UseQueryResult<GitHubRelease[], Error> {
  return useQuery<GitHubRelease[], Error>({
    queryKey: ['github', 'releases', perPage],
    queryFn: () => listAllReleaseAssets(),
    staleTime: GITHUB_CACHE_TTL.releases,
    retry: 1,
  });
}

export function useLatestRelease(): UseQueryResult<GitHubRelease | null, Error> {
  return useQuery<GitHubRelease | null, Error>({
    queryKey: ['github', 'release', 'latest'],
    queryFn: () => getLatestRelease(),
    staleTime: GITHUB_CACHE_TTL.releases,
    retry: 1,
  });
}

export interface UseVideoAssetsResult {
  isLoading: boolean;
  error: string | null;
  assets: Array<GitHubReleaseAsset & { releaseTag: string }>;
  refetch: () => void;
}

export function collectVideoAssets(
  releases: GitHubRelease[],
): Array<GitHubReleaseAsset & { releaseTag: string }> {
  const videoExtensions = ['mp4', 'mov', 'm4v', 'webm', 'mkv'];
  const results: Array<GitHubReleaseAsset & { releaseTag: string }> = [];
  for (const release of releases) {
    for (const asset of release.assets) {
      const idx = asset.name.lastIndexOf('.');
      if (idx < 0) continue;
      const ext = asset.name.slice(idx + 1).toLowerCase();
      if (videoExtensions.includes(ext)) {
        results.push({ ...asset, releaseTag: release.tag_name });
      }
    }
  }
  return results.sort((a, b) => {
    const ta = new Date(a.created_at).getTime();
    const tb = new Date(b.created_at).getTime();
    return tb - ta;
  });
}