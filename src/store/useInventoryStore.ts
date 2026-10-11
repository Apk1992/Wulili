import { create } from 'zustand';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/inventory';

export interface InventoryEntry {
  id: string;
  count: number;
}

export interface InventoryState {
  foods: Record<string, number>;
  medicines: Record<string, number>;
}

interface InventoryStore {
  inventory: InventoryState;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addFood: (id: string, count?: number) => void;
  addMedicine: (id: string, count?: number) => void;
  consumeFood: (id: string) => boolean;
  consumeMedicine: (id: string) => boolean;
  getFoodCount: (id: string) => number;
  getMedicineCount: (id: string) => number;
  clear: () => void;
}

const EMPTY: InventoryState = { foods: {}, medicines: {} };

function persist(inv: InventoryState): void {
  void storageSet(STORAGE_KEY, inv);
}

export const useInventoryStore = create<InventoryStore>((set, get) => ({
  inventory: EMPTY,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<InventoryState>(STORAGE_KEY);
    if (stored) {
      set({
        inventory: {
          foods: stored.foods ?? {},
          medicines: stored.medicines ?? {},
        },
        hydrated: true,
      });
      return;
    }
    set({ hydrated: true });
  },

  addFood: (id, count = 1) => {
    const inv = get().inventory;
    const cur = inv.foods[id] ?? 0;
    const next: InventoryState = {
      ...inv,
      foods: { ...inv.foods, [id]: Math.max(0, cur + count) },
    };
    set({ inventory: next });
    persist(next);
  },

  addMedicine: (id, count = 1) => {
    const inv = get().inventory;
    const cur = inv.medicines[id] ?? 0;
    const next: InventoryState = {
      ...inv,
      medicines: { ...inv.medicines, [id]: Math.max(0, cur + count) },
    };
    set({ inventory: next });
    persist(next);
  },

  consumeFood: (id) => {
    const inv = get().inventory;
    const cur = inv.foods[id] ?? 0;
    if (cur <= 0) return false;
    const next: InventoryState = {
      ...inv,
      foods: { ...inv.foods, [id]: cur - 1 },
    };
    set({ inventory: next });
    persist(next);
    return true;
  },

  consumeMedicine: (id) => {
    const inv = get().inventory;
    const cur = inv.medicines[id] ?? 0;
    if (cur <= 0) return false;
    const next: InventoryState = {
      ...inv,
      medicines: { ...inv.medicines, [id]: cur - 1 },
    };
    set({ inventory: next });
    persist(next);
    return true;
  },

  getFoodCount: (id) => get().inventory.foods[id] ?? 0,

  getMedicineCount: (id) => get().inventory.medicines[id] ?? 0,

  clear: () => {
    set({ inventory: EMPTY });
    persist(EMPTY);
  },
}));