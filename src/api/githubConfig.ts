import type { GitHubRepoInfo } from '@/types/settings';

// 素材仓库（读图片、音乐、台词、配置）
export const GITHUB_REPO: GitHubRepoInfo = {
  owner: 'yukee520',
  repo: 'Wulili_assets',
  branch: 'main',
};

// 代码仓库（读 Releases，检查更新、下载 APK）
export const GITHUB_RELEASE_REPO: GitHubRepoInfo = {
  owner: 'yukee520',
  repo: 'Wulili',
  branch: 'main',
};

export const GITHUB_API_BASE = 'https://api.github.com';
export const GITHUB_API_VERSION = '2022-11-28';
export const GITHUB_RAW_BASE = `https://raw.githubusercontent.com/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/${GITHUB_REPO.branch}`;

export const GITHUB_PATHS = {
  dialogues: 'dialogue/dialogues.json',
  appConfig: 'data/config.json',
  music: 'music',
  videos: 'videos',
  notes: 'notes',
  images: 'images',
  imagesAvatar: 'images/avatar',
  imagesFoodHealthy: 'images/food/healthy',
  imagesFoodJunk: 'images/food/junk',
  imagesMedicine: 'images/medicine',
  imagesOutfit: 'images/outfit',
  imagesAccessory: 'images/accessory',
  minigames: 'minigames',
  minigameMemory: 'minigames/memory',
  minigameRhythm: 'minigames/rhythm',
} as const;

export const GITHUB_ACCEPT = {
  json: 'application/vnd.github+json',
  raw: 'application/vnd.github.raw',
  html: 'application/vnd.github.html',
} as const;

export const GITHUB_CACHE_TTL = {
  repoListing: 5 * 60 * 1000,
  releases: 10 * 60 * 1000,
  dialogues: 5 * 60 * 1000,
  appConfig: 5 * 60 * 1000,
  minigame: 10 * 60 * 1000,
  image: 60 * 60 * 1000,
  memoryList: 5 * 60 * 1000,
} as const;

export const GITHUB_COMMIT_AUTHOR = {
  name: 'Wulili App',
  email: 'wulili-app@users.noreply.github.com',
} as const;

export function buildContentsUrl(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${GITHUB_API_BASE}/repos/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/contents/${clean}`;
}

export function buildRawUrl(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `${GITHUB_RAW_BASE}/${clean}`;
}

export function buildReleasesUrl(): string {
  return `${GITHUB_API_BASE}/repos/${GITHUB_RELEASE_REPO.owner}/${GITHUB_RELEASE_REPO.repo}/releases`;
}

export function buildLatestReleaseUrl(): string {
  return `${GITHUB_API_BASE}/repos/${GITHUB_RELEASE_REPO.owner}/${GITHUB_RELEASE_REPO.repo}/releases/latest`;
}

export function buildCommitUrl(sha: string): string {
  return `https://github.com/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/commit/${sha}`;
}

export function buildFileHtmlUrl(path: string): string {
  const clean = path.replace(/^\/+|\/+$/g, '');
  return `https://github.com/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}/blob/${GITHUB_REPO.branch}/${clean}`;
}