// src/services/bgmManager.ts
import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';

try {
  Sound.setCategory('Playback', true);
} catch {}

// 🔥 Cloudflare R2 静态资源基础地址
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isMutedByMedia: boolean = false;
  private isPreparing: boolean = false;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    
    // 冷启动唤醒
    setTimeout(() => this.init(), 400);
    setTimeout(() => this.init(), 1500);

    // 心跳检测：防止 BGM 运行久了意外静默
    this.startHeartbeat();
  }

  private startHeartbeat() {
    if (this.heartbeatTimer) clearInterval(this.heartbeatTimer);
    this.heartbeatTimer = setInterval(() => {
      if (!this.isAppActive || this.isMutedByMedia || this.isPreparing) return;
      
      try {
        if (!this.sound || !this.sound.isPlaying()) {
          this.resume();
        }
      } catch {
        this.loadAndPlay();
      }
    }, 10000);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      try { Sound.setActive(true); } catch {}
      setTimeout(() => this.resume(), 300);
    } else {
      this.pause();
    }
  };

  public init() {
    if (this.isPlaying() || this.isPreparing || this.isMutedByMedia) return;
    void this.loadAndPlay();
  }

  public isPlaying(): boolean {
    try {
      return !!(this.sound && this.sound.isPlaying());
    } catch {
      return false;
    }
  }

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      this.release();
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
    if (this.isMutedByMedia || this.isPreparing || this.isPlaying()) return;
    this.isPreparing = true;

    try {
      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const suffix = isNight ? 'night' : 'day';
      
      // 🔥 直接从 R2 获取音频，告别 GitHub Raw 阻断
      const downloadUrl = `${R2_BASE_URL}/bgm/${this.season}_${suffix}.m4a?t=${Date.now()}`;

      if (this.isMutedByMedia) {
        this.isPreparing = false;
        return;
      }

      this.release();

      try { Sound.setActive(true); } catch {}

      const createdSound = new Sound(downloadUrl, undefined, (error) => {
        this.isPreparing = false;

        if (error || this.isMutedByMedia) {
          try { createdSound.release(); } catch {}
          return;
        }

        if (this.sound) {
          try { this.sound.stop(); this.sound.release(); } catch {}
        }

        this.sound = createdSound;
        this.currentUrl = downloadUrl;

        try {
          this.sound.setVolume(0.4);
          this.sound.setNumberOfLoops(-1);

          if (this.isAppActive && !this.isMutedByMedia) {
            this.sound.play();
          }
        } catch {}
      });

    } catch {
      this.isPreparing = false;
    }
  }

  public pause() {
    try {
      if (this.sound && this.sound.isPlaying()) {
        this.sound.pause();
      }
    } catch {}
  }

  public resume() {
    if (this.isMutedByMedia || !this.isAppActive) return;
    if (this.isPlaying()) return;

    if (!this.sound) {
      void this.loadAndPlay();
      return;
    }

    try {
      Sound.setActive(true);
      this.sound.play();
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

  public suspendForVideo() {
    this.isMutedByMedia = true;
    this.isPreparing = false;
    this.release(); 
  }

  public resumeFromVideo() {
    this.isMutedByMedia = false;
    this.isPreparing = false;
    void this.loadAndPlay();
  }
}

export const bgmManager = new BgmManager();
