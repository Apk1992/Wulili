import { create } from 'zustand';
import { useWuliliStore } from './useWuliliStore';
import { useDialogueStore } from './useDialogueStore';
import { useAppConfigStore } from './useAppConfigStore';
import { clamp } from '@/utils/random';
import type { MinigameOutcome, MinigameResult } from '@/types/minigame';
import { storageGet, storageSet } from '@/utils/storage';

const STORAGE_KEY = '@wulili/minigame-stats';

export interface MinigameStatEntry {
  minigameId: string;
  levelId: string;
  plays: number;
  bestScore: number;
  victories: number;
  lastPlayedAt: number;
}

interface MinigameStore {
  stats: Record<string, MinigameStatEntry>;
  hydrated: boolean;
  isPlaying: boolean;
  activeMinigameId: string | null;
  activeLevelId: string | null;

  hydrate: () => Promise<void>;
  startSession: (minigameId: string, levelId: string, energyCost?: number) => boolean;
  finishSession: (outcome: MinigameOutcome) => void;
  abortSession: () => void;
  getStat: (minigameId: string, levelId: string) => MinigameStatEntry | null;
  canPlay: (energyCost: number) => boolean;
  resetStats: () => void;
}

function statKey(minigameId: string, levelId: string): string {
  return `${minigameId}::${levelId}`;
}

function persist(stats: Record<string, MinigameStatEntry>): void {
  void storageSet(STORAGE_KEY, stats);
}

export const useMinigameStore = create<MinigameStore>((set, get) => ({
  stats: {},
  hydrated: false,
  isPlaying: false,
  activeMinigameId: null,
  activeLevelId: null,

  hydrate: async () => {
    const stored = await storageGet<Record<string, MinigameStatEntry>>(STORAGE_KEY);
    set({ stats: stored ?? {}, hydrated: true });
  },

  canPlay: (energyCost) => {
    const energy = useWuliliStore.getState().state.stats.energy;
    return energy >= energyCost;
  },

// 实现
  startSession: (minigameId, levelId, energyCost) => {
    const cfg = useAppConfigStore.getState();
    const entry = cfg.getMinigameById(minigameId);

  // R2 index 来的 entry 可能不在 config.minigames 里
  // 优先用调用方传的 energyCost（来自 levels.json）
    const cost = energyCost ?? entry?.energyCost ?? 10;

    if (!get().canPlay(cost)) return false;

    set({
      isPlaying: true,
      activeMinigameId: minigameId,
      activeLevelId: levelId,
    });
    return true;
  },

  finishSession: (outcome) => {
    const wulili = useWuliliStore.getState();

    const moodGain = outcome.result === 'victory' ? outcome.moodGain : Math.round(outcome.moodGain * 0.3);
    const coinGain = outcome.result === 'victory' ? outcome.coinReward : Math.round(outcome.coinReward * 0.2);

    wulili.addStats({
      mood: moodGain,
      energy: -outcome.energyCost,
    });
    if (coinGain > 0) wulili.addCoins(coinGain);
    wulili.markInteraction('entertain');

    const key = statKey(outcome.minigameId, outcome.levelId);
    const prev = get().stats[key];
    const next: MinigameStatEntry = {
      minigameId: outcome.minigameId,
      levelId: outcome.levelId,
      plays: (prev?.plays ?? 0) + 1,
      bestScore: Math.max(prev?.bestScore ?? 0, outcome.score),
      victories: (prev?.victories ?? 0) + (outcome.result === 'victory' ? 1 : 0),
      lastPlayedAt: Date.now(),
    };
    const stats = { ...get().stats, [key]: next };
    set({
      stats,
      isPlaying: false,
      activeMinigameId: null,
      activeLevelId: null,
    });
    persist(stats);

    void useDialogueStore.getState();
  },

  abortSession: () => {
    set({ isPlaying: false, activeMinigameId: null, activeLevelId: null });
  },

  getStat: (minigameId, levelId) => get().stats[statKey(minigameId, levelId)] ?? null,

  resetStats: () => {
    set({ stats: {} });
    persist({});
  },
}));

export function computeMinigameResult(score: number, target: number): MinigameResult {
  if (score >= target) return 'victory';
  return 'defeat';
}

export function computeMoodFromResult(
  result: MinigameResult,
  baseMoodGain: number,
): number {
  const factor = result === 'victory' ? 1 : 0.3;
  return Math.round(clamp(baseMoodGain * factor, 0, 50));
}
