import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { State, RepeatMode, Event } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

class BgmManager {
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isMutedByMedia: boolean = false;
  private retryTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);

    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      if (event.state === State.Playing) {
        this.isMutedByMedia = true;
      } else if (
        event.state === State.Paused ||
        event.state === State.Stopped ||
        event.state === State.Ended ||
        event.state === State.None
      ) {
        this.isMutedByMedia = false;
        // 如果没声音了，尝试恢复
        await this.resume();
      }
    });

    // 🔥 启动保活定时器（每 3 秒检查一次）
    this.retryTimer = setInterval(() => {
      if (!this.isAppActive || this.isMutedByMedia) return;
      void this.resume();
    }, 3000);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      void this.resume();
    }
  };

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      void this.loadAndPlay(true);
    }
  }

  // 🔥 检查是否有音乐在放
  private async isMusicPlaying(): Promise<boolean> {
    try {
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0)
        ? queue[activeIndex]
        : null;
      if (!activeTrack) return false;
      if (activeTrack.id === 'bgm') return false;
      const state = await TrackPlayer.getState();
      return state === State.Playing;
    } catch {
      return false;
    }
  }

  public async loadAndPlay(force = false) {
    try {
      if (!this.isAppActive) return;
      const token = getGitHubToken();
      if (!token) return;

      if (await this.isMusicPlaying()) return;

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

      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0)
        ? queue[activeIndex]
        : null;

      // 已经是这首 BGM，只需恢复
      if (!force && activeTrack && activeTrack.id === 'bgm' && this.currentUrl === downloadUrl) {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing) {
          await TrackPlayer.play();
        }
        return;
      }

      // 重新装载
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
      
      if (!this.isMutedByMedia) {
        await TrackPlayer.play();
      }
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }

  public async resume() {
    try {
      if (!this.isAppActive || this.isMutedByMedia) return;
      if (await this.isMusicPlaying()) return;

      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0)
        ? queue[activeIndex]
        : null;

      if (activeTrack && activeTrack.id === 'bgm') {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing) {
          await TrackPlayer.play();
        }
      } else if (!activeTrack) {
        await this.loadAndPlay();
      }
    } catch {}
  }

  public async suspendForVideo() {
    this.isMutedByMedia = true;
    try { await TrackPlayer.pause(); } catch {}
  }

  public async resumeFromVideo() {
    this.isMutedByMedia = false;
    await this.resume();
  }
}

export const bgmManager = new BgmManager();
