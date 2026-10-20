// src/services/bgmManager.ts
import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import { getGitHubToken } from '@/api/githubClient';

try {
  Sound.setCategory('Playback', true);
} catch {}

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isMutedByMedia: boolean = false;
  
  // 🔥 核心排他锁：防止异步请求与实例化期间重复触发
  private isPreparing: boolean = false;
  private autoInitTimer: NodeJS.Timeout | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    // 冷启动 800ms 后自动开始尝试初始化
    this.startAutoInitLoop();
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

  // 🔥 解决关掉软件重开无 BGM 的关键：自动轮询尝试，直到 Token 准备就绪
  private startAutoInitLoop() {
    if (this.autoInitTimer) clearInterval(this.autoInitTimer);
    this.autoInitTimer = setInterval(() => {
      if (this.sound) {
        if (this.autoInitTimer) clearInterval(this.autoInitTimer);
        return;
      }
      const token = getGitHubToken();
      if (token && !this.isMutedByMedia) {
        void this.loadAndPlay();
      }
    }, 500);
  }

  public init() {
    if (this.sound && this.isPlaying()) return;
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
    // 拦截：如果被挂起、正在准备中、或已经处于播放状态
    if (this.isMutedByMedia || this.isPreparing) return;
    if (this.isPlaying()) return;

    this.isPreparing = true;

    try {
      const token = getGitHubToken();
      if (!token) {
        this.isPreparing = false;
        return;
      }

      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const suffix = isNight ? 'night' : 'day';
      const filePath = `bgm/${this.season}_${suffix}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}?t=${Date.now()}`;

      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Cache-Control': 'no-cache' },
      });
      
      if (!res.ok) {
        this.isPreparing = false;
        return;
      }

      const data = await res.json();
      const downloadUrl = data.download_url;

      if (this.isMutedByMedia) {
        this.isPreparing = false;
        return;
      }

      // 强制释放所有可能残存的原生 Sound 对象
      this.release();

      try {
        Sound.setActive(true);
      } catch {}

      // 物理实例化音频
      const newSound = new Sound(downloadUrl, undefined, (error) => {
        this.isPreparing = false;

        if (error || this.isMutedByMedia) {
          try { newSound.release(); } catch {}
          return;
        }

        // 再次兜底：如果此时已有句柄，强制销毁
        if (this.sound) {
          try {
            this.sound.stop();
            this.sound.release();
          } catch {}
        }

        this.sound = newSound;
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
    if (this.autoInitTimer) clearInterval(this.autoInitTimer);
    this.release(); 
  }

  public resumeFromVideo() {
    this.isMutedByMedia = false;
    this.startAutoInitLoop();
    void this.loadAndPlay();
  }
}

export const bgmManager = new BgmManager();
