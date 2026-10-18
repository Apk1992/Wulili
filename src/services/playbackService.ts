import TrackPlayer, {
  Event,
  State as TrackPlayerState,
  AppKilledPlaybackBehavior,
} from 'react-native-track-player';

/**
 * 后台播放服务
 * 在 App 启动时注册（index.js）
 * 即使 UI 冻结，此服务依然运行
 */
export async function playbackService(): Promise<void> {
  // ========== 通知栏 / 锁屏控制 ==========
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    console.log('[Playback] RemotePlay');
    return TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    console.log('[Playback] RemotePause');
    return TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteStop, () => {
    console.log('[Playback] RemoteStop');
    return TrackPlayer.stop();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('[Playback] RemoteNext');
    return TrackPlayer.skipToNext();
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('[Playback] RemotePrevious');
    return TrackPlayer.skipToPrevious();
  });

  TrackPlayer.addEventListener(Event.RemoteSeek, (event) => {
    console.log('[Playback] RemoteSeek ->', event.position);
    return TrackPlayer.seekTo(event.position);
  });

  TrackPlayer.addEventListener(Event.RemoteDuck, async (event) => {
    // 来电/其它 App 抢音频焦点 → 暂停或降低音量
    console.log('[Playback] RemoteDuck', event);
    if (event.permanent) {
      await TrackPlayer.pause();
    } else if (event.paused) {
      await TrackPlayer.setVolume(0.2);
    } else {
      await TrackPlayer.setVolume(1.0);
    }
  });

  // ========== 自动切歌（核心） ==========
  TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
    console.log('[Playback] ActiveTrackChanged ->', {
      index: event.index,
      lastIndex: event.lastIndex,
      trackId: event.track?.id,
    });
  });

  // 队列播完（最后一首结束）
  TrackPlayer.addEventListener(Event.PlaybackQueueEnded, async (event) => {
    console.log('[Playback] QueueEnded', event);
    // 如果想循环：TrackPlayer.skip(0); TrackPlayer.play();
    // 如果不想：什么也不做，播放停止
  });

  // 播放错误时自动跳到下一首（跳过坏文件）
  TrackPlayer.addEventListener(Event.PlaybackError, async (error) => {
    console.warn('[Playback] Error:', error);
    try {
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (typeof activeIndex === 'number') {
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      }
    } catch {
      // ignore
    }
  });
}

/**
 * App 被杀后的播放行为
 * 需要在 setupPlayer 里传这个参数
 */
export const APP_KILLED_BEHAVIOR = AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification;

void TrackPlayerState;
