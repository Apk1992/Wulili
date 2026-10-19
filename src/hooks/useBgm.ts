import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

Sound.setCategory('Playback');

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);

  const soundRef = useRef<Sound | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  const isMutedRef = useRef<boolean>(false); // 是否因为音乐/后台而被暂停

  // 加载并准备 BGM（不自动播放）
  const loadBgm = useCallback(async () => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const seasonStr = season || 'autumn';
      const filePath = `bgm/${seasonStr}_${isNight ? 'night' : 'day'}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const downloadUrl = data.download_url;

      // 如果已经是同一首歌，不重复加载
      if (currentUrlRef.current === downloadUrl && soundRef.current) {
        return;
      }

      // 🔥 先释放旧的实例（这就是双重声音的根源！）
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }

      Sound.setActive(true);
      const newSound = new Sound(downloadUrl, undefined, (error) => {
        if (error) {
          console.warn('BGM 加载失败', error);
          return;
        }

        soundRef.current = newSound;
        currentUrlRef.current = downloadUrl;
        newSound.setVolume(0.4);
        newSound.setNumberOfLoops(-1); // 无限循环

        // 只有当前没被静音时才播放
        if (!isMutedRef.current) {
          newSound.play();
        }
      });
    } catch (err) {
      console.warn('BGM 加载异常:', err);
    }
  }, [season, bgmEnabled]);

  // 停止 BGM（但不释放实例）
  const pauseBgm = useCallback(() => {
    if (soundRef.current && soundRef.current.isPlaying()) {
      soundRef.current.pause();
    }
  }, []);

  // 恢复 BGM 播放（仅在应该播放的时候）
  const resumeBgm = useCallback(() => {
    if (!soundRef.current) {
      void loadBgm();
      return;
    }
    if (!isMutedRef.current && !soundRef.current.isPlaying()) {
      soundRef.current.play();
    }
  }, [loadBgm]);

  // 监听 TrackPlayer 状态：有音乐/视频时暂停 BGM，没有时恢复
  const syncWithTrackPlayer = useCallback(async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0)
        ? queue[activeIndex]
        : null;
      const state = await TrackPlayer.getState();

      const isMediaPlaying = !!activeTrack && activeTrack.id !== 'bgm' && state === State.Playing;

      if (isMediaPlaying) {
        // 有音乐在播 → 静音 BGM
        isMutedRef.current = true;
        pauseBgm();
      } else {
        // 没音乐 → 恢复 BGM
        isMutedRef.current = false;
        resumeBgm();
      }
    } catch {
      // TrackPlayer 未初始化
      isMutedRef.current = false;
      resumeBgm();
    }
  }, [pauseBgm, resumeBgm]);

  // 进入页面时加载
  useFocusEffect(
    useCallback(() => {
      void loadBgm();
      // 每 500ms 检查一次 TrackPlayer 状态（因为事件监听兼容性差）
      const timer = setInterval(() => {
        void syncWithTrackPlayer();
      }, 500);
      return () => clearInterval(timer);
    }, [loadBgm, syncWithTrackPlayer])
  );

  // App 前后台切换：后台时暂停 BGM
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        Sound.setActive(true);
        isMutedRef.current = false;
        resumeBgm();
      } else {
        // 后台/锁屏 → 暂停
        pauseBgm();
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, [pauseBgm, resumeBgm]);

  // 🔥 页面卸载时释放（防止双重声音）
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.stop();
        soundRef.current.release();
        soundRef.current = null;
      }
    };
  }, []);

  // 监听 TrackPlayer 的播放状态变化（事件驱动，更即时）
  useEffect(() => {
    const sub = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      if (event.state === State.Playing) {
        isMutedRef.current = true;
        pauseBgm();
      } else if (event.state === State.Paused || event.state === State.Stopped || event.state === State.Ended) {
        isMutedRef.current = false;
        resumeBgm();
      }
    });
    return () => sub.remove();
  }, [pauseBgm, resumeBgm]);
}
