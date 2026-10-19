import { AppState, AppStateStatus } from 'react-native';
import TrackPlayer, { State, RepeatMode, Event } from 'react-native-track-player';
import { getGitHubToken } from '@/api/githubClient';

const BGM_ID = 'auto_bgm';

class AutoBgmService {
  private season: string = 'autumn';
  private url: string | null = null;
  private isEnabled: boolean = true;

  constructor() {
    // 监听 App 前后台，用于处理通知栏和音频焦点
    AppState.addEventListener('change', this.handleAppState);
  }

  public setSeason(s: string) {
    this.season = s;
    void this.ensurePlaying();
  }

  public setEnabled(enabled: boolean) {
    this.isEnabled = enabled;
    if (!enabled) TrackPlayer.pause();
    else void this.ensurePlaying();
  }

  private handleAppState = (nextState: AppStateStatus) => {
    // 只要切回前台，就疯狂尝试确保 BGM 在播
    if (nextState === 'active') {
      setTimeout(() => void this.ensurePlaying(), 500);
    }
  };

  // 核心逻辑：只要没有别人的歌，就强行播 BGM
  public async ensurePlaying() {
    if (!this.isEnabled) return;

    try {
      const token = getGitHubToken();
      if (!token) return;

      // 1. 检查播放器当前状态
      const queue = await TrackPlayer.getQueue();
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      const activeTrack = (activeIndex !== undefined && activeIndex !== null && queue.length > 0) ? queue[activeIndex] : null;

      // 2. 如果有别的歌（不是 auto_bgm），绝不打扰
      if (activeTrack && activeTrack.id !== BGM_ID) {
        return;
      }

      // 3. 获取 BGM 地址
      const currentHour = new Date().getHours();
      const isNight = currentHour >= 18 || currentHour < 6;
      const suffix = isNight ? 'night' : 'day';
      const filePath = `bgm/${this.season}_${suffix}.m4a`;
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${filePath}`;

      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) return;
      const data = await res.json();
      const downloadUrl = data.download_url;

      // 4. 如果队列里已经是这首 BGM，只是暂停了，直接播放
      if (activeTrack && activeTrack.id === BGM_ID && this.url === downloadUrl) {
        const state = await TrackPlayer.getState();
        if (state !== State.Playing) {
          await TrackPlayer.play();
        }
        return;
      }

      // 5. 完全重新装载
      await TrackPlayer.reset();
      await TrackPlayer.add({
        id: BGM_ID,
        url: downloadUrl,
        title: 'BGM',
        artist: 'Wulili',
      });
      await TrackPlayer.setRepeatMode(RepeatMode.Track);
      await TrackPlayer.setVolume(0.4);
      this.url = downloadUrl;
      await TrackPlayer.play();

    } catch (err) {
      console.warn('AutoBgm 异常:', err);
    }
  }
}

export const autoBgm = new AutoBgmService();
