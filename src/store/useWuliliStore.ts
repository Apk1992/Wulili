import { create } from 'zustand';
import type {
  ActionFeedback,
  ActionType,
  IllnessType,
  WuliliState,
  WuliliStats,
} from '@/types/wulili';
import { INITIAL_WULILI_STATE, STAT_LIMITS } from '@/types/wulili';
import { STORAGE_KEYS, storageGet, storageSet } from '@/utils/storage';
import { clamp, chance, randomFloat } from '@/utils/random';
import { getDateKey, HOUR_MS } from '@/utils/time';
import { aggregateBonus, type AggregatedBonus } from '@/utils/equipmentBonus';
import {
  computeSleepDeprivation,
  SLEEP_CONFIG,
} from '@/data/sleepConfig';
import {
  MENSTRUAL_CONFIG,
  randomCycleLength,
  getMedicineExpireAt,
} from '@/data/menstrualConfig';

interface WuliliStore {
  state: WuliliState;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  persist: () => Promise<void>;
  applyTimeDecay: () => void;
  setStat: (key: keyof WuliliStats, value: number) => void;
  addStats: (delta: Partial<WuliliStats>) => void;
  addCoins: (amount: number) => void;
  addStreamSeconds: (seconds: number) => void;
  addSleepSeconds: (seconds: number) => void;
  setAffinity: (value: number) => void;
  setIllness: (type: IllnessType, severity: number) => void;
  clearIllness: () => void;
  takeMenstrualMedicine: () => void;
  checkAndRollCycle: () => void;
  markInteraction: (action: ActionType) => void;
  recordFoodCategory: (category: 'healthy' | 'junk') => void;
  recordDessert: () => void;
  ownOutfit: (id: string) => void;
  ownAccessory: (id: string) => void;
  wearOutfit: (id: string | null) => void;
  wearAccessory: (id: string | null) => void;
  applyActionFeedback: (feedback: ActionFeedback) => void;
  updateLoginStreak: () => void;
  getEquipmentBonus: () => AggregatedBonus;
  reset: () => void;
}

function clampStat(key: keyof WuliliStats, value: number): number {
  const limits = STAT_LIMITS[key];
  return clamp(value, limits.min, limits.max);
}

function isStreamingNow(): boolean {
  try {
    const { useStreamStore } = require('@/store/useStreamStore');
    return useStreamStore.getState().state.isStreaming === true;
  } catch {
    return false;
  }
}

function isSleepingNow(): boolean {
  try {
    const { useSleepStore } = require('@/store/useSleepStore');
    return useSleepStore.getState().state.isSleeping === true;
  } catch {
    return false;
  }
}

function getBonus(): AggregatedBonus {
  try {
    const { useAppConfigStore } = require('@/store/useAppConfigStore');
    const cfg = useAppConfigStore.getState();
    const outfit = cfg.getOutfitById
      ? cfg.getOutfitById(useWuliliStore.getState().state.currentOutfit)
      : null;
    const accessory = cfg.getAccessoryById
      ? cfg.getAccessoryById(useWuliliStore.getState().state.currentAccessory)
      : null;
    return aggregateBonus(outfit, accessory);
  } catch {
    return {
      moodDecayRate: 1,
      energyCostRate: 1,
      affinityGain: 0,
      streamIncomeRate: 1,
      moodRecoveryRate: 1,
      illnessResistance: 0,
      sleepRecoveryRate: 1,
    };
  }
}

function pickRandomSleepIllness(): IllnessType {
  return chance(0.6) ? 'cold' : 'fever';
}

