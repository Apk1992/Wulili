import { useEffect } from 'react';
import TrackPlayer, { State, usePlaybackState } from 'react-native-track-player';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getTimeOfDay } from '@/utils/time';
import { getGitHubToken } from '@/api/githubClient';

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function useBgm() {
  const { season } = useSeason();
  const timeOfDay = getTimeOfDay(); // 假设你返回 'morning' | 'night' 之类的
  const token = getGitHubToken();
  const isMusicPlaying = useSettingsStore((s) => s.settings.bgmEnabled ?? true);

  useEffect(() => {
    if (!isMusicPlaying || !token) return;

    const setupBgm = async () => {
      try {
        // 1. 拼接 BGM 路径 (例如: music/bgm/autumn_night.mp3)
        const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
        const suffix = isNight ? 'night' : 'day';
        const bgmPath = `${RAW_BASE}/music/bgm/${season}_${suffix}.mp3?token=${token}`;

        // 2. 重置播放器并加载
        await TrackPlayer.reset();
        await TrackPlayer.add({
          url: bgmPath,
          title: 'BGM',
          artist: 'Wulili',
        });
        
        // 3. 循环播放并调低音量
        await TrackPlayer.setRepeatMode(2); // RepeatMode.Queue
        await TrackPlayer.setVolume(0.3);
        await TrackPlayer.play();
      } catch (err) {
        console.log('BGM 加载失败:', err);
      }
    };

    setupBgm();

    // 清理函数
    return () => {
      TrackPlayer.stop();
    };
  }, [season, timeOfDay, token, isMusicPlaying]);
}
