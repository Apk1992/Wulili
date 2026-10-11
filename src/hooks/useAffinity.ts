import { useCallback } from 'react';
import { useWuliliStore } from '@/store/useWuliliStore';
import { clamp } from '@/utils/random';

const MAX_AFFINITY = 100;
const MIN_AFFINITY = 0;

export interface UseAffinityResult {
  affinity: number;
  level: number;
  levelLabel: string;
  progressToNext: number;
  gain: (amount: number) => void;
  lose: (amount: number) => void;
}

const LEVEL_LABELS: readonly string[] = [
  '陌生',
  '初识',
  '熟悉',
  '亲近',
  '信赖',
  '挚友',
  '不可替代',
];

export function getAffinityLevelLabel(affinity: number): string {
  const level = getAffinityLevel(affinity);
  return LEVEL_LABELS[level] ?? LEVEL_LABELS[LEVEL_LABELS.length - 1];
}

export function getAffinityLevel(affinity: number): number {
  const clamped = clamp(affinity, MIN_AFFINITY, MAX_AFFINITY);
  if (clamped >= 95) return 6;
  if (clamped >= 80) return 5;
  if (clamped >= 60) return 4;
  if (clamped >= 40) return 3;
  if (clamped >= 20) return 2;
  if (clamped >= 5) return 1;
  return 0;
}

export function useAffinity(): UseAffinityResult {
  const affinity = useWuliliStore((s) => s.state.affinity);
  const setAffinity = useWuliliStore((s) => s.setAffinity);

  const gain = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      const current = useWuliliStore.getState().state.affinity;
      const next = clamp(current + amount, MIN_AFFINITY, MAX_AFFINITY);
      setAffinity(next);
    },
    [setAffinity],
  );

  const lose = useCallback(
    (amount: number) => {
      if (amount <= 0) return;
      const current = useWuliliStore.getState().state.affinity;
      const next = clamp(current - amount, MIN_AFFINITY, MAX_AFFINITY);
      setAffinity(next);
    },
    [setAffinity],
  );

  const level = getAffinityLevel(affinity);
  const levelLabel = getAffinityLevelLabel(affinity);
  const progressToNext = getProgressToNextLevel(affinity);

  return {
    affinity,
    level,
    levelLabel,
    progressToNext,
    gain,
    lose,
  };
}

function getProgressToNextLevel(affinity: number): number {
  const clamped = clamp(affinity, MIN_AFFINITY, MAX_AFFINITY);
  const thresholds = [5, 20, 40, 60, 80, 95, 100];
  for (let i = 0; i < thresholds.length; i += 1) {
    if (clamped < thresholds[i]) {
      const prev = i === 0 ? 0 : thresholds[i - 1];
      const span = thresholds[i] - prev;
      if (span <= 0) return 1;
      return (clamped - prev) / span;
    }
  }
  return 1;
}