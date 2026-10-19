import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { RepeatMode, State } from 'react-native-track-player';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);

  const setupBgm = useCallback(async (force = false) => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      try {
        await TrackPlayer.getPlaybackState();
      } catch (e) {
        await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
      }

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const seasonStr = season || 'autumn';
      
      const filePath = `bgm/${seasonStr}_${isNight ? 'night' : 'day'}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const downloadUrl = data.download_url;

      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0) ? queue[activeIndex] : null;

      if (!force && activeTrack && activeTrack.id !== 'bgm') {
        return;
      }

      if (force || !activeTrack || activeTrack.id !== 'bgm' || lastPlayedUrlRef.current !== downloadUrl) {
        await TrackPlayer.reset();
        await TrackPlayer.add({ id: 'bgm', url: downloadUrl, title: 'BGM', artist: 'Wulili' });
        lastPlayedUrlRef.current = downloadUrl;
      }

      // 🔥 核心修复：只要走到这，必须强制设为单曲循环！防止2分钟后自然死亡
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
      await TrackPlayer.setVolume(0.4);

      const state = await TrackPlayer.getState();
      if (state !== State.Playing) {
        await TrackPlayer.play();
      }
    } catch (err: any) {
      console.warn('BGM 异常:', err);
    }
  }, [season, bgmEnabled]);

  useFocusEffect(
    useCallback(() => {
      void setupBgm(true);
      const timer = setInterval(async () => {
        try {
          const activeTrack = await TrackPlayer.getActiveTrack();
          if (activeTrack && activeTrack.id !== 'bgm') return;
          const state = await TrackPlayer.getState();
          if (state !== State.Playing) void setupBgm(true);
        } catch {}
      }, 2000);
      return () => clearInterval(timer);
    }, [setupBgm])
  );

  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void setupBgm(true);
      } else if (nextAppState === 'background' || nextAppState === 'inactive') {
        try {
          const activeTrack = await TrackPlayer.getActiveTrack();
          if (activeTrack?.id === 'bgm') await TrackPlayer.pause();
        } catch {}
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [setupBgm]);
}
