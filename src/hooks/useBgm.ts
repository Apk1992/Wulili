import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bgmManager } from '@/services/bgmManager';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);

  // 1. 冷启动初始化
  useEffect(() => {
    if (bgmEnabled) {
      const t = setTimeout(() => {
        bgmManager.init();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [bgmEnabled]);

  // 2. 每次回到页面时检查一次
  useFocusEffect(
    useCallback(() => {
      if (bgmEnabled && !bgmManager.isExternallyHeld()) {
        bgmManager.resume();
      }
    }, [bgmEnabled]),
  );

  // 3. App 切后台暂停 / 切前台恢复
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

  // 4. 兜底：BGM 没播起来时每 3 秒重试（外部占用期间不重试）
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      if (!bgmManager.getIsPlaying() && !bgmManager.isExternallyHeld()) {
        bgmManager.resume();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [bgmEnabled]);
}
