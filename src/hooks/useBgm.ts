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

  const setupBgm = useCallback(async (forceReload = false) => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      // 🔥 绝杀 1：检测播放器是否活着，如果被系统/通知栏搞死了，强制复活！
      try {
        await TrackPlayer.getPlaybackState();
      } catch (e) {
        console.log('TrackPlayer 服务已死，正在尝试重新初始化...');
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

      // 如果当前不是 BGM，千万别抢（让回忆音乐正常播）
      if (activeTrack && activeTrack.id !== 'bgm') return;

      // 如果队列空了、或者不是 BGM，就重新加载
      if (forceReload || !activeTrack || activeTrack.id !== 'bgm' || lastPlayedUrlRef.current !== downloadUrl) {
        await TrackPlayer.reset();
        await TrackPlayer.add({ id: 'bgm', url: downloadUrl, title: 'BGM', artist: 'Wulili' });
        await TrackPlayer.setRepeatMode(RepeatMode.Track);
        await TrackPlayer.setVolume(0.4);
        lastPlayedUrlRef.current = downloadUrl;
      }

      const state = await TrackPlayer.getState();
      if (state !== State.Playing) {
        await TrackPlayer.play();
      }
    } catch (err: any) {
      console.warn('BGM 异常:', err);
    }
  }, [season, bgmEnabled]);

  // 每次回到主页/页面聚焦时检查
  useFocusEffect(
    useCallback(() => {
      void setupBgm();
    }, [setupBgm])
  );

  // 每次切回前台时检查（防止在后台被系统杀）
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void setupBgm();
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
