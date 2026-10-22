import Sound from 'react-native-sound';

Sound.setCategory('Playback', true);

const DEFAULT_BGM =
  'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev/bgm/autumn_day.m4a.mp4';

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = DEFAULT_BGM;
  private retryCount: number = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  /**
   * 外部占用者集合（回忆音乐 / 视频 等）
   * 只要集合非空，BGM 一律不允许 resume / init
   */
  private externalHolders: Set<string> = new Set();

  // ========== 外部占用 API ==========

  public acquireExternal(holderId: string) {
    this.externalHolders.add(holderId);
    this.pause();
    console.log('[BgmManager] acquireExternal:', holderId, 'holders=', this.externalHolders.size);
  }

  public releaseExternal(holderId: string) {
    this.externalHolders.delete(holderId);
    console.log('[BgmManager] releaseExternal:', holderId, 'holders=', this.externalHolders.size);
  }

  public isExternallyHeld(): boolean {
    return this.externalHolders.size > 0;
  }

  // ========== 兼容旧接口（内部转发到 external） ==========

  public suspendForVideo() {
    this.acquireExternal('video');
  }

  public resumeFromVideo() {
    this.releaseExternal('video');
  }

  // ========== 播放控制 ==========

  public init(audioUrl?: string) {
    // 外部占用期间，不允许初始化/播放
    if (this.isExternallyHeld()) {
      console.log('[BgmManager] init 被拦截：外部占用中');
      return;
    }

    if (audioUrl) this.currentUrl = audioUrl;
    const targetUrl = this.currentUrl;

    if (this.sound && this.isPlaying) {
      return;
    }

    this.releaseSound();
    console.log('[BgmManager] 加载 BGM:', targetUrl);

    setTimeout(() => {
      // 异步延迟里再检查一次，防止期间被占用
      if (this.isExternallyHeld()) return;

      this.sound = new Sound(targetUrl, '', (error) => {
        if (error) {
          console.warn('[BgmManager] BGM 加载失败:', error);
          this.isPlaying = false;
          if (this.retryCount < 5) {
            this.retryCount++;
            setTimeout(() => this.init(targetUrl), 1500);
          }
          return;
        }
        // 加载完再检查一次
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
    // 外部占用期间，不允许恢复
    if (this.isExternallyHeld()) {
      console.log('[BgmManager] resume 被拦截：外部占用中');
      return;
    }
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
    console.log('[BgmManager] resume 调用完成');
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
