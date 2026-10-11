import { GITHUB_PATHS } from './githubConfig';
import { getFileJson, putFile, getFileSha } from './githubContents';
import type { AppConfig } from '@/types/config';
import { CONFIG_SCHEMA_VERSION } from '@/types/config';

export async function fetchRemoteAppConfig(): Promise<{
  config: AppConfig;
  sha: string;
}> {
  const result = await getFileJson<AppConfig>(GITHUB_PATHS.appConfig);
  const config = normalizeAppConfig(result.data);
  return { config, sha: result.sha };
}

export async function pushRemoteAppConfig(
  config: AppConfig,
  message: string,
): Promise<{ sha: string; commitUrl: string }> {
  const payload: AppConfig = {
    ...config,
    schemaVersion: CONFIG_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  const content = JSON.stringify(payload, null, 2);
  const existingSha = await getFileSha(GITHUB_PATHS.appConfig);
  const response = await putFile(
    GITHUB_PATHS.appConfig,
    content,
    message,
    existingSha,
  );
  return {
    sha: response.content.sha,
    commitUrl: response.commit.html_url,
  };
}

function normalizeAppConfig(input: unknown): AppConfig {
  const empty: AppConfig = {
    schemaVersion: CONFIG_SCHEMA_VERSION,
    updatedAt: '',
    foods: [],
    medicines: [],
    outfits: [],
    accessories: [],
    exercises: [],
    minigames: [],
  };
  if (typeof input !== 'object' || input === null) return empty;
  const obj = input as Record<string, unknown>;
  return {
    schemaVersion:
      typeof obj.schemaVersion === 'number'
        ? obj.schemaVersion
        : CONFIG_SCHEMA_VERSION,
    updatedAt: typeof obj.updatedAt === 'string' ? obj.updatedAt : '',
    foods: Array.isArray(obj.foods) ? (obj.foods as AppConfig['foods']) : [],
    medicines: Array.isArray(obj.medicines)
      ? (obj.medicines as AppConfig['medicines'])
      : [],
    outfits: Array.isArray(obj.outfits)
      ? (obj.outfits as AppConfig['outfits'])
      : [],
    accessories: Array.isArray(obj.accessories)
      ? (obj.accessories as AppConfig['accessories'])
      : [],
    exercises: Array.isArray(obj.exercises)
      ? (obj.exercises as AppConfig['exercises'])
      : [],
    minigames: Array.isArray(obj.minigames)
      ? (obj.minigames as AppConfig['minigames'])
      : [],
  };
}