// src/store/useSleepStore.ts
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

// 🔥 用一个模块级变量记录真实状态，彻底杜绝异步读取延迟
let currentSleepState: SleepState = EMPTY;

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
      currentSleepState = merged; // 🔥 同步更新模块变量
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
    currentSleepState = next; // 🔥 立即同步
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
    currentSleepState = next; // 🔥 立即同步
    set({ state: next });
    persist(next);
  },

  stop: () => {
    const current = get().state;
    const total = Math.round(current.totalSeconds);
    currentSleepState = EMPTY; // 🔥 立即同步
    set({ state: EMPTY });
    persist(EMPTY);
    return total;
  },

  reset: () => {
    currentSleepState = EMPTY;
    set({ state: EMPTY });
    persist(EMPTY);
  },
}));

// 🔥 新增导出：提供一个绝对同步的瞬时读取方法，供 WuliliStore 和 GameLoop 调用
export function getIsSleepingSync(): boolean {
  // 优先从同步变量读，防止 React 渲染延迟
  return currentSleepState.isSleeping === true;
}
