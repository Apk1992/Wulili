// src/services/bgmManager.ts
import Sound from 'react-native-sound';

// 允许在静音模式下播放（iOS 必须）
Sound.setCategory('Playback', true);

class BgmManager {
  private sound: Sound | null = null;
  private isPlaying: boolean = false;
  private currentUrl: string = '';

  // 初始化并播放 BGM（自带循环播放）
  public init(audioUrl: string = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev/music/bgm_default.mp3') {
    // 如果已经在播放同一个音频，则跳过
    if (this.sound && this.isPlaying && this.currentUrl === audioUrl) {
      return;
    }

    // 如果之前有实例，先安全释放
    this.stop();
    this.currentUrl = audioUrl;

    console.log('[BgmManager] 加载背景音乐: ', audioUrl);

    this.sound = new Sound(audioUrl, '', (error) => {
      if (error) {
        console.warn('[BgmManager] 背景音乐加载失败:', error);
        this.isPlaying = false;
        return;
      }

      // 🔥 核心：开启无限循环播放
      this.sound?.setNumberOfLoops(-1);
      this.sound?.setVolume(1.0);

      this.sound?.play((success) => {
        if (!success) {
          console.warn('[BgmManager] 播放中途被打断或解码失败');
        }
        this.isPlaying = false;
      });

      this.isPlaying = true;
    });
  }

  // 暂停音乐
  public pause() {
    if (this.sound && this.isPlaying) {
      this.sound.pause(() => {
        this.isPlaying = false;
        console.log('[BgmManager] 背景音乐已暂停');
      });
    }
  }

  // 恢复/重新播放音乐
  public resume() {
    if (this.sound) {
      if (!this.isPlaying) {
        this.sound.play((success) => {
          if (!success) {
            console.warn('[BgmManager] 恢复播放失败');
          }
          this.isPlaying = false;
        });
        this.isPlaying = true;
        console.log('[BgmManager] 背景音乐已恢复');
      }
    } else if (this.currentUrl) {
      // 如果实例被销毁了，重新初始化
      this.init(this.currentUrl);
    }
  }

  // 彻底停止并销毁当前音频
  public stop() {
    if (this.sound) {
      try {
        this.sound.stop();
        this.sound.release();
      } catch (e) {
        console.warn('[BgmManager] 释放音乐实例异常:', e);
      }
      this.sound = null;
      this.isPlaying = false;
    }
  }

  // 切换播放状态（开 -> 关，关 -> 开）
  public toggle(audioUrl?: string): boolean {
    if (this.isPlaying) {
      this.pause();
      return false; // 当前变为关闭状态
    } else {
      if (audioUrl) {
        this.init(audioUrl);
      } else {
        this.resume();
      }
      return true; // 当前变为开启状态
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const bgmManager = new BgmManager();
