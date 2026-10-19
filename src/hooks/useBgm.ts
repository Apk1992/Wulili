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

  const setupBgm = useCallback(async (forcePlay = false) => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      // 1. 检查底层服务是否存活
      try {
        await TrackPlayer.getPlaybackState();
      } catch (e) {
        await TrackPlayer.setupPlayer({ autoHandleInterruptions: true });
      }

      // 2. 获取当前的播放状态
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0) ? queue[activeIndex] : null;

      // 🔥 核心逻辑：如果当前在放音乐/视频（不是bgm），直接退出，绝对不抢
      if (activeTrack && activeTrack.id !== 'bgm') {
        return;
      }

      // 3. 准备 BGM 链接
      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const seasonStr = season || 'autumn';
      const filePath = `bgm/${seasonStr}_${isNight ? 'night' : 'day'}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const downloadUrl = data.download_url;

      // 4. 如果没加载过 BGM，或者歌变了，就重新装载（但如果是恢复，就不用重置）
      if (!activeTrack || activeTrack.id !== 'bgm' || lastPlayedUrlRef.current !== downloadUrl) {
        await TrackPlayer.reset();
        await TrackPlayer.add({ id: 'bgm', url: downloadUrl, title: 'BGM', artist: 'Wulili' });
        await TrackPlayer.setRepeatMode(RepeatMode.Track); // 循环
        await TrackPlayer.setVolume(0.4);
        lastPlayedUrlRef.current = downloadUrl;
      }

      // 5. 如果目标是播放，就 play
      const state = await TrackPlayer.getState();
      if (state !== State.Playing) {
        await TrackPlayer.play();
      }
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }, [season, bgmEnabled]);

  // 每次回到主页（或者进入回忆主页），强行检查并恢复 BGM
  useFocusEffect(
    useCallback(() => {
      void setupBgm(true);
    }, [setupBgm])
  );

  // 切后台暂停，切回前台恢复
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        void setupBgm(false);
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
