// src/screens/MemoryScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenContainer from '@/components/ScreenContainer';
import CategoryTabs from '@/components/CategoryTabs';
import MemoryListItem from '@/components/MemoryListItem';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { useGitHubReleases, collectVideoAssets } from '@/hooks/useGitHubReleases';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { bgmManager } from '@/services/bgmManager';
import type { MemoryItem, MemoryKind } from '@/types/memory';
import type { RootStackParamList } from '@/types/navigation';
import type { GitHubContentItem } from '@/types/github';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const BASE_PATHS: Record<MemoryKind, string> = {
  music: GITHUB_PATHS.music,
  video: GITHUB_PATHS.videos,
  note: GITHUB_PATHS.notes,
};

const EMPTY_MESSAGES: Record<MemoryKind, string> = {
  music: '往这个文件夹里上传一些音乐吧。',
  video: '往这个文件夹里上传一些视频吧。',
  note: '往这个文件夹里上传一些读文吧。',
};

// 🔥 Cloudflare R2 公开基础路径
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

const NEW_FILES_KEY = '@wulili/known_files_r2_v8';

// 预设默认的静态回忆资产索引（补全所有字段，避免 MemoryListItem 渲染时报错）
const DEFAULT_MEMORY_ITEMS: GitHubContentItem[] = [
  { name: 'bgm_default.mp3', path: 'music/bgm_default.mp3', type: 'file', size: 524288, sha: 'def-1' },
  { name: 'welcome.mp4', path: 'videos/welcome.mp4', type: 'file', size: 2097152, sha: 'def-2' },
  { name: 'intro.md', path: 'notes/intro.md', type: 'file', size: 1024, sha: 'def-3' },
];

export function MemoryScreen({ navigation }: Props): React.JSX.Element {
  const [activeKind, setActiveKind] = useState<MemoryKind>('music');
  const [currentPath, setCurrentPath] = useState<string>(GITHUB_PATHS.music);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [knownFiles, setKnownFiles] = useState<Record<string, boolean>>({});
  
  const [rawData, setRawData] = useState<GitHubContentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  const releasesQuery = useGitHubReleases(30);

  useEffect(() => {
    AsyncStorage.getItem(NEW_FILES_KEY).then((res) => {
      if (res) {
        try {
          setKnownFiles(JSON.parse(res));
        } catch {
          setKnownFiles({});
        }
      }
    }).catch(() => {});
  }, []);

  const handleTabChange = (kind: MemoryKind) => {
    setActiveKind(kind);
    setCurrentPath(BASE_PATHS[kind]);
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      // 过滤当前分类匹配的默认项目
      const filtered = DEFAULT_MEMORY_ITEMS.filter(item => {
        if (activeKind === 'music') return item.path.startsWith('music/');
        if (activeKind === 'video') return item.path.startsWith('videos/');
        return item.path.startsWith('notes/');
      });
      setRawData(filtered);
    } catch {
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      bgmManager.init();
      void fetchData();
      void releasesQuery.refetch();
    }, [currentPath, activeKind]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    await releasesQuery.refetch();
    setRefreshing(false);
  };

  const handleGoBackFolder = () => {
    const basePath = BASE_PATHS[activeKind];
    if (currentPath === basePath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || basePath);
  };

  const handleFolderPress = (folderPath: string) => {
    setCurrentPath(folderPath);
  };

  const handlePressItem = async (item: any) => {
    const identityKey = `${item.path}_${item.sha || 'root'}`;
    const newKnown = { 
      ...knownFiles, 
      [item.path]: true,
      [identityKey]: true
    };

    setKnownFiles(newKnown);
    await AsyncStorage.setItem(NEW_FILES_KEY, JSON.stringify(newKnown)).catch(() => {});

    if (item.isFolder) {
      handleFolderPress(item.path);
      return;
    }

    if (item.kind === 'music') {
      navigation.navigate('MusicPlayer', { initialPath: currentPath });
    } else if (item.kind === 'video') {
      navigation.navigate('VideoPlayer', { url: item.downloadUrl, title: item.displayName });
    } else {
      navigation.navigate('NoteReader', { path: item.path, sha: item.sha, displayName: item.displayName });
    }
  };

  const activeItems = useMemo(() => {
    if (activeKind === 'video' && releasesQuery.data && currentPath === BASE_PATHS.video) {
      const repoItems = buildItems(rawData, 'video', knownFiles);
      const releaseItems = buildReleaseItems(releasesQuery.data, knownFiles);
      return [...releaseItems, ...repoItems];
    }
    return buildItems(rawData, activeKind, knownFiles);
  }, [rawData, activeKind, knownFiles, releasesQuery.data, currentPath]);

  const counts = {
    music: activeKind === 'music' ? activeItems.length : 0,
    video: activeKind === 'video' ? activeItems.length : 0,
    note: activeKind === 'note' ? activeItems.length : 0,
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <CategoryTabs active={activeKind} onChange={handleTabChange} counts={counts} />
      </View>

      {currentPath !== BASE_PATHS[activeKind] && (
        <View className="px-4 py-2 flex-row items-center">
          <Pressable className="flex-row items-center bg-card dark:bg-dark-card px-3 py-1.5 rounded-full border border-border dark:border-dark-border" onPress={handleGoBackFolder}>
            <Ionicons name="arrow-back" size={14} color="#2563EB" />
            <Text className="ml-1 text-xs text-primary font-medium">返回上一级</Text>
          </Pressable>
        </View>
      )}

      {loading && !refreshing ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#2563EB" />
          <Text className="text-xs text-muted mt-4">正在加载回忆…</Text>
        </View>
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
                <View className="relative">
                  <Pressable
                    className="flex-row items-center justify-between p-4 mb-2 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border"
                    onPress={() => void handlePressItem(item)}
                  >
                    <View className="flex-row items-center">
                      <Ionicons name="folder" size={24} color="#F59E0B" />
                      <Text className="ml-3 text-base font-medium text-text dark:text-dark-text">{item.name}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#94A3B8" />
                  </Pressable>
                  {item.isNew && (
                    <View className="absolute top-2 right-8 bg-danger px-1.5 py-0.5 rounded-full">
                      <Text className="text-[9px] text-white font-bold">NEW</Text>
                    </View>
                  )}
                </View>
              );
            }
            return (
              <View className="relative">
                <MemoryListItem item={item} onPress={() => void handlePressItem(item)} />
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
          ListHeaderComponent={<Text className="text-xs text-muted dark:text-dark-muted mb-2">共 {activeItems.length} 项 · 全球 CDN 加速中</Text>}
        />
      )}
    </ScreenContainer>
  );
}

