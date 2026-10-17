import { useEffect, useRef } from 'react';
import TrackPlayer, { State, usePlaybackState, RepeatMode } from 'react-native-track-player';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getTimeOfDay } from '@/utils/time';
import { getGitHubToken } from '@/api/githubClient';

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function useBgm() {
  const { season } = useSeason();
  const timeOfDay = getTimeOfDay(); // 假设返回 'morning', 'afternoon', 'evening', 'night' 等
  const token = getGitHubToken();
  
  // 获取设置里的 BGM 开关（你可以后续在设置页加一个开关控制它）
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  
  // 监听当前的播放状态，如果被回忆记录打断了，我们可以恢复
  const playbackState = usePlaybackState();
  const lastPlayedUrlRef = useRef<string | null>(null);

  useEffect(() => {
    if (!bgmEnabled || !token) {
      TrackPlayer.pause(); // 如果关掉了 BGM，直接暂停
      return;
    }

    const setupBgm = async () => {
      try {
        // 判断是不是夜晚（根据你自己的 getTimeOfDay 返回的枚举值调整）
        const isNight = timeOfDay === 'night' || timeOfDay === 'evening';
        const suffix = isNight ? 'night' : 'day';
        
        // 拼接 URL，例如 autumn_night.mp3
        const bgmUrl = `${RAW_BASE}/bgm/${season}_${suffix}.mp3?token=${token}`;

        // 如果当前正在播这首，就不重复加载了
        if (lastPlayedUrlRef.current === bgmUrl) return;

        // 加载 BGM
        await TrackPlayer.reset(); // 清空之前的播放队列（可能会清掉回忆的音乐，所以我们在回忆页面要处理冲突）
        await TrackPlayer.add({
          id: 'bgm',
          url: bgmUrl,
          title: `${season} ${suffix} BGM`,
          artist: 'Wulili',
        });
        
        await TrackPlayer.setRepeatMode(RepeatMode.Track); // 单曲循环
        await TrackPlayer.setVolume(0.3); // 背景音音量小一点
        await TrackPlayer.play();
        
        lastPlayedUrlRef.current = bgmUrl;
      } catch (err) {
        console.log('BGM 播放失败 (可能还没传这首歌):', err);
      }
    };

    setupBgm();
  }, [season, timeOfDay, token, bgmEnabled]);

  // 处理与回忆记录的互斥（进阶功能，等基础版跑通再考虑）
  // useEffect(() => {
  //   if (playbackState.state === State.Paused || playbackState.state === State.None) {
  //      // 如果被其他页面暂停了，判断是不是在主页，如果是，尝试恢复
  //   }
  // }, [playbackState.state]);
}
