import Sound from 'react-native-sound';

Sound.setCategory('Playback', true);

const R2_BASE = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const MANIFEST_URL = `${R2_BASE}/manifest.json`;

// 兜底：manifest 拉不到时用这个
const FALLBACK_BGM = `${R2_BASE}/bgm/autumn_day.m4a.mp4`;

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = FALLBACK_BGM;
  private retryCount: number = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;
  private externalHolders: Set<string> = new Set();

  // 🔥 manifest 缓存
  private manifestFiles: string[] | null = null;
  private manifestLoading: Promise<string[]> | null = null;

  // ===== 外部占用 API =====
  public acquireExternal(holderId: string) {
    this.externalHolders.add(holderId);
    this.pause();
  }
  public releaseExternal(holderId: string) {
    this.externalHolders.delete(holderId);
  }
  public isExternallyHeld(): boolean {
    return this.externalHolders.size > 0;
  }
  public suspendForVideo() { this.acquireExternal('video'); }
  public resumeFromVideo() { this.releaseExternal('video'); }

  // ===== manifest 加载 =====
  private async loadManifest(): Promise<string[]> {
    if (this.manifestFiles) return this.manifestFiles;
    if (this.manifestLoading) return this.manifestLoading;

    this.manifestLoading = (async () => {
      try {
        const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
        if (!res.ok) throw new Error(`manifest ${res.status}`);
        const data = await res.json();
        const files: string[] = Array.isArray(data?.files)
          ? data.files
              .map((f: any) => f?.path)
              .filter((p: any): p is string => typeof p === 'string' && p.length > 0)
          : [];
        this.manifestFiles = files;
        return files;
      } catch (e) {
        console.warn('[BgmManager] manifest 加载失败:', e);
        return [];
      } finally {
        this.manifestLoading = null;
      }
    })();

    return this.manifestLoading;
  }

  /** 从 manifest 里找匹配的 BGM 路径，比如 autumn + day */
  private async resolveBgmPath(season: string, isNight: boolean): Promise<string | null> {
    const files = await this.loadManifest();
    const suffix = isNight ? 'night' : 'day';
    const prefix = `bgm/${season}_${suffix}`;

    // 先精确匹配 .m4a / .m4a.mp4 / .mp3 / .wav
    const candidates = files.filter((p) => p.startsWith(prefix));
    if (candidates.length === 0) return null;

    // 优先选非目录（size>0 或非 / 结尾）
    const file = candidates.find((p) => !p.endsWith('/'));
    return file ?? null;
  }

  // ===== 播放控制 =====

  /** 设置要播放的 BGM（按季节+昼夜） */
  public async setScene(season: string, isNight: boolean): Promise<void> {
    if (this.isExternallyHeld()) return;

    const path = await this.resolveBgmPath(season, isNight);
    const url = path ? `${R2_BASE}/${path}` : FALLBACK_BGM;

    if (url === this.currentUrl && this.sound && this.isPlaying) {
      return; // 已经是这首，不用重载
    }

    this.currentUrl = url;
    this.init(url);
  }

  public init(audioUrl?: string) {
    if (this.isExternallyHeld()) return;

    if (audioUrl) this.currentUrl = audioUrl;
    const targetUrl = this.currentUrl;

    if (this.sound && this.isPlaying) return;

    this.releaseSound();
    console.log('[BgmManager] 加载 BGM:', targetUrl);

    setTimeout(() => {
      if (this.isExternallyHeld()) return;

      this.sound = new Sound(targetUrl, '', (error) => {
        if (error) {
          console.warn('[BgmManager] BGM 加载失败:', error, targetUrl);
          this.isPlaying = false;
          if (this.retryCount < 5) {
            this.retryCount++;
            setTimeout(() => this.init(targetUrl), 1500);
          }
          return;
        }
        if (this.isExternallyHeld()) {
          try { this.sound?.stop(); this.sound?.release(); } catch {}
          this.sound = null;
          this.isPlaying = false;
          return;
        }
        this.retryCount = 0;
        this.isPlaying = true;
        this.playLoop();
      });
    }, 300);
  }

  private playLoop() {
    if (!this.sound || !this.isPlaying || this.isExternallyHeld()) return;

    const current = this.sound;
    try {
      current.play((success) => {
        if (!this.isPlaying || this.isExternallyHeld()) return;
        if (!this.sound || this.sound !== current) return;

        if (success) {
          try {
            this.sound.seekTo(0);
            this.playLoop();
          } catch {
            this.init(this.currentUrl);
          }
        } else {
          console.warn('[BgmManager] BGM 播放中断，1 秒后重试');
          if (this.restartTimer) clearTimeout(this.restartTimer);
          this.restartTimer = setTimeout(() => {
            if (this.isPlaying && !this.isExternallyHeld()) {
              this.init(this.currentUrl);
            }
          }, 1000);
        }
      });
    } catch (e) {
      console.warn('[BgmManager] play 异常:', e);
      this.init(this.currentUrl);
    }
  }

  public pause() {
    this.isPlaying = false;
    if (this.sound) {
      try { this.sound.pause(); } catch {}
    }
  }

  public resume() {
    if (this.isExternallyHeld()) return;
    this.isPlaying = true;
    if (!this.sound) {
      this.init(this.currentUrl);
      return;
    }
    try {
      this.sound.getCurrentTime(() => {});
      this.playLoop();
    } catch {
      this.init(this.currentUrl);
    }
  }

  private releaseSound() {
    if (this.restartTimer) {
      clearTimeout(this.restartTimer);
      this.restartTimer = null;
    }
    if (this.sound) {
      try { this.sound.stop(); this.sound.release(); } catch {}
      this.sound = null;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.releaseSound();
  }

  public toggle(): boolean {
    if (this.isPlaying) { this.pause(); return false; }
    this.resume();
    return true;
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const bgmManager = new BgmManager();
