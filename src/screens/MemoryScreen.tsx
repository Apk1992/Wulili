// src/screens/MemoryScreen.tsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import ScreenContainer from '@/components/ScreenContainer';
import CategoryTabs from '@/components/CategoryTabs';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { useGitHubReleases, collectVideoAssets } from '@/hooks/useGitHubReleases';
import { detectMemoryKind, getKindIcon, getKindLabel } from '@/utils/mediaType';
import { formatFileSize, humanizeFileName } from '@/utils/format';
import { bgmManager } from '@/services/bgmManager';
import type { MemoryKind } from '@/types/memory';
import type { RootStackParamList } from '@/types/navigation';
import type { GitHubContentItem } from '@/types/github';

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const BASE_PATHS: Record<MemoryKind, string> = {
  music: GITHUB_PATHS.music,
  video: GITHUB_PATHS.videos,
  note: GITHUB_PATHS.notes,
};

const EMPTY_MESSAGES: Record<MemoryKind, string> = {
  music: '音乐文件夹里暂无音频文件。',
  video: '视频文件夹里暂无视频文件。',
  note: '笔记文件夹里暂无读文文件。',
};

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const NEW_FILES_KEY = '@wulili/known_files_r2_v11';

const DEFAULT_MEMORY_ITEMS: GitHubContentItem[] = [
  { name: 'bgm_default.mp3', path: 'music/bgm_default.mp3', type: 'file', size: 524288, sha: 'def-1' },
  { name: 'welcome.mp4', path: 'videos/welcome.mp4', type: 'file', size: 2097152, sha: 'def-2' },
  { name: 'intro.md', path: 'notes/intro.md', type: 'file', size: 1024, sha: 'def-3' },
];

export function MemoryScreen({ navigation }: Props): React.JSX.Element {
  const [activeKind, setActiveKind] = useState<MemoryKind>('music');
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
  };

  const fetchData = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      setRawData(DEFAULT_MEMORY_ITEMS);
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
    }, [activeKind]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchData(false);
    await releasesQuery.refetch();
    setRefreshing(false);
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

    if (item.kind === 'music') {
      navigation.navigate('MusicPlayer', { initialPath: BASE_PATHS.music });
    } else if (item.kind === 'video') {
      navigation.navigate('VideoPlayer', { url: item.downloadUrl, title: item.displayName });
    } else {
      navigation.navigate('NoteReader', { path: item.path, sha: item.sha, displayName: item.displayName });
    }
  };

  // 🔥 核心优化：过滤、合并并按上传日期/时间降序排序（最新在最上）
  const activeItems = useMemo(() => {
    const prefixMap: Record<MemoryKind, string> = {
      music: 'music/',
      video: 'videos/',
      note: 'notes/',
    };
    const targetPrefix = prefixMap[activeKind];

    const filteredFiles = rawData.filter(file => file.type === 'file' && file.path.startsWith(targetPrefix));
    const repoItems = buildItems(filteredFiles, activeKind, knownFiles);

    let combined = repoItems;
    if (activeKind === 'video' && releasesQuery.data) {
      const releaseItems = buildReleaseItems(releasesQuery.data, knownFiles);
      combined = [...releaseItems, ...repoItems];
    }

    // 按照 updatedAt 时间戳降序排序（时间越近越靠前）
    return combined.sort((a, b) => {
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [rawData, activeKind, knownFiles, releasesQuery.data]);

  const counts = {
    music: rawData.filter(f => f.path.startsWith('music/')).length,
    video: rawData.filter(f => f.path.startsWith('videos/')).length + (releasesQuery.data ? collectVideoAssets(releasesQuery.data).length : 0),
    note: rawData.filter(f => f.path.startsWith('notes/')).length,
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <CategoryTabs active={activeKind} onChange={handleTabChange} counts={counts} />
      </View>

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
          renderItem={({ item }) => (
            <View className="relative mb-2">
              <Pressable
                onPress={() => void handlePressItem(item)}
                className="flex-row items-center p-3 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border active:opacity-95"
              >
                <View className="w-11 h-11 items-center justify-center rounded-xl bg-primary/10 dark:bg-primary/20 mr-3">
                  <Ionicons name={getKindIcon(item.kind) || 'document'} size={20} color="#2563EB" />
                </View>
                <View className="flex-1">
                  <Text className="text-sm font-semibold text-text dark:text-dark-text" numberOfLines={1}>
                    {item.displayName}
                  </Text>
                  <Text className="text-[11px] text-muted dark:text-dark-muted mt-0.5" numberOfLines={1}>
                    {getKindLabel(item.kind)} · {formatFileSize(item.size)}
                  </Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
              </Pressable>
              {item.isNew && (
                <View className="absolute top-2 right-2 bg-danger px-1.5 py-0.5 rounded-full">
                  <Text className="text-[9px] text-white font-bold">NEW</Text>
                </View>
              )}
            </View>
          )}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text className="text-xs text-muted dark:text-dark-muted mb-2">共 {activeItems.length} 项 · 按最新时间置顶</Text>}
        />
      )}
    </ScreenContainer>
  );
}

function buildItems(files: GitHubContentItem[], type: MemoryKind, knownFiles: Record<string, boolean>): any[] {
  const items: any[] = [];
  for (const file of files) {
    const identityKey = `${file.path}_${file.sha || 'root'}`;
    const isKnown = !!(knownFiles[file.path] || knownFiles[identityKey]);

    const kind = detectMemoryKind(file.name) || type;
    items.push({
      id: file.sha || file.path,
      kind,
      name: file.name,
      displayName: humanizeFileName(file.name),
      path: file.path,
      size: file.size ?? 0,
      sha: file.sha ?? 'local',
      downloadUrl: `${R2_BASE_URL}/${file.path}`,
      updatedAt: file.updatedAt || new Date().toISOString(),
      source: 'repo',
      isFolder: false,
      isNew: !isKnown,
    });
  }
  return items;
}

function buildReleaseItems(releases: any[], knownFiles: Record<string, boolean>): any[] {
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
      source: 'release',
      isFolder: false,
      isNew: !isKnown,
    };
  });
}

export default MemoryScreen;
