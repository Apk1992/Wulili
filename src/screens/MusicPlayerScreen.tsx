import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TrackPlayer, { Event, RepeatMode, State as TrackPlayerState, usePlaybackState, useProgress, useTrackPlayerEvents } from 'react-native-track-player';
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

export function MusicPlayerScreen({}: Props): React.JSX.Element {
  // 🔥 记录当前处于哪个文件夹路径
  const [currentPath, setCurrentPath] = useState<string>(GITHUB_PATHS.music);
  const query = useGitHubFiles({ path: currentPath, depth: 1 });

  const [playback, setPlayback] = useState<PlaybackState>({ current: null, status: 'idle', position: 0, duration: 0, error: null });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const isSeekingRef = useRef<boolean>(false);
  const queueReadyRef = useRef<boolean>(false);
  const trackPlayerState = usePlaybackState();
  const progress = useProgress(250);

  // 把拉取到的数据拆分为文件夹和音乐
  const { folders, items } = useMemo(() => {
    const files = query.data ?? [];
    const dirs: GitHubContentItem[] = [];
    const musicFiles: GitHubContentItem[] = [];

    for (const file of files) {
      if (file.type === 'dir') dirs.push(file);
      else if (file.type === 'file') musicFiles.push(file);
    }

    return { folders: dirs, items: buildMusicItems(musicFiles) };
  }, [query.data]);

  // 切换文件夹
  const handleFolderPress = (path: string) => {
    setCurrentPath(path);
  };

  // 返回上一级
  const handleGoBackFolder = () => {
    if (currentPath === GITHUB_PATHS.music) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || GITHUB_PATHS.music);
  };

  useEffect(() => {
    return () => { void TrackPlayer.pause().catch(() => undefined); };
  }, []);

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

    setPlayback((prev) => ({ ...prev, status, position: progress.position, duration: progress.duration || prev.duration }));
  }, [trackPlayerState.state, progress.position, progress.duration, playback.current]);

  useTrackPlayerEvents([Event.PlaybackActiveTrackChanged], async (event) => {
    try {
      const index = event.index;
      if (typeof index === 'number' && index >= 0 && index < items.length) {
        setCurrentIndex(index);
        isSeekingRef.current = false;
        setPlayback((prev) => ({ ...prev, current: items[index], status: 'loading', position: 0, duration: 0, error: null }));
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
    const tracks = buildTracks(items); // 只加入当前文件夹的歌
    await TrackPlayer.add(tracks);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue);
    queueReadyRef.current = true;
    await TrackPlayer.skip(startIndex);
    await TrackPlayer.play();
    setCurrentIndex(startIndex);
  }, [items, buildTracks]);

  const handlePlayAt = useCallback(async (index: number) => {
    try {
      const item = items[index];
      if (!item) return;

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
      setPlayback((prev) => ({ ...prev, status: 'error', error: '播放失败' }));
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

  if (query.isLoading) return <ScreenContainer edges={['bottom']}><LoadingView message="正在加载…" fullScreen /></ScreenContainer>;
  if (query.isError) return <ScreenContainer edges={['bottom']}><ErrorView title="加载失败" message="无法获取列表。" onRetry={() => query.refetch()} fullScreen /></ScreenContainer>;
  if (items.length === 0 && folders.length === 0) return <ScreenContainer edges={['bottom']}><EmptyView title="这里空空如也" message="往该文件夹传点音乐吧。" icon="musical-notes-outline" fullScreen /></ScreenContainer>;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        // 把文件夹和音乐文件合在一起渲染
        data={[{ isFolderHeader: true } as any, ...folders, ...items]}
        keyExtractor={(item: any, index) => item.isFolderHeader ? 'header' : item.id || index.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: playback.current ? 220 : 24 }}
        renderItem={({ item, index }) => {
          if (item.isFolderHeader) {
            return (
              <View className="mb-2 flex-row items-center justify-between">
                {currentPath !== GITHUB_PATHS.music ? (
                  <Pressable className="flex-row items-center" onPress={handleGoBackFolder}>
                    <Ionicons name="arrow-back" size={16} color="#2563EB" />
                    <Text className="ml-1 text-xs text-primary">返回上一级</Text>
                  </Pressable>
                ) : <View />}
                <Pressable className="flex-row items-center" onPress={() => void query.refetch()}>
                  <Ionicons name="refresh" size={14} color="#2563EB" />
                  <Text className="ml-1 text-xs text-primary">刷新</Text>
                </Pressable>
              </View>
            );
          }

          // 渲染文件夹
          if (item.type === 'dir') {
            return (
              <Pressable 
                className="flex-row items-center justify-between p-4 mb-2 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border"
                onPress={() => handleFolderPress(item.path)}
              >
                <View className="flex-row items-center">
                  <Ionicons name="folder" size={24} color="#F59E0B" />
                  <Text className="ml-3 text-base font-medium text-text dark:text-dark-text">{item.name}</Text>
                </View>
                <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
              </Pressable>
            );
          }

          // 渲染歌曲
          const musicIndex = index - 1 - folders.length;
          const isCurrent = currentIndex === musicIndex;
          return (
            <View className={isCurrent ? 'rounded-2xl border-2 border-primary' : ''}>
              <MemoryListItem item={item} onPress={() => void handlePlayAt(musicIndex)} />
              {isCurrent && (
                <View className="flex-row items-center mb-2 ml-4">
                  <Ionicons name={playback.status === 'playing' ? 'musical-notes' : 'pause-circle'} size={12} color="#2563EB" />
                  <Text className="ml-1 text-[10px] text-primary">{playback.status === 'playing' ? '正在播放' : '已暂停'}</Text>
                </View>
              )}
            </View>
          );
        }}
        showsVerticalScrollIndicator={false}
      />
      {playback.current && (
        <View className="absolute left-4 right-4 bottom-4">
          <MediaPlayerBar
            playback={playback}
            onTogglePlay={() => void handleTogglePlay()}
            onSeekStart={() => { isSeekingRef.current = true; }}
            onSeekChange={() => {}}
            onSeekComplete={async (sec) => { await TrackPlayer.seekTo(sec); isSeekingRef.current = false; }}
            onPrevious={() => void handlePrevious()}
            onNext={() => void handleNext()}
            onStop={() => void handleStop()}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex >= 0 && currentIndex + 1 < items.length}
          />
        </View>
      )}
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
