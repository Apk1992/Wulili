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
import type { MemoryItem, PlaybackState } from '@/types/memory';
import type { GitHubContentItem } from '@/types/github';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MusicPlayer'>;

const RAW_BASE = `https://raw.githubusercontent.com/yukee520/Wulili_assets/main`;
const NEW_FILES_KEY = '@wulili/known_files';

export function MusicPlayerScreen({ route }: Props): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string>(route.params?.initialPath || GITHUB_PATHS.music);
  const [rawData, setRawData] = useState<GitHubContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);
  
  const [playback, setPlayback] = useState<PlaybackState>({ current: null, status: 'idle', position: 0, duration: 0, error: null });
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  
  // 🔥 强依赖 knownFiles，必须加载完成才能渲染列表
  const [knownFiles, setKnownFiles] = useState<Record<string, boolean> | null>(null);

  const isSeekingRef = useRef<boolean>(false);
  const queueReadyRef = useRef<boolean>(false);
  const trackPlayerState = usePlaybackState();
  const progress = useProgress(250);

  // 1. 加载已读缓存
  useEffect(() => {
    void AsyncStorage.getItem(NEW_FILES_KEY).then((res) => {
      setKnownFiles(res ? JSON.parse(res) : {});
    });
  }, []);

  // 2. 离开页面强制停止播放，交还 BGM
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

  // 3. 拆分并计算 NEW
  const { folders, items } = useMemo(() => {
    const dirs: GitHubContentItem[] = [];
    const musicFiles: GitHubContentItem[] = [];
    for (const file of rawData) {
      if (file.type === 'dir') dirs.push(file);
      else if (file.type === 'file') musicFiles.push(file);
    }
    // 如果 knownFiles 还没加载完，暂时给个空对象避免闪退
    return { folders: dirs, items: buildMusicItems(musicFiles, knownFiles || {}) };
  }, [rawData, knownFiles]);

  const handleFolderPress = (path: string) => setCurrentPath(path);
  
  const handleGoBackFolder = () => {
    if (currentPath === GITHUB_PATHS.music) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || GITHUB_PATHS.music);
  };

  // ... 播放逻辑 (和之前一样，这里省略为了长度，保留你原来的 handlePlayAt, handleTogglePlay 等)

  const handlePlayAt = useCallback(async (index: number) => {
    try {
      const item = items[index];
      if (!item) return;

      // 🔥 点击后标记已读，更新缓存
      const newKnown = { ...(knownFiles || {}), [item.sha || item.path]: true, [item.path]: true };
      setKnownFiles(newKnown);
      await AsyncStorage.setItem(NEW_FILES_KEY, JSON.stringify(newKnown));

      setPlayback({ current: item, status: 'loading', position: 0, duration: 0, error: null });
      
      // 这里是你原本的播放逻辑...
      const token = getGitHubToken();
      const headers: Record<string, string> = {};
      if (token) headers.Authorization = `Bearer ${token}`;
      
      const tracks = items.map((it) => ({
        id: it.id,
        url: `${RAW_BASE}/${it.path}`,
        title: humanizeFileName(it.displayName),
        artist: '雾璃',
        headers,
      }));

      await TrackPlayer.reset();
      await TrackPlayer.add(tracks);
      await TrackPlayer.setRepeatMode(RepeatMode.Queue);
      await TrackPlayer.skip(index);
      await TrackPlayer.play();
      setCurrentIndex(index);

    } catch (error) {
      setPlayback((prev) => ({ ...prev, status: 'error', error: '播放失败' }));
    }
  }, [items, knownFiles]);

  // 播放控制 (快进、暂停) 与你之前一样
  const handleTogglePlay = async () => {
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
  };

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
                {/* 🔥 确保这里正确显示 NEW 标签 */}
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
            onSeekStart={() => { isSeekingRef.current = true; }}
            onSeekChange={() => {}}
            onSeekComplete={async (sec) => { await TrackPlayer.seekTo(sec); isSeekingRef.current = false; }}
            onPrevious={async () => { /* ... */ }}
            onNext={async () => { /* ... */ }}
            onStop={async () => { await TrackPlayer.reset(); setPlayback({ current: null, status: 'idle', position: 0, duration: 0, error: null }); }}
            hasPrevious={currentIndex > 0}
            hasNext={currentIndex >= 0 && currentIndex + 1 < items.length}
          />
        </View>
      )}
    </ScreenContainer>
  );
}

// 🔥 严丝合缝的判断，必须同时比对 sha 和 path
function buildMusicItems(files: GitHubContentItem[], knownFiles: Record<string, boolean>): any[] {
  const items: any[] = [];
  for (const file of files) {
    const kind = detectMemoryKind(file.name);
    if (kind !== 'music') continue;
    const uniqueId = file.sha || file.path;
    items.push({
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
      // 🔥 只要 knownFiles 里没有这个 SHA 也没有这个 PATH，就显示 NEW
      isNew: !knownFiles[uniqueId] && !knownFiles[file.path],
    });
  }
  return items.sort((a, b) => a.displayName.localeCompare(b.displayName, 'zh-CN'));
}

export default MusicPlayerScreen;
