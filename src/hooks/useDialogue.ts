import { useCallback, useMemo } from 'react';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { hoursSince, getTimeOfDay } from '@/utils/time';
import { weightedPick, chance } from '@/utils/random';
import type {
  Dialogue,
  DialogueSelectionContext,
  TriggerCondition,
} from '@/types/dialogue';
import type { ActionType, FoodCategory } from '@/types/wulili';

export interface UseDialogueResult {
  speak: (options?: SpeakOptions) => Dialogue | null;
  peek: (options?: SpeakOptions) => Dialogue | null;
  resetRuntime: () => void;
}

export interface SpeakOptions {
  action?: ActionType;
  foodCategory?: FoodCategory;
  forceCategory?: Dialogue['category'];
  minAffinity?: number;
}

export function useDialogue(): UseDialogueResult {
  const dialogues = useDialogueStore((s) => s.dialogues);
  const spoken = useDialogueStore((s) => s.spoken);
  const onceSpoken = useDialogueStore((s) => s.onceSpoken);
  const markSpoken = useDialogueStore((s) => s.markSpoken);

  const buildContext = useCallback(
    (options?: SpeakOptions): DialogueSelectionContext => {
      const w = useWuliliStore.getState().state;
      const cfg = useAppConfigStore.getState();
      void cfg;
      return {
        action: options?.action,
        foodCategory: options?.foodCategory,
        illness: w.illness.type !== 'none' ? w.illness.type : undefined,
        hunger: w.stats.hunger,
        mood: w.stats.mood,
        health: w.stats.health,
        energy: w.stats.energy,
        weight: w.stats.weight,
        affinity: w.affinity,
        coins: w.coins,
        timeOfDay: getTimeOfDay(),
        lastFedHoursAgo: hoursSince(w.lastFedAt),
        lastEntertainedHoursAgo: hoursSince(w.lastEntertainedAt),
        lastStreamedHoursAgo: hoursSince(w.lastStreamedAt),
        lastExercisedHoursAgo: hoursSince(w.lastExercisedAt),
        lastInteractionHoursAgo: hoursSince(w.lastInteractionAt),
        consecutiveJunkFood: w.consecutiveJunkFood,
        consecutiveHealthyFood: w.consecutiveHealthyFood,
      };
    },
    [],
  );

  const pickCandidates = useCallback(
    (ctx: DialogueSelectionContext, options?: SpeakOptions): Dialogue[] => {
      const now = Date.now();
      const filtered: Dialogue[] = [];

      for (const d of dialogues) {
        if (options?.forceCategory && d.category !== options.forceCategory) continue;
        if (options?.action && d.action && d.action !== options.action) continue;
        if (options?.action && !d.action && d.category !== 'idle') {
          const map: Record<ActionType, Dialogue['category']> = {
            feed: 'feed',
            entertain: 'entertain',
            stream: 'stream',
            exercise: 'exercise',
            medicine: 'medicine',
            idle: 'idle',
          };
          if (d.category !== map[options.action]) continue;
        }
        if (options?.foodCategory && d.foodCategory && d.foodCategory !== options.foodCategory) {
          continue;
        }
        if (d.minAffinity !== undefined && ctx.affinity < d.minAffinity) continue;
        if (d.maxAffinity !== undefined && ctx.affinity > d.maxAffinity) continue;
        if (d.once && onceSpoken.includes(d.id)) continue;

        const lastSpokenAt = spoken[d.id];
        if (lastSpokenAt !== undefined && d.cooldownHours > 0) {
          const hours = (now - lastSpokenAt) / (60 * 60 * 1000);
          if (hours < d.cooldownHours) continue;
        }

        if (!allTriggersMatch(d.triggers, ctx)) continue;
        filtered.push(d);
      }

      return filtered;
    },
    [dialogues, onceSpoken, spoken],
  );

  const speak = useCallback(
    (options?: SpeakOptions): Dialogue | null => {
      const ctx = buildContext(options);
      const candidates = pickCandidates(ctx, options);
      if (candidates.length === 0) return null;

      const weighted = candidates.map((d) => ({ item: d, weight: Math.max(0.01, d.weight) }));
      const chosen = weightedPick(weighted);
      if (!chosen) return null;
      if (chance(0.02) && candidates.length > 1) {
        const alt = candidates.find((c) => c.id !== chosen.id);
        if (alt) {
          markSpoken(alt.id);
          return alt;
        }
      }
      markSpoken(chosen.id);
      return chosen;
    },
    [buildContext, pickCandidates, markSpoken],
  );

  const peek = useCallback(
    (options?: SpeakOptions): Dialogue | null => {
      const ctx = buildContext(options);
      const candidates = pickCandidates(ctx, options);
      if (candidates.length === 0) return null;
      const weighted = candidates.map((d) => ({ item: d, weight: Math.max(0.01, d.weight) }));
      return weightedPick(weighted);
    },
    [buildContext, pickCandidates],
  );

  const resetRuntime = useCallback(() => {
    useDialogueStore.getState().resetRuntime();
  }, []);

  return useMemo(
    () => ({ speak, peek, resetRuntime }),
    [speak, peek, resetRuntime],
  );
}

