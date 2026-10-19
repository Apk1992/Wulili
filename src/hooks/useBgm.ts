import { useEffect } from 'react';
import { bgmManager } from '@/services/bgmManager';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);

  useEffect(() => {
    if (bgmEnabled) {
      bgmManager.setSeason(season || 'autumn');
      void bgmManager.loadAndPlay();
    }
  }, [season, bgmEnabled]);

  useFocusEffect(
    useCallback(() => {
      if (bgmEnabled) {
        void bgmManager.loadAndPlay();
      }
    }, [bgmEnabled])
  );
}
