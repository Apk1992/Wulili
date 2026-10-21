// src/services/bgmManager.ts
import Sound from 'react-native-sound';

// 允许在静音模式下播放（iOS 必须）
Sound.setCategory('Playback', true);

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev/music/bgm_default.mp3';
  private isSuspendedForVideo: boolean = false;

  // 初始化并播放 BGM（采用递归回调确保 100% 绝对无限循环）
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

    console.log('[BgmManager] 加载并播放背景音乐: ', targetUrl);

    this.sound = new Sound(targetUrl, '', (error) => {
      if (error) {
        console.warn('[BgmManager] 背景音乐加载失败:', error);
        this.isPlaying = false;
        return;
      }

      this.isPlaying = true;
      this.playLoop();
    });
  }

  // 内部递归循环播放函数（彻底解决部分平台 setNumberOfLoops 失效问题）
  private playLoop() {
    if (!this.sound || !this.isPlaying || this.isSuspendedForVideo) return;

    this.sound.play((success) => {
      if (success) {
        // 播放完毕后如果依然处于播放状态，则自动递归重新播放实现无限循环
        if (this.isPlaying && !this.isSuspendedForVideo) {
          this.sound?.seekTo(0);
          this.playLoop();
        }
      } else {
        console.warn('[BgmManager] 音频播放中断');
        this.isPlaying = false;
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
    console.log('[BgmManager] 背景音乐已暂停');
  }

  // 恢复音乐
  public resume() {
    this.isSuspendedForVideo = false;
    this.isPlaying = true;
    if (this.sound) {
      this.playLoop();
    } else {
      this.init(this.currentUrl);
    }
    console.log('[BgmManager] 背景音乐已恢复');
  }

  // 为视频播放临时挂起（防止音频冲突）
  public suspendForVideo() {
    if (this.isPlaying) {
      this.isSuspendedForVideo = true;
      if (this.sound) {
        try {
          this.sound.pause();
        } catch {}
      }
      console.log('[BgmManager] 为视频播放临时挂起 BGM');
    }
  }

  // 视频播放完毕后从挂起中恢复
  public resumeFromVideo() {
    if (this.isSuspendedForVideo) {
      this.isSuspendedForVideo = false;
      this.isPlaying = true;
      if (this.sound) {
        this.playLoop();
      } else {
        this.init(this.currentUrl);
      }
      console.log('[BgmManager] 视频结束，恢复 BGM');
    }
  }

  // 彻底释放实例
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

  // 停止
  public stop() {
    this.isPlaying = false;
    this.releaseSound();
  }

  // 切换开关状态
  public toggle(audioUrl?: string): boolean {
    if (this.isPlaying) {
      this.pause();
      return false; // 关闭
    } else {
      this.resume();
      return true; // 开启
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const bgmManager = new BgmManager();
