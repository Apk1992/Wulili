import { useCallback, useRef, useState } from 'react';
import { Alert } from 'react-native';
import TrackPlayer, { RepeatMode, State, usePlaybackState } from 'react-native-track-player';
import { useFocusEffect } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);
  
  // 监听播放器状态（用于如果 BGM 被暂停了，能自动恢复）
  const playbackState = usePlaybackState();

  const setupBgm = useCallback(async () => {
    if (!bgmEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      // 1. 检查播放器里当前挂着的是不是我们的 BGM
      const activeTrack = await TrackPlayer.getActiveTrack();
      
      // 如果挂的是回忆记录的歌曲（因为有时候 reset 慢了一拍），直接暴力清空
      if (activeTrack && activeTrack.id !== 'bgm') {
        await TrackPlayer.reset();
      }

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const suffix = isNight ? 'night' : 'day';
      const seasonStr = season || 'autumn';
      
      const filePath = `bgm/${seasonStr}_${suffix}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      // 2. 获取下载链接
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

      // 3. 如果播放器里已经有这首 BGM，并且只是暂停了，直接 play()
      if (activeTrack?.id === 'bgm' && lastPlayedUrlRef.current === downloadUrl) {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing) {
          await TrackPlayer.play();
        }
        return;
      }

      // 4. 如果是第一次加载，或者换歌了，重新 setup
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
      console.warn('BGM Load Error:', err);
    }
  }, [season, bgmEnabled]);

  // 🔥 核心改动：使用 useFocusEffect，每次回到主页都会执行
  useFocusEffect(
    useCallback(() => {
      void setupBgm();
    }, [setupBgm])
  );

  // 如果播放器状态变成暂停或停止（比如被系统打断），只要焦点还在，自动尝试恢复
  useFocusEffect(
    useCallback(() => {
      if (playbackState.state === State.Paused || playbackState.state === State.Stopped) {
        void setupBgm();
      }
    }, [playbackState.state, setupBgm])
  );
}
