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
  private isMediaPlaying: boolean = false; // 是否正在播放音乐或视频

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      Sound.setActive(true);
      this.checkAndPlay();
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
        this.checkAndPlay();
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
          this.checkAndPlay();
        }
      });
    } catch {
      this.isLoading = false;
    }
  }

  private checkAndPlay() {
    if (this.isAppActive && !this.isMediaPlaying && this.sound && !this.sound.isPlaying()) {
      this.sound.play();
    }
  }

  public pauseForMedia() {
    this.isMediaPlaying = true;
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    }
  }

  public resumeFromMedia() {
    this.isMediaPlaying = false;
    this.checkAndPlay();
  }

  private pause() { 
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    } 
  }

  public release() {
    if (this.sound) { 
      this.sound.stop(); 
      this.sound.release(); 
      this.sound = null; 
      this.currentUrl = null;
    }
  }
}

export const bgmManager = new BgmManager();