function allTriggersMatch(
  triggers: TriggerCondition[],
  ctx: DialogueSelectionContext,
): boolean {
  if (triggers.length === 0) return true;
  for (const t of triggers) {
    if (!triggerMatches(t, ctx)) return false;
  }
  return true;
}

function triggerMatches(
  trigger: TriggerCondition,
  ctx: DialogueSelectionContext,
): boolean {
  const { type, value } = trigger;
  switch (type) {
    case 'hungerBelow':
      return ctx.hunger < toNumber(value);
    case 'hungerAbove':
      return ctx.hunger > toNumber(value);
    case 'moodBelow':
      return ctx.mood < toNumber(value);
    case 'moodAbove':
      return ctx.mood > toNumber(value);
    case 'healthBelow':
      return ctx.health < toNumber(value);
    case 'healthAbove':
      return ctx.health > toNumber(value);
    case 'energyBelow':
      return ctx.energy < toNumber(value);
    case 'energyAbove':
      return ctx.energy > toNumber(value);
    case 'weightBelow':
      return ctx.weight < toNumber(value);
    case 'weightAbove':
      return ctx.weight > toNumber(value);
    case 'affinityBelow':
      return ctx.affinity < toNumber(value);
    case 'affinityAbove':
      return ctx.affinity > toNumber(value);
    case 'coinsBelow':
      return ctx.coins < toNumber(value);
    case 'coinsAbove':
      return ctx.coins > toNumber(value);
    case 'timeOfDay':
      return ctx.timeOfDay === String(value);
    case 'lastFedHoursAgo':
      return ctx.lastFedHoursAgo !== null && ctx.lastFedHoursAgo >= toNumber(value);
    case 'lastEntertainedHoursAgo':
      return ctx.lastEntertainedHoursAgo !== null && ctx.lastEntertainedHoursAgo >= toNumber(value);
    case 'lastStreamedHoursAgo':
      return ctx.lastStreamedHoursAgo !== null && ctx.lastStreamedHoursAgo >= toNumber(value);
    case 'lastExercisedHoursAgo':
      return ctx.lastExercisedHoursAgo !== null && ctx.lastExercisedHoursAgo >= toNumber(value);
    case 'lastInteractionHoursAgo':
      return ctx.lastInteractionHoursAgo !== null && ctx.lastInteractionHoursAgo >= toNumber(value);
    case 'foodCategory':
      return ctx.foodCategory === value;
    case 'illness':
      return ctx.illness === value;
    case 'consecutiveJunkFood':
      return ctx.consecutiveJunkFood >= toNumber(value);
    case 'consecutiveHealthyFood':
      return ctx.consecutiveHealthyFood >= toNumber(value);
    default:
      return true;
  }
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}