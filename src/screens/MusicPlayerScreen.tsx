import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useIsFocused } from '@react-navigation/native'; // 👈 引入
import Ionicons from 'react-native-vector-icons/Ionicons';
import TrackPlayer, {
  Event,
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import type { Track } from 'react-native-track-player';

import ScreenContainer from '@/components/ScreenContainer';
import MediaPlayerBar from '@/components/MediaPlayerBar';
import MemoryListItem from '@/components/MemoryListItem';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { useGitHubFiles } from '@/hooks/useGitHubRepo';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { getGitHubToken } from '@/api/githubClient';
import type { MemoryItem, PlaybackState } from '@/types/memory';
import type { GitHubContentItem } from '@/types/github';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const RAW_BASE = `https://raw.githubusercontent.com/yukee520/Wulili_assets/main`;
const MAX_RETRIES = 2;

export function MusicPlayerScreen({}: Props): React.JSX.Element {
  const query = useGitHubFiles({ path: GITHUB_PATHS.music, depth: 1 });
  const isFocused = useIsFocused(); // 👈 判断是否在页面上

  const [playback, setPlayback] = useState<PlaybackState>({
    current: null,
    status: 'idle',
    position: 0,
    duration: 0,
    error: null,
  });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [retryCount, setRetryCount] = useState<number>(0);

  const isSeekingRef = useRef<boolean>(false);
  const seekPositionRef = useRef<number>(0);
  const queueReadyRef = useRef<boolean>(false);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const trackPlayerState = usePlaybackState();
  const progress = useProgress(250);

  const items = useMemo(() => {
    const files = query.data ?? [];
    return buildMusicItems(files);
  }, [query.data]);

  // 🔥 离开页面时：强行清空音乐，让 BGM 立刻接管
  useEffect(() => {
    return () => {
      // 只要离开这个页面，就直接重置 TrackPlayer
      void TrackPlayer.reset().catch(() => undefined);
    };
  }, []);

  useEffect(() => {
    if (trackPlayerState.state === TrackPlayerState.Error && playback.current) {
      if (retryCount < MAX_RETRIES) {
        const next = retryCount + 1;
        setRetryCount(next);
        if (retryTimerRef.current !== null) clearTimeout(retryTimerRef.current);
        retryTimerRef.current = setTimeout(() => {
          if (currentIndex >= 0) void replayCurrentIndex();
        }, 3000);
      } else {
        setPlayback((prev) => ({ ...prev, status: 'error', error: '播放失败（已重试）' }));
      }
    }
  }, [trackPlayerState.state]);

  useEffect(() => {
    if (!playback.current || isSeekingRef.current) return;

    const state = trackPlayerState.state;
    let status: PlaybackState['status'] = 'idle';
    if (state === TrackPlayerState.Playing) status = 'playing';
    else if (state === TrackPlayerState.Paused) status = 'paused';
    else if (state === TrackPlayerState.Buffering || state === TrackPlayerState.Loading) status = 'loading';
    else if (state === TrackPlayerState.Ended) status = 'ended';
    else if (state === TrackPlayerState.Error) status = 'error';
    else if (state === TrackPlayerState.Stopped) status = 'ended';

    setPlayback((prev) => ({
      ...prev,
      status,
      position: progress.position,
      duration: progress.duration || prev.duration,
    }));
  }, [trackPlayerState.state, progress.position, progress.duration, playback.current]);

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (event) => {
    try {
      const index = event.index;
      if (typeof index === 'number' && index >= 0 && index < items.length) {
        setCurrentIndex(index);
        setRetryCount(0);
        isSeekingRef.current = false;
        setPlayback((prev) => ({
          ...prev,
          current: items[index],
          status: 'loading',
          position: 0,
          duration: 0,
          error: null,
        }));
      }
    } catch {}
  });

  const buildTracks = useCallback((musicItems: MemoryItem[]): Track[] => {
    const token = getGitHubToken();
    const headers: Record<string, string> = {};
    if (token) headers.Authorization = `Bearer ${token}`;
    return musicItems.map((item) => ({
      id: item.id,
      url: `${RAW_BASE}/${item.path}`,
      title: humanizeFileName(item.displayName),
      artist: '雾璃',
      headers,
    }));
  }, []);

  const ensureQueue = useCallback(async (startIndex: number) => {
    await TrackPlayer.reset();
    const tracks = buildTracks(items);
    await TrackPlayer.add(tracks);
    queueReadyRef.current = true;
    await TrackPlayer.skip(startIndex);
    await TrackPlayer.play();
    setCurrentIndex(startIndex);
  }, [items, buildTracks]);

  const replayCurrentIndex = useCallback(async () => {
    if (currentIndex < 0 || currentIndex >= items.length) return;
    try {
      await TrackPlayer.reset();
      queueReadyRef.current = false;
      await ensureQueue(currentIndex);
    } catch {}
  }, [currentIndex, items.length, ensureQueue]);

  const handlePlayAt = useCallback(async (index: number) => {
    try {
      const item = items[index];
      if (!item) return;

      setRetryCount(0);
      isSeekingRef.current = false;
      setPlayback({ current: item, status: 'loading', position: 0, duration: 0, error: null });

      if (!queueReadyRef.current) {
        await ensureQueue(index);
      } else {
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeIndex === index) {
          const state = (await TrackPlayer.getPlaybackState()).state;
          if (state === TrackPlayerState.Playing) {
            await TrackPlayer.pause();
            setPlayback((prev) => ({ ...prev, status: 'paused' }));
          } else {
            await TrackPlayer.play();
            setPlayback((prev) => ({ ...prev, status: 'playing' }));
          }
        } else {
          await TrackPlayer.skip(index);
          await TrackPlayer.play();
          setCurrentIndex(index);
        }
      }
    } catch (error) {
      setPlayback((prev) => ({ ...prev, status: 'error', error: error instanceof Error ? error.message : '播放失败' }));
    }
  }, [items, ensureQueue]);

  const handleTogglePlay = useCallback(async () => {
    try {
      const state = (await TrackPlayer.getPlaybackState()).state;
      if (state === TrackPlayerState.Playing) {
        await TrackPlayer.pause();
        setPlayback((prev) => ({ ...prev, status: 'paused' }));
      } else {
        await TrackPlayer.play();
        setPlayback((prev) => ({ ...prev, status: 'playing' }));
      }
    } catch {}
  }, []);

  const handleSeekStart = useCallback((value: number) => { isSeekingRef.current = true; seekPositionRef.current = value; }, []);
  const handleSeekChange = useCallback((value: number) => { seekPositionRef.current = value; }, []);
  const handleSeekComplete = useCallback(async (value: number) => {
    try {
      await TrackPlayer.seekTo(value);
      setPlayback((prev) => ({ ...prev, position: value }));
    } catch {} finally { isSeekingRef.current = false; }
  }, []);

  const handleNext = useCallback(async () => {
    try {
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (typeof activeIndex === 'number' && activeIndex + 1 < items.length) {
        await TrackPlayer.skipToNext();
        await TrackPlayer.play();
      }
    } catch {}
  }, [items.length]);

  const handlePrevious = useCallback(async () => {
    try {
      const activeIndex = await TrackPlayer.getActiveTrackIndex();
      if (typeof activeIndex === 'number' && activeIndex > 0) {
        await TrackPlayer.skip(activeIndex - 1);
        await TrackPlayer.play();
      }
    } catch {}
  }, []);

  const handleStop = useCallback(async () => {
    try {
      await TrackPlayer.reset();
      queueReadyRef.current = false;
    } catch {}
    setCurrentIndex(-1);
    setPlayback({ current: null, status: 'idle', position: 0, duration: 0, error: null });
  }, []);

  if (query.isLoading) return <ScreenContainer edges={['bottom']}><LoadingView message="正在加载音乐列表…" fullScreen /></ScreenContainer>;
  if (query.isError) return <ScreenContainer edges={['bottom']}><ErrorView title="加载失败" message="无法获取音乐列表，请检查网络或 Token。" onRetry={() => query.refetch()} fullScreen /></ScreenContainer>;
  if (items.length === 0) return <ScreenContainer edges={['bottom']}><EmptyView title="还没有音乐" message="往仓库的 music/ 文件夹里上传一些音乐文件吧。" icon="musical-notes-outline" fullScreen /></ScreenContainer>;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: playback.current ? 220 : 24 }}
        renderItem={({ item, index }) => {
          const isCurrent = currentIndex === index;
          return (
            <View className={isCurrent ? 'rounded-2xl border-2 border-primary' : ''}>
              <MemoryListItem item={item} onPress={() => void handlePlayAt(index)} />
              {isCurrent ? (
                <View className="flex-row items-center mb-2 ml-4">
                  <Ionicons name={playback.status === 'playing' ? 'musical-notes' : playback.status === 'error' ? 'alert-circle' : 'pause-circle'} size={12} color={playback.status === 'error' ? '#EF4444' : '#2563EB'} />
                  <Text className={['ml-1 text-[10px]', playback.status === 'error' ? 'text-danger' : 'text-primary'].join(' ')}>
                    {playback.status === 'playing' ? '正在播放' : playback.status === 'paused' ? '已暂停' : playback.status === 'error' ? '播放失败' : '当前曲目'}
                  </Text>
                </View>
              ) : null}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Pressable className="mb-2 flex-row items-center" onPress={() => void query.refetch()}>
            <Ionicons name="refresh" size={14} color="#2563EB" />
            <Text className="ml-1 text-xs text-primary">刷新列表</Text>
          </Pressable>
        }
      />
      {playback.current ? (
        <View className="absolute left-4 right-4 bottom-4">
          <MediaPlayerBar
            playback={playback}
            onTogglePlay={() => void handleTogglePlay()}
            onSeekStart={handleSeekStart}
            onSeekChange={handleSeekChange}
            onSeekComplete={(sec) => void handleSeekComplete(sec)}
            onPrevious={() => void handlePrevious()}
            onNext={() => void handleNext()}
            onStop={() => void handleStop()}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex >= 0 && currentIndex + 1 < items.length}
          />
        </View>
      ) : null}
    </ScreenContainer>
  );
}

function buildMusicItems(files: GitHubContentItem[]): MemoryItem[] {
  const items: MemoryItem[] = [];
  for (const file of files) {
    const kind = detectMemoryKind(file.name);
    if (kind !== 'music') continue;
    items.push({
      id: file.sha || file.path,
      kind: 'music',
      name: file.name,
      displayName: humanizeFileName(file.name),
      path: file.path,
      size: file.size,
      sha: file.sha,
      downloadUrl: file.download_url,
      updatedAt: null,
      source: 'repo',
    });
  }
  return items.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
}

export default MusicPlayerScreen;
