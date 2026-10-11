import React, { useState } from 'react';
import { Alert, FlatList, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenContainer from '@/components/ScreenContainer';
import Button from '@/components/Button';
import Card from '@/components/Card';
import JsonEditor from '@/components/editor/JsonEditor';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useGitHubRawFile } from '@/hooks/useGitHubFile';
import { putFile } from '@/api/githubContents';
import { toGitHubApiError } from '@/api/githubClient';
import type { MinigameIndexEntry } from '@/types/config';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'MinigameEditor'>;

export function MinigameEditorScreen({}: Props): React.JSX.Element {
  const { hasToken } = useGitHubToken();
  const config = useAppConfigStore((s) => s.config);
  const updateConfig = useAppConfigStore((s) => s.updateConfig);
  const [editingEntry, setEditingEntry] = useState<MinigameIndexEntry | null>(null);
  const [uploading, setUploading] = useState<boolean>(false);

  const rawQuery = useGitHubRawFile(
    editingEntry?.dataPath ?? null,
    editingEntry !== null,
  );

  const handleDelete = (id: string) => {
    Alert.alert('删除小游戏', '确定要删除吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: () => {
          updateConfig({
            minigames: config.minigames.filter((m) => m.id !== id),
          });
        },
      },
    ]);
  };

  const handleAdd = () => {
    const newEntry: MinigameIndexEntry = {
      id: `user-game-${Date.now()}`,
      engine: 'memory',
      name: '新小游戏',
      description: '',
      icon: 'game-controller',
      dataPath: `minigames/custom/${Date.now()}.json`,
      assetFolder: 'images/minigame/memory',
      moodGain: 10,
      energyCost: 6,
      coinReward: 8,
    };
    updateConfig({ minigames: [...config.minigames, newEntry] });
    setEditingEntry(newEntry);
  };

  const handleSaveJson = async (raw: string) => {
    if (!editingEntry) return;
    if (!hasToken) {
      Alert.alert('未配置 Token', '请先在设置里配置 GitHub Token。');
      return;
    }
    setUploading(true);
    try {
      await putFile(
        editingEntry.dataPath,
        raw,
        `更新小游戏数据 ${editingEntry.id}`,
        rawQuery.data?.htmlUrl ? undefined : undefined,
      );
      Alert.alert('已推送', '小游戏数据已保存到 GitHub。');
      void rawQuery.refetch();
    } catch (error) {
      const apiError = toGitHubApiError(error);
      Alert.alert('推送失败', apiError.message);
    } finally {
      setUploading(false);
    }
  };

  if (editingEntry) {
    return (
      <ScreenContainer edges={['bottom']}>
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            {editingEntry.name}
          </Text>
          <Button
            label="返回列表"
            size="sm"
            variant="ghost"
            fullWidth={false}
            onPress={() => setEditingEntry(null)}
          />
        </View>
        <Text className="text-xs text-muted dark:text-dark-muted mb-2">
          文件路径：{editingEntry.dataPath}
        </Text>
        {rawQuery.isLoading ? (
          <Text className="text-xs text-muted dark:text-dark-muted">加载中…</Text>
        ) : rawQuery.isError || !rawQuery.data ? (
          <JsonEditor
            value={'{\n  "levels": []\n}'}
            onCommit={(raw) => void handleSaveJson(raw)}
            minHeight={240}
          />
        ) : (
          <JsonEditor
            value={rawQuery.data.raw}
            onCommit={(raw) => void handleSaveJson(raw)}
            minHeight={240}
          />
        )}
        {uploading ? (
          <Text className="text-xs text-primary mt-2">正在推送…</Text>
        ) : null}
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-3 flex-row items-center justify-between">
        <Text className="text-sm font-semibold text-text dark:text-dark-text">
          小游戏编辑器 · {config.minigames.length} 项
        </Text>
        <View style={{ width: 90 }}>
          <Button label="新增" size="sm" icon="add" onPress={handleAdd} />
        </View>
      </View>

      <FlatList
        data={config.minigames}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 32 }}
        renderItem={({ item }) => (
          <Card className="mb-3">
            <View className="flex-row items-center">
              <View className="flex-1">
                <Text className="text-sm font-semibold text-text dark:text-dark-text">
                  {item.name}
                </Text>
                <Text className="text-xs text-muted dark:text-dark-muted mt-0.5">
                  引擎：{item.engine} · 数据：{item.dataPath}
                </Text>
              </View>
              <Button
                label="编辑"
                size="sm"
                fullWidth={false}
                onPress={() => setEditingEntry(item)}
              />
              <View className="ml-2">
                <Button
                  label="删除"
                  size="sm"
                  variant="danger"
                  fullWidth={false}
                  onPress={() => handleDelete(item.id)}
                />
              </View>
            </View>
          </Card>
        )}
        showsVerticalScrollIndicator={false}
      />
    </ScreenContainer>
  );
}

export default MinigameEditorScreen;