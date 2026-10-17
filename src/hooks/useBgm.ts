import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
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
        const currentHour = new Date().getHours();
        const isNight = currentHour >= 18 || currentHour < 6;
        const suffix = isNight ? 'night' : 'day';
        const seasonStr = season || 'autumn';
        
        // 注意：这里测试你用 .m4a，如果你其实传的是 .mp3，记得改这里
        const bgmUrl = `${RAW_BASE}/bgm/${seasonStr}_${suffix}.m4a?token=${token}`;

        if (lastPlayedUrlRef.current === bgmUrl) return;

        // 🔥 关键：先清理旧队列，再添加新歌
        await TrackPlayer.reset(); 
        await TrackPlayer.add({ 
          id: 'bgm', 
          url: bgmUrl, 
          title: 'BGM', 
          artist: 'Wulili' 
        });
        
        await TrackPlayer.setRepeatMode(RepeatMode.Track); 
        await TrackPlayer.setVolume(0.4);
        
        // 🔥 强行触发播放，如果底层报错，直接弹窗抓取
        await TrackPlayer.play();
        
        lastPlayedUrlRef.current = bgmUrl;
      } catch (err: any) {
        // 如果 Play 失败，弹窗让你知道原因
        Alert.alert('BGM加载失败', err?.message || '未知错误');
        console.error('BGM Load Error:', err);
      }
    };

    setupBgm();
  }, [season, token, bgmEnabled]);
}
