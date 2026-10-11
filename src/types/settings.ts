export type ThemePreference = 'system' | 'light' | 'dark';

export interface AppSettings {
  themePreference: ThemePreference;
  developerMode: boolean;
  useRemoteConfig: boolean;
  useRemoteDialogues: boolean;
  useRemoteImages: boolean;
  autoCheckUpdate: boolean;
  lastUpdateCheckAt: number | null;
  skippedVersion: string | null;
  avatarCacheEnabled: boolean;
  hapticFeedbackEnabled: boolean;
}

export interface GitHubCredentials {
  token: string | null;
  hasToken: boolean;
  savedAt: number | null;
}

export interface GitHubRepoInfo {
  owner: string;
  repo: string;
  branch: string;
}

export interface UpdateInfo {
  currentVersion: string;
  latestVersion: string | null;
  hasUpdate: boolean;
  releaseTag: string | null;
  releaseName: string | null;
  releaseNotes: string | null;
  apkUrl: string | null;
  apkSize: number | null;
  publishedAt: string | null;
  checkedAt: number | null;
  error: string | null;
}

export const DEFAULT_SETTINGS: AppSettings = {
  themePreference: 'system',
  developerMode: false,
  useRemoteConfig: true,
  useRemoteDialogues: true,
  useRemoteImages: true,
  autoCheckUpdate: true,
  lastUpdateCheckAt: null,
  skippedVersion: null,
  avatarCacheEnabled: true,
  hapticFeedbackEnabled: true,
};