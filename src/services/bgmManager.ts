import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { State, RepeatMode } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

class BgmManager {
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
  };

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
    try {
      if (!this.isAppActive) return;
      const token = getGitHubToken();
      if (!token) return;

      // 🔥 核心：检查当前播放器里挂的是什么
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null) ? queue[activeIndex] : null;

      // 如果当前正在播放回忆记录（音乐/视频），绝对不要抢
      if (activeTrack && activeTrack.id !== 'bgm') {
        return;
      }

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const suffix = isNight ? 'night' : 'day';
      const filePath = `bgm/${this.season}_${suffix}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const downloadUrl = data.download_url;

      // 如果已经是 BGM 且没在播，直接 play
      if (activeTrack && activeTrack.id === 'bgm' && this.currentUrl === downloadUrl) {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing) {
          await TrackPlayer.play();
        }
        return;
      }

      // 重新装载 BGM
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: 'bgm',
        url: downloadUrl,
        title: 'BGM',
        artist: 'Wulili',
      });
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
      await TrackPlayer.setVolume(0.4);
      this.currentUrl = downloadUrl;
      
      await TrackPlayer.play();
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }

  // 供视频页面调用
  public async suspendForVideo() {
    try {
      await TrackPlayer.pause();
    } catch {}
  }

  public async resumeFromVideo() {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null) ? queue[activeIndex] : null;
      if (activeTrack && activeTrack.id === 'bgm') {
        await TrackPlayer.play();
      } else if (!activeTrack) {
        await this.loadAndPlay();
      }
    } catch {}
  }
}

export const bgmManager = new BgmManager();
