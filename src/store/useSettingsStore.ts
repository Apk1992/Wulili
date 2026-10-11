import { create } from 'zustand';
import type { AppSettings, ThemePreference } from '@/types/settings';
import { DEFAULT_SETTINGS } from '@/types/settings';
import { STORAGE_KEYS, storageGet, storageSet } from '@/utils/storage';

interface SettingsState {
  settings: AppSettings;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  setThemePreference: (pref: ThemePreference) => void;
  setDeveloperMode: (enabled: boolean) => void;
  setUseRemoteConfig: (enabled: boolean) => void;
  setUseRemoteDialogues: (enabled: boolean) => void;
  setUseRemoteImages: (enabled: boolean) => void;
  setAutoCheckUpdate: (enabled: boolean) => void;
  setLastUpdateCheckAt: (timestamp: number) => void;
  skipVersion: (version: string) => void;
  clearSkippedVersion: () => void;
  setAvatarCacheEnabled: (enabled: boolean) => void;
  setHapticFeedbackEnabled: (enabled: boolean) => void;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

async function persist(settings: AppSettings): Promise<void> {
  await storageSet(STORAGE_KEYS.settings, settings);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<Partial<AppSettings>>(STORAGE_KEYS.settings);
    const merged: AppSettings = { ...DEFAULT_SETTINGS, ...(stored ?? {}) };
    set({ settings: merged, hydrated: true });
  },

  setThemePreference: (pref) => {
    const next = { ...get().settings, themePreference: pref };
    set({ settings: next });
    void persist(next);
  },

  setDeveloperMode: (enabled) => {
    const next = { ...get().settings, developerMode: enabled };
    set({ settings: next });
    void persist(next);
  },

  setUseRemoteConfig: (enabled) => {
    const next = { ...get().settings, useRemoteConfig: enabled };
    set({ settings: next });
    void persist(next);
  },

  setUseRemoteDialogues: (enabled) => {
    const next = { ...get().settings, useRemoteDialogues: enabled };
    set({ settings: next });
    void persist(next);
  },

  setUseRemoteImages: (enabled) => {
    const next = { ...get().settings, useRemoteImages: enabled };
    set({ settings: next });
    void persist(next);
  },

  setAutoCheckUpdate: (enabled) => {
    const next = { ...get().settings, autoCheckUpdate: enabled };
    set({ settings: next });
    void persist(next);
  },

  setLastUpdateCheckAt: (timestamp) => {
    const next = { ...get().settings, lastUpdateCheckAt: timestamp };
    set({ settings: next });
    void persist(next);
  },

  skipVersion: (version) => {
    const next = { ...get().settings, skippedVersion: version };
    set({ settings: next });
    void persist(next);
  },

  clearSkippedVersion: () => {
    const next = { ...get().settings, skippedVersion: null };
    set({ settings: next });
    void persist(next);
  },

  setAvatarCacheEnabled: (enabled) => {
    const next = { ...get().settings, avatarCacheEnabled: enabled };
    set({ settings: next });
    void persist(next);
  },

  setHapticFeedbackEnabled: (enabled) => {
    const next = { ...get().settings, hapticFeedbackEnabled: enabled };
    set({ settings: next });
    void persist(next);
  },

  updateSettings: (partial) => {
    const next = { ...get().settings, ...partial };
    set({ settings: next });
    void persist(next);
  },

  resetSettings: () => {
    set({ settings: DEFAULT_SETTINGS });
    void persist(DEFAULT_SETTINGS);
  },
}));