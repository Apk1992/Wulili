import { getLatestRelease, listReleases, findApkAsset } from './githubReleases';
import type { GitHubRelease } from '@/types/github';
import type { UpdateInfo } from '@/types/settings';

export async function checkForUpdate(
  currentVersion: string,
): Promise<UpdateInfo> {
  const checkedAt = Date.now();
  try {
    const release = await getLatestRelease();
    if (!release) {
      return buildEmptyUpdate(currentVersion, checkedAt);
    }
    return buildUpdateInfo(currentVersion, release, checkedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : '检查更新失败';
    return {
      ...buildEmptyUpdate(currentVersion, checkedAt),
      error: message,
    };
  }
}

export async function checkForUpdateFromList(
  currentVersion: string,
): Promise<UpdateInfo> {
  const checkedAt = Date.now();
  try {
    const releases = await listReleases(20);
    const latest = releases.find((r) => !r.draft && !r.prerelease) ?? releases[0];
    if (!latest) {
      return buildEmptyUpdate(currentVersion, checkedAt);
    }
    return buildUpdateInfo(currentVersion, latest, checkedAt);
  } catch (error) {
    const message = error instanceof Error ? error.message : '检查更新失败';
    return {
      ...buildEmptyUpdate(currentVersion, checkedAt),
      error: message,
    };
  }
}

function buildEmptyUpdate(currentVersion: string, checkedAt: number): UpdateInfo {
  return {
    currentVersion,
    latestVersion: null,
    hasUpdate: false,
    releaseTag: null,
    releaseName: null,
    releaseNotes: null,
    apkUrl: null,
    apkSize: null,
    publishedAt: null,
    checkedAt,
    error: null,
  };
}

function buildUpdateInfo(
  currentVersion: string,
  release: GitHubRelease,
  checkedAt: number,
): UpdateInfo {
  const latestVersion = release.tag_name;
  const apk = findApkAsset(release);
  const hasUpdate = isVersionNewer(currentVersion, latestVersion) && apk !== null;
  return {
    currentVersion,
    latestVersion,
    hasUpdate,
    releaseTag: release.tag_name,
    releaseName: release.name || release.tag_name,
    releaseNotes: release.body || null,
    apkUrl: apk ? apk.url : null,
    apkSize: apk ? apk.size : null,
    publishedAt: release.published_at ?? release.created_at ?? null,
    checkedAt,
    error: null,
  };
}

function isVersionNewer(current: string, candidate: string): boolean {
  const cur = parseSimple(current);
  const cand = parseSimple(candidate);
  if (!cur || !cand) return false;
  if (cand.major !== cur.major) return cand.major > cur.major;
  if (cand.minor !== cur.minor) return cand.minor > cur.minor;
  return cand.patch > cur.patch;
}

function parseSimple(
  input: string,
): { major: number; minor: number; patch: number } | null {
  if (!input) return null;
  const cleaned = input.trim().replace(/^v/i, '');
  const match = cleaned.match(/^(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}