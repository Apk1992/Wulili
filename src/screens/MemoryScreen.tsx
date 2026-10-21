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
import { getGitHubToken } from '@/api/githubClient';
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
  music: '这个文件夹里暂无内容。',
  video: '这个文件夹里暂无内容。',
  note: '这个文件夹里暂无内容。',
};

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';
const NEW_FILES_KEY = '@wulili/known_files_r2_subfolder_v1';

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

  // 切换顶部 Tab 时，重置当前路径为该分类的根目录（如 music/）
  const handleTabChange = (kind: MemoryKind) => {
    setActiveKind(kind);
    setCurrentPath(BASE_PATHS[kind]);
  };

  // 真实通过 GitHub API 动态拉取你当前子文件夹底下的目录与文件结构
  const fetchFolder = async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const token = getGitHubToken();
      const apiUrl = `https://api.github.com/repos/yukee520/Wulili_assets/contents/${currentPath}?t=${Date.now()}`;
      const res = await fetch(apiUrl, {
        headers: {
          Authorization: token ? `Bearer ${token}` : '',
          Accept: 'application/vnd.github.v3+json',
          'Cache-Control': 'no-cache',
        },
      });
      if (!res.ok) throw new Error('获取目录失败');
      const data = await res.json();
      setRawData(Array.isArray(data) ? data : []);
    } catch {
      setRawData([]);
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      bgmManager.init();
      void fetchFolder();
      void releasesQuery.refetch();
    }, [currentPath, activeKind]),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchFolder(false);
    await releasesQuery.refetch();
    setRefreshing(false);
  };

  // 返回上一级文件夹
  const handleGoBackFolder = () => {
    const basePath = BASE_PATHS[activeKind];
    if (currentPath === basePath) return;
    const parts = currentPath.split('/');
    parts.pop();
    setCurrentPath(parts.join('/') || basePath);
  };

  // 点击列表项（如果是文件夹则进入子文件夹，如果是文件则打开对应播放器/阅读器）
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

  // 组装并按照时间降序排序（文件夹置顶，文件按时间最新置顶）
  const activeItems = useMemo(() => {
    const repoItems = buildItems(rawData, activeKind, knownFiles);
    
    let combined = repoItems;
    // 如果在视频根目录下，顺便合并 GitHub Release 资产
    if (activeKind === 'video' && releasesQuery.data && currentPath === BASE_PATHS.video) {
      const releaseItems = buildReleaseItems(releasesQuery.data, knownFiles);
      combined = [...releaseItems, ...repoItems];
    }

    // 排序：文件夹永远在最前；同级别按名字或时间排序
    return combined.sort((a, b) => {
      if (a.isFolder && !b.isFolder) return -1;
      if (!a.isFolder && b.isFolder) return 1;
      return b.name.localeCompare(a.name, 'zh-CN');
    });
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

      {/* 如果不在根目录，显示返回上一级按钮 */}
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
          <Text className="text-xs text-muted mt-4">正在加载目录…</Text>
        </View>
      ) : activeItems.length === 0 ? (
        <EmptyView title="这里还是空的" message={EMPTY_MESSAGES[activeKind]} icon="folder-open-outline" fullScreen />
      ) : (
        <FlatList
          data={activeItems}
          keyExtractor={(item) => `${item.source || 'repo'}-${item.sha || item.path}`}
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
          ListHeaderComponent={<Text className="text-xs text-muted dark:text-dark-muted mb-2">当前路径: {currentPath}</Text>}
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
      items.push({
        id: file.sha || file.path,
        kind,
        name: file.name,
        displayName: humanizeFileName(file.name),
        path: file.path,
        size: file.size ?? 0,
        sha: file.sha ?? 'local',
        downloadUrl: `${R2_BASE_URL}/${file.path}`,
        updatedAt: new Date().toISOString(),
        source: 'repo',
        isFolder: false,
        isNew: !isKnown,
      });
    }
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
