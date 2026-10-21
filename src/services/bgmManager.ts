// src/services/bgmManager.ts
import Sound from 'react-native-sound';

// 允许在静音模式下播放（iOS 必须）
Sound.setCategory('Playback', true);

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev/music/bgm_default.mp3';
  private isSuspendedForVideo: boolean = false;
  private retryCount: number = 0;

  // 初始化并播放 BGM（冷启动容错 + 自动重试）
  public init(audioUrl?: string) {
    const targetUrl = audioUrl || this.currentUrl;
    if (audioUrl) {
      this.currentUrl = audioUrl;
    }

    // 如果已经在播放，直接返回
    if (this.sound && this.isPlaying && !this.isSuspendedForVideo) {
      return;
    }

    // 清理旧实例
    this.releaseSound();

    console.log('[BgmManager] 冷启动加载背景音乐: ', targetUrl);

    // 延迟 300ms 确保 App 渲染和底层音频焦点就绪后加载
    setTimeout(() => {
      this.sound = new Sound(targetUrl, '', (error) => {
        if (error) {
          console.warn('[BgmManager] 背景音乐加载失败，尝试重试:', error);
          this.isPlaying = false;
          // 加载失败时自动重试最多 3 次
          if (this.retryCount < 3) {
            this.retryCount++;
            setTimeout(() => this.init(targetUrl), 1500);
          }
          return;
        }

        this.retryCount = 0; // 成功后重置重试计数
        this.isPlaying = true;
        this.playLoop();
      });
    }, 300);
  }

  // 内部循环播放函数
  private playLoop() {
    if (!this.sound || !this.isPlaying || this.isSuspendedForVideo) return;

    this.sound.play((success) => {
      if (success) {
        if (this.isPlaying && !this.isSuspendedForVideo) {
          this.sound?.seekTo(0);
          this.playLoop();
        }
      } else {
        console.warn('[BgmManager] 音频播放中断，尝试自动恢复');
        if (this.isPlaying && !this.isSuspendedForVideo) {
          setTimeout(() => this.playLoop(), 1000);
        }
      }
    });
  }

  // 暂停音乐
  public pause() {
    this.isPlaying = false;
    if (this.sound) {
      try {
        this.sound.pause();
      } catch (e) {
        console.warn('[BgmManager] 暂停异常:', e);
      }
    }
  }

  // 恢复/唤醒音乐（冷启动或后台切回前台时调用）
  public resume() {
    this.isSuspendedForVideo = false;
    this.isPlaying = true;
    if (this.sound) {
      this.playLoop();
    } else {
      this.init(this.currentUrl);
    }
    console.log('[BgmManager] 背景音乐已强制唤醒恢复');
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
      if (this.sound) {
        this.playLoop();
      } else {
        this.init(this.currentUrl);
      }
    }
  }

  private releaseSound() {
    if (this.sound) {
      try {
        this.sound.stop();
        this.sound.release();
      } catch (e) {
        console.warn('[BgmManager] 释放实例异常:', e);
      }
      this.sound = null;
    }
  }

  public stop() {
    this.isPlaying = false;
    this.releaseSound();
  }

  public toggle(): boolean {
    if (this.isPlaying) {
      this.pause();
      return false;
    } else {
      this.resume();
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const bgmManager = new BgmManager();
