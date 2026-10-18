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
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) throw new Error(`API 请求失败: ${res.status}`);
      const data = await res.json();
      const downloadUrl = data.download_url;
      if (!downloadUrl) throw new Error('未能获取下载链接');

      const queue = await TrackPlayer.getQueue();
      const activeTrack = queue.length > 0 ? queue[await TrackPlayer.getActiveTrackIndex() || 0] : null;

      if (forceReload || !activeTrack || activeTrack.id !== 'bgm') {
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

  // 2. 页面聚焦时
  useFocusEffect(
    useCallback(() => {
      void setupBgm();
    }, [setupBgm])
  );

  // 3. 监听播放器状态（被系统打断时恢复）
  useEffect(() => {
    if (playbackState.state === State.Paused || playbackState.state === State.Stopped || playbackState.state === State.None) {
      void setupBgm();
    }
  }, [playbackState.state, setupBgm]);

  // 🔥 4. 监听 App 进入后台/被杀掉，自动暂停 BGM
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // App 切到后台，直接暂停 BGM（不 reset 队列，这样回来时能恢复）
        try {
          const state = await TrackPlayer.getState();
          if (state === State.Playing) {
            await TrackPlayer.pause();
          }
        } catch {}
      } else if (nextAppState === 'active') {
        // App 切回前台，如果刚才被暂停了，就恢复
        void setupBgm();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, [setupBgm]);
}