function applyDecayToStats(state: WuliliState, elapsedHours: number): WuliliState {
  const hours = clamp(elapsedHours, 0, 24 * 7);
  if (hours <= 0) return state;

  const streaming = isStreamingNow();
  const sleeping = isSleepingNow();
  const bonus = getBonus();
  const sleepDeprivation = computeSleepDeprivation(
    state.lastSleptAt,
    state.createdAt,
  );

  // 月经影响
  const menstrual = state.menstrual;
  const now = Date.now();
  const dayInCycle =
    menstrual.cycleStartAt !== null
      ? Math.floor((now - menstrual.cycleStartAt) / (24 * 60 * 60 * 1000)) + 1
      : 0;
  const inPeriod =
    dayInCycle >= 1 && dayInCycle <= MENSTRUAL_CONFIG.periodDays;
  const medicineActive =
    menstrual.medicineExpireAt !== null && now < menstrual.medicineExpireAt;
  const menstrualPenalty = inPeriod ? (medicineActive ? 0.3 : 1.0) : 0;

  const hungerDecay = 3.2 * hours;
  const energyDecay =
    streaming || sleeping
      ? 0
      : 2.6 * hours * bonus.energyCostRate * (1 + menstrualPenalty * 0.5);
  const moodDecayBase =
    streaming || sleeping
      ? 0
      : 1.6 *
        hours *
        bonus.moodDecayRate *
        sleepDeprivation.moodDecayMultiplier *
        (1 + menstrualPenalty * 1.0);

  let moodDecay = moodDecayBase;
  if (!streaming && !sleeping) {
    if (state.stats.hunger < 30) moodDecay += 1.4 * hours;
    if (state.stats.health < 40) moodDecay += 1.2 * hours;
    if (state.illness.type !== 'none') moodDecay += 1.6 * hours;
  }

  let healthDecay = 0.5 * hours;
  if (state.stats.hunger < 20) healthDecay += 1.6 * hours;
  if (state.stats.energy < 15 && !streaming && !sleeping) {
    healthDecay += 1.2 * hours;
  }
  if (inPeriod) {
    healthDecay += 0.5 * hours * (medicineActive ? 0.3 : 1.0);
  }

  const newStats: WuliliStats = {
    hunger: clampStat('hunger', state.stats.hunger - hungerDecay),
    mood: clampStat('mood', state.stats.mood - moodDecay),
    health: clampStat('health', state.stats.health - healthDecay),
    energy: clampStat('energy', state.stats.energy - energyDecay),
    weight: state.stats.weight,
  };

  let illness = state.illness;
  if (illness.type === 'none') {
    const rhinitisRisk =
      computeRhinitisRisk(newStats, hours) * (1 - bonus.illnessResistance);
    const sleepIllnessRisk = sleeping
      ? 0
      : sleepDeprivation.illnessRiskPerHour *
        hours *
        (1 - bonus.illnessResistance);

    if (chance(sleepIllnessRisk)) {
      illness = {
        type: pickRandomSleepIllness(),
        since: Date.now(),
        severity: 1.2,
      };
    } else if (chance(rhinitisRisk)) {
      illness = { type: 'rhinitis', since: Date.now(), severity: 1 };
    }
  } else {
    const recoveryChance = 0.05 * hours * (newStats.health / 100);
    if (chance(recoveryChance)) {
      illness = { type: 'none', since: null, severity: 0 };
    } else {
      illness = {
        ...illness,
        severity: clamp(illness.severity + 0.02 * hours, 0, 5),
      };
    }
  }

  return {
    ...state,
    stats: newStats,
    illness,
    lastTickAt: Date.now(),
  };
}

function computeRhinitisRisk(stats: WuliliStats, hours: number): number {
  let risk = 0;
  if (stats.health < 50) risk += (50 - stats.health) / 500;
  if (stats.energy < 30) risk += (30 - stats.energy) / 600;
  if (stats.hunger < 30) risk += (30 - stats.hunger) / 700;
  risk *= clamp(hours, 0.5, 4);
  return clamp(risk, 0, 0.35);
}

function migrateState(stored: Partial<WuliliState>): WuliliState {
  const menstrual = stored.menstrual ?? INITIAL_WULILI_STATE.menstrual;
  return {
    ...INITIAL_WULILI_STATE,
    ...stored,
    stats: { ...INITIAL_WULILI_STATE.stats, ...(stored.stats ?? {}) },
    illness: { ...INITIAL_WULILI_STATE.illness, ...(stored.illness ?? {}) },
    menstrual: {
      cycleStartAt: menstrual.cycleStartAt ?? null,
      cycleLengthDays:
        typeof menstrual.cycleLengthDays === 'number'
          ? menstrual.cycleLengthDays
          : MENSTRUAL_CONFIG.baseCycleDays,
      medicineExpireAt: menstrual.medicineExpireAt ?? null,
    },
    totalStreamSeconds:
      typeof stored.totalStreamSeconds === 'number'
        ? stored.totalStreamSeconds
        : 0,
    totalSleepSeconds:
      typeof stored.totalSleepSeconds === 'number'
        ? stored.totalSleepSeconds
        : 0,
    consecutiveDessert:
      typeof stored.consecutiveDessert === 'number'
        ? stored.consecutiveDessert
        : 0,
    lastSleptAt:
      typeof stored.lastSleptAt === 'number' ? stored.lastSleptAt : null,
  };
}

