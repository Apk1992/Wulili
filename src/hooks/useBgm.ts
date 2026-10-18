import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { RepeatMode, State, usePlaybackState } from 'react-native-track-player';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);
  const playbackState = usePlaybackState();

  const setupBgm = useCallback(async (forceReload = false) => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

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

      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0) ? queue[activeIndex] : null;

      // 🔥 核心：只要发现当前播放的不是我们的 BGM（说明是回忆音乐、视频残留，或者是空的），立刻强制清空！
      if (activeTrack && activeTrack.id !== 'bgm') {
        await TrackPlayer.reset();
      }

      // 如果队列是空的，或者歌换了，就重新加载
      if (forceReload || !activeTrack || activeTrack.id !== 'bgm' || lastPlayedUrlRef.current !== downloadUrl) {
        await TrackPlayer.reset();
        await TrackPlayer.add({
          id: 'bgm',
          url: downloadUrl,
          title: `${seasonStr} ${suffix}`,
          artist: 'Wulili',
        });
        await TrackPlayer.setRepeatMode(RepeatMode.Track);
        await TrackPlayer.setVolume(0.4);
        lastPlayedUrlRef.current = downloadUrl;
      }

      // 确保它在播放
      const state = await TrackPlayer.getState();
      if (state !== State.Playing) {
        await TrackPlayer.play();
      }
    } catch (err: any) {
      console.warn('BGM Load Error:', err);
    }
  }, [season, bgmEnabled]);

  // 1. 初次加载
  useEffect(() => {
    void setupBgm();
  }, [setupBgm]);

  // 2. 每次页面聚焦（从回忆记录退回主页）时，立刻抢占 BGM！
  useFocusEffect(
    useCallback(() => {
      void setupBgm();
    }, [setupBgm])
  );

  // 3. 监听播放器状态（如果视频/音乐播完变成 Ended/Stopped，立刻接管）
  useEffect(() => {
    if (playbackState.state === State.Ended || playbackState.state === State.Stopped || playbackState.state === State.None) {
      void setupBgm();
    }
  }, [playbackState.state, setupBgm]);

  // 4. App 切后台/前台
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          const activeTrack = await TrackPlayer.getActiveTrack();
          if (activeTrack?.id === 'bgm') await TrackPlayer.pause();
        } catch {}
      } else if (nextAppState === 'active') {
        void setupBgm();
      }
    };
    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [setupBgm]);
}
