import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { Event, State, RepeatMode } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

class BgmManager {
  private currentUrl: string | null = null;
  private isAppActive: boolean = true;
  private isExternallySuspended: boolean = false;
  private season: string = 'autumn';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);

    // 🔥 这里的逻辑需要非常小心：回忆记录里也有 TrackPlayer
    // 如果正在放的是 BGM（id === 'bgm'），那就由我们管理；
    // 如果切到了其他音乐，BGM 就隐身。
    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      // 只要不是被外部挂起，且 BGM 应该在播
      if (
        event.state !== State.Playing &&
        this.isAppActive &&
        !this.isExternallySuspended
      ) {
        const currentTrack = await TrackPlayer.getActiveTrack();
        // 如果目前播放器挂的是别的歌（回忆音乐），那不管
        if (currentTrack && currentTrack.id !== 'bgm') return;
        
        // 如果挂的是 BGM 或者没歌，那就尝试恢复
        void this.loadAndPlay();
      }
    });
  }

  public setSuspended(suspended: boolean) {
    this.isExternallySuspended = suspended;
    if (!suspended) {
      // 恢复时，先看是不是被别人占用了
      void this.checkAndResume();
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      void this.checkAndResume();
    }
    // 切后台不用主动 pause，TrackPlayer 系统会自动处理
  };

  private async checkAndResume() {
    const currentTrack = await TrackPlayer.getActiveTrack();
    if (currentTrack && currentTrack.id !== 'bgm') return; // 有其他音乐在放，别抢
    void this.loadAndPlay();
  }

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      void this.loadAndPlay(true);
    }
  }

  public async loadAndPlay(forceReload = false) {
    try {
      const token = getGitHubToken();
      if (!token) return;

      // 如果当前队列里有其他歌曲，绝对不能断别人
      const queue = await TrackPlayer.getQueue();
      const activeTrack = queue.length > 0 ? queue[await TrackPlayer.getActiveTrackIndex() || 0] : null;
      if (!forceReload && activeTrack && activeTrack.id !== 'bgm') {
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

      if (!forceReload && this.currentUrl === downloadUrl && activeTrack?.id === 'bgm') {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing && !this.isExternallySuspended && this.isAppActive) {
          await TrackPlayer.play();
        }
        return;
      }

      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: 'bgm', // 🔥 核心：特殊 ID
        url: downloadUrl,
        title: 'BGM',
        artist: 'Wulili',
      });
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
      await TrackPlayer.setVolume(0.4);
      this.currentUrl = downloadUrl;

      if (!this.isExternallySuspended && this.isAppActive) {
        await TrackPlayer.play();
      }
      this.startHeartbeat();
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(async () => {
      try {
        if (!this.isAppActive || this.isExternallySuspended) return;
        
        const currentTrack = await TrackPlayer.getActiveTrack();
        if (currentTrack && currentTrack.id !== 'bgm') return; // 有人在放歌，别打扰

        const state = await TrackPlayer.getState();
        if (state !== State.Playing) {
          await TrackPlayer.play();
        }
      } catch {}
    }, 3000);
  }
}

export const bgmManager = new BgmManager();
