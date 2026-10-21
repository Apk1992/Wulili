import Sound from 'react-native-sound';

Sound.setCategory('Playback', true);

const DEFAULT_BGM = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev/bgm/autumn_day.m4a.mp4';

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = DEFAULT_BGM;
  private isSuspendedForVideo: boolean = false;
  private retryCount: number = 0;
  private restartTimer: ReturnType<typeof setTimeout> | null = null;

  public init(audioUrl?: string) {
    if (audioUrl) this.currentUrl = audioUrl;
    const targetUrl = this.currentUrl;

    // 已经在播，不用重复加载
    if (this.sound && this.isPlaying && !this.isSuspendedForVideo) {
      return;
    }

    this.releaseSound();
    console.log('[BgmManager] 加载 BGM:', targetUrl);

    setTimeout(() => {
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
        this.retryCount = 0;
        this.isPlaying = true;
        this.playLoop();
      });
    }, 300);
  }

  private playLoop() {
    // 🔥 每次进入都做完整性检查
    if (!this.sound || !this.isPlaying || this.isSuspendedForVideo) return;

    const current = this.sound; // 捕获当前实例，防止中途被释放
    try {
      current.play((success) => {
        // 播放结束回调
        if (!this.isPlaying || this.isSuspendedForVideo) return;
        if (!this.sound || this.sound !== current) return; // 实例已被替换/释放，别再操作

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
            if (this.isPlaying && !this.isSuspendedForVideo) {
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
    this.isSuspendedForVideo = false;
    this.isPlaying = true;
    // 🔥 如果没有实例或实例失效，重新加载
    if (!this.sound) {
      this.init(this.currentUrl);
      return;
    }
    try {
      this.sound.getCurrentTime((seconds) => {
        // getCurrentTime 是 Sound 提供的存活检测
      });
      this.playLoop();
    } catch {
      // 实例已经死掉，重新初始化
      this.init(this.currentUrl);
    }
    console.log('[BgmManager] resume 调用完成');
  }

  public suspendForVideo() {
    if (this.isPlaying) {
      this.isSuspendedForVideo = true;
      if (this.sound) {
        try { this.sound.pause(); } catch {}
      }
    }
  }

  public resumeFromVideo() {
    if (this.isSuspendedForVideo) {
      this.isSuspendedForVideo = false;
      this.isPlaying = true;
      if (this.sound) this.playLoop();
      else this.init(this.currentUrl);
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
