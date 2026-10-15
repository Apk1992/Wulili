import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useSleepStore } from '@/store/useSleepStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { clamp } from '@/utils/random';
import {
  STREAM_CONFIG,
  computeStreamLevel,
  computeDurationBonus,
} from '@/data/streamConfig';
import { SLEEP_CONFIG } from '@/data/sleepConfig';
import { MENSTRUAL_CONFIG } from '@/data/menstrualConfig';
import { aggregateBonus } from '@/utils/equipmentBonus';

const TICK_INTERVAL_MS = 5000;

export interface UseGameLoopResult {
  isRunning: boolean;
}

function isInPeriod(): boolean {
  const w = useWuliliStore.getState().state;
  const m = w.menstrual;
  if (!m.cycleStartAt) return false;
  const dayInCycle =
    Math.floor((Date.now() - m.cycleStartAt) / (24 * 60 * 60 * 1000)) + 1;
  return dayInCycle >= 1 && dayInCycle <= MENSTRUAL_CONFIG.periodDays;
}

function getMenstrualPenalty(): number {
  if (!isInPeriod()) return 0;
  const m = useWuliliStore.getState().state.menstrual;
  const medicineActive =
    m.medicineExpireAt !== null && Date.now() < m.medicineExpireAt;
  return medicineActive ? 0.3 : 1.0;
}

