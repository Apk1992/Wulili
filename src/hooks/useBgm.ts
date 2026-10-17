import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';
import { useIsFocused } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (!bgmEnabled || !isFocused) return;

    const setupBgm = async () => {
      try {
        const token = getGitHubToken();
        if (!token) return;

        // 检查当前播放器里到底挂的是什么
        const activeTrack = await TrackPlayer.getActiveTrack();
        
        // 如果当前挂的不是 BGM（说明是回忆记录的歌被遗留下来了），直接暴力清空队列！
        if (activeTrack && activeTrack.id !== 'bgm') {
          await TrackPlayer.reset();
        }

        const currentHour = new Date().getHours();
        const isNight = currentHour >= 18 || currentHour < 6;
        const suffix = isNight ? 'night' : 'day';
        const seasonStr = season || 'autumn';
        
        const filePath = `bgm/${seasonStr}_${suffix}.m4a`;
        const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
        });

        if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
        const data = await res.json();
        const downloadUrl = data.download_url;
        
        if (!downloadUrl) throw new Error('未能获取下载链接');

        // 如果队列里的也是这首 BGM，并且暂停了，就直接恢复播放
        if (activeTrack?.id === 'bgm' && lastPlayedUrlRef.current === downloadUrl) {
          const state = await TrackPlayer.getState();
          if (state !== State.Playing) {
            await TrackPlayer.play();
          }
          return;
        }

        // 全新加载
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: 'bgm',
          url: downloadUrl,
          title: `${seasonStr} ${suffix}`,
          artist: 'Wulili',
        });
        
        await TrackPlayer.setRepeatMode(RepeatMode.Track);
        await TrackPlayer.setVolume(0.4);
        await TrackPlayer.play();

        lastPlayedUrlRef.current = downloadUrl;
      } catch (err: any) {
        Alert.alert('BGM 播放失败', err?.message || '未知错误');
      }
    };

    setupBgm();
  }, [season, bgmEnabled, isFocused]);
}
