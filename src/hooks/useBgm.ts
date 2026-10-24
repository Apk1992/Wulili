// src/hooks/useBgm.ts
import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bgmManager } from '@/services/bgmManager';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);

  // 1. 冷启动 / 季节变化：按当前季节+昼夜设置 BGM
  useEffect(() => {
    if (!bgmEnabled) return;
    const t = setTimeout(() => {
      const h = new Date().getHours();
      const isNight = h >= 18 || h < 6;
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

  // 4. 兜底：BGM 没播起来时每 3 秒重试（走 setScene，确保 URL 正确）
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      if (!bgmManager.getIsPlaying() && !bgmManager.isExternallyHeld()) {
        const h = new Date().getHours();
        const isNight = h >= 18 || h < 6;
        void bgmManager.setScene(season ?? 'autumn', isNight);
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [bgmEnabled, season]);
}
