import { useEffect, useRef } from 'react';
import TrackPlayer, { RepeatMode } from 'react-native-track-player';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function useBgm() {
  const { season } = useSeason();
  const token = getGitHubToken();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bgmEnabled || !token) return;

    const setupBgm = async () => {
      try {
        // 获取当前真实时间，18点-6点算夜晚
        const currentHour = new Date().getHours();
        const isNight = currentHour >= 18 || currentHour < 6;
        const suffix = isNight ? 'night' : 'day';
        
        // 我们暂且把 秋季 固定下来测试，如果后续要动态，可以用 season
        const seasonStr = season || 'autumn';
        
        const bgmUrl = `${RAW_BASE}/bgm/${seasonStr}_${suffix}.m4a?token=${token}`;

        if (lastPlayedUrlRef.current === bgmUrl) return;

        // 尝试加载
        await TrackPlayer.reset(); 
        await TrackPlayer.add({ id: 'bgm', url: bgmUrl, title: 'BGM', artist: 'Wulili' });
        await TrackPlayer.setRepeatMode(RepeatMode.Track); 
        await TrackPlayer.setVolume(0.4);
        await TrackPlayer.play();
        
        lastPlayedUrlRef.current = bgmUrl;
      } catch (err) {
        // 如果 BGM 加载失败，弹窗提示（仅限于测试阶段，看看到底是不是没传图/路径错）
        console.warn('BGM Load Error:', err);
      }
    };

    setupBgm();
  }, [season, token, bgmEnabled]);
}
