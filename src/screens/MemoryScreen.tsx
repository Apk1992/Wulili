import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, RefreshControl, Text, View, Pressable } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import CategoryTabs from '@/components/CategoryTabs';
import MemoryListItem from '@/components/MemoryListItem';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import EmptyView from '@/components/EmptyView';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { useGitHubFiles } from '@/hooks/useGitHubRepo';
import { useGitHubReleases, collectVideoAssets } from '@/hooks/useGitHubReleases';
import { detectMemoryKind } from '@/utils/mediaType';
import { humanizeFileName } from '@/utils/format';
import { useBgm } from '@/hooks/useBgm'; // 👈 引入 BGM
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

export function MemoryScreen({ navigation }: Props): React.JSX.Element {
  // 🔥 关键：在回忆页也激活 BGM，从播放器退出后能瞬间响
  useBgm();

  const [activeKind, setActiveKind] = useState<MemoryKind>('music');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const musicQuery = useGitHubFiles({ path: FOLDER_BY_KIND.music, depth: 1, enabled: activeKind === 'music' });
  const videoQuery = useGitHubFiles({ path: FOLDER_BY_KIND.video, depth: 1, enabled: activeKind === 'video' });
  const noteQuery = useGitHubFiles({ path: FOLDER_BY_KIND.note, depth: 1, enabled: activeKind === 'note' });
  const releasesQuery = useGitHubReleases(30);

  const musicItems = useMemo(() => buildItems(musicQuery.data ?? [], 'music'), [musicQuery.data]);
  const videoItems = useMemo(() => {
    const repoItems = buildItems(videoQuery.data ?? [], 'video');
    const releaseItems = buildReleaseItems(releasesQuery.data ?? []);
    return [...releaseItems, ...repoItems];
  }, [videoQuery.data, releasesQuery.data]);
  const noteItems = useMemo(() => buildItems(noteQuery.data ?? [], 'note'), [noteQuery.data]);

  const counts = {
    music: musicItems.length,
    video: videoItems.length,
    note: noteItems.length,
  };

  const activeQuery = activeKind === 'music' ? musicQuery : activeKind === 'video' ? videoQuery : noteQuery;
  const activeItems = activeKind === 'music' ? musicItems : activeKind === 'video' ? videoItems : noteItems;

  useFocusEffect(
    useCallback(() => {
      void musicQuery.refetch();
      void videoQuery.refetch();
      void noteQuery.refetch();
      void releasesQuery.refetch();
    }, []),
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([musicQuery.refetch(), videoQuery.refetch(), noteQuery.refetch(), releasesQuery.refetch()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handlePressItem = (item: any) => {
    // 🔥 点击文件夹
    if (item.isFolder) {
      if (item.kind === 'music') {
        navigation.navigate('MusicPlayer', { initialPath: item.path });
      }
      // 如果以后要做视频文件夹，在这里加
      return;
    }

    if (item.kind === 'music') {
      navigation.navigate('MusicPlayer');
      return;
    }
    if (item.kind === 'video') {
      navigation.navigate('VideoPlayer');
      return;
    }
    navigation.navigate('NoteReader', { path: item.path, sha: item.sha, displayName: item.displayName });
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <CategoryTabs active={activeKind} onChange={setActiveKind} counts={counts} />
      </View>

      {activeQuery.isLoading ? (
        <LoadingView message="正在加载回忆…" fullScreen />
      ) : activeQuery.isError ? (
        <ErrorView title="加载失败" message="无法连接到回忆仓库，请检查网络或 Token 设置。" onRetry={() => activeQuery.refetch()} fullScreen />
      ) : activeItems.length === 0 ? (
        <EmptyView title="这里还是空的" message={EMPTY_MESSAGES[activeKind]} icon="cloud-outline" fullScreen />
      ) : (
        <FlatList
          data={activeItems}
          keyExtractor={(item) => `${item.source}-${item.sha || item.path}`}
          contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 24 }}
          renderItem={({ item }) => {
            // 渲染文件夹 UI
            if ((item as any).isFolder) {
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
            // 渲染音乐文件 UI
            return <MemoryListItem item={item} onPress={() => handlePressItem(item)} />;
          }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<Text className="text-xs text-muted dark:text-dark-muted mb-2">共 {activeItems.length} 项 · 下拉刷新</Text>}
        />
      )}
    </ScreenContainer>
  );
}

// 🔥 修复：无论有没有扩展名，只要是 `dir`，就作为文件夹放进来
function buildItems(files: GitHubContentItem[], type: MemoryKind): any[] {
  const items: any[] = [];
  
  for (const file of files) {
    // 核心拦截：只要它是文件夹，无条件放进去
    if (file.type === 'dir') {
      items.push({
        id: file.sha || file.path,
        kind: type, // 标记它属于哪个 tab
        name: file.name,
        displayName: file.name,
        path: file.path,
        size: 0,
        sha: file.sha,
        downloadUrl: '',
        updatedAt: null,
        source: 'repo',
        isFolder: true, // 👈 强制标记为文件夹
      });
      continue;
    }

    // 如果是文件，照常判断
    if (file.type === 'file') {
      const kind = detectMemoryKind(file.name);
      if (!kind) continue;
      items.push({
        id: file.sha || file.path,
        kind,
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
  }
  
  // 排序时，把文件夹排在最前面
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
