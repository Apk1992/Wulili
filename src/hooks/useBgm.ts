import { useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { bgmManager } from '@/services/bgmManager';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);

  // 1. 首次挂载（冷启动）时初始化 BGM
  useEffect(() => {
    if (bgmEnabled) {
      // 延迟 500ms 等 TrackPlayer 和音频焦点初始化完成
      const t = setTimeout(() => {
        bgmManager.init();
      }, 500);
      return () => clearTimeout(t);
    }
  }, [bgmEnabled]);

  // 2. 每次回到页面时检查一次
  useFocusEffect(
    useCallback(() => {
      if (bgmEnabled) {
        bgmManager.resume();
      }
    }, [bgmEnabled]),
  );

  // 3. App 切后台暂停，切前台恢复
  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (!bgmEnabled) return;
      if (nextState === 'active') {
        bgmManager.resume();
      } else if (nextState === 'background' || nextState === 'inactive') {
        bgmManager.pause();
      }
    };
    const sub = AppState.addEventListener('change', handleAppState);
    return () => sub.remove();
  }, [bgmEnabled]);

  // 4. 冷启动时若 BGM 还没播起来，每 3 秒强制重试一次
  useEffect(() => {
    if (!bgmEnabled) return;
    const timer = setInterval(() => {
      if (!bgmManager.getIsPlaying()) {
        bgmManager.resume();
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [bgmEnabled]);
}
