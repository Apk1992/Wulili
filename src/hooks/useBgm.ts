import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import TrackPlayer, { RepeatMode } from 'react-native-track-player';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bgmEnabled) return;

    const setupBgm = async () => {
      try {
        const token = getGitHubToken();
        if (!token) return;

        const currentHour = new Date().getHours();
        const isNight = currentHour >= 18 || currentHour < 6;
        const suffix = isNight ? 'night' : 'day';
        const seasonStr = season || 'autumn';
        
        const filePath = `bgm/${seasonStr}_${suffix}.m4a`;
        const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

        // 1. 通过 API 获取私有仓库的真实下载链接
        const res = await fetch(apiUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: 'application/vnd.github.v3+json',
          },
        });

        if (!res.ok) {
          throw new Error(`API 请求失败: ${res.status}`);
        }

        const data = await res.json();
        const downloadUrl = data.download_url; // 这是一个带签名的临时 URL

        if (!downloadUrl) throw new Error('未能获取下载链接');

        // 如果当前播放的已经是这同一首歌，就不再重头加载了
        if (lastPlayedUrlRef.current === downloadUrl) return;

        // 2. 清空队列并播放
        // 注意：如果回忆记录正在播放，这里会打断它。如果你不想打断，可以在调用前加个判断。
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: 'bgm',
          url: downloadUrl,
          title: `${seasonStr} ${suffix}`,
          artist: 'Wulili',
        });
        
        await TrackPlayer.setRepeatMode(RepeatMode.Track);
        await TrackPlayer.setVolume(0.4); // 背景音小一点
        await TrackPlayer.play();

        lastPlayedUrlRef.current = downloadUrl;
      } catch (err: any) {
        Alert.alert('BGM 播放失败', err?.message || '未知错误');
      }
    };

    setupBgm();
  }, [season, bgmEnabled]);
}
