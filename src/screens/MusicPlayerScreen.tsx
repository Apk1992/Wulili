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
  // 🔥 新增：记录当前所在的文件夹路径，默认是基础 music/ 目录
  const [currentPath, setCurrentPath] = useState<string>(GITHUB_PATHS.music);

  // 拉取当前路径下的文件和文件夹
  const query = useGitHubFiles({ path: currentPath, depth: 1 });

  const [playback, setPlayback] = useState<PlaybackState>({ current: null, status: 'idle', position: 0, duration: 0, error: null });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const isSeekingRef = useRef<boolean>(false);
  const queueReadyRef = useRef<boolean>(false);
  const trackPlayerState = usePlaybackState();
  const progress = useProgress(250);

  // 区分当前路径下的文件夹和音乐文件
  const { folders, items } = useMemo(() => {
    const files = query.data ?? [];
    const dirs: GitHubContentItem[] = [];
    const musicFiles: GitHubContentItem[] = [];

    for (const file of files) {
      if (file.type === 'dir') {
        dirs.push(file);
      } else if (file.type === 'file') {
        musicFiles.push(file);
      }
    }

    return {
      folders: dirs,
      items: buildMusicItems(musicFiles), // 只从当前文件夹里的音乐建播放队列
    };
  }, [query.data]);

  // 离开页面时只暂停，不打断底层状态，让主页的 BGM 顺利接管
  useEffect(() => {
    return () => {
      void TrackPlayer.pause().catch(() => undefined);
    };
  }, []);

  // 🔥 切换文件夹时，如果当前在播放，就不重置，只是 UI 跟着切
  const handleFolderPress = (path: string) => {
    setCurrentPath(path);
  };

  // 🔥 返回上一级文件夹
  const handleGoBackFolder = () => {
    if (currentPath === GITHUB_PATHS.music) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || GITHUB_PATHS.music);
  };

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
    const tracks = buildTracks(items); // 👈 这里只会把【当前文件夹】里的歌加入队列
    await TrackPlayer.add(tracks);
    await TrackPlayer.setRepeatMode(RepeatMode.Queue); // 列表循环
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

  if (query.isLoading) return <ScreenContainer edges={['bottom']}><LoadingView message="正在加载音乐列表…" fullScreen /></ScreenContainer>;
  if (query.isError) return <ScreenContainer edges={['bottom']}><ErrorView title="加载失败" message="无法获取音乐列表，请检查网络或 Token。" onRetry={() => query.refetch()} fullScreen /></ScreenContainer>;
  
  // 如果当前文件夹既没歌也没文件夹，显示空状态
  if (items.length === 0 && folders.length === 0) {
    return <ScreenContainer edges={['bottom']}><EmptyView title="这里还没有内容" message="往当前文件夹里上传一些音乐文件或子文件夹吧。" icon="musical-notes-outline" fullScreen /></ScreenContainer>;
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        // 🔥 把文件夹和音乐文件合在一起渲染（文件夹在上）
        data={[{ isFolderHeader: true }, ...folders, ...items] as any[]}
        keyExtractor={(item: any, index) => item.isFolderHeader ? 'header' : item.id || index.toString()}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: playback.current ? 220 : 24 }}
        renderItem={({ item, index }) => {
          // 渲染顶部的“返回上一级”和“刷新”栏
          if (item.isFolderHeader) {
            return (
              <View className="mb-2 flex-row items-center justify-between">
                {currentPath !== GITHUB_PATHS.music ? (
                  <Pressable className="flex-row items-center" onPress={handleGoBackFolder}>
                    <Ionicons name="arrow-back" size={16} color="#2563EB" />
                    <Text className="ml-1 text-xs text-primary">返回上一级</Text>
                  </Pressable>
                ) : (
                  <View />
                )}
                <Pressable className="flex-row items-center" onPress={() => void query.refetch()}>
                  <Ionicons name="refresh" size={14} color="#2563EB" />
                  <Text className="ml-1 text-xs text-primary">刷新列表</Text>
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

          // 渲染音乐文件（原本的 MemoryListItem）
          const musicIndex = index - 1 - folders.length;
          const isCurrent = currentIndex === musicIndex;
          
          return (
            <View className={isCurrent ? 'rounded-2xl border-2 border-primary' : ''}>
              <MemoryListItem item={item} onPress={() => void handlePlayAt(musicIndex)} />
              {isCurrent && (
                <View className="flex-row items-center mb-2 ml-4">
                  <Ionicons name={playback.status === 'playing' ? 'musical-notes' : playback.status === 'error' ? 'alert-circle' : 'pause-circle'} size={12} color={playback.status === 'error' ? '#EF4444' : '#2563EB'} />
                  <Text className={['ml-1 text-[10px]', playback.status === 'error' ? 'text-danger' : 'text-primary'].join(' ')}>
                    {playback.status === 'playing' ? '正在播放' : playback.status === 'paused' ? '已暂停' : playback.status === 'error' ? '播放失败' : '当前曲目'}
                  </Text>
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
            onSeekStart={(v) => { isSeekingRef.current = true; }}
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
      path: file.path, // 保留完整的音乐路径
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
