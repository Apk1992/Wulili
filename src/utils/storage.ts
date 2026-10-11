import AsyncStorage from '@react-native-async-storage/async-storage';

export const STORAGE_KEYS = {
  wuliliState: '@wulili/state',
  wuliliPersistVersion: '@wulili/persist-version',
  dialogueRuntime: '@wulili/dialogue-runtime',
  dialogueUserPool: '@wulili/dialogue-user-pool',
  dialogueRemoteCache: '@wulili/dialogue-remote-cache',
  appConfigCache: '@wulili/app-config-cache',
  appConfigUserDraft: '@wulili/app-config-draft',
  minigameCachePrefix: '@wulili/minigame-cache/',
  settings: '@wulili/settings',
  updateState: '@wulili/update-state',
  remoteImagePrefix: '@wulili/image/',
  memoryListCache: '@wulili/memory-list-cache',
  githubRepoCache: '@wulili/github-repo-cache',
  githubReleaseCache: '@wulili/github-release-cache',
  lastSyncAt: '@wulili/last-sync-at',
} as const;

export const PERSIST_VERSION = 1;

export async function storageGet<T>(key: string): Promise<T | null> {
  try {
    const raw = await AsyncStorage.getItem(key);
    if (raw === null) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function storageSet<T>(key: string, value: T): Promise<boolean> {
  try {
    const raw = JSON.stringify(value);
    await AsyncStorage.setItem(key, raw);
    return true;
  } catch {
    return false;
  }
}

export async function storageRemove(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export async function storageGetRaw(key: string): Promise<string | null> {
  try {
    return await AsyncStorage.getItem(key);
  } catch {
    return null;
  }
}

export async function storageSetRaw(key: string, value: string): Promise<boolean> {
  try {
    await AsyncStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

export async function storageGetMany(keys: readonly string[]): Promise<Record<string, string | null>> {
  const result: Record<string, string | null> = {};
  try {
    const pairs = await AsyncStorage.multiGet(keys as string[]);
    for (const [k, v] of pairs) {
      result[k] = v;
    }
  } catch {
    for (const k of keys) {
      if (!(k in result)) result[k] = null;
    }
  }
  return result;
}

export async function storageClearByPrefix(prefix: string): Promise<void> {
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    const matched = allKeys.filter((k) => k.startsWith(prefix));
    if (matched.length > 0) {
      await AsyncStorage.multiRemove(matched);
    }
  } catch {
    // ignore
  }
}

export async function storageClearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
  } catch {
    // ignore
  }
}

export async function safeJsonParse<T>(raw: string | null): Promise<T | null> {
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}