// src/screens/MusicPlayerScreen.tsx
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Pressable, Text, View, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TrackPlayer, {
  Event,
  RepeatMode,
  State as TrackPlayerState,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import type { Track } from 'react-native-track-player';

import ScreenContainer from '@/components/ScreenContainer';
import MediaPlayerBar from '@/components/MediaPlayerBar';
import MemoryListItem from '@/components/MemoryListItem';
import ErrorView from '@/components/ErrorView';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { bgmManager } from '@/services/bgmManager';
import type { MemoryItem, PlaybackState } from '@/types/memory';
import type { GitHubContentItem } from '@/types/github';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const MANIFEST_URL = `${R2_BASE_URL}/manifest.json`;

function encodeR2Url(path: string): string {
  return path.split('/').map(encodeURIComponent).join('/');
}

interface ManifestFile {
  path: string;
  size: number;
  updatedAt: string;
}

export function MusicPlayerScreen({ route }: Props): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>(
    route.params?.initialPath || GITHUB_PATHS.music,
  );
  const [allFiles, setAllFiles] = useState<ManifestFile[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const [playback, setPlayback] = useState<PlaybackState>({
    current: null,
    status: 'idle',
    position: 0,
    duration: 0,
    error: null,
  });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);

  const isSeekingRef = useRef<boolean>(false);
  const queueReadyRef = useRef<boolean>(false);
  const trackPlayerState = usePlaybackState();
  const progress = useProgress(250);

  // ===== 拉取 manifest =====
  const fetchManifest = async () => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`${MANIFEST_URL}?t=${Date.now()}`);
      if (!res.ok) throw new Error('manifest 获取失败');
      const data = await res.json();
      const files: ManifestFile[] = Array.isArray(data?.files) ? data.files : [];
      setAllFiles(files);
    } catch (e) {
      console.error('[manifest] 加载失败:', e);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchManifest();
  }, []);

  // 进页面占用音频（暂停 BGM）；离开时释放 + 清空队列
  useFocusEffect(
    useCallback(() => {
      bgmManager.acquireExternal('memory-player');
      void fetchManifest();
      return () => {
        bgmManager.releaseExternal('memory-player');
        void TrackPlayer.reset().catch(() => undefined);
        queueReadyRef.current = false;
      };
    }, []),
  );

  // ===== 从 manifest 提取当前目录的 folders + items =====
  const { folders, items } = useMemo(() => {
    const prefix = currentPath.endsWith('/') ? currentPath : `${currentPath}/`;
    const inFolder = allFiles.filter(
      (f) => f.path.startsWith(prefix) && f.path !== prefix && f.size > 0,
    );

    const folderSet = new Set<string>();
    const musicItems: any[] = [];

    for (const f of inFolder) {
      const rel = f.path.slice(prefix.length);
      const slashIdx = rel.indexOf('/');
      if (slashIdx >= 0) {
        folderSet.add(prefix + rel.slice(0, slashIdx));
      } else {
        const kind = detectMemoryKind(f.path);
        if (kind !== 'music') continue;
        musicItems.push({
          id: f.path,
          kind: 'music',
          name: rel,
          displayName: humanizeFileName(rel),
          path: f.path,
          size: f.size,
          sha: f.path,
          downloadUrl: `${R2_BASE_URL}/${encodeR2Url(f.path)}`,
          updatedAt: null,
          source: 'r2',
          isNew: false,
        });
      }
    }

    const dirs: GitHubContentItem[] = Array.from(folderSet).map((p) => ({
      type: 'dir',
      name: p.split('/').pop() || p,
      path: p,
      size: 0,
      sha: p,
    }));

    musicItems.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
    return { folders: dirs, items: musicItems };
  }, [allFiles, currentPath]);

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
    else if (state === TrackPlayerState.Buffering || state === TrackPlayerState.Loading)
      status = 'loading';
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
    return musicItems.map((item) => ({
      id: item.id,
      url: `${R2_BASE_URL}/${encodeR2Url(item.path)}`,
      title: item.displayName,
      artist: '雾璃',
    }));
  }, []);

  const ensureQueue = useCallback(
    async (startIndex: number) => {
      await TrackPlayer.reset();
      const tracks = buildTracks(items);
      await TrackPlayer.add(tracks);
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      queueReadyRef.current = true;
      await TrackPlayer.skip(startIndex);
      await TrackPlayer.play();
      setCurrentIndex(startIndex);
    },
    [items, buildTracks],
  );

  const handlePlayAt = useCallback(
    async (index: number) => {
      try {
        const item = items[index];
        if (!item) return;

        setPlayback({
          current: item,
          status: 'loading',
          position: 0,
          duration: 0,
          error: null,
        });

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
      } catch (e) {
        console.error('[handlePlayAt] 失败:', e);
        setPlayback((prev) => ({ ...prev, status: 'error', error: '播放失败' }));
      }
    },
    [items, ensureQueue],
  );

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

  const handleSeekStart = useCallback(() => {
    isSeekingRef.current = true;
  }, []);

  const handleSeekChange = useCallback(() => {}, []);

  const handleSeekComplete = useCallback(async (value: number) => {
    try {
      await TrackPlayer.seekTo(value);
      setPlayback((prev) => ({ ...prev, position: value }));
    } catch {
    } finally {
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
    setPlayback({
      current: null,
      status: 'idle',
      position: 0,
      duration: 0,
      error: null,
    });
  }, []);

  if (loading) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </ScreenContainer>
    );
  }
  if (error) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorView title="加载失败" onRetry={() => void fetchManifest()} fullScreen />
      </ScreenContainer>
    );
  }
  if (items.length === 0 && folders.length === 0) {
    return (
      <ScreenContainer edges={['bottom']}>
        <EmptyView
          title="空空如也"
          message="这里没有文件。"
          icon="folder-open-outline"
          fullScreen
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        data={[{ isFolderHeader: true } as any, ...folders, ...items]}
        keyExtractor={(item: any, index) =>
          item.isFolderHeader ? 'header' : item.id || index.toString()
        }
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: playback.current ? 220 : 24,
        }}
        renderItem={({ item, index }) => {
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
                <Pressable className="flex-row items-center" onPress={() => void fetchManifest()}>
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
                  <Text className="ml-3 text-base font-medium text-text dark:text-dark-text">
                    {item.name}
                  </Text>
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
                <MemoryListItem
                  item={item}
                  onPress={() => void handlePlayAt(musicIndex)}
                />
              </View>
              {isCurrent && (
                <View className="flex-row items-center mb-2 ml-4">
                  <Ionicons
                    name={playback.status === 'playing' ? 'musical-notes' : 'pause-circle'}
                    size={12}
                    color="#2563EB"
                  />
                  <Text className="ml-1 text-[10px] text-primary">
                    {playback.status === 'playing' ? '正在播放' : '已暂停'}
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

export default MusicPlayerScreen;
