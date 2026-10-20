// src/screens/DeveloperConsoleScreen.tsx
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SettingRow from '@/components/SettingRow';
import SyncButton from '@/components/editor/SyncButton';
import { useDialogue } from '@/hooks/useDialogue';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useGitHubAppConfig } from '@/hooks/useGitHubAppConfig';
import { useSettingsStore } from '@/store/useSettingsStore';
import { fetchRemoteDialogues, pushRemoteDialogues } from '@/api/githubDialogues';
import { pushRemoteAppConfig } from '@/api/githubAppConfig';
import { toGitHubApiError } from '@/api/githubClient';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { formatRelativeTime } from '@/utils/time';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DeveloperConsole'>;

// 🔥 Cloudflare R2 基础公开域名提示
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function DeveloperConsoleScreen({ navigation }: Props): React.JSX.Element {
  const { hasToken } = useGitHubToken();
  const useRemoteDialogues = useSettingsStore((s) => s.settings.useRemoteDialogues);
  const [pulling, setPulling] = useState<boolean>(false);
  const [pushingDialogues, setPushingDialogues] = useState<boolean>(false);
  const [pushingConfig, setPushingConfig] = useState<boolean>(false);

  const configQuery = useGitHubAppConfig(false);
  const config = useAppConfigStore((s) => s.config);
  const syncMeta = useAppConfigStore((s) => s.syncMeta);
  const setRemoteConfig = useAppConfigStore((s) => s.setRemoteConfig);

  const dialogues = useDialogueStore((s) => s.dialogues);
  const setRemoteDialogues = useDialogueStore((s) => s.setRemoteDialogues);
  const setUserDialogues = useDialogueStore((s) => s.setUserDialogues);
  const userDialogues = dialogues.filter((d) => d.source === 'user');
  const remoteDialogues = dialogues.filter((d) => d.source === 'remote');
  const defaultCount = dialogues.filter((d) => d.source === 'default').length;

  const handlePullAll = async () => {
    if (!hasToken) {
      Alert.alert('未配置 Token', '请先在设置里配置 GitHub Token。');
      return;
    }
    setPulling(true);
    try {
      if (useRemoteDialogues) {
        const dialogueResult = await fetchRemoteDialogues();
        setRemoteDialogues(dialogueResult.file.dialogues);
      }
      const configResult = await configQuery.refetch();
      if (configResult.data) {
        setRemoteConfig(configResult.data.config);
      }
      Alert.alert('拉取成功', '线上内容已同步到本机。');
    } catch (error) {
      const apiError = toGitHubApiError(error);
      Alert.alert('拉取失败', apiError.message);
    } finally {
      setPulling(false);
    }
  };

  const handlePushDialogues = async () => {
    if (!hasToken) {
      Alert.alert('未配置 Token', '请先在设置里配置 GitHub Token。');
      return;
    }
    const allDialogues = [...remoteDialogues, ...userDialogues];
    if (allDialogues.length === 0) {
      Alert.alert('没有可推送的内容', '你还没有创建自定义台词。');
      return;
    }
    setPushingDialogues(true);
    try {
      const result = await pushRemoteDialogues(
        allDialogues,
        `更新台词 ${new Date().toISOString()}`,
      );
      Alert.alert('推送成功', `已提交到 GitHub\n${result.commitUrl}`);
    } catch (error) {
      const apiError = toGitHubApiError(error);
      Alert.alert('推送失败', apiError.message);
    } finally {
      setPushingDialogues(false);
    }
  };

  const handlePushConfig = async () => {
    if (!hasToken) {
      Alert.alert('未配置 Token', '请先在设置里配置 GitHub Token。');
      return;
    }
    setPushingConfig(true);
    try {
      const result = await pushRemoteAppConfig(
        config,
        `更新配置 ${new Date().toISOString()}`,
      );
      Alert.alert('推送成功', `已提交到 GitHub\n${result.commitUrl}`);
    } catch (error) {
      const apiError = toGitHubApiError(error);
      Alert.alert('推送失败', apiError.message);
    } finally {
      setPushingConfig(false);
    }
  };

  const handleExportDialogues = () => {
    useDialogueStore.getState().setUserDialogues(userDialogues);
    const json = JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        dialogues: [...remoteDialogues, ...userDialogues],
      },
      null,
      2,
    );
    Alert.alert(
      '导出内容',
      `${json.length} 个字符，请到开发者编辑页面复制内容。`,
      [{ text: '好的' }],
    );
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="px-4 pt-4">
          <Card>
            <Text className="text-sm font-semibold text-text dark:text-dark-text">
              内容统计与 R2 CDN 状态
            </Text>
            <View className="mt-2">
              <StatLine label="内置台词" value={defaultCount} />
              <StatLine label="线上台词" value={remoteDialogues.length} />
              <StatLine label="本地台词" value={userDialogues.length} />
              <StatLine label="食物" value={config.foods.length} />
              <StatLine label="药品" value={config.medicines.length} />
              <StatLine label="服装" value={config.outfits.length} />
              <StatLine label="配饰" value={config.accessories.length} />
              <StatLine label="小游戏" value={config.minigames.length} />
            </View>
            <Text className="text-[10px] text-primary mt-2">
              CDN 加速节点: {R2_BASE_URL}
            </Text>
            <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
              上次拉取：{syncMeta.lastPulledAt ? formatRelativeTime(syncMeta.lastPulledAt) : '从未'}
            </Text>
          </Card>
        </View>

        <View className="px-4 mt-3">
          <SyncButton
            label="从 GitHub 拉取最新内容"
            variant="pull"
            loading={pulling}
            onPress={() => void handlePullAll()}
            lastSyncedAt={syncMeta.lastPulledAt}
          />
        </View>

        <View className="px-4 mt-2">
          <SyncButton
            label="推送台词到 GitHub"
            variant="push"
            icon="chatbubbles"
            loading={pushingDialogues}
            onPress={() => void handlePushDialogues()}
          />
        </View>

        <View className="px-4 mt-2">
          <SyncButton
            label="推送配置到 GitHub"
            variant="push"
            icon="settings"
            loading={pushingConfig}
            onPress={() => void handlePushConfig()}
          />
        </View>

        <View className="px-4 mt-2">
          <Button
            label="导出为 JSON"
            variant="ghost"
            size="sm"
            icon="download"
            onPress={handleExportDialogues}
          />
        </View>

        <Text className="px-4 pt-5 pb-2 text-xs text-muted dark:text-dark-muted">
          编辑内容
        </Text>
        <SettingRow
          icon="chatbubble-ellipses"
          label="台词编辑器"
          value={`${remoteDialogues.length + userDialogues.length} 条`}
          onPress={() => navigation.navigate('DialogueEditor')}
        />
        <SettingRow
          icon="restaurant"
          label="食物编辑器"
          value={`${config.foods.length} 项`}
          onPress={() => navigation.navigate('FoodEditor')}
        />
        <SettingRow
          icon="medkit"
          label="药品编辑器"
          value={`${config.medicines.length} 项`}
          onPress={() => navigation.navigate('MedicineEditor')}
        />
        <SettingRow
          icon="shirt"
          label="服装编辑器"
          value={`${config.outfits.length} 项`}
          onPress={() => navigation.navigate('OutfitEditor')}
        />
        <SettingRow
          icon="glasses"
          label="配饰编辑器"
          value={`${config.accessories.length} 项`}
          onPress={() => navigation.navigate('AccessoryEditor')}
        />
        <SettingRow
          icon="game-controller"
          label="小游戏编辑器"
          value={`${config.minigames.length} 项`}
          onPress={() => navigation.navigate('MinigameEditor')}
        />
        <SettingRow
          icon="folder"
          label="回忆管理"
          value="上传、删除、重命名"
          onPress={() => navigation.navigate('MemoryManager')}
        />

        <View className="px-4 mt-4">
          <Button
            label="返回设置"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

function StatLine({ label, value }: { label: string; value: number }): React.JSX.Element {
  return (
    <View className="flex-row items-center justify-between py-1">
      <Text className="text-xs text-muted dark:text-dark-muted">{label}</Text>
      <Text className="text-xs font-medium text-text dark:text-dark-text">
        {value}
      </Text>
    </View>
  );
}

void useDialogue;

export default DeveloperConsoleScreen;
