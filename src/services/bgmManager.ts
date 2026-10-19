import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

Sound.setCategory('Playback');

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isLoading: boolean = false; // 🔥 防止并发加载
  private isMutedByMedia: boolean = false; // 🔥 是否有音乐在放

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      if (event.state === State.Playing) {
        this.isMutedByMedia = true;
        this.pause();
      } else if (event.state === State.Paused || event.state === State.Stopped || event.state === State.Ended) {
        this.isMutedByMedia = false;
        this.resume();
      }
    });

    // 🔥 启动 2 秒一次的保活心跳
    setInterval(() => {
      if (!this.isAppActive || this.isMutedByMedia || this.isLoading) return;
      if (this.sound && !this.sound.isPlaying()) {
        this.sound.play();
      }
    }, 2000);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      Sound.setActive(true);
      // 切回前台时，稍微延迟一下再恢复，避开系统音频通道的切换期
      setTimeout(() => {
        if (!this.sound) void this.loadAndPlay();
        else this.resume();
      }, 500);
    } else {
      this.pause();
    }
  };

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      this.release();
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const token = getGitHubToken();
      if (!token) {
        this.isLoading = false;
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
      if (!res.ok) {
        this.isLoading = false;
        return;
      }
      const data = await res.json();
      const downloadUrl = data.download_url;

      if (this.currentUrl === downloadUrl && this.sound) {
        this.resume();
        this.isLoading = false;
        return;
      }

      this.release();
      Sound.setActive(true);

      this.sound = new Sound(downloadUrl, undefined, (error) => {
        this.isLoading = false;
        if (error) {
          console.warn('BGM 加载失败:', error);
          return;
        }
        this.currentUrl = downloadUrl;
        if (this.sound) {
          this.sound.setVolume(0.4);
          this.sound.setNumberOfLoops(-1);
          // 延时 800ms 后强启，避开系统冷启动的死锁
          setTimeout(() => {
            if (!this.isMutedByMedia && this.isAppActive) {
              this.sound?.play();
            }
          }, 800);
        }
      });
    } catch (err) {
      this.isLoading = false;
      console.warn('BGM 异常:', err);
    }
  }

  private pause() {
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    }
  }

  private resume() {
    if (!this.sound || this.isMutedByMedia || !this.isAppActive) return;
    if (!this.sound.isPlaying()) {
      this.sound.play();
    }
  }

  public release() {
    if (this.sound) {
      this.sound.stop();
      this.sound.release();
      this.sound = null;
    }
  }

  public suspendForVideo() {
    this.isMutedByMedia = true;
    this.pause();
  }
  public resumeFromVideo() {
    this.isMutedByMedia = false;
    this.resume();
  }
}

export const bgmManager = new BgmManager();
