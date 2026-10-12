import React, { useCallback, useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceInfo from 'react-native-device-info';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SettingRow from '@/components/SettingRow';
import { useSettingsStore } from '@/store/useSettingsStore';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useDeveloperMode } from '@/hooks/useDeveloperMode';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useWuliliStore } from '@/store/useWuliliStore';
import { storageClearByPrefix } from '@/utils/storage';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'Settings'>;

export function SettingsScreen({ navigation }: Props): React.JSX.Element {
  const settings = useSettingsStore((s) => s.settings);
  const setThemePreference = useSettingsStore((s) => s.setThemePreference);
  const setAutoCheckUpdate = useSettingsStore((s) => s.setAutoCheckUpdate);
  const setUseRemoteConfig = useSettingsStore((s) => s.setUseRemoteConfig);
  const setUseRemoteDialogues = useSettingsStore((s) => s.setUseRemoteDialogues);
  const setUseRemoteImages = useSettingsStore((s) => s.setUseRemoteImages);
  const resetSettings = useSettingsStore((s) => s.resetSettings);

  const {
    hasToken,
    hasEmbedded,
    clearToken,
    isLoading: tokenLoading,
  } = useGitHubToken();
  const { isEnabled: developerMode, handleSecretTap, disable } = useDeveloperMode();
  const { info, isChecking, check } = useAppUpdate();

  const [versionTapCount, setVersionTapCount] = useState<number>(0);

  const handleVersionTap = useCallback(() => {
    if (developerMode) return;
    handleSecretTap();
    setVersionTapCount((prev) => {
      const next = prev + 1;
      if (next >= 7) return 0;
      return next;
    });
  }, [developerMode, handleSecretTap]);

  const handleCheckUpdate = async () => {
    const result = await check({ silent: false });
    if (result && !result.hasUpdate) {
      Alert.alert('已是最新版本', `当前版本 ${result.currentVersion}`);
    }
  };

  const handleClearCache = () => {
    Alert.alert('清除缓存', '这会清空已缓存的台词、图片与配置，确定吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        onPress: async () => {
          await storageClearByPrefix('@wulili/image/');
          await storageClearByPrefix('@wulili/minigame-cache/');
          await useDialogueStore.getState().hydrate();
          Alert.alert('已清除', '缓存已清空，返回首页会自动重新拉取。');
        },
      },
    ]);
  };

  const handleResetGame = () => {
    Alert.alert('重置养成数据', '这会清空雾璃的所有状态、金币、亲密度与购买记录，且不可恢复。确定吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '重置',
        style: 'destructive',
        onPress: () => {
          useWuliliStore.getState().reset();
          useDialogueStore.getState().resetRuntime();
          Alert.alert('已重置', '雾璃会重新认识你。');
        },
      },
    ]);
  };

  const handleClearToken = () => {
    Alert.alert('清除 Token', '确定要移除 GitHub Token 吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          Alert.alert('已清除');
        },
      },
    ]);
  };

  const handleResetSettings = () => {
    Alert.alert('恢复默认设置', '确定吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '恢复',
        style: 'destructive',
        onPress: () => {
          resetSettings();
          Alert.alert('已恢复');
        },
      },
    ]);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <Text className="px-4 pt-4 pb-2 text-xs text-muted dark:text-dark-muted">
          GitHub
        </Text>
        <SettingRow
          icon="key"
          label="GitHub Token"
          value={
            tokenLoading
              ? '读取中…'
              : hasEmbedded
                ? '已内嵌（无需配置）'
                : hasToken
                  ? '已设置'
                  : '未设置'
          }
          onPress={() => navigation.navigate('GitHubToken')}
        />
        {hasToken && !hasEmbedded ? (
          <SettingRow
            icon="trash"
            label="清除 Token"
            variant="danger"
            onPress={handleClearToken}
          />
        ) : null}
        <SettingRow
          icon="cloud-download"
          label="使用线上配置"
          value="食物、药物、服饰、小游戏"
          toggle={{ value: settings.useRemoteConfig, onValueChange: setUseRemoteConfig }}
        />
        <SettingRow
          icon="chatbubbles"
          label="使用线上台词"
          toggle={{ value: settings.useRemoteDialogues, onValueChange: setUseRemoteDialogues }}
        />
        <SettingRow
          icon="image"
          label="使用线上图片"
          value="在线加载雾璃与物品形象"
          toggle={{ value: settings.useRemoteImages, onValueChange: setUseRemoteImages }}
        />

        <Text className="px-4 pt-4 pb-2 text-xs text-muted dark:text-dark-muted">
          显示
        </Text>
        <SettingRow
          icon="contrast"
          label="主题"
          value={
            settings.themePreference === 'system'
              ? '跟随系统'
              : settings.themePreference === 'light'
                ? '浅色'
                : '深色'
          }
          onPress={() => {
            Alert.alert('选择主题', undefined, [
              { text: '跟随系统', onPress: () => setThemePreference('system') },
              { text: '浅色', onPress: () => setThemePreference('light') },
              { text: '深色', onPress: () => setThemePreference('dark') },
              { text: '取消', style: 'cancel' },
            ]);
          }}
        />

        <Text className="px-4 pt-4 pb-2 text-xs text-muted dark:text-dark-muted">
          更新
        </Text>
        <SettingRow
          icon="refresh"
          label={isChecking ? '正在检查…' : '检查更新'}
          value={info?.latestVersion ? `最新版本 ${info.latestVersion}` : undefined}
          onPress={handleCheckUpdate}
        />
        <SettingRow
          icon="cloud-upload"
          label="自动检查更新"
          toggle={{ value: settings.autoCheckUpdate, onValueChange: setAutoCheckUpdate }}
        />

        {developerMode ? (
          <>
            <Text className="px-4 pt-4 pb-2 text-xs text-primary">
              开发者模式
            </Text>
            <SettingRow
              icon="construct"
              label="开发者控制台"
              value="台词、食物、药品、服饰、小游戏、回忆管理"
              onPress={() => navigation.navigate('DeveloperConsole')}
            />
            <SettingRow
              icon="shield"
              label="关闭开发者模式"
              variant="danger"
              onPress={() => {
                Alert.alert('关闭开发者模式', '确定吗？', [
                  { text: '取消', style: 'cancel' },
                  { text: '关闭', style: 'destructive', onPress: disable },
                ]);
              }}
            />
          </>
        ) : null}

        <Text className="px-4 pt-4 pb-2 text-xs text-muted dark:text-dark-muted">
          数据
        </Text>
        <SettingRow icon="trash-bin" label="清除缓存" onPress={handleClearCache} />
        <SettingRow
          icon="warning"
          label="重置养成数据"
          variant="danger"
          onPress={handleResetGame}
        />
        <SettingRow
          icon="reload"
          label="恢复默认设置"
          variant="danger"
          onPress={handleResetSettings}
        />

        <Text className="px-4 pt-4 pb-2 text-xs text-muted dark:text-dark-muted">
          关于
        </Text>
        <SettingRow
          icon="information-circle"
          label="关于雾璃专属"
          onPress={() => navigation.navigate('About')}
        />

        <Card className="mx-4 mt-4 items-center">
          <Button
            label={`版本 ${DeviceInfo.getVersion()}`}
            variant="ghost"
            size="sm"
            onPress={handleVersionTap}
          />
          {!developerMode && versionTapCount > 0 ? (
            <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
              再点击 {7 - versionTapCount} 次可开启开发者模式
            </Text>
          ) : null}
          {developerMode ? (
            <Text className="text-[10px] text-primary mt-1">
              开发者模式已开启
            </Text>
          ) : null}
        </Card>
      </ScrollView>
    </ScreenContainer>
  );
}

export default SettingsScreen;