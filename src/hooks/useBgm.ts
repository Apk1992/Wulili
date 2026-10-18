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

  const setupBgm = useCallback(async () => {
    if (!bgmEnabled) return;
    try {
      const token = getGitHubToken();
      if (!token) return;

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
      const activeTrack = (activeIndex !== undefined && activeIndex !== null) ? queue[activeIndex] : null;

      // 🔥 只要发现当前播放的不是 BGM（是回忆音乐或视频），BGM 坚决不抢！
      if (activeTrack && activeTrack.id !== 'bgm') return;

      if (!activeTrack || activeTrack.id !== 'bgm' || lastPlayedUrlRef.current !== downloadUrl) {
        await TrackPlayer.reset();
        await TrackPlayer.add({ id: 'bgm', url: downloadUrl, title: 'BGM', artist: 'Wulili' });
        await TrackPlayer.setRepeatMode(RepeatMode.Track);
        await TrackPlayer.setVolume(0.4);
        lastPlayedUrlRef.current = downloadUrl;
      }

      const state = await TrackPlayer.getState();
      if (state !== State.Playing) await TrackPlayer.play();
    } catch (err) {}
  }, [season, bgmEnabled]);

  useFocusEffect(useCallback(() => { void setupBgm(); }, [setupBgm]));

  // 切后台只暂停 BGM，如果是音乐/视频，不要管它！
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
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [setupBgm]);
}
