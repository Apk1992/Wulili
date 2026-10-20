// src/services/bgmManager.ts
import { AppState, AppStateStatus } from 'react-native';
import Sound from 'react-native-sound';
import { getGitHubToken } from '@/api/githubClient';

// 设置音频模式，允许和其他播放器/系统声音混合或轮换
Sound.setCategory('Playback', true);

class BgmManager {
  private sound: Sound | null = null;
  private currentUrl: string | null = null;
  private season: string = 'autumn';
  private isAppActive: boolean = true;
  private isLoading: boolean = false;
  private isMutedByMedia: boolean = false;

  constructor() {
    AppState.addEventListener('change', this.handleAppStateChange);
  }

  private handleAppStateChange = (nextAppState: AppStateStatus) => {
    this.isAppActive = nextAppState === 'active';
    if (this.isAppActive) {
      // 从后台切回时重新激活 Sound 模式
      Sound.setActive(true);
      setTimeout(() => this.resume(), 300);
    } else {
      this.pause();
    }
  };

  public setSeason(newSeason: string) {
    if (this.season !== newSeason) {
      this.season = newSeason;
      this.release();
      void this.loadAndPlay();
    }
  }

  public async loadAndPlay() {
    if (this.isLoading) return;
    this.isLoading = true;

    try {
      const token = getGitHubToken();
      if (!token) {
        this.isLoading = false;
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
        this.isLoading = false;
        return;
      }
      const data = await res.json();
      const downloadUrl = data.download_url;

      // 如果是同一个音频且 Sound 还在，直接恢复播放
      if (this.currentUrl === downloadUrl && this.sound) {
        this.isLoading = false;
        this.resume();
        return;
      }

      // 释放老声音，准备播放新声音
      this.release();

      Sound.setActive(true);
      const newSound = new Sound(downloadUrl, undefined, (error) => {
        this.isLoading = false;
        if (error) {
          console.warn('BGM Load Error:', error);
          return;
        }

        this.sound = newSound;
        this.currentUrl = downloadUrl;
        this.sound.setVolume(0.4);
        this.sound.setNumberOfLoops(-1);

        if (!this.isMutedByMedia && this.isAppActive) {
          this.sound.play((success) => {
            if (!success) {
              // 播放失败时重置
              this.sound?.reset();
            }
          });
        }
      });
    } catch {
      this.isLoading = false;
    }
  }

  public pause() {
    if (this.sound && this.sound.isPlaying()) {
      this.sound.pause();
    }
  }

  public resume() {
    if (this.isMutedByMedia || !this.isAppActive) return;

    if (!this.sound) {
      void this.loadAndPlay();
      return;
    }

    Sound.setActive(true);
    if (!this.sound.isPlaying()) {
      this.sound.play();
    }
  }

  public release() {
    if (this.sound) {
      try {
        this.sound.stop();
        this.sound.release();
      } catch {}
      this.sound = null;
      this.currentUrl = null;
    }
  }

  // 被视频 / 音乐播放挂起
  public suspendForVideo() {
    this.isMutedByMedia = true;
    this.pause();
  }

  // 从视频 / 音乐播放恢复
  public resumeFromVideo() {
    this.isMutedByMedia = false;
    this.resume();
  }
}

export const bgmManager = new BgmManager();
