import { useQuery } from '@tanstack/react-query';
import type { UseQueryResult } from '@tanstack/react-query';
import {
  listDirectory,
  listFilesRecursive,
} from '@/api/githubContents';
import { GITHUB_CACHE_TTL } from '@/api/githubConfig';
import type { GitHubContentItem } from '@/types/github';

export interface UseGitHubDirectoryOptions {
  path: string;
  enabled?: boolean;
  staleTime?: number;
}

export function useGitHubDirectory(
  options: UseGitHubDirectoryOptions,
): UseQueryResult<GitHubContentItem[], Error> {
  const { path, enabled = true, staleTime = GITHUB_CACHE_TTL.repoListing } =
    options;
  return useQuery<GitHubContentItem[], Error>({
    queryKey: ['github', 'dir', path],
    queryFn: () => listDirectory(path),
    enabled: enabled && path.length > 0,
    staleTime,
    retry: 1,
  });
}

export interface UseGitHubFilesOptions {
  path: string;
  depth?: number;
  enabled?: boolean;
  staleTime?: number;
}

export function useGitHubFiles(
  options: UseGitHubFilesOptions,
): UseQueryResult<GitHubContentItem[], Error> {
  const {
    path,
    depth = 2,
    enabled = true,
    staleTime = GITHUB_CACHE_TTL.repoListing,
  } = options;
  return useQuery<GitHubContentItem[], Error>({
    queryKey: ['github', 'files', path, depth],
    queryFn: () => listFilesRecursive(path, depth),
    enabled: enabled && path.length > 0,
    staleTime,
    retry: 1,
  });
}

export function filterByExtensions(
  items: GitHubContentItem[],
  extensions: readonly string[],
): GitHubContentItem[] {
  const lower = extensions.map((e) => e.toLowerCase());
  return items.filter((item) => {
    if (item.type !== 'file') return false;
    const idx = item.name.lastIndexOf('.');
    if (idx < 0) return false;
    return lower.includes(item.name.slice(idx + 1).toLowerCase());
  });
}

export function sortByName(
  items: GitHubContentItem[],
  ascending: boolean = true,
): GitHubContentItem[] {
  const sorted = items.slice().sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
  return ascending ? sorted : sorted.reverse();
}