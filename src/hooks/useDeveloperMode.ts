import { useCallback, useRef, useState } from 'react';
import { useSettingsStore } from '@/store/useSettingsStore';

const TAP_THRESHOLD = 7;
const TAP_WINDOW_MS = 3000;

export interface UseDeveloperModeResult {
  isEnabled: boolean;
  tapCount: number;
  handleSecretTap: () => void;
  enable: () => void;
  disable: () => void;
  reset: () => void;
}

export function useDeveloperMode(): UseDeveloperModeResult {
  const isEnabled = useSettingsStore((s) => s.settings.developerMode);
  const setDeveloperMode = useSettingsStore((s) => s.setDeveloperMode);
  const [tapCount, setTapCount] = useState<number>(0);
  const lastTapRef = useRef<number>(0);

  const handleSecretTap = useCallback(() => {
    const now = Date.now();
    const elapsed = now - lastTapRef.current;
    lastTapRef.current = now;

    if (elapsed > TAP_WINDOW_MS) {
      setTapCount(1);
      return;
    }

    const next = tapCount + 1;
    setTapCount(next);

    if (next >= TAP_THRESHOLD && !isEnabled) {
      setDeveloperMode(true);
      setTapCount(0);
    }
  }, [tapCount, isEnabled, setDeveloperMode]);

  const enable = useCallback(() => {
    setDeveloperMode(true);
    setTapCount(0);
  }, [setDeveloperMode]);

  const disable = useCallback(() => {
    setDeveloperMode(false);
    setTapCount(0);
  }, [setDeveloperMode]);

  const reset = useCallback(() => {
    setTapCount(0);
    lastTapRef.current = 0;
  }, []);

  return {
    isEnabled,
    tapCount,
    handleSecretTap,
    enable,
    disable,
    reset,
  };
}