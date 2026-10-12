import { create } from 'zustand';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/stream-state';

export interface StreamState {
  isStreaming: boolean;
  startedAt: number | null;
  lastTickAt: number | null;
  accumulatedCoins: number;
  totalSeconds: number;
}

interface StreamStore {
  state: StreamState;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  start: () => void;
  tick: (deltaMs: number, earningsPerSecond: number, energyCostPerSec: number, moodCostPerSec: number, applyCosts: (energyCost: number, moodCost: number) => void) => void;
  addEarnings: (coins: number) => void;
  stop: () => number;
  reset: () => void;
}

const EMPTY: StreamState = {
  isStreaming: false,
  startedAt: null,
  lastTickAt: null,
  accumulatedCoins: 0,
  totalSeconds: 0,
};

function persist(state: StreamState): void {
  void storageSet(STORAGE_KEY, state);
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  state: EMPTY,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<StreamState>(STORAGE_KEY);
    if (stored && typeof stored === 'object') {
      const merged: StreamState = {
        ...EMPTY,
        ...stored,
      };
      set({ state: merged, hydrated: true });
      return;
    }
    set({ hydrated: true });
  },

  start: () => {
    const next: StreamState = {
      isStreaming: true,
      startedAt: Date.now(),
      lastTickAt: Date.now(),
      accumulatedCoins: 0,
      totalSeconds: 0,
    };
    set({ state: next });
    persist(next);
  },

  tick: (deltaMs, earningsPerSecond, energyCostPerSec, moodCostPerSec, applyCosts) => {
    const current = get().state;
    if (!current.isStreaming) return;

    const deltaSec = Math.max(0, deltaMs / 1000);
    if (deltaSec <= 0) return;

    const earned = earningsPerSecond * deltaSec;
    const energyCost = energyCostPerSec * deltaSec;
    const moodCost = moodCostPerSec * deltaSec;

    applyCosts(energyCost, moodCost);

    const next: StreamState = {
      ...current,
      lastTickAt: Date.now(),
      accumulatedCoins: current.accumulatedCoins + earned,
      totalSeconds: current.totalSeconds + deltaSec,
    };
    set({ state: next });
    persist(next);
  },

  addEarnings: (coins) => {
    const current = get().state;
    const next: StreamState = {
      ...current,
      accumulatedCoins: current.accumulatedCoins + coins,
    };
    set({ state: next });
    persist(next);
  },

  stop: () => {
    const current = get().state;
    const total = Math.round(current.accumulatedCoins);
    set({ state: EMPTY });
    persist(EMPTY);
    return total;
  },

  reset: () => {
    set({ state: EMPTY });
    persist(EMPTY);
  },
}));