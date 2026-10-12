import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { clamp } from '@/utils/random';
import { STREAM_CONFIG, computeStreamLevel } from '@/data/streamConfig';
import { aggregateBonus } from '@/utils/equipmentBonus';
import { SEASONS, getSeasonFromDate } from '@/data/seasons';

const TICK_INTERVAL_MS = 5000;

export interface UseGameLoopResult {
  isRunning: boolean;
}

export function useGameLoop(): UseGameLoopResult {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const processStreamTick = (deltaMs: number) => {
      const streamStore = useStreamStore.getState();
      const stream = streamStore.state;
      if (!stream.isStreaming) return;

      const wuliliStore = useWuliliStore.getState();
      const wulili = wuliliStore.state;

      // 服饰加成
      const cfg = useAppConfigStore.getState();
      const outfit = wulili.currentOutfit
        ? cfg.getOutfitById(wulili.currentOutfit)
        : null;
      const accessory = wulili.currentAccessory
        ? cfg.getAccessoryById(wulili.currentAccessory)
        : null;
      const bonus = aggregateBonus(outfit, accessory);

      // 直播等级加成
      const levelInfo = computeStreamLevel(wulili.totalStreamSeconds);
      const levelMultiplier = 1 + levelInfo.bonusRate;

      // 状态系数
      const moodFactor = clamp(wulili.stats.mood / 100, 0.2, 1);
      const healthFactor = clamp(wulili.stats.health / 100, 0.3, 1);

      // 每秒收入（含服饰 + 等级加成）
      const earningsPerSecond =
        STREAM_CONFIG.baseEarningPerSecond *
        moodFactor *
        healthFactor *
        bonus.streamIncomeRate *
        levelMultiplier;

      // 每秒消耗（含服饰减免）
      const energyCostPerSecond =
        STREAM_CONFIG.energyCostPerSecond * bonus.energyCostRate;
      const moodCostPerSecond =
        STREAM_CONFIG.moodCostPerSecond * bonus.moodDecayRate;

      const deltaSec = deltaMs / 1000;

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

      // 自动结束判断
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

      void deltaSec;
    };

    const tick = () => {
      if (!runningRef.current) return;
      try {
        const wuliliStore = useWuliliStore.getState();
        wuliliStore.applyTimeDecay();
        processStreamTick(TICK_INTERVAL_MS);
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

void SEASONS;
void getSeasonFromDate;