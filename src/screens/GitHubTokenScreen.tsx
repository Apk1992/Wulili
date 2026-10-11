import React, { useEffect, useState } from 'react';
import {
  Alert,
  Linking,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useGitHubToken } from '@/hooks/useGitHubToken';
import { useTheme } from '@/hooks/useTheme';
import { useSettingsStore } from '@/store/useSettingsStore';
import { listDirectory } from '@/api/githubContents';
import { GITHUB_REPO } from '@/api/githubConfig';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'GitHubToken'>;

export function GitHubTokenScreen({ navigation }: Props): React.JSX.Element {
  const { isDark } = useTheme();
  const { hasToken, isLoading, saveToken, clearToken, loadToken } = useGitHubToken();
  const [draft, setDraft] = useState<string>('');
  const [testing, setTesting] = useState<boolean>(false);
  const [showValue, setShowValue] = useState<boolean>(false);
  const useRemoteConfig = useSettingsStore((s) => s.settings.useRemoteConfig);

  useEffect(() => {
    void (async () => {
      const token = await loadToken();
      if (token) setDraft(token);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    const ok = await saveToken(draft);
    if (ok) {
      Alert.alert('已保存', 'Token 已加密保存到本机。');
    } else {
      Alert.alert('保存失败', '请检查输入后重试。');
    }
  };

  const handleTest = async () => {
    setTesting(true);
    try {
      if (draft.trim().length > 0) {
        await saveToken(draft);
      }
      const items = await listDirectory('');
      const names = items.slice(0, 5).map((i) => i.name).join('、');
      Alert.alert(
        '连接成功',
        `已读取到仓库 ${GITHUB_REPO.owner}/${GITHUB_REPO.repo} 的内容：\n${names || '（空仓库）'}`,
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : '连接失败';
      Alert.alert('连接失败', message);
    } finally {
      setTesting(false);
    }
  };

  const handleClear = () => {
    Alert.alert('清除 Token', '确定吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清除',
        style: 'destructive',
        onPress: async () => {
          await clearToken();
          setDraft('');
        },
      },
    ]);
  };

  const openTokenPage = () => {
    void Linking.openURL(
      'https://github.com/settings/personal-access-tokens/new',
    );
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Card>
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            当前状态
          </Text>
          <View className="flex-row items-center mt-2">
            <Ionicons
              name={hasToken ? 'checkmark-circle' : 'alert-circle'}
              size={16}
              color={hasToken ? '#10B981' : '#EF4444'}
            />
            <Text className="ml-2 text-xs text-muted dark:text-dark-muted">
              {isLoading ? '读取中…' : hasToken ? '已配置 Token' : '尚未配置 Token'}
            </Text>
          </View>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            什么是 Token？
          </Text>
          <Text className="mt-2 text-xs leading-5 text-muted dark:text-dark-muted">
            为了读取私有的回忆仓库，应用需要一个 GitHub 细粒度访问令牌（Fine-grained PAT）。
            令牌只保存在本机（加密存储），不会上传到任何服务器。
          </Text>
          <View className="mt-3">
            <Button
              label="去 GitHub 创建 Token"
              variant="ghost"
              size="sm"
              icon="open-outline"
              onPress={openTokenPage}
            />
          </View>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            权限设置
          </Text>
          <Text className="mt-2 text-xs leading-5 text-muted dark:text-dark-muted">
            · Repository access：Only select repositories → {GITHUB_REPO.repo}
            {'\n'}· Permissions → Contents：Read and write
            {'\n'}· （如果只想阅读，可选 Read-only；但要在 App 内推送台词，需要写权限。）
          </Text>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text mb-2">
            粘贴 Token
          </Text>
          <View className="flex-row items-center">
            <TextInput
              value={draft}
              onChangeText={setDraft}
              placeholder="github_pat_..."
              placeholderTextColor={isDark ? '#64748B' : '#94A3B8'}
              secureTextEntry={!showValue}
              autoCapitalize="none"
              autoCorrect={false}
              multiline={false}
              className={[
                'flex-1 text-xs font-mono text-text dark:text-dark-text',
                'bg-background dark:bg-dark-bg rounded-xl px-3 py-2',
                'border border-border dark:border-dark-border',
              ].join(' ')}
            />
            <Pressable
              onPress={() => setShowValue((v) => !v)}
              className="ml-2 p-2 rounded-full active:opacity-60"
            >
              <Ionicons
                name={showValue ? 'eye-off' : 'eye'}
                size={18}
                color={isDark ? '#F1F5F9' : '#0F172A'}
              />
            </Pressable>
          </View>

          <View className="mt-3 flex-row">
            <View className="flex-1 mr-2">
              <Button
                label={testing ? '测试中…' : '保存并测试'}
                variant="primary"
                size="sm"
                loading={testing}
                icon="checkmark"
                onPress={handleTest}
              />
            </View>
            <View className="flex-1">
              <Button
                label="仅保存"
                variant="ghost"
                size="sm"
                onPress={handleSave}
              />
            </View>
          </View>

          {hasToken ? (
            <View className="mt-2">
              <Button
                label="清除 Token"
                variant="danger"
                size="sm"
                onPress={handleClear}
              />
            </View>
          ) : null}
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            当前使用
          </Text>
          <Text className="mt-2 text-xs text-muted dark:text-dark-muted">
            · 仓库：{GITHUB_REPO.owner}/{GITHUB_REPO.repo}
            {'\n'}· 分支：{GITHUB_REPO.branch}
            {'\n'}· 线上配置：{useRemoteConfig ? '开启' : '关闭'}
          </Text>
        </Card>

        <View className="mt-4">
          <Button
            label="返回"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export default GitHubTokenScreen;