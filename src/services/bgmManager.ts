import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import { getGitHubToken } from '@/api/githubClient';

Sound.setCategory('Playback');

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isLoading: boolean = false;
  private isManualPaused: boolean = false; // 用户/媒体播放器接管时的暂停

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      Sound.setActive(true);
      if (!this.isManualPaused) {
        this.resume();
      }
    } else {
      this.pause(true); // 后台时静默暂停
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
      if (!token) { this.isLoading = false; return; }

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const suffix = isNight ? 'night' : 'day';
      const filePath = `bgm/${this.season}_${suffix}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;
      
      const res = await fetch(apiUrl, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' } });
      if (!res.ok) { this.isLoading = false; return; }
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
        if (error) return;
        this.currentUrl = downloadUrl;
        if (this.sound) {
          this.sound.setVolume(0.4);
          this.sound.setNumberOfLoops(-1);
          if (this.isAppActive && !this.isManualPaused) {
            this.sound.play();
          }
        }
      });
    } catch {
      this.isLoading = false;
    }
  }

  // 外部音乐或视频播放时调用：暂停 BGM
  public pauseForMedia() {
    this.isManualPaused = true;
    this.pause(false);
  }

  // 退出音乐或视频播放时调用：恢复 BGM
  public resumeFromMedia() {
    this.isManualPaused = false;
    if (this.isAppActive) {
      this.resume();
    }
  }

  private pause(isBackground = false) { 
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    } 
  }

  private resume() {
    if (!this.sound || this.isManualPaused || !this.isAppActive) return;
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
}

export const bgmManager = new BgmManager();
