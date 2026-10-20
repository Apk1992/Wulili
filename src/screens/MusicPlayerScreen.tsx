import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { Event, RepeatMode, State as TrackPlayerState, usePlaybackState, useProgress, useTrackPlayerEvents } from 'react-native-track-player';
import type { Track } from 'react-native-track-player';

import ScreenContainer from '@/components/ScreenContainer';
import MediaPlayerBar from '@/components/MediaPlayerBar';
import MemoryListItem from '@/components/MemoryListItem';
import ErrorView from '@/components/ErrorView';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { getGitHubToken } from '@/api/githubClient';
import { bgmManager } from '@/services/bgmManager';
import type { MemoryItem, PlaybackState } from '@/types/memory';
import type { GitHubContentItem } from '@/types/github';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const RAW_BASE = `https://raw.githubusercontent.com/yukee520/Wulili_assets/main`;
const NEW_FILES_KEY = '@wulili/known_files';

// 🔥 辅助函数：多维健壮匹配已读状态（path、sha、id）
function isFileKnown(file: { path: string; sha?: string; id?: string }, knownMap: Record<string, boolean>) {
  if (knownMap[file.path]) return true;
  if (file.sha && knownMap[file.sha]) return true;
  if (file.id && knownMap[file.id]) return true;
  return false;
}

export function MusicPlayerScreen({ route }: Props): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>(route.params?.initialPath || GITHUB_PATHS.music);
  const [rawData, setRawData] = useState<GitHubContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  
  const [playback, setPlayback] = useState<PlaybackState>({ current: null, status: 'idle', position: 0, duration: 0, error: null });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [knownFiles, setKnownFiles] = useState<Record<string, boolean>>({});

  const isSeekingRef = useRef<boolean>(false);
  const queueReadyRef = useRef<boolean>(false);
  const trackPlayerState = usePlaybackState();
  const progress = useProgress(250);

  useEffect(() => {
    void AsyncStorage.getItem(NEW_FILES_KEY).then((res) => {
      if (res) setKnownFiles(JSON.parse(res));
    });
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        void TrackPlayer.reset().catch(() => undefined);
      };
    }, [])
  );

  const fetchFolder = async () => {
    setLoading(true);
    setError(false);
    try {
      const token = getGitHubToken();
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${currentPath}`;
      const res = await fetch(apiUrl, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3+json' },
      });
      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      setRawData(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(useCallback(() => { void fetchFolder(); }, [currentPath]));

  const { folders, items } = useMemo(() => {
    const dirs: GitHubContentItem[] = [];
    const musicFiles: GitHubContentItem[] = [];
    for (const file of rawData) {
      if (file.type === 'dir') dirs.push(file);
      else if (file.type === 'file') musicFiles.push(file);
    }
    return { folders: dirs, items: buildMusicItems(musicFiles, knownFiles) };
  }, [rawData, knownFiles]);

  const handleFolderPress = (path: string) => setCurrentPath(path);
  
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

  useEffect(() => {
    try {
      bgmManager.pauseForMedia?.();
    } catch {}

    return () => {
      try {
        bgmManager.resumeFromMedia?.();
      } catch {}
    };
  }, []);

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

      // 🔥 多维写入已读缓存，确保点击后 NEW 标签彻底消失
      const newKnown = { 
        ...knownFiles, 
        [item.path]: true,
        ...(item.sha ? { [item.sha]: true } : {}),
        ...(item.id ? { [item.id]: true } : {})
      };
      setKnownFiles(newKnown);
      void AsyncStorage.setItem(NEW_FILES_KEY, JSON.stringify(newKnown));

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
  }, [items, ensureQueue, knownFiles]);

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

  const handleSeekStart = useCallback((value: number) => {
    isSeekingRef.current = true;
  }, []);

  const handleSeekChange = useCallback((value: number) => {}, []);

  const handleSeekComplete = useCallback(async (value: number) => {
    try {
      await TrackPlayer.seekTo(value);
      setPlayback((prev) => ({ ...prev, position: value }));
    } catch {} finally {
      isSeekingRef.current = false;
    }
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

  if (loading) return <ScreenContainer edges={['bottom']}><View className="flex-1 items-center justify-center"><ActivityIndicator size="large" color="#2563EB" /></View></ScreenContainer>;
  if (error) return <ScreenContainer edges={['bottom']}><ErrorView title="加载失败" onRetry={() => void fetchFolder()} fullScreen /></ScreenContainer>;
  if (items.length === 0 && folders.length === 0) return <ScreenContainer edges={['bottom']}><EmptyView title="空空如也" message="这里没有文件。" icon="folder-open-outline" fullScreen /></ScreenContainer>;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
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
                <Pressable className="flex-row items-center" onPress={() => void fetchFolder()}>
                  <Ionicons name="refresh" size={14} color="#2563EB" />
                  <Text className="ml-1 text-xs text-primary">刷新</Text>
                </Pressable>
              </View>
            );
          }

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

          const musicIndex = index - 1 - folders.length;
          const isCurrent = currentIndex === musicIndex;
          
          return (
            <View className={isCurrent ? 'rounded-2xl border-2 border-primary' : ''}>
              <View className="relative">
                <MemoryListItem item={item} onPress={() => void handlePlayAt(musicIndex)} />
                {item.isNew && (
                  <View className="absolute top-2 right-2 bg-danger px-1.5 py-0.5 rounded-full">
                    <Text className="text-[9px] text-white font-bold">NEW</Text>
                  </View>
                )}
              </View>
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
            onTogglePlay={handleTogglePlay}
            onSeekStart={handleSeekStart}
            onSeekChange={handleSeekChange}
            onSeekComplete={handleSeekComplete}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onStop={handleStop}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex >= 0 && currentIndex + 1 < items.length}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

function buildMusicItems(files: GitHubContentItem[], knownFiles: Record<string, boolean>): any[] {
  const items: any[] = [];
  for (const file of files) {
    const kind = detectMemoryKind(file.name);
    if (kind !== 'music') continue;
    const uniqueId = file.sha || file.path;
    
    const itemObj = {
      id: uniqueId,
      kind: 'music',
      name: file.name,
      displayName: humanizeFileName(file.name),
      path: file.path,
      size: file.size,
      sha: file.sha,
      downloadUrl: file.download_url,
      updatedAt: null,
      source: 'repo',
    };

    items.push({
      ...itemObj,
      isNew: !isFileKnown(itemObj, knownFiles), // 使用多维健壮匹配判断是否新文件
    });
  }
  return items.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
}

export default MusicPlayerScreen;
