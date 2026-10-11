import type {
  Accessory,
  ExerciseOption,
  Food,
  Medicine,
  Outfit,
} from './wulili';

export interface MinigameIndexEntry {
  id: string;
  engine: 'memory' | 'rhythm';
  name: string;
  description: string;
  icon: string;
  dataPath: string;
  assetFolder: string;
  moodGain: number;
  energyCost: number;
  coinReward: number;
}

export interface AppConfig {
  schemaVersion: number;
  updatedAt: string;
  foods: Food[];
  medicines: Medicine[];
  outfits: Outfit[];
  accessories: Accessory[];
  exercises: ExerciseOption[];
  minigames: MinigameIndexEntry[];
}

export interface ConfigSyncMeta {
  lastPulledAt: number | null;
  lastPushedAt: number | null;
  remoteSha: string | null;
  source: 'default' | 'remote' | 'cache';
}

export interface UploadResult {
  path: string;
  sha: string;
  commitUrl: string;
  size: number;
}

export interface UploadProgress {
  fileName: string;
  loaded: number;
  total: number;
  phase: 'reading' | 'encoding' | 'uploading' | 'done' | 'error';
}

export const CONFIG_SCHEMA_VERSION = 1;

export const UPLOAD_SIZE_LIMIT = 100 * 1024 * 1024;

export const UPLOAD_FOLDERS = {
  music: 'music',
  videos: 'videos',
  notes: 'notes',
  avatar: 'images/avatar',
  foodHealthy: 'images/food/healthy',
  foodJunk: 'images/food/junk',
  medicine: 'images/medicine',
  outfit: 'images/outfit',
  accessory: 'images/accessory',
  minigameMemory: 'images/minigame/memory',
  minigameRhythm: 'images/minigame/rhythm',
} as const;

export type UploadFolderKey = keyof typeof UPLOAD_FOLDERS;