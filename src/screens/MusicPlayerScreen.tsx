import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TrackPlayer from 'react-native-track-player';

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
  const query = useGitHubFiles({ path: GITHUB_PATHS.music, depth: 1 });
  const [playback, setPlayback] = useState<PlaybackState>({
    current: null,
    status: 'idle',
    position: 0,
    duration: 0,
    error: null,
  });

  const items = useMemo(() => {
    const files = query.data ?? [];
    return buildMusicItems(files);
  }, [query.data]);

  useEffect(() => {
    return () => {
      void TrackPlayer.reset().catch(() => undefined);
    };
  }, []);

  const handlePress = useCallback(
    async (item: MemoryItem) => {
      try {
        await TrackPlayer.reset();
        const token = getGitHubToken();
        await TrackPlayer.add({
          id: item.id,
          url: `${RAW_BASE}/${item.path}`,
          title: humanizeFileName(item.displayName),
          artist: '雾璃',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        setPlayback({
          current: item,
          status: 'loading',
          position: 0,
          duration: 0,
          error: null,
        });
        await TrackPlayer.play();
        setPlayback((prev) => ({ ...prev, status: 'playing' }));
      } catch (error) {
        const message = error instanceof Error ? error.message : '播放失败';
        setPlayback({
          current: item,
          status: 'error',
          position: 0,
          duration: 0,
          error: message,
        });
        Alert.alert('播放失败', message);
      }
    },
    [],
  );

  const togglePlay = async () => {
    try {
      if (playback.status === 'playing') {
        await TrackPlayer.pause();
        setPlayback((prev) => ({ ...prev, status: 'paused' }));
      } else if (playback.current) {
        await TrackPlayer.play();
        setPlayback((prev) => ({ ...prev, status: 'playing' }));
      }
    } catch {
      // ignore
    }
  };

  const stopPlayback = async () => {
    try {
      await TrackPlayer.reset();
    } catch {
      // ignore
    }
    setPlayback({
      current: null,
      status: 'idle',
      position: 0,
      duration: 0,
      error: null,
    });
  };

  if (query.isLoading) {
    return (
      <ScreenContainer edges={['bottom']}>
        <LoadingView message="正在加载音乐列表…" fullScreen />
      </ScreenContainer>
    );
  }

  if (query.isError) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorView
          title="加载失败"
          message="无法获取音乐列表，请检查网络或 Token。"
          onRetry={() => query.refetch()}
          fullScreen
        />
      </ScreenContainer>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenContainer edges={['bottom']}>
        <EmptyView
          title="还没有音乐"
          message="往仓库的 music/ 文件夹里上传一些音乐文件吧。"
          icon="musical-notes-outline"
          fullScreen
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 100 }}
        renderItem={({ item }) => (
          <MemoryListItem item={item} onPress={() => void handlePress(item)} />
        )}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Pressable
            className="mb-2 flex-row items-center"
            onPress={() => void query.refetch()}
          >
            <Ionicons name="refresh" size={14} color="#2563EB" />
            <Text className="ml-1 text-xs text-primary">刷新列表</Text>
          </Pressable>
        }
      />
      {playback.current ? (
        <View className="absolute left-4 right-4 bottom-4">
          <MediaPlayerBar
            playback={playback}
            onTogglePlay={() => void togglePlay()}
            onStop={() => void stopPlayback()}
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