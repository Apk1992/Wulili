import { useMemo } from 'react';
import { buildRawUrl } from '@/api/githubConfig';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { getGitHubToken } from '@/api/githubClient';

export interface RemoteImageSource {
  uri: string;
  headers: Record<string, string>;
}

export interface UseGitHubImageResult {
  source: RemoteImageSource | null;
  url: string;
}

export function buildImagePath(
  folder: keyof typeof GITHUB_PATHS,
  fileName: string,
): string {
  const base = GITHUB_PATHS[folder];
  if (typeof base !== 'string') return fileName;
  return `${base}/${fileName}`;
}

export function useGitHubImage(
  remotePath: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  return useMemo(() => {
    if (!enabled || !remotePath || remotePath.length === 0) {
      return { source: null, url: '' };
    }
    const url = buildRawUrl(remotePath);
    const token = getGitHubToken();
    const headers: Record<string, string> = {};
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    return {
      source: { uri: url, headers },
      url,
    };
  }, [remotePath, enabled]);
}

export function useAvatarImage(
  fileName: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  const path = fileName ? buildImagePath('imagesAvatar', fileName) : null;
  return useGitHubImage(path, enabled);
}

export function useFoodImage(
  category: 'healthy' | 'junk',
  fileName: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  const folder = category === 'healthy' ? 'imagesFoodHealthy' : 'imagesFoodJunk';
  const path = fileName ? buildImagePath(folder, fileName) : null;
  return useGitHubImage(path, enabled);
}

export function useOutfitImage(
  fileName: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  const path = fileName ? buildImagePath('imagesOutfit', fileName) : null;
  return useGitHubImage(path, enabled);
}

export function useAccessoryImage(
  fileName: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  const path = fileName ? buildImagePath('imagesAccessory', fileName) : null;
  return useGitHubImage(path, enabled);
}

export function useMedicineImage(
  fileName: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  const path = fileName ? buildImagePath('imagesMedicine', fileName) : null;
  return useGitHubImage(path, enabled);
}

export function useMinigameAsset(
  folder: 'minigameMemory' | 'minigameRhythm',
  fileName: string | null,
  enabled: boolean = true,
): UseGitHubImageResult {
  const path = fileName ? buildImagePath(folder, fileName) : null;
  return useGitHubImage(path, enabled);
}