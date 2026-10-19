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
  private watchdog: ReturnType<typeof setInterval> | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // 🔥 监听 TrackPlayer，如果有其他的音乐/视频在播，强制暂停 BGM
    TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      if (event.state === State.Playing) {
        this.pause();
      } else if (event.state === State.Paused || event.state === State.Stopped || event.state === State.Ended) {
        this.resume();
      }
    });

    // 🔥 启动终极自愈定时器（每2秒查一次，只要没声音，强行拉起）
    this.startWatchdog();
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      Sound.setActive(true);
      this.resume();
    } else {
      this.pause();
    }
  };

  private startWatchdog() {
    if (this.watchdog) return;
    this.watchdog = setInterval(async () => {
      if (!this.isAppActive) return;
      if (!this.sound) {
        void this.loadAndPlay();
        return;
      }
      // 检查 TrackPlayer 是不是在放音乐
      try {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing && !this.sound.isPlaying()) {
          this.sound.play();
        }
      } catch {
        if (!this.sound.isPlaying()) this.sound.play();
      }
    }, 2000);
  }

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      this.release();
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
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

      if (this.currentUrl === downloadUrl && this.sound) {
        if (!this.sound.isPlaying()) this.sound.play();
        return;
      }

      this.release();
      Sound.setActive(true);

      this.sound = new Sound(downloadUrl, undefined, (error) => {
        if (error) {
          console.warn('BGM 加载失败:', error);
          return;
        }
        this.currentUrl = downloadUrl;
        if (this.sound) {
          this.sound.setVolume(0.4);
          this.sound.setNumberOfLoops(-1);
          this.sound.play();
        }
      });
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }

  private pause() {
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    }
  }

  private resume() {
    if (this.sound && !this.sound.isPlaying()) {
      // 检查 TrackPlayer 是否在放歌
      TrackPlayer.getState().then((state) => {
        if (state !== State.Playing) {
          this.sound?.play();
        }
      }).catch(() => {
        this.sound?.play();
      });
    }
  }

  public release() {
    if (this.sound) {
      this.sound.stop();
      this.sound.release();
      this.sound = null;
    }
  }

  public suspendForVideo() { this.pause(); }
  public resumeFromVideo() { this.resume(); }
}

export const bgmManager = new BgmManager();
