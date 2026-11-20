// src/store/useStreamStore.ts
import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/stream-state';
const ABS_START_KEY = '@wulili/stream_abs_start_time'; // 🔥 独立的绝对时间锚点

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

function persist(state: StreamState): void {
  void storageSet(STORAGE_KEY, state);
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
      startedAt: now,
      lastTickAt: now,
      accumulatedCoins: 0,
      totalSeconds: 0,
    };
    currentStreamState = next;
    set({ state: next });
    persist(next);

    // 🔥 强行写入绝对时间，绝不丢失
    AsyncStorage.setItem(ABS_START_KEY, now.toString()).catch(() => {});
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
    
    // 🔥 下播时清理时间锚点
    AsyncStorage.removeItem(ABS_START_KEY).catch(() => {});
    return total;
  },

  reset: () => {
    currentStreamState = EMPTY;
    set({ state: EMPTY });
    persist(EMPTY);
    AsyncStorage.removeItem(ABS_START_KEY).catch(() => {});
  },
}));
