// src/hooks/useBgm.ts
import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bgmManager } from '@/services/bgmManager';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';

function getIsNight(): boolean {
  const h = new Date().getHours();
  return h >= 18 || h < 6;
}

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastIsNightRef = useRef<boolean | null>(null);

  // 1. 冷启动 / 季节变化：按当前季节+昼夜设置 BGM
  useEffect(() => {
    if (!bgmEnabled) return;
    const t = setTimeout(() => {
      const isNight = getIsNight();
      lastIsNightRef.current = isNight;
      void bgmManager.setScene(season ?? 'autumn', isNight);
    }, 500);
    return () => clearTimeout(t);
  }, [bgmEnabled, season]);

  // 2. 每次回到页面时检查一次
  useFocusEffect(
    useCallback(() => {
      if (bgmEnabled && !bgmManager.isExternallyHeld()) {
        bgmManager.resume();
      }
    }, [bgmEnabled]),
  );

  // 3. App 切后台暂停，切前台恢复
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (!bgmEnabled) return;
      if (nextState === 'active') {
        if (!bgmManager.isExternallyHeld()) {
          bgmManager.resume();
        }
      } else if (nextState === 'background' || nextState === 'inactive') {
        bgmManager.pause();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [bgmEnabled]);

  // 4. 兜底：BGM 没播起来时每 3 秒重试
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      if (!bgmManager.getIsPlaying() && !bgmManager.isExternallyHeld()) {
        void bgmManager.setScene(season ?? 'autumn', getIsNight());
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [bgmEnabled, season]);

  // 5. 每分钟检查昼夜是否变化，变了就切 BGM
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      const isNight = getIsNight();
      if (lastIsNightRef.current !== null && lastIsNightRef.current !== isNight) {
        lastIsNightRef.current = isNight;
        console.log('[useBgm] 昼夜变化，切换 BGM:', { isNight });
        void bgmManager.setScene(season ?? 'autumn', isNight);
      } else if (lastIsNightRef.current === null) {
        lastIsNightRef.current = isNight;
      }
    }, 60_000);
    return () => clearInterval(timer);
  }, [bgmEnabled, season]);
}