export function useGameLoop(): UseGameLoopResult {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const getBonus = () => {
      const wulili = useWuliliStore.getState().state;
      const cfg = useAppConfigStore.getState();
      const outfit = wulili.currentOutfit
        ? cfg.getOutfitById(wulili.currentOutfit)
        : null;
      const accessory = wulili.currentAccessory
        ? cfg.getAccessoryById(wulili.currentAccessory)
        : null;
      return aggregateBonus(outfit, accessory);
    };

    const processStreamTick = (deltaMs: number) => {
      const streamStore = useStreamStore.getState();
      const stream = streamStore.state;
      if (!stream.isStreaming) return;

      const wulili = useWuliliStore.getState().state;
      const bonus = getBonus();
      const levelInfo = computeStreamLevel(wulili.totalStreamSeconds);
      const levelMultiplier = 1 + levelInfo.bonusRate;
      const durationInfo = computeDurationBonus(stream.totalSeconds);

      const moodFactor = clamp(wulili.stats.mood / 100, 0.2, 1);
      const healthFactor = clamp(wulili.stats.health / 100, 0.3, 1);

      // 经期惩罚
      const menstrualPenalty = getMenstrualPenalty();
      const streamIncomePenalty = 1 - menstrualPenalty * 0.3;   // 最多 -30%
      const energyExtraCost = 1 + menstrualPenalty * 0.3;        // 最多 +30%

      const earningsPerSecond =
        STREAM_CONFIG.baseEarningPerSecond *
        moodFactor *
        healthFactor *
        bonus.streamIncomeRate *
        levelMultiplier *
        durationInfo.multiplier *
        streamIncomePenalty;

      const energyCostPerSecond =
        STREAM_CONFIG.energyCostPerSecond *
        bonus.energyCostRate *
        energyExtraCost;
      const moodCostPerSecond =
        STREAM_CONFIG.moodCostPerSecond *
        bonus.moodDecayRate *
        (1 + menstrualPenalty * 0.5);

      streamStore.tick(
        deltaMs,
        earningsPerSecond,
        energyCostPerSecond,
        moodCostPerSecond,
        (energyCost, moodCost) => {
          useWuliliStore.getState().addStats({
            energy: -energyCost,
            mood: -moodCost,
          });
        },
        (seconds) => {
          useWuliliStore.getState().addStreamSeconds(seconds);
        },
      );

      const afterTick = useWuliliStore.getState().state;
      if (
        afterTick.stats.energy < STREAM_CONFIG.autoStopEnergy ||
        afterTick.stats.health < STREAM_CONFIG.autoStopHealth
      ) {
        const earned = streamStore.stop();
        if (earned > 0) {
          useWuliliStore.getState().addCoins(earned);
          useWuliliStore.getState().markInteraction('stream');
        }
      }
    };

    const processSleepTick = (deltaMs: number) => {
      const sleepStore = useSleepStore.getState();
      const sleep = sleepStore.state;
      if (!sleep.isSleeping) return;

      const bonus = getBonus();
      let recoveryMultiplier = bonus.sleepRecoveryRate ?? 1;

      // 经期惩罚：恢复慢
      const menstrualPenalty = getMenstrualPenalty();
      recoveryMultiplier *= 1 - menstrualPenalty * 0.4;   // 最多 -40%

      const energyPerSec =
        (SLEEP_CONFIG.energyRecoveryPerHour / 3600) * recoveryMultiplier;
      const moodPerSec =
        (SLEEP_CONFIG.moodRecoveryPerHour / 3600) * recoveryMultiplier;
      const healthPerSec =
        (SLEEP_CONFIG.healthRecoveryPerHour / 3600) * recoveryMultiplier;

      sleepStore.tick(
        deltaMs,
        { energy: energyPerSec, mood: moodPerSec, health: healthPerSec },
        (energyGain, moodGain, healthGain) => {
          useWuliliStore.getState().addStats({
            energy: energyGain,
            mood: moodGain,
            health: healthGain,
          });
        },
        (seconds) => {
          useWuliliStore.getState().addSleepSeconds(seconds);
        },
      );

      const afterTick = useWuliliStore.getState().state;
      const totalHours = (sleep.totalSeconds + deltaMs / 1000) / 3600;
      if (
        afterTick.stats.energy >= SLEEP_CONFIG.autoWakeEnergy ||
        totalHours >= SLEEP_CONFIG.maxSleepHours
      ) {
        sleepStore.stop();
        useWuliliStore.getState().markInteraction('sleep');
      }
    };

    const tick = () => {
      if (!runningRef.current) return;
      try {
        const wuliliStore = useWuliliStore.getState();
        wuliliStore.applyTimeDecay();
        processStreamTick(TICK_INTERVAL_MS);
        processSleepTick(TICK_INTERVAL_MS);
      } catch {
        // ignore
      }
    };

    const start = () => {
      if (runningRef.current) return;
      runningRef.current = true;
      tick();
      intervalRef.current = setInterval(tick, TICK_INTERVAL_MS);
    };

    const stop = () => {
      runningRef.current = false;
      if (intervalRef.current !== null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };

    start();

    const subscription = AppState.addEventListener('change', (nextState) => {
      const prev = appStateRef.current;
      appStateRef.current = nextState;
      if (
        nextState === 'active' &&
        (prev === 'background' || prev === 'inactive')
      ) {
        const streamStore = useStreamStore.getState();
        const stream = streamStore.state;
        if (stream.isStreaming && stream.lastTickAt) {
          const elapsedMs = Date.now() - stream.lastTickAt;
          if (elapsedMs > 1000) {
            const cappedMs = Math.min(
              elapsedMs,
              STREAM_CONFIG.maxOfflineSeconds * 1000,
            );
            processStreamTick(cappedMs);
          }
        }

        const sleepStore = useSleepStore.getState();
        const sleep = sleepStore.state;
        if (sleep.isSleeping && sleep.lastTickAt) {
          const elapsedMs = Date.now() - sleep.lastTickAt;
          if (elapsedMs > 1000) {
            const cappedMs = Math.min(
              elapsedMs,
              SLEEP_CONFIG.maxOfflineSeconds * 1000,
            );
            processSleepTick(cappedMs);
          }
        }

        tick();
        start();
      } else if (
        nextState === 'background' ||
        nextState === 'inactive'
      ) {
        stop();
      }
    });

    return () => {
      stop();
      subscription.remove();
    };
  }, []);

  return { isRunning: runningRef.current };
}