import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import TrackPlayer, { Event, State } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

// 开启允许通过 HTTP 播放
Sound.setCategory('Playback');

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private isMuted: boolean = false;
  private isAppActive: boolean = true;
  private season: string = 'autumn';

  constructor() {
    // 监听 App 前后台
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // 监听 TrackPlayer（音乐/视频），一旦开始播放就暂停 BGM
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

      // 如果正在播放同一首歌，且不需要强制刷新，直接返回
      if (!forceReload && this.currentUrl === downloadUrl && this.sound) {
        if (!this.isMuted && this.isAppActive && !this.sound.isPlaying()) {
          this.sound.play();
        }
        return;
      }

      // 🔥 关键：在加载新歌之前，必须释放旧的
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
        this.sound.setNumberOfLoops(-1); // 无限循环
        
        // 只有在没被静音、且App在前台时，才播放
        if (!this.isMuted && this.isAppActive) {
          this.sound.play();
        }
      });
    } catch (err) {
      console.warn('BGM 异常:', err);
    }
  }

  private play() {
    if (this.sound && !this.isMuted && this.isAppActive) {
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

// 导出全局唯一实例
export const bgmManager = new BgmManager();
