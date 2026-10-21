// src/screens/MemoryManagerScreen.tsx
import React, { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, Text, View, Linking } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { launchImageLibrary } from 'react-native-image-picker';
import { pick, types as documentTypes } from '@react-native-documents/picker';
import RNFS from 'react-native-fs';

import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import Card from '@/components/Card';
import { useGitHubFiles } from '@/hooks/useGitHubRepo';
import { putBinaryFile, deleteFile, getFileSha } from '@/api/githubContents';
import { toGitHubApiError } from '@/api/githubClient';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { GITHUB_PATHS } from '@/api/githubConfig';
import { UPLOAD_SIZE_LIMIT } from '@/types/config';
import { detectMemoryKind, getKindLabel } from '@/utils/mediaType';
import { formatFileSize, humanizeFileName } from '@/utils/format';
import type { GitHubContentItem } from '@/types/github';
import type { MemoryKind } from '@/types/memory';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MemoryManager'>;

type FolderKey = 'music' | 'videos' | 'notes';

const FOLDERS: Array<{ key: FolderKey; label: string }> = [
  { key: 'music', label: '音乐' },
  { key: 'videos', label: '视频' },
  { key: 'notes', label: '笔记' },
];

// 🔥 Cloudflare R2 基础公开域名
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function MemoryManagerScreen({}: Props): React.JSX.Element {
  const { hasToken } = useGitHubToken();
  const [activeFolder, setActiveFolder] = useState<FolderKey>('music');
  const [uploading, setUploading] = useState<boolean>(false);

  const query = useGitHubFiles({
    path: GITHUB_PATHS[activeFolder],
    depth: 1,
    enabled: true,
  });

  const items = useMemo(() => {
    const files = query.data ?? [];
    return files.filter((f) => f.type === 'file');
  }, [query.data]);

  const ensureToken = (): boolean => {
    if (!hasToken) {
      Alert.alert('未配置 Token', '请先在设置里配置 GitHub Token。');
      return false;
    }
    return true;
  };

  const uploadBase64 = async (
    fileName: string,
    base64: string,
    size: number,
  ) => {
    if (size > UPLOAD_SIZE_LIMIT) {
      Alert.alert(
        '文件过大',
        `单个文件不能超过 ${formatFileSize(UPLOAD_SIZE_LIMIT)}，大视频建议直接同步到 Cloudflare R2 后台。`,
      );
      return;
    }
    setUploading(true);
    try {
      const path = `${GITHUB_PATHS[activeFolder]}/${fileName}`;
      const existingSha = await getFileSha(path);
      await putBinaryFile(path, base64, `上传 ${fileName}`, existingSha);
      Alert.alert('上传成功', `${fileName} 已保存。App 将自动通过 R2 加速节点加载。`);
      void query.refetch();
    } catch (error) {
      const apiError = toGitHubApiError(error);
      Alert.alert('上传失败', apiError.message);
    } finally {
      setUploading(false);
    }
  };

  const handlePickImage = async () => {
    if (!ensureToken()) return;
    try {
      const result = await launchImageLibrary({
        mediaType: 'mixed',
        selectionLimit: 1,
      });
      if (result.didCancel) return;
      const asset = result.assets?.[0];
      if (!asset || !asset.uri) {
        Alert.alert('无法读取文件', '请重试。');
        return;
      }
      const size = asset.fileSize ?? 0;
      if (size > UPLOAD_SIZE_LIMIT) {
        Alert.alert(
          '文件过大',
          `单个文件不能超过 ${formatFileSize(UPLOAD_SIZE_LIMIT)}。`,
        );
        return;
      }
      const base64 = await RNFS.readFile(asset.uri, 'base64');
      const fileName = asset.fileName ?? `upload-${Date.now()}`;
      await uploadBase64(fileName, base64, size);
    } catch (error) {
      const message = error instanceof Error ? error.message : '选择文件失败';
      Alert.alert('选择失败', message);
    }
  };

  const handlePickDocument = async () => {
    if (!ensureToken()) return;
    try {
      const results = await pick({
        type: [documentTypes.allFiles],
        allowMultiSelection: false,
      });
      const file = results[0];
      if (!file) return;
      const uri = file.uri;
      const size = file.size ?? 0;
      if (size > UPLOAD_SIZE_LIMIT) {
        Alert.alert(
          '文件过大',
          `单个文件不能超过 ${formatFileSize(UPLOAD_SIZE_LIMIT)}。`,
        );
        return;
      }
      const base64 = await RNFS.readFile(uri, 'base64');
      const fileName = file.name ?? `upload-${Date.now()}`;
      await uploadBase64(fileName, base64, size);
    } catch (error) {
      if (
        error &&
        typeof error === 'object' &&
        'code' in error &&
        (error as { code?: string }).code === 'DOCUMENT_PICKER_CANCELED'
      ) {
        return;
      }
      const message = error instanceof Error ? error.message : '选择文件失败';
      Alert.alert('选择失败', message);
    }
  };

  const handleDelete = (item: GitHubContentItem) => {
    if (!ensureToken()) return;
    Alert.alert('删除文件', `确定要删除 ${item.name} 吗？`, [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteFile(item.path, `删除 ${item.name}`, item.sha);
            Alert.alert('已删除');
            void query.refetch();
          } catch (error) {
            const apiError = toGitHubApiError(error);
            Alert.alert('删除失败', apiError.message);
          }
        },
      },
    ]);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3">
        <View className="flex-row mb-3">
          {FOLDERS.map((folder) => {
            const active = folder.key === activeFolder;
            return (
              <Pressable
                key={folder.key}
                onPress={() => setActiveFolder(folder.key)}
                className={[
                  'px-3 py-1.5 mr-2 rounded-full',
                  active ? 'bg-primary' : 'bg-border dark:bg-dark-border',
                ].join(' ')}
              >
                <Text
                  className={[
                    'text-xs',
                    active ? 'text-white' : 'text-muted dark:text-dark-muted',
                  ].join(' ')}
                >
                  {folder.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Card>
          <Text className="text-xs text-muted dark:text-dark-muted mb-1">
            当前目录：{GITHUB_PATHS[activeFolder]}/
          </Text>
          <Text className="text-[10px] text-primary dark:text-blue-400 mb-3">
            提示：静态资源已接入 Cloudflare R2 CDN ({R2_BASE_URL})
          </Text>
          <View className="flex-row">
            <View className="flex-1 mr-2">
              <Button
                label="上传媒体文件"
                size="sm"
                icon="image"
                loading={uploading}
                onPress={() => void handlePickImage()}
              />
            </View>
            <View className="flex-1">
              <Button
                label="上传任意文档"
                size="sm"
                variant="secondary"
                icon="document"
                loading={uploading}
                onPress={() => void handlePickDocument()}
              />
            </View>
          </View>
        </Card>

        <View className="flex-row items-center justify-between mt-4 mb-2">
          <Text className="text-xs text-muted dark:text-dark-muted">
            文件列表 · {items.length}
          </Text>
          <Pressable
            onPress={() => void query.refetch()}
            className="flex-row items-center"
          >
            <Text className="text-xs text-primary">刷新列表</Text>
          </Pressable>
        </View>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.sha || item.path}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => {
          const kind: MemoryKind | null = detectMemoryKind(item.name);
          // 拼接 R2 预览地址
          const r2ItemUrl = `${R2_BASE_URL}/${item.path.replace(/^\/+/, '')}`;

          return (
            <Pressable
              onPress={() => {
                // 点击可以直接在浏览器或应用内通过 R2 访问该资源
                void Linking.openURL(r2ItemUrl);
              }}
              className="flex-row items-center p-3 mb-2 rounded-2xl bg-card dark:bg-dark-card border border-border dark:border-dark-border active:opacity-90"
            >
              <View className="flex-1">
                <Text
                  className="text-sm font-medium text-text dark:text-dark-text"
                  numberOfLines={1}
                >
                  {humanizeFileName(item.name)}
                </Text>
                <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
                  {kind ? getKindLabel(kind) : '其他'} · {formatFileSize(item.size)}
                </Text>
              </View>
              <Button
                label="删除"
                size="sm"
                variant="danger"
                fullWidth={false}
                onPress={() => handleDelete(item)}
              />
            </Pressable>
          );
        }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View className="py-12 items-center px-4">
            <Text className="text-xs text-muted dark:text-dark-muted text-center mb-2">
              当前分类目录暂无文件，或网络未同步。
            </Text>
            <Text className="text-[10px] text-muted dark:text-dark-muted text-center">
              如果你的文件已直接上传至 Cloudflare R2 存储桶，可直接通过上方按钮上传索引或确认 Token 配置。
            </Text>
          </View>
        }
      />
    </ScreenContainer>
  );
}

export default MemoryManagerScreen;
