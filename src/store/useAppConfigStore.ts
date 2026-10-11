import { create } from 'zustand';
import type { AppConfig, ConfigSyncMeta } from '@/types/config';
import type { Accessory, ExerciseOption, Food, Medicine, Outfit } from '@/types/wulili';
import type { MinigameIndexEntry } from '@/types/config';
import { STORAGE_KEYS, storageGet, storageSet } from '@/utils/storage';
import { defaultAppConfig } from '@/data/defaultAppConfig';

interface AppConfigStore {
  config: AppConfig;
  syncMeta: ConfigSyncMeta;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setRemoteConfig: (config: AppConfig) => void;
  setUserDraft: (config: AppConfig) => void;
  updateConfig: (partial: Partial<AppConfig>) => void;
  getFoodById: (id: string) => Food | null;
  getMedicineById: (id: string) => Medicine | null;
  getOutfitById: (id: string) => Outfit | null;
  getAccessoryById: (id: string) => Accessory | null;
  getExerciseById: (id: string) => ExerciseOption | null;
  getMinigameById: (id: string) => MinigameIndexEntry | null;
  getFoodsByCategory: (category: 'healthy' | 'junk') => Food[];
  reset: () => void;
}

function mergeConfigs(
  base: AppConfig,
  remote: AppConfig | null,
  user: AppConfig | null,
): AppConfig {
  const pick = <T extends { id: string }>(
    a: T[],
    b: T[] | undefined,
    c: T[] | undefined,
  ): T[] => {
    const map = new Map<string, T>();
    for (const x of a) map.set(x.id, x);
    if (b) for (const x of b) map.set(x.id, x);
    if (c) for (const x of c) map.set(x.id, x);
    return Array.from(map.values());
  };

  return {
    schemaVersion: user?.schemaVersion ?? remote?.schemaVersion ?? base.schemaVersion,
    updatedAt: user?.updatedAt ?? remote?.updatedAt ?? base.updatedAt,
    foods: pick(base.foods, remote?.foods, user?.foods),
    medicines: pick(base.medicines, remote?.medicines, user?.medicines),
    outfits: pick(base.outfits, remote?.outfits, user?.outfits),
    accessories: pick(base.accessories, remote?.accessories, user?.accessories),
    exercises: pick(base.exercises, remote?.exercises, user?.exercises),
    minigames: pick(base.minigames, remote?.minigames, user?.minigames),
  };
}

export const useAppConfigStore = create<AppConfigStore>((set, get) => ({
  config: defaultAppConfig,
  syncMeta: {
    lastPulledAt: null,
    lastPushedAt: null,
    remoteSha: null,
    source: 'default',
  },
  hydrated: false,

  hydrate: async () => {
    const remote = await storageGet<AppConfig>(STORAGE_KEYS.appConfigCache);
    const user = await storageGet<AppConfig>(STORAGE_KEYS.appConfigUserDraft);
    const merged = mergeConfigs(defaultAppConfig, remote, user);
    set({
      config: merged,
      syncMeta: {
        lastPulledAt: null,
        lastPushedAt: null,
        remoteSha: null,
        source: remote || user ? 'cache' : 'default',
      },
      hydrated: true,
    });
  },

  setRemoteConfig: (config) => {
    const user = get().config;
    const merged = mergeConfigs(defaultAppConfig, config, null);
    set({
      config: merged,
      syncMeta: {
        ...get().syncMeta,
        lastPulledAt: Date.now(),
        source: 'remote',
      },
    });
    void storageSet(STORAGE_KEYS.appConfigCache, config);
    void user;
  },

  setUserDraft: (config) => {
    set({ config });
    void storageSet(STORAGE_KEYS.appConfigUserDraft, config);
    void storageSet(STORAGE_KEYS.appConfigCache, config);
  },

  updateConfig: (partial) => {
    const next = { ...get().config, ...partial };
    set({ config: next });
    void storageSet(STORAGE_KEYS.appConfigUserDraft, next);
  },

  getFoodById: (id) => get().config.foods.find((f) => f.id === id) ?? null,

  getMedicineById: (id) => get().config.medicines.find((m) => m.id === id) ?? null,

  getOutfitById: (id) => get().config.outfits.find((o) => o.id === id) ?? null,

  getAccessoryById: (id) => get().config.accessories.find((a) => a.id === id) ?? null,

  getExerciseById: (id) => get().config.exercises.find((e) => e.id === id) ?? null,

  getMinigameById: (id) => get().config.minigames.find((m) => m.id === id) ?? null,

  getFoodsByCategory: (category) =>
    get().config.foods.filter((f) => f.category === category),

  reset: () => {
    set({
      config: defaultAppConfig,
      syncMeta: {
        lastPulledAt: null,
        lastPushedAt: null,
        remoteSha: null,
        source: 'default',
      },
    });
  },
}));