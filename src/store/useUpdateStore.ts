import { create } from 'zustand';
import type { UpdateInfo } from '@/types/settings';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/update-state';

interface UpdateStore {
  info: UpdateInfo | null;
  isChecking: boolean;
  lastError: string | null;
  hydrated: boolean;

  hydrate: () => Promise<void>;
  setInfo: (info: UpdateInfo | null) => void;
  setChecking: (checking: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
  clearInfo: () => void;
}

export const useUpdateStore = create<UpdateStore>((set) => ({
  info: null,
  isChecking: false,
  lastError: null,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<UpdateInfo>(STORAGE_KEY);
    set({ info: stored ?? null, hydrated: true });
  },

  setInfo: (info) => {
    set({ info });
    if (info) {
      void storageSet(STORAGE_KEY, info);
    }
  },

  setChecking: (checking) => set({ isChecking: checking }),

  setError: (error) => set({ lastError: error }),

  clearError: () => set({ lastError: null }),

  clearInfo: () => {
    set({ info: null, lastError: null });
    void storageSet(STORAGE_KEY, null);
  },
}));