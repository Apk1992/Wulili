import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  FlatList,
  Modal,
  Pressable,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Video from 'react-native-video';
import { SafeAreaView } from 'react-native-safe-area-context';

import ScreenContainer from '@/components/ScreenContainer';
import MemoryListItem from '@/components/MemoryListItem';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { useGitHubFiles } from '@/hooks/useGitHubRepo';
import { useGitHubReleases, collectVideoAssets } from '@/hooks/useGitHubReleases';
import { getGitHubToken } from '@/api/githubClient';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { formatDuration } from '@/utils/time';
import { bgmManager } from '@/services/bgmManager'; // 👈 BGM 挂起/恢复
import type { MemoryItem } from '@/types/memory';
import type { GitHubContentItem } from '@/types/github';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

const RAW_BASE = `https://raw.githubusercontent.com/yukee520/Wulili_assets/main`;
const SCREEN_WIDTH = Dimensions.get('window').width;
const SMALL_VIDEO_HEIGHT = SCREEN_WIDTH * 0.56;

export function VideoPlayerScreen({}: Props): React.JSX.Element {
  const repoQuery = useGitHubFiles({ path: GITHUB_PATHS.videos, depth: 1 });
  const releasesQuery = useGitHubReleases(30);

  const [current, setCurrent] = useState<MemoryItem | null>(null);
  const [paused, setPaused] = useState<boolean>(false);
  const [position, setPosition] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState<boolean>(false);

  // 🔥 自动挂起/恢复 BGM
  useEffect(() => {
    if (current) {
      bgmManager.suspendForVideo();
    } else {
      bgmManager.resumeFromVideo();
    }
    return () => {
      bgmManager.resumeFromVideo();
    };
  }, [current]);

  const items = useMemo(() => {
    const repoItems = buildRepoItems(repoQuery.data ?? []);
    const releaseItems = buildReleaseItems(releasesQuery.data ?? []);
    return [...releaseItems, ...repoItems];
  }, [repoQuery.data, releasesQuery.data]);

  const videoSource = useMemo(() => {
    if (!current) return null;
    const token = getGitHubToken();
    if (current.source === 'release') {
      return { uri: current.downloadUrl ?? '' };
    }
    return {
      uri: `${RAW_BASE}/${current.path}`,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
  }, [current]);

  const handlePress = useCallback((item: MemoryItem) => {
    setCurrent(item);
    setPaused(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    setFullscreen(false);
  }, []);

  const togglePause = () => setPaused((p) => !p);

  const closePlayer = () => {
    setCurrent(null);
    setPaused(false);
    setPosition(0);
    setDuration(0);
    setError(null);
    setFullscreen(false);
  };

  const openFullscreen = () => {
    setFullscreen(true);
    setPaused(false);
  };

  const closeFullscreen = () => {
    setFullscreen(false);
  };

  if (repoQuery.isLoading || releasesQuery.isLoading) {
    return (
      <ScreenContainer edges={['bottom']}>
        <LoadingView message="正在加载视频列表…" fullScreen />
      </ScreenContainer>
    );
  }

  if (repoQuery.isError && releasesQuery.isError) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorView
          title="加载失败"
          message="无法获取视频列表。"
          onRetry={() => {
            void repoQuery.refetch();
            void releasesQuery.refetch();
          }}
          fullScreen
        />
      </ScreenContainer>
    );
  }

  if (current) {
    return (
      <ScreenContainer padded={false} edges={['bottom']}>
        <View
          className="bg-black"
          style={{ width: SCREEN_WIDTH, height: SMALL_VIDEO_HEIGHT }}
        >
          <Video
            // 🔥 核心修复：每次换视频强制重建播放器，避免 0.07 秒卡顿
            key={`small-${current.id}`}
            source={videoSource ?? { uri: '' }}
            style={{ width: SCREEN_WIDTH, height: SMALL_VIDEO_HEIGHT }}
            resizeMode="contain"
            paused={paused}
            controls={false}
            onLoad={(data) => {
              setDuration(data.duration);
              setError(null);
            }}
            onProgress={(data) => setPosition(data.currentTime)}
            onError={() => setError('无法播放该视频')}
            onEnd={closePlayer}
          />
          <Pressable
            onPress={openFullscreen}
            className="absolute top-3 right-3 p-2 rounded-full active:opacity-70"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
            accessibilityLabel="全屏"
          >
            <Ionicons name="expand" size={20} color="#FFFFFF" />
          </Pressable>
          {error ? (
            <View className="absolute inset-0 items-center justify-center bg-black/60">
              <Text className="text-white text-sm">{error}</Text>
            </View>
          ) : null}
        </View>

        <View className="p-3 flex-row items-center justify-between bg-card dark:bg-dark-card border-b border-border dark:border-dark-border">
          <View className="flex-1 mr-2">
            <Text
              className="text-sm font-semibold text-text dark:text-dark-text"
              numberOfLines={1}
            >
              {humanizeFileName(current.displayName)}
            </Text>
            <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">
              {formatDuration(position * 1000)} / {formatDuration(duration * 1000)}
            </Text>
          </View>
          <Pressable
            onPress={togglePause}
            className="p-2 rounded-full active:opacity-70"
          >
            <Ionicons
              name={paused ? 'play' : 'pause'}
              size={22}
              color="#2563EB"
            />
          </Pressable>
          <Pressable
            onPress={closePlayer}
            className="p-2 rounded-full active:opacity-70 ml-1"
          >
            <Ionicons name="close" size={22} color="#EF4444" />
          </Pressable>
        </View>

        <View className="px-4 py-2">
          <Pressable onPress={closePlayer} className="flex-row items-center">
            <Ionicons name="chevron-back" size={16} color="#2563EB" />
            <Text className="ml-1 text-xs text-primary">返回列表</Text>
          </Pressable>
        </View>

        {/* 全屏 Modal */}
        <Modal
          visible={fullscreen}
          animationType="fade"
          transparent={false}
          onRequestClose={closeFullscreen}
          statusBarTranslucent
        >
          <View className="flex-1 bg-black">
            <SafeAreaView edges={['top', 'bottom']} className="flex-1">
              <View className="flex-1 items-center justify-center">
                <Video
                  // 🔥 核心修复：全屏也强制重建
                  key={`full-${current.id}`}
                  source={videoSource ?? { uri: '' }}
                  style={{ width: '100%', height: '100%' }}
                  resizeMode="contain"
                  paused={paused}
                  controls={false}
                  onLoad={(data) => {
                    setDuration(data.duration);
                  }}
                  onProgress={(data) => setPosition(data.currentTime)}
                  onError={() => setError('无法播放该视频')}
                  onEnd={closePlayer}
                />
              </View>

              <View className="absolute top-0 left-0 right-0 p-4 flex-row items-center justify-between">
                <Pressable
                  onPress={closeFullscreen}
                  className="p-2 rounded-full active:opacity-70"
                  style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  accessibilityLabel="退出全屏"
                >
                  <Ionicons name="contract" size={22} color="#FFFFFF" />
                </Pressable>
                <View className="flex-row items-center">
                  <Pressable
                    onPress={togglePause}
                    className="p-2 rounded-full active:opacity-70 mr-2"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    <Ionicons
                      name={paused ? 'play' : 'pause'}
                      size={22}
                      color="#FFFFFF"
                    />
                  </Pressable>
                  <Pressable
                    onPress={closePlayer}
                    className="p-2 rounded-full active:opacity-70"
                    style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
                  >
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </Pressable>
                </View>
              </View>

              <View className="absolute bottom-0 left-0 right-0 p-4">
                <Text className="text-white text-center text-xs">
                  {formatDuration(position * 1000)} / {formatDuration(duration * 1000)}
                </Text>
              </View>
            </SafeAreaView>
          </View>
        </Modal>
      </ScreenContainer>
    );
  }

  if (items.length === 0) {
    return (
      <ScreenContainer edges={['bottom']}>
        <EmptyView
          title="还没有视频"
          message="上传视频到仓库 videos/ 文件夹，或在 Release 中挂载视频附件。"
          icon="videocam-outline"
          fullScreen
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <FlatList
        data={items}
        keyExtractor={(item) => `${item.source}-${item.sha}`}
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 12,
          paddingBottom: 24,
        }}
        renderItem={({ item }) => (
          <MemoryListItem item={item} onPress={handlePress} />
        )}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <Text className="text-xs text-muted dark:text-dark-muted mb-2">
            共 {items.length} 个视频 · 在线流式播放
          </Text>
        }
      />
    </ScreenContainer>
  );
}

function buildRepoItems(files: GitHubContentItem[]): MemoryItem[] {
  const items: MemoryItem[] = [];
  for (const file of files) {
    const kind = detectMemoryKind(file.name);
    if (kind !== 'video') continue;
    items.push({
      id: file.sha || file.path,
      kind: 'video',
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
  return items;
}

function buildReleaseItems(
  releases: NonNullable<ReturnType<typeof useGitHubReleases>['data']>,
): MemoryItem[] {
  const assets = collectVideoAssets(releases);
  return assets.map((asset) => ({
    id: `asset-${asset.id}`,
    kind: 'video' as const,
    name: asset.name,
    displayName: humanizeFileName(asset.name),
    path: asset.name,
    size: asset.size,
    sha: String(asset.id),
    downloadUrl: asset.browser_download_url,
    updatedAt: asset.created_at,
    source: 'release' as const,
    releaseTag: asset.releaseTag,
    assetId: asset.id,
  }));
}

export default VideoPlayerScreen;
