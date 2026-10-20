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
  
  private loadingPromise: Promise<void> | null = null;
  private retryTimer: NodeJS.Timeout | null = null;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
    setTimeout(() => this.init(), 500);
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

  public init() {
    // 🔥 严格防重叠：如果已经在播放，直接返回，绝不重复触发
    try {
      if (this.sound && this.sound.isPlaying()) return;
    } catch {}

    void this.loadAndPlayWithRetry(0);
  }

  private async loadAndPlayWithRetry(retryCount: number) {
    if (this.isMutedByMedia) return;

    try {
      if (this.sound && this.sound.isPlaying()) return;
    } catch {}

    const token = getGitHubToken();
    if (!token) {
      if (retryCount < 10) {
        if (this.retryTimer) clearTimeout(this.retryTimer);
        this.retryTimer = setTimeout(() => {
          void this.loadAndPlayWithRetry(retryCount + 1);
        }, 300);
      }
      return;
    }

    await this.loadAndPlay();
  }

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      this.release();
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
    if (this.isMutedByMedia) return;

    // 如果已经在播放，直接退出
    try {
      if (this.sound && this.sound.isPlaying()) return;
    } catch {}

    if (this.sound) {
      this.resume();
      return;
    }

    if (this.loadingPromise) {
      await this.loadingPromise;
      return;
    }

    this.loadingPromise = (async () => {
      try {
        const token = getGitHubToken();
        if (!token) return;

        const currentHour = new Date().getHours();
        const isNight = currentHour >= 18 || currentHour < 6;
        const suffix = isNight ? 'night' : 'day';
        const filePath = `bgm/${this.season}_${suffix}.m4a`;
        // 加入时间戳防止 API 缓存
        const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}?t=${Date.now()}`;

        const res = await fetch(apiUrl, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json', 'Cache-Control': 'no-cache' },
        });
        if (!res.ok) return;
        const data = await res.json();
        const downloadUrl = data.download_url;

        if (this.isMutedByMedia) return;

        this.release();

        try {
          Sound.setActive(true);
        } catch {}

        await new Promise<void>((resolve) => {
          const newSound = new Sound(downloadUrl, undefined, (error) => {
            if (error) {
              this.sound = null;
              resolve();
              return;
            }

            if (this.isMutedByMedia) {
              try {
                newSound.release();
              } catch {}
              resolve();
              return;
            }

            this.release();

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
            resolve();
          });
        });
      } catch {
      } finally {
        this.loadingPromise = null;
      }
    })();

    await this.loadingPromise;
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

    try {
      if (this.sound && this.sound.isPlaying()) return;
    } catch {}

    if (!this.sound) {
      void this.loadAndPlayWithRetry(0);
      return;
    }

    try {
      Sound.setActive(true);
      if (this.sound && !this.sound.isPlaying()) {
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
    if (this.retryTimer) clearTimeout(this.retryTimer);
    this.release(); 
  }

  public resumeFromVideo() {
    this.isMutedByMedia = false;
    void this.loadAndPlayWithRetry(0);
  }
}

export const bgmManager = new BgmManager();
