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
  
  // 🔥 强排他锁：只要正在请求 API 或者正在创建 Sound，绝对不允许第二个请求进入！
  private isFetchingOrLoading: boolean = false;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    // 软件启动时，尝试 3 次强力唤醒（针对冷启动 Token 加载延迟）
    setTimeout(() => this.init(), 400);
    setTimeout(() => this.init(), 1200);
    setTimeout(() => this.init(), 2500);
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
    // 只要有正在播放的 sound，或者正在网络请求，立刻退出！
    if (this.sound || this.isFetchingOrLoading || this.isMutedByMedia) return;
    void this.loadAndPlay();
  }

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      this.release();
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
    // 🔥 第一层拦截：已被媒体挂起、已有播放对象、或正在加载中
    if (this.isMutedByMedia || this.sound || this.isFetchingOrLoading) return;

    this.isFetchingOrLoading = true; // 上锁

    try {
      const token = getGitHubToken();
      if (!token) {
        this.isFetchingOrLoading = false;
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
        this.isFetchingOrLoading = false;
        return;
      }

      const data = await res.json();
      const downloadUrl = data.download_url;

      // 如果请求过程中已经切去听音乐/看视频了，放弃
      if (this.isMutedByMedia) {
        this.isFetchingOrLoading = false;
        return;
      }

      // 🔥 清除旧句柄（防止底层硬音轨重叠）
      this.release();

      try {
        Sound.setActive(true);
      } catch {}

      // 创建 Native Sound 实例
      const createdSound = new Sound(downloadUrl, undefined, (error) => {
        this.isFetchingOrLoading = false; // 解锁

        if (error || this.isMutedByMedia) {
          try { createdSound.release(); } catch {}
          return;
        }

        // 第二重防止重叠：如果极小概率下此时已有 sound，销毁刚创建的
        if (this.sound) {
          try {
            this.sound.stop();
            this.sound.release();
          } catch {}
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
      this.isFetchingOrLoading = false;
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

    if (!this.sound) {
      void this.loadAndPlay();
      return;
    }

    try {
      Sound.setActive(true);
      if (!this.sound.isPlaying()) {
        this.sound.play();
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

  public suspendForVideo() {
    this.isMutedByMedia = true;
    this.isFetchingOrLoading = false;
    this.release(); 
  }

  public resumeFromVideo() {
    this.isMutedByMedia = false;
    this.isFetchingOrLoading = false;
    void this.loadAndPlay();
  }
}

export const bgmManager = new BgmManager();
