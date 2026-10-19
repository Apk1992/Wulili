import { useCallback, useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import TrackPlayer, { State } from 'react-native-track-player';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

// 开启允许通过 HTTP 播放（安卓端必须）
Sound.setCategory('Playback');

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  
  const soundRef = useRef<Sound | null>(null);
  const currentUrlRef = useRef<string | null>(null);
  
  // 记录是否需要静音（当回忆音乐在播时，为 true）
  const isMutedByMediaRef = useRef<boolean>(false);

  const loadAndPlayBgm = useCallback(async () => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const seasonStr = season || 'autumn';
      const filePath = `bgm/${seasonStr}_${isNight ? 'night' : 'day'}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      // 1. 获取真实下载链接
      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();
      const downloadUrl = data.download_url;

      // 2. 如果当前正在放的 BGM 和要放的 URL 一样，且没在播，直接恢复
      if (currentUrlRef.current === downloadUrl && soundRef.current) {
        if (!soundRef.current.isPlaying() && !isMutedByMediaRef.current) {
          soundRef.current.play();
        }
        return;
      }

      // 3. 如果 URL 变了，释放旧的，加载新的
      if (soundRef.current) {
        soundRef.current.release();
        soundRef.current = null;
      }

      Sound.setActive(true); // 激活音频会话
      const newSound = new Sound(downloadUrl, undefined, (error) => {
        if (error) {
          console.warn('BGM 加载失败', error);
          return;
        }
        
        soundRef.current = newSound;
        currentUrlRef.current = downloadUrl;
        
        // 设置音量
        newSound.setVolume(0.4);
        
        // 🔥 关键：设为无限循环！
        newSound.setNumberOfLoops(-1);

        // 如果当前没有音乐在放，就播放
        if (!isMutedByMediaRef.current) {
          newSound.play();
        }
      });
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }, [season, bgmEnabled]);

  // 检查底层 TrackPlayer 的状态，如果它在放音乐/视频，就静音 BGM
  const checkTrackPlayerAndSync = useCallback(async () => {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0) ? queue[activeIndex] : null;
      const state = await TrackPlayer.getState();

      // 如果当前是音乐/视频在播放，或者 TrackPlayer 是激活状态
      if (activeTrack && activeTrack.id !== 'bgm' && state === State.Playing) {
        isMutedByMediaRef.current = true;
        if (soundRef.current && soundRef.current.isPlaying()) {
          soundRef.current.pause();
        }
      } else {
        // 没有音乐/视频，恢复 BGM
        isMutedByMediaRef.current = false;
        if (soundRef.current && !soundRef.current.isPlaying()) {
          soundRef.current.play();
        } else if (!soundRef.current) {
          void loadAndPlayBgm();
        }
      }
    } catch {
      // 如果 TrackPlayer 没初始化，直接播 BGM
      isMutedByMediaRef.current = false;
      if (soundRef.current && !soundRef.current.isPlaying()) {
        soundRef.current.play();
      } else if (!soundRef.current) {
        void loadAndPlayBgm();
      }
    }
  }, [loadAndPlayBgm]);

  // 每当回到主页 / 进入记录页
  useFocusEffect(
    useCallback(() => {
      void loadAndPlayBgm();
      void checkTrackPlayerAndSync();
      
      // 开一个简短的心跳检测（因为 track player 的 event listener 无法直接穿透 state 改变）
      const timer = setInterval(() => {
        void checkTrackPlayerAndSync();
      }, 1000);

      return () => clearInterval(timer);
    }, [loadAndPlayBgm, checkTrackPlayerAndSync])
  );

  // App 前后台监听
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      if (nextAppState === 'active') {
        // 回到前台，如果 Sound 被系统中断了，重新激活并播放
        Sound.setActive(true);
        if (soundRef.current && !isMutedByMediaRef.current) {
          soundRef.current.play();
        }
      }
    };
    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => sub.remove();
  }, []);

  // 页面卸载时，释放资源
  useEffect(() => {
    return () => {
      if (soundRef.current) {
        soundRef.current.release();
        soundRef.current = null;
      }
    };
  }, []);
}
