import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { RepeatMode, State, usePlaybackState } from 'react-native-track-player';
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

      // 1. 检查当前播放器里挂着的是什么
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null) ? queue[activeIndex] : null;

      // 🔥 核心保护：如果当前播放的是回忆记录的音乐/视频（id 不是 bgm），直接给爷爬，绝对不许抢！
      if (activeTrack && activeTrack.id !== 'bgm') {
        return; 
      }

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

      // 2. 如果队列是空的，或者歌变了，才重新加载
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

  // 2. 监听播放器状态变化（例如回忆记录退出了，或者 BGM 被暂停了）
  useEffect(() => {
    if (!bgmEnabled) return;
    
    // 只要播放器状态变成 停止/结束/暂停，且没有在播放回忆（由 setupBgm 内部拦截），我们就恢复 BGM
    if (playbackState.state === State.Paused || playbackState.state === State.Stopped || playbackState.state === State.Ended || playbackState.state === State.None) {
      void setupBgm();
    }
  }, [playbackState.state, setupBgm, bgmEnabled]);

  // 3. 监听 App 进入后台/回前台
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        // 切到后台，暂停所有音频
        try {
          await TrackPlayer.pause();
        } catch {}
      } else if (nextAppState === 'active') {
        // 切回前台，自动恢复
        void setupBgm();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      subscription.remove();
    };
  }, [setupBgm]);
}