export const useWuliliStore = create<WuliliStore>((set, get) => ({
  state: INITIAL_WULILI_STATE,
  hydrated: false,

  hydrate: async () => {
    const stored = await storageGet<Partial<WuliliState>>(STORAGE_KEYS.wuliliState);
    if (stored && typeof stored === 'object') {
      const merged = migrateState(stored);
      if (merged.menstrual.cycleStartAt === null) {
        merged.menstrual = {
          cycleStartAt: Date.now(),
          cycleLengthDays: randomCycleLength(),
          medicineExpireAt: null,
        };
      }
      const nextState = rollCycleIfNeeded(merged);
      const elapsed = (Date.now() - (nextState.lastTickAt ?? Date.now())) / HOUR_MS;
      const decayed = applyDecayToStats(nextState, elapsed);
      set({ state: decayed, hydrated: true });
      await storageSet(STORAGE_KEYS.wuliliState, decayed);
      return;
    }
    const fresh: WuliliState = {
      ...INITIAL_WULILI_STATE,
      menstrual: {
        cycleStartAt: Date.now(),
        cycleLengthDays: randomCycleLength(),
        medicineExpireAt: null,
      },
    };
    set({ state: fresh, hydrated: true });
    await storageSet(STORAGE_KEYS.wuliliState, fresh);
  },

  persist: async () => {
    await storageSet(STORAGE_KEYS.wuliliState, get().state);
  },

  applyTimeDecay: () => {
    const current = get().state;
    const rolled = rollCycleIfNeeded(current);
    const elapsed = (Date.now() - rolled.lastTickAt) / HOUR_MS;
    if (elapsed < 0.0005) {
      if (rolled !== current) {
        set({ state: rolled });
        void storageSet(STORAGE_KEYS.wuliliState, rolled);
      }
      return;
    }
    const next = applyDecayToStats(rolled, elapsed);
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  setStat: (key, value) => {
    const next = {
      ...get().state,
      stats: { ...get().state.stats, [key]: clampStat(key, value) },
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  addStats: (delta) => {
    const current = get().state;
    const bonus = getBonus();
    const newStats: WuliliStats = { ...current.stats };
    (Object.keys(delta) as Array<keyof WuliliStats>).forEach((key) => {
      let d = delta[key];
      if (typeof d !== 'number') return;
      if (d < 0) {
        if (key === 'mood') d = d * bonus.moodDecayRate;
        if (key === 'energy') d = d * bonus.energyCostRate;
      } else {
        if (key === 'mood') d = d * bonus.moodRecoveryRate;
      }
      newStats[key] = clampStat(key, newStats[key] + d);
    });
    const next = { ...current, stats: newStats };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  addCoins: (amount) => {
    const current = get().state;
    const next = { ...current, coins: Math.max(0, current.coins + amount) };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  addStreamSeconds: (seconds) => {
    if (seconds <= 0) return;
    const current = get().state;
    const next = {
      ...current,
      totalStreamSeconds: current.totalStreamSeconds + seconds,
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  addSleepSeconds: (seconds) => {
    if (seconds <= 0) return;
    const current = get().state;
    const next = {
      ...current,
      totalSleepSeconds: current.totalSleepSeconds + seconds,
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  setAffinity: (value) => {
    const current = get().state;
    const next = { ...current, affinity: clamp(value, 0, 100) };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  setIllness: (type, severity) => {
    const current = get().state;
    const next = {
      ...current,
      illness: {
        type,
        since: type === 'none' ? null : Date.now(),
        severity: clamp(severity, 0, 5),
      },
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  clearIllness: () => {
    const current = get().state;
    const next = { ...current, illness: { type: 'none', since: null, severity: 0 } };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  takeMenstrualMedicine: () => {
    const current = get().state;
    const next = {
      ...current,
      menstrual: {
        ...current.menstrual,
        medicineExpireAt: getMedicineExpireAt(),
      },
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  checkAndRollCycle: () => {
    const current = get().state;
    const next = rollCycleIfNeeded(current);
    if (next !== current) {
      set({ state: next });
      void storageSet(STORAGE_KEYS.wuliliState, next);
    }
  },

  markInteraction: (action) => {
    const now = Date.now();
    const current = get().state;
    const next: WuliliState = {
      ...current,
      lastInteractionAt: now,
    };
    if (action === 'feed') next.lastFedAt = now;
    if (action === 'entertain') next.lastEntertainedAt = now;
    if (action === 'stream') next.lastStreamedAt = now;
    if (action === 'exercise') next.lastExercisedAt = now;
    if (action === 'medicine') next.lastMedicineAt = now;
    if (action === 'sleep') next.lastSleptAt = now;
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  recordFoodCategory: (category) => {
    const current = get().state;
    const next: WuliliState = {
      ...current,
      consecutiveHealthyFood:
        category === 'healthy' ? current.consecutiveHealthyFood + 1 : 0,
      consecutiveJunkFood:
        category === 'junk' ? current.consecutiveJunkFood + 1 : 0,
      // 吃正餐 → 重置甜点连续计数
      consecutiveDessert: 0,
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  recordDessert: () => {
    const current = get().state;
    const next: WuliliState = {
      ...current,
      consecutiveDessert: current.consecutiveDessert + 1,
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  ownOutfit: (id) => {
    const current = get().state;
    if (current.ownedOutfits.includes(id)) return;
    const next = { ...current, ownedOutfits: [...current.ownedOutfits, id] };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  ownAccessory: (id) => {
    const current = get().state;
    if (current.ownedAccessories.includes(id)) return;
    const next = { ...current, ownedAccessories: [...current.ownedAccessories, id] };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  wearOutfit: (id) => {
    const current = get().state;
    if (id !== null && !current.ownedOutfits.includes(id)) return;
    const next = { ...current, currentOutfit: id };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  wearAccessory: (id) => {
    const current = get().state;
    if (id !== null && !current.ownedAccessories.includes(id)) return;
    const next = { ...current, currentAccessory: id };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  applyActionFeedback: (feedback) => {
    const current = get().state;
    const newStats: WuliliStats = { ...current.stats };
    (Object.keys(feedback.deltaStats) as Array<keyof WuliliStats>).forEach((key) => {
      const d = feedback.deltaStats[key];
      if (typeof d === 'number') {
        newStats[key] = clampStat(key, newStats[key] + d);
      }
    });
    const next: WuliliState = {
      ...current,
      stats: newStats,
      coins: Math.max(0, current.coins + feedback.deltaCoins),
      affinity: clamp(current.affinity + feedback.deltaAffinity, 0, 100),
      illness:
        feedback.triggeredIllness && feedback.triggeredIllness !== 'none'
          ? { type: feedback.triggeredIllness, since: Date.now(), severity: 1 }
          : current.illness,
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  updateLoginStreak: () => {
    const current = get().state;
    const today = getDateKey();
    if (current.lastLoginDate === today) return;
    const yesterday = getDateKey(new Date(Date.now() - 24 * HOUR_MS));
    const streak =
      current.lastLoginDate === yesterday ? current.consecutiveDaysLoggedIn + 1 : 1;
    const bonusCoins = streak >= 7 ? 30 : streak >= 3 ? 15 : 5;
    const next: WuliliState = {
      ...current,
      lastLoginDate: today,
      consecutiveDaysLoggedIn: streak,
      coins: current.coins + bonusCoins,
    };
    set({ state: next });
    void storageSet(STORAGE_KEYS.wuliliState, next);
  },

  getEquipmentBonus: () => getBonus(),

  reset: () => {
    const fresh: WuliliState = {
      ...INITIAL_WULILI_STATE,
      createdAt: Date.now(),
      lastTickAt: Date.now(),
      menstrual: {
        cycleStartAt: Date.now(),
        cycleLengthDays: randomCycleLength(),
        medicineExpireAt: null,
      },
    };
    set({ state: fresh });
    void storageSet(STORAGE_KEYS.wuliliState, fresh);
  },
}));

function rollCycleIfNeeded(state: WuliliState): WuliliState {
  const m = state.menstrual;
  if (!m.cycleStartAt) return state;
  const cycleMs = m.cycleLengthDays * 24 * 60 * 60 * 1000;
  const now = Date.now();
  if (now - m.cycleStartAt >= cycleMs) {
    return {
      ...state,
      menstrual: {
        cycleStartAt: now,
        cycleLengthDays: randomCycleLength(),
        medicineExpireAt: null,
      },
    };
  }
  return state;
}

export function pickRandomIllnessSeverity(): number {
  return clamp(randomFloat(0.8, 2.2), 0, 5);
}

void SLEEP_CONFIG;