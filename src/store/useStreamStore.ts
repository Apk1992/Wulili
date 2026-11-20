// src/store/useStreamStore.ts
import { create } from 'zustand';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/stream-state';

export interface StreamState {
  isStreaming: boolean;
  startedAt: number | null; // 🔥 核心：记录绝对的开播时间点
  lastTickAt: number | null;
  accumulatedCoins: number;
  totalSeconds: number;
}

interface StreamStore {
  state: StreamState;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  start: () => void;
  tick: (
    deltaMs: number,
    earningsPerSecond: number,
    energyCostPerSec: number,
    moodCostPerSec: number,
    applyCosts: (energyCost: number, moodCost: number) => void,
    onSecondsAccumulated?: (deltaSeconds: number) => void,
  ) => void;
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

let currentStreamState: StreamState = EMPTY;

// 同步强制写入（无视异步排队，尽最大可能防丢）
function persist(state: StreamState): void {
  storageSet(STORAGE_KEY, state);
}

export const useStreamStore = create<StreamStore>((set, get) => ({
  state: EMPTY,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<StreamState>(STORAGE_KEY);
    if (stored && typeof stored === 'object') {
      const merged: StreamState = { ...EMPTY, ...stored };
      currentStreamState = merged;
      set({ state: merged, hydrated: true });
      return;
    }
    set({ hydrated: true });
  },

  start: () => {
    const now = Date.now();
    const next: StreamState = {
      isStreaming: true,
      startedAt: now, // 🔥 记录绝对时间
      lastTickAt: now,
      accumulatedCoins: 0,
      totalSeconds: 0,
    };
    currentStreamState = next;
    set({ state: next });
    persist(next);
  },

  tick: (
    deltaMs,
    earningsPerSecond,
    energyCostPerSec,
    moodCostPerSec,
    applyCosts,
    onSecondsAccumulated,
  ) => {
    const current = get().state;
    if (!current.isStreaming) return;

    const deltaSec = Math.max(0, deltaMs / 1000);
    if (deltaSec <= 0) return;

    const earned = earningsPerSecond * deltaSec;
    const energyCost = energyCostPerSec * deltaSec;
    const moodCost = moodCostPerSec * deltaSec;

    applyCosts(energyCost, moodCost);

    if (onSecondsAccumulated) {
      onSecondsAccumulated(deltaSec);
    }

    const next: StreamState = {
      ...current,
      lastTickAt: Date.now(),
      accumulatedCoins: current.accumulatedCoins + earned,
      totalSeconds: current.totalSeconds + deltaSec,
    };
    currentStreamState = next;
    set({ state: next });
    persist(next);
  },

  addEarnings: (coins) => {
    const current = get().state;
    const next: StreamState = {
      ...current,
      accumulatedCoins: current.accumulatedCoins + coins,
    };
    currentStreamState = next;
    set({ state: next });
    persist(next);
  },

  stop: () => {
    const current = get().state;
    const total = Math.round(current.accumulatedCoins);
    currentStreamState = EMPTY;
    set({ state: EMPTY });
    persist(EMPTY);
    return total;
  },

  reset: () => {
    currentStreamState = EMPTY;
    set({ state: EMPTY });
    persist(EMPTY);
  },
}));

export function getStreamStateSync(): StreamState {
  return currentStreamState;
}
