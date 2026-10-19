import { useEffect } from 'react';
import { autoBgm } from '@/services/AutoBgm';
import { useSeason } from '@/hooks/useSeason';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);

  // 挂载时激活
  useEffect(() => {
    autoBgm.setEnabled(bgmEnabled);
    if (bgmEnabled) autoBgm.setSeason(season || 'autumn');
  }, [bgmEnabled, season]);

  // 每次页面聚焦，强制检查一次
  useFocusEffect(
    useCallback(() => {
      if (bgmEnabled) {
        void autoBgm.ensurePlaying();
      }
    }, [bgmEnabled])
  );
}