function buildItems(
  files: GitHubContentItem[],
  type: MemoryKind,
  knownFiles: Record<string, boolean>
): any[] {
  const items: any[] = [];
  
  for (const file of files) {
    const identityKey = `${file.path}_${file.sha || 'root'}`;
    const isKnown = !!(knownFiles[file.path] || knownFiles[identityKey]);

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
        isNew: !isKnown,
      });
      continue;
    }
    
    if (file.type === 'file') {
      const kind = detectMemoryKind(file.name) || type;
      const r2DownloadUrl = `${R2_BASE_URL}/${file.path}`;

      items.push({
        id: file.sha || file.path,
        kind,
        name: file.name,
        displayName: humanizeFileName(file.name),
        path: file.path,
        size: file.size ?? 0,
        sha: file.sha ?? 'local',
        downloadUrl: r2DownloadUrl,
        updatedAt: new Date().toISOString(),
        source: 'repo',
        isFolder: false,
        isNew: !isKnown,
      });
    }
  }
  
  return items.sort((a, b) => {
    if (a.isFolder && !b.isFolder) return -1;
    if (!a.isFolder && b.isFolder) return 1;
    return b.name.localeCompare(a.name, 'zh-CN');
  });
}

function buildReleaseItems(
  releases: NonNullable<ReturnType<typeof useGitHubReleases>['data']>,
  knownFiles: Record<string, boolean>
): MemoryItem[] {
  const assets = collectVideoAssets(releases);
  return assets.map((asset) => {
    const uniqueId = String(asset.id);
    const identityKey = `${asset.name}_${uniqueId}`;
    const isKnown = !!(knownFiles[asset.name] || knownFiles[identityKey]);
    return {
      id: `asset-${asset.id}`,
      kind: 'video' as MemoryKind,
      name: asset.name,
      displayName: humanizeFileName(asset.name),
      path: asset.name,
      size: asset.size,
      sha: uniqueId,
      downloadUrl: asset.browser_download_url,
      updatedAt: asset.created_at,
      source: 'release' as const,
      releaseTag: asset.releaseTag,
      assetId: asset.id,
      isNew: !isKnown,
    };
  });
}

export default MemoryScreen;
