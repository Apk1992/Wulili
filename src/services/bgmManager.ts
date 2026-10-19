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
  private isExternallySuspended: boolean = false; // 🔥 新增：供视频页强行暂停
  private season: string = 'autumn';

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

  // 供视频页面调用
  public setSuspended(suspended: boolean) {
    this.isExternallySuspended = suspended;
    if (suspended) {
      this.pause();
    } else {
      this.play();
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

  public stopAndRelease() {
    if (this.sound) {
      this.sound.stop();
      this.sound.release();
      this.sound = null;
    }
  }
}

export const bgmManager = new BgmManager();
