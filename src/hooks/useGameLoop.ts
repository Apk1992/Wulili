import { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useWuliliStore } from '@/store/useWuliliStore';

const TICK_INTERVAL_MS = 60 * 1000;

export interface UseGameLoopResult {
  isRunning: boolean;
}

export function useGameLoop(): UseGameLoopResult {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const runningRef = useRef<boolean>(false);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    const tick = () => {
      if (!runningRef.current) return;
      try {
        useWuliliStore.getState().applyTimeDecay();
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
      if (nextState === 'active' && (prev === 'background' || prev === 'inactive')) {
        tick();
        start();
      } else if (nextState === 'background' || nextState === 'inactive') {
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