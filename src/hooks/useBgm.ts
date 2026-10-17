import { useEffect, useRef } from 'react';
import { Alert } from 'react-native';
import TrackPlayer, { RepeatMode, usePlaybackState, State } from 'react-native-track-player';
import { useIsFocused } from '@react-navigation/native';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useSeason } from '@/hooks/useSeason';
import { getGitHubToken } from '@/api/githubClient';

export function useBgm() {
  const { season } = useSeason();
  const bgmEnabled = useSettingsStore((s) => (s.settings as any).bgmEnabled ?? true);
  const lastPlayedUrlRef = useRef<string | null>(null);
  
  // 监听当前页面的聚焦状态（当你从回忆记录退回到主页时，这里会变成 true）
  const isFocused = useIsFocused();
  // 获取当前播放器状态
  const playbackState = usePlaybackState();

  useEffect(() => {
    // 如果 BGM 关了，或者当前不在主页，就不处理
    if (!bgmEnabled || !isFocused) return;

    const setupBgm = async () => {
      try {
        const token = getGitHubToken();
        if (!token) return;

        // 如果当前正在播放别的东西（比如还没关掉的回忆记录），先不抢
        // 但如果播放器是停止状态（State.None），或者已经播放结束（State.Ended），我们就去加载 BGM
        if (
          playbackState.state === State.Playing || 
          playbackState.state === State.Buffering || 
          playbackState.state === State.Loading
        ) {
           // 如果现在已经在播 BGM 了，也不用重复加载
           const currentTrack = await TrackPlayer.getActiveTrack();
           if (currentTrack?.id === 'bgm') return;
           
           // 如果正在播回忆记录，而用户还在回忆页面，就不抢
           if (!isFocused) return;
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

        // 如果歌没变，且我们是被回忆记录打断的，我们只需要调用 play() 恢复，不需要 reset()
        if (lastPlayedUrlRef.current === downloadUrl) {
           await TrackPlayer.play();
           return;
        }

        // 如果歌变了（比如从白天变成了晚上），或者第一次加载：
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
        Alert.alert('BGM 播放失败', err?.message || '未知错误');
      }
    };

    setupBgm();
    
    // 依赖项加上 isFocused 和 playbackState，这样每次你退回到主页都会触发检查
  }, [season, bgmEnabled, isFocused, playbackState.state]);
}
