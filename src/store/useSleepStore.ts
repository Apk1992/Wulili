import { create } from 'zustand';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/sleep-state';

export interface SleepState {
  isSleeping: boolean;
  startedAt: number | null;
  lastTickAt: number | null;
  totalSeconds: number;
}

interface SleepStore {
  state: SleepState;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  start: () => void;
  tick: (
    deltaMs: number,
    recoveryPerSecond: {
      energy: number;
      mood: number;
      health: number;
    },
    applyRecovery: (energy: number, mood: number, health: number) => void,
    onSecondsAccumulated?: (deltaSeconds: number) => void,
  ) => void;
  stop: () => number;
  reset: () => void;
}

const EMPTY: SleepState = {
  isSleeping: false,
  startedAt: null,
  lastTickAt: null,
  totalSeconds: 0,
};

function persist(state: SleepState): void {
  void storageSet(STORAGE_KEY, state);
}

export const useSleepStore = create<SleepStore>((set, get) => ({
  state: EMPTY,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<SleepState>(STORAGE_KEY);
    if (stored && typeof stored === 'object') {
      const merged: SleepState = { ...EMPTY, ...stored };
      set({ state: merged, hydrated: true });
      return;
    }
    set({ hydrated: true });
  },

  start: () => {
    const next: SleepState = {
      isSleeping: true,
      startedAt: Date.now(),
      lastTickAt: Date.now(),
      totalSeconds: 0,
    };
    set({ state: next });
    persist(next);
  },

  tick: (deltaMs, recoveryPerSecond, applyRecovery, onSecondsAccumulated) => {
    const current = get().state;
    if (!current.isSleeping) return;

    const deltaSec = Math.max(0, deltaMs / 1000);
    if (deltaSec <= 0) return;

    const energyGain = recoveryPerSecond.energy * deltaSec;
    const moodGain = recoveryPerSecond.mood * deltaSec;
    const healthGain = recoveryPerSecond.health * deltaSec;

    applyRecovery(energyGain, moodGain, healthGain);

    if (onSecondsAccumulated) {
      onSecondsAccumulated(deltaSec);
    }

    const next: SleepState = {
      ...current,
      lastTickAt: Date.now(),
      totalSeconds: current.totalSeconds + deltaSec,
    };
    set({ state: next });
    persist(next);
  },

  stop: () => {
    const current = get().state;
    const total = Math.round(current.totalSeconds);
    set({ state: EMPTY });
    persist(EMPTY);
    return total;
  },

  reset: () => {
    set({ state: EMPTY });
    persist(EMPTY);
  },
}));