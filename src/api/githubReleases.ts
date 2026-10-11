import { GITHUB_ACCEPT } from './githubConfig';
import { buildLatestReleaseUrl, buildReleasesUrl } from './githubConfig';
import { githubRequest, toGitHubApiError } from './githubClient';
import type { GitHubRelease } from '@/types/github';

export async function listReleases(perPage: number = 20): Promise<GitHubRelease[]> {
  try {
    const data = await githubRequest<GitHubRelease[]>(
      'get',
      buildReleasesUrl(),
      {
        params: { per_page: perPage },
        accept: GITHUB_ACCEPT.json,
      },
    );
    return Array.isArray(data) ? data : [];
  } catch (error) {
    throw toGitHubApiError(error);
  }
}

export async function getLatestRelease(): Promise<GitHubRelease | null> {
  try {
    const data = await githubRequest<GitHubRelease>(
      'get',
      buildLatestReleaseUrl(),
      { accept: GITHUB_ACCEPT.json },
    );
    return data ?? null;
  } catch (error) {
    const apiError = toGitHubApiError(error);
    if (apiError.isNotFound) return null;
    throw apiError;
  }
}

export async function listAllReleaseAssets(): Promise<GitHubRelease[]> {
  const releases = await listReleases(30);
  return releases.filter((r) => !r.draft);
}

export function findAssetByExtension(
  release: GitHubRelease,
  extensions: readonly string[],
): { name: string; url: string; size: number; assetId: number } | null {
  const lower = extensions.map((e) => e.toLowerCase());
  for (const asset of release.assets) {
    const idx = asset.name.lastIndexOf('.');
    if (idx < 0) continue;
    const ext = asset.name.slice(idx + 1).toLowerCase();
    if (lower.includes(ext)) {
      return {
        name: asset.name,
        url: asset.browser_download_url,
        size: asset.size,
        assetId: asset.id,
      };
    }
  }
  return null;
}

export function findApkAsset(
  release: GitHubRelease,
): { name: string; url: string; size: number; assetId: number } | null {
  return findAssetByExtension(release, ['apk']);
}