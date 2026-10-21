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

type Props = NativeStackScreenProps<RootStackParamList, 'Tabs'>;

const BASE_PATHS: Record<MemoryKind, string> = {
  music: GITHUB_PATHS.music,
  video: GITHUB_PATHS.videos,
  note: GITHUB_PATHS.notes,
};

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const NEW_FILES_KEY = '@wulili/known_files_r2_pure_static_v1';

// 🔥 纯静态 R2 资产与子文件夹索引配置（完全摆脱 GitHub API 扫描）
// 你可以在这里自由添加你的子文件夹和文件，全部走 R2 CDN 秒开
interface StaticItem {
  id: string;
  name: string;
  path: string;       // R2 相对路径
  type: 'dir' | 'file';
  parentPath: string; // 父级目录路径
  size?: number;
  updatedAt?: string;
}

const STATIC_ASSETS_DATABASE: StaticItem[] = [
  // --- 音乐分类 ---
  { id: 'm-dir-1', name: '默认合集', path: 'music/default', type: 'dir', parentPath: 'music' },
  { id: 'm-file-1', name: 'bgm_default.mp3', path: 'music/default/bgm_default.mp3', type: 'file', parentPath: 'music/default', size: 524288, updatedAt: '2026-06-01T00:00:00.000Z' },

  // --- 视频分类 ---
  { id: 'v-dir-1', name: '日常记录', path: 'videos/dailies', type: 'dir', parentPath: 'videos' },
  { id: 'v-file-1', name: 'welcome.mp4', path: 'videos/dailies/welcome.mp4', type: 'file', parentPath: 'videos/dailies', size: 2097152, updatedAt: '2026-06-01T00:00:00.000Z' },

  // --- 笔记分类 ---
  { id: 'n-dir-1', name: '心情随笔', path: 'notes/thoughts', type: 'dir', parentPath: 'notes' },
  { id: 'n-file-1', name: 'intro.md', path: 'notes/thoughts/intro.md', type: 'file', parentPath: 'notes/thoughts', size: 1024, updatedAt: '2026-06-01T00:00:00.000Z' },
];

export function MemoryScreen({ navigation }: Props): React.JSX.Element {
  const [activeKind, setActiveKind] = useState<MemoryKind>('music');
  const [currentPath, setCurrentPath] = useState<string>(GITHUB_PATHS.music);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [knownFiles, setKnownFiles] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState<boolean>(false);

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

  const handleRefresh = async () => {
    setRefreshing(true);
    await releasesQuery.refetch();
    setRefreshing(false);
  };

  useFocusEffect(
    useCallback(() => {
      bgmManager.init();
      void releasesQuery.refetch();
    }, [currentPath, activeKind]),
  );

  const handleGoBackFolder = () => {
    const basePath = BASE_PATHS[activeKind];
    if (currentPath === basePath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || basePath);
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
      setCurrentPath(item.path);
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

  // 🔥 核心：直接从本地纯静态数据库中匹配当前 parentPath 的子文件夹和文件，完全不走 GitHub API！
  const activeItems = useMemo(() => {
    const matched = STATIC_ASSETS_DATABASE.filter(item => item.parentPath === currentPath);

    const formattedItems = matched.map((item) => {
      const identityKey = `${item.path}_${item.id}`;
      const isKnown = !!(knownFiles[item.path] || knownFiles[identityKey]);

      if (item.type === 'dir') {
        return {
          id: item.id,
          kind: activeKind,
          name: item.name,
          displayName: item.name,
          path: item.path,
          size: 0,
          sha: item.id,
          downloadUrl: '',
          updatedAt: item.updatedAt || null,
          source: 'repo',
          isFolder: true,
          isNew: !isKnown,
        };
      }

      const kind = detectMemoryKind(item.name) || activeKind;
      return {
        id: item.id,
        kind,
        name: item.name,
        displayName: humanizeFileName(item.name),
        path: item.path,
        size: item.size ?? 0,
        sha: item.id,
        downloadUrl: `${R2_BASE_URL}/${item.path}`,
        updatedAt: item.updatedAt || new Date().toISOString(),
        source: 'repo',
        isFolder: false,
        isNew: !isKnown,
      };
    });

    let combined = formattedItems;
    // 如果在视频根目录，顺便拼入 GitHub Release 资产
    if (activeKind === 'video' && releasesQuery.data && currentPath === BASE_PATHS.video) {
      const releaseItems = buildReleaseItems(releasesQuery.data, knownFiles);
      combined = [...releaseItems, ...formattedItems];
    }

    // 排序：文件夹置顶，文件按时间降序
    return combined.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      const timeA = new Date(a.updatedAt || 0).getTime();
      const timeB = new Date(b.updatedAt || 0).getTime();
      return timeB - timeA;
    });
  }, [currentPath, activeKind, knownFiles, releasesQuery.data]);

  const counts = {
    music: STATIC_ASSETS_DATABASE.filter(i => i.parentPath.startsWith('music')).length,
    video: STATIC_ASSETS_DATABASE.filter(i => i.parentPath.startsWith('videos')).length + (releasesQuery.data ? collectVideoAssets(releasesQuery.data).length : 0),
    note: STATIC_ASSETS_DATABASE.filter(i => i.parentPath.startsWith('notes')).length,
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
          <Text className="text-xs text-muted mt-4">加载中…</Text>
        </View>
      ) : activeItems.length === 0 ? (
        <EmptyView title="这里还是空的" message="当前子文件夹暂无内容。" icon="folder-open-outline" fullScreen />
      ) : (
        <FlatList
          data={activeItems}
          keyExtractor={(item) => `${item.source}-${item.sha || item.path}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            if (item.isFolder) {
              return (
                <View className="relative mb-2">
                  <Pressable
                    className="flex-row items-center justify-between p-4 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border active:opacity-90"
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
            );
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text className="text-xs text-muted dark:text-dark-muted mb-2">当前路径: {currentPath} · R2 加速直连</Text>}
        />
      )}
    </ScreenContainer>
  );
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
