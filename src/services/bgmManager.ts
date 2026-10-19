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
  private isLoading: boolean = false;
  private isMutedByMedia: boolean = false;

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

    // 🔥 心跳：每 2 秒查一次，没播就强行播
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
      setTimeout(() => this.resume(), 500);
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
          setTimeout(() => {
            if (!this.isMutedByMedia && this.isAppActive) this.sound?.play();
          }, 500);
        }
      });
    } catch {
      this.isLoading = false;
    }
  }

  private pause() { if (this.sound && this.sound.isPlaying()) this.sound.pause(); }
  private resume() {
    if (!this.sound || this.isMutedByMedia || !this.isAppActive) return;
    if (!this.sound.isPlaying()) this.sound.play();
  }
  public release() {
    if (this.sound) { this.sound.stop(); this.sound.release(); this.sound = null; }
  }

  public suspendForVideo() { this.isMutedByMedia = true; this.pause(); }
  public resumeFromVideo() { this.isMutedByMedia = false; this.resume(); }
}

export const bgmManager = new BgmManager();
