import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

Sound.setCategory('Playback');

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private isMuted: boolean = false;
  private isAppActive: boolean = true;
  private isExternallySuspended: boolean = false;
  private season: string = 'autumn';
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      if (event.state === State.Playing) {
        this.isMuted = true;
        this.pause();
      } else if (event.state === State.Paused || event.state === State.Stopped || event.state === State.Ended || event.state === State.None) {
        this.isMuted = false;
        this.play();
      }
    });
  }

  public setSuspended(suspended: boolean) {
    this.isExternallySuspended = suspended;
    if (suspended) {
      this.pause();
    } else {
      this.play();
      // 🔥 关键：如果之前因为视频挂了，退出视频时强制重载一次（防死锁）
      setTimeout(() => {
        if (!this.isMuted && this.isAppActive && !this.isExternallySuspended && this.sound && !this.sound.isPlaying()) {
          this.sound.play();
        }
      }, 300);
    }
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      Sound.setActive(true);
      this.play();
    } else {
      this.pause();
    }
  };

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

      if (!forceReload && this.currentUrl === downloadUrl && this.sound) {
        if (!this.isMuted && this.isAppActive && !this.isExternallySuspended && !this.sound.isPlaying()) {
          this.sound.play();
        }
        this.startHeartbeat(); // 🔥 每次调用都确保心跳启动
        return;
      }

      this.stopAndRelease();

      Sound.setActive(true);
      this.sound = new Sound(downloadUrl, undefined, (error) => {
        if (error) {
          console.warn('BGM 加载失败:', error);
          return;
        }
        
        this.currentUrl = downloadUrl;
        if (!this.sound) return;

        this.sound.setVolume(0.4);
        this.sound.setNumberOfLoops(-1);
        
        if (!this.isMuted && this.isAppActive && !this.isExternallySuspended) {
          this.sound.play();
        }
        this.startHeartbeat(); // 🔥 加载成功后启动心跳
      });
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }

  private play() {
    if (this.sound && !this.isMuted && this.isAppActive && !this.isExternallySuspended) {
      if (!this.sound.isPlaying()) {
        this.sound.play();
      }
    }
  }

  private pause() {
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    }
  }

  // 🔥 核心：每 3 秒检测一次，如果被意外卡住强制恢复
  private startHeartbeat() {
    if (this.heartbeatTimer) return;
    this.heartbeatTimer = setInterval(() => {
      if (
        this.sound &&
        !this.isMuted &&
        this.isAppActive &&
        !this.isExternallySuspended &&
        !this.sound.isPlaying()
      ) {
        this.sound.play();
      }
    }, 3000);
  }

  public stopAndRelease() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
    if (this.sound) {
      this.sound.stop();
      this.sound.release();
      this.sound = null;
    }
  }
}

export const bgmManager = new BgmManager();
