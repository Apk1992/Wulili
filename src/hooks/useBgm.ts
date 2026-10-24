// src/hooks/useBgm.ts
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bgmManager } from '@/services/bgmManager';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';

/**
 * 固定按 UTC+8（北京时间）判断昼夜，避免手机时区不对导致误判
 * 18:00 - 05:59 → 夜晚
 */
function getIsNight(): boolean {
  const now = new Date();
  // 转成 UTC 毫秒，再加 8 小时
  const utc8Ms = now.getTime() + now.getTimezoneOffset() * 60_000 + 8 * 3600_000;
  const utc8Hour = new Date(utc8Ms).getUTCHours();
  return utc8Hour >= 18 || utc8Hour < 6;
}

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastIsNightRef = useRef<boolean | null>(null);

  // 1. 冷启动 / 季节变化
  useEffect(() => {
    if (!bgmEnabled) return;
    const t = setTimeout(() => {
      const isNight = getIsNight();
      lastIsNightRef.current = isNight;
      void bgmManager.setScene(season ?? 'autumn', isNight);
    }, 500);
    return () => clearTimeout(t);
  }, [bgmEnabled, season]);

  // 2. 回到页面
  useFocusEffect(
    useCallback(() => {
      if (bgmEnabled && !bgmManager.isExternallyHeld()) {
        bgmManager.resume();
      }
    }, [bgmEnabled]),
  );

  // 3. App 前后台
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (!bgmEnabled) return;
      if (nextState === 'active') {
        if (!bgmManager.isExternallyHeld()) bgmManager.resume();
      } else if (nextState === 'background' || nextState === 'inactive') {
        bgmManager.pause();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [bgmEnabled]);

  // 4. 兜底：3 秒重试
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      if (!bgmManager.getIsPlaying() && !bgmManager.isExternallyHeld()) {
        void bgmManager.setScene(season ?? 'autumn', getIsNight());
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [bgmEnabled, season]);

  // 5. 每分钟检查昼夜变化
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      const isNight = getIsNight();
      if (lastIsNightRef.current !== null && lastIsNightRef.current !== isNight) {
        lastIsNightRef.current = isNight;
        void bgmManager.setScene(season ?? 'autumn', isNight);
      } else if (lastIsNightRef.current === null) {
        lastIsNightRef.current = isNight;
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [bgmEnabled, season]);
}
