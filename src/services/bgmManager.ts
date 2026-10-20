// src/services/bgmManager.ts
import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import { getGitHubToken } from '@/api/githubClient';

// 设置音频模式
try {
  Sound.setCategory('Playback', true);
} catch {}

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isLoading: boolean = false;
  private isMutedByMedia: boolean = false;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      try {
        Sound.setActive(true);
      } catch {}
      setTimeout(() => this.resume(), 300);
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
    if (this.isLoading || this.isMutedByMedia) return;
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
        this.isLoading = false;
        this.resume();
        return;
      }

      this.release();

      try {
        Sound.setActive(true);
      } catch {}

      const newSound = new Sound(downloadUrl, undefined, (error) => {
        this.isLoading = false;
        if (error) {
          this.sound = null;
          return;
        }

        // 如果在加载期间用户已经打开了音乐/视频，放弃播放
        if (this.isMutedByMedia) {
          newSound.release();
          return;
        }

        this.sound = newSound;
        this.currentUrl = downloadUrl;
        
        try {
          this.sound.setVolume(0.4);
          this.sound.setNumberOfLoops(-1);

          if (this.isAppActive && !this.isMutedByMedia) {
            this.sound.play((success) => {
              if (!success) {
                try {
                  this.sound?.reset();
                } catch {}
              }
            });
          }
        } catch {}
      });
    } catch {
      this.isLoading = false;
    }
  }

  public pause() {
    try {
      if (this.sound) {
        if (this.sound.isPlaying()) {
          this.sound.pause();
        }
      }
    } catch {}
  }

  public resume() {
    if (this.isMutedByMedia || !this.isAppActive) return;

    if (!this.sound) {
      void this.loadAndPlay();
      return;
    }

    try {
      Sound.setActive(true);
      if (this.sound && !this.sound.isPlaying()) {
        this.sound.play((success) => {
          if (!success) {
            try {
              this.sound?.reset();
            } catch {}
          }
        });
      }
    } catch {}
  }

  public release() {
    try {
      if (this.sound) {
        this.sound.stop();
        this.sound.release();
      }
    } catch {}
    this.sound = null;
    this.currentUrl = null;
  }

  // 🔥 核心修改：当打开音乐或视频时，直接完全释放 BGM，把音频通道让给播放器，防止底层冲突闪退
  public suspendForVideo() {
    this.isMutedByMedia = true;
    this.release(); 
  }

  // 离开音乐或视频时，重新加载并恢复 BGM
  public resumeFromVideo() {
    this.isMutedByMedia = false;
    void this.loadAndPlay();
  }
}

export const bgmManager = new BgmManager();
