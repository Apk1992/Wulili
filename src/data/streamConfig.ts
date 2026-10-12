import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWuliliStore } from '@/store/useWuliliStore';
import { useStreamStore } from '@/store/useStreamStore';
import { clamp } from '@/utils/random';
import { STREAM_CONFIG } from '@/data/streamConfig';

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

      const wulili = useWuliliStore.getState().state;

      const moodFactor = clamp(wulili.stats.mood / 100, 0.2, 1);
      const healthFactor = clamp(wulili.stats.health / 100, 0.3, 1);
      const earningsPerSecond =
        STREAM_CONFIG.baseEarningPerSecond * moodFactor * healthFactor;

      streamStore.tick(
        deltaMs,
        earningsPerSecond,
        STREAM_CONFIG.energyCostPerSecond,
        STREAM_CONFIG.moodCostPerSecond,
        (energyCost, moodCost) => {
          useWuliliStore.getState().addStats({
            energy: -energyCost,
            mood: -moodCost,
          });
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