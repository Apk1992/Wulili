import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenContainer from '@/components/ScreenContainer';
import CategoryTabs from '@/components/CategoryTabs';
import MemoryListItem from '@/components/MemoryListItem';
import ErrorView from '@/components/ErrorView';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { useGitHubReleases, collectVideoAssets } from '@/hooks/useGitHubReleases';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { getGitHubToken } from '@/api/githubClient';
import { useBgm } from '@/hooks/useBgm';
import type { MemoryItem, MemoryKind } from '@/types/memory';
import type { RootStackParamList } from '@/types/navigation';
import type { GitHubContentItem } from '@/types/github';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const FOLDER_BY_KIND: Record<MemoryKind, string> = {
  music: GITHUB_PATHS.music,
  video: GITHUB_PATHS.videos,
  note: GITHUB_PATHS.notes,
};

const EMPTY_MESSAGES: Record<MemoryKind, string> = {
  music: '往仓库的 music/ 文件夹里上传一些音乐吧。',
  video: '往仓库的 videos/ 文件夹或 Release 里上传一些视频吧。',
  note: '往仓库的 notes/ 文件夹里上传一些读文吧。',
};

const NEW_FILES_KEY = '@wulili/known_files';

export function MemoryScreen({ navigation }: Props): React.JSX.Element {
  useBgm();

  const [activeKind, setActiveKind] = useState<MemoryKind>('music');
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [knownFiles, setKnownFiles] = useState<Record<string, boolean>>({});
  
  // 🔥 自己接管请求状态
  const [rawData, setRawData] = useState<GitHubContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<boolean>(false);

  const releasesQuery = useGitHubReleases(30);

  // 加载已读记忆
  useEffect(() => {
    void AsyncStorage.getItem(NEW_FILES_KEY).then((res) => {
      if (res) setKnownFiles(JSON.parse(res));
    });
  }, []);

  // 🔥 核心修复：自己发请求拉取数据，绝对不经过旧的 Hook
  const fetchFolder = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    setError(false);
    try {
      const token = getGitHubToken();
      const path = FOLDER_BY_KIND[activeKind];
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${path}`;

      const res = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/vnd.github.v3+json',
        },
      });

      if (!res.ok) throw new Error('获取失败');
      const data = await res.json();
      // 即使里面有文件夹，也会原样返回
      setRawData(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      void fetchFolder();
      void releasesQuery.refetch();
    }, [activeKind]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFolder(false);
    await releasesQuery.refetch();
    setRefreshing(false);
  };

  // 转换并排序数据
  const activeItems = useMemo(() => {
    if (activeKind === 'video' && releasesQuery.data) {
      const repoItems = buildItems(rawData, 'video', knownFiles);
      const releaseItems = buildReleaseItems(releasesQuery.data);
      return [...releaseItems, ...repoItems];
    }
    return buildItems(rawData, activeKind, knownFiles);
  }, [rawData, activeKind, knownFiles, releasesQuery.data]);

  const counts = {
    music: activeKind === 'music' ? activeItems.length : 0,
    video: activeKind === 'video' ? activeItems.length : 0,
    note: activeKind === 'note' ? activeItems.length : 0,
  };

  const handlePressItem = (item: any) => {
    if (item.isNew) {
      const newKnown = { ...knownFiles, [item.sha || item.path]: true };
      setKnownFiles(newKnown);
      void AsyncStorage.setItem(NEW_FILES_KEY, JSON.stringify(newKnown));
    }

    if (item.isFolder) {
      if (item.kind === 'music') navigation.navigate('MusicPlayer', { initialPath: item.path });
      return;
    }

    if (item.kind === 'music') {
      navigation.navigate('MusicPlayer');
    } else if (item.kind === 'video') {
      navigation.navigate('VideoPlayer');
    } else {
      navigation.navigate('NoteReader', { path: item.path, sha: item.sha, displayName: item.displayName });
    }
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <CategoryTabs active={activeKind} onChange={setActiveKind} counts={counts} />
      </View>

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-xs text-muted mt-4">正在加载回忆…</Text>
        </View>
      ) : error ? (
        <ErrorView title="加载失败" message="无法连接到仓库，请检查网络。" onRetry={() => void fetchFolder()} fullScreen />
      ) : activeItems.length === 0 ? (
        <EmptyView title="这里还是空的" message={EMPTY_MESSAGES[activeKind]} icon="cloud-outline" fullScreen />
      ) : (
        <FlatList
          data={activeItems}
          keyExtractor={(item) => `${item.source}-${item.sha || item.path}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            if (item.isFolder) {
              return (
                <Pressable
                  className="flex-row items-center justify-between p-4 mb-2 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border"
                  onPress={() => handlePressItem(item)}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="folder" size={24} color="#F59E0B" />
                    <Text className="ml-3 text-base font-medium text-text dark:text-dark-text">{item.name}</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                </Pressable>
              );
            }
            return (
              <View className="relative">
                <MemoryListItem item={item} onPress={() => handlePressItem(item)} />
                {item.isNew && (
                  <View className="absolute top-2 right-2 bg-danger px-1.5 py-0.5 rounded-full">
                    <Text className="text-[9px] text-white font-bold">NEW</Text>
                  </View>
                )}
              </View>
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text className="text-xs text-muted dark:text-dark-muted mb-2">共 {activeItems.length} 项 · 下拉刷新</Text>}
        />
      )}
    </ScreenContainer>
  );
}

// 🔥 核心处理逻辑：不强求扩展名，只要 type 是 dir 就返回
function buildItems(files: GitHubContentItem[], type: MemoryKind, knownFiles: Record<string, boolean>): any[] {
  const items: any[] = [];
  
  for (const file of files) {
    if (file.type === 'dir') {
      items.push({
        id: file.sha || file.path,
        kind: type,
        name: file.name,
        displayName: file.name,
        path: file.path,
        size: 0,
        sha: file.sha,
        downloadUrl: '',
        updatedAt: null,
        source: 'repo',
        isFolder: true,
      });
      continue;
    }

    if (file.type === 'file') {
      const kind = detectMemoryKind(file.name);
      if (!kind) continue;
      const uniqueId = file.sha || file.path;
      items.push({
        id: uniqueId,
        kind,
        name: file.name,
        displayName: humanizeFileName(file.name),
        path: file.path,
        size: file.size,
        sha: file.sha,
        downloadUrl: file.download_url,
        updatedAt: null,
        source: 'repo',
        isNew: !knownFiles[uniqueId], // 🔥 判断是否为新文件
      });
    }
  }
  
  return items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return a.displayName.localeCompare(b.displayName, 'zh-CN');
  });
}

function buildReleaseItems(releases: NonNullable<ReturnType<typeof useGitHubReleases>['data']>): MemoryItem[] {
  const assets = collectVideoAssets(releases);
  return assets.map((asset) => ({
    id: `asset-${asset.id}`,
    kind: 'video' as MemoryKind,
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

export default MemoryScreen;
