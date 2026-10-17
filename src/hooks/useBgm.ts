import { useEffect, useRef } from 'react';
import TrackPlayer, { RepeatMode } from 'react-native-track-player';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getTimeOfDay } from '@/utils/time';
import { getGitHubToken } from '@/api/githubClient';

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function useBgm() {
  const { season } = useSeason();
  const timeOfDay = getTimeOfDay();
  const token = getGitHubToken();
  
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bgmEnabled || !token) return;

    const setupBgm = async () => {
      try {
        const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
        const suffix = isNight ? 'night' : 'day';
        
        // 使用 .m4a，放在根目录的 bgm 文件夹下
        const bgmUrl = `${RAW_BASE}/bgm/${season}_${suffix}.m4a?token=${token}`;

        if (lastPlayedUrlRef.current === bgmUrl) return;

        console.log('🎵 [BGM] 准备加载:', bgmUrl);

        // 清除队列，加载 BGM
        await TrackPlayer.reset(); 
        await TrackPlayer.add({
          id: 'bgm',
          url: bgmUrl,
          title: `${season} ${suffix} BGM`,
          artist: 'Wulili',
        });
        
        await TrackPlayer.setRepeatMode(RepeatMode.Track); 
        await TrackPlayer.setVolume(0.4); // 音量不要太大
        await TrackPlayer.play();
        
        console.log('🎵 [BGM] 播放成功');
        lastPlayedUrlRef.current = bgmUrl;
      } catch (err) {
        console.log('❌ [BGM] 播放失败:', err);
      }
    };

    setupBgm();
  }, [season, timeOfDay, token, bgmEnabled]);
}
