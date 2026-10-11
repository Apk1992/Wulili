import React, { useState } from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import DeviceInfo from 'react-native-device-info';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { formatFileSize } from '@/utils/format';
import { GITHUB_REPO } from '@/api/githubConfig';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'About'>;

export function AboutScreen({ navigation }: Props): React.JSX.Element {
  const { info, isChecking, check, openApk, skipVersion } = useAppUpdate();
  const [checking, setChecking] = useState<boolean>(false);

  const handleCheck = async () => {
    setChecking(true);
    try {
      const result = await check({ silent: false });
      if (result && !result.hasUpdate) {
        // already latest, no dialog
      }
    } finally {
      setChecking(false);
    }
  };

  const repoUrl = `https://github.com/${GITHUB_REPO.owner}/${GITHUB_REPO.repo}`;

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ padding: 16, paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        <View className="items-center py-6">
          <View className="w-20 h-20 rounded-3xl bg-primary/15 items-center justify-center">
            <Ionicons name="sparkles" size={40} color="#2563EB" />
          </View>
          <Text className="mt-3 text-xl font-bold text-text dark:text-dark-text">
            雾璃专属
          </Text>
          <Text className="text-xs text-muted dark:text-dark-muted mt-1">
            版本 {DeviceInfo.getVersion()} ({DeviceInfo.getBuildNumber()})
          </Text>
          <Text className="text-[10px] text-muted dark:text-dark-muted mt-1">
            一个属于你和雾璃的私密空间
          </Text>
        </View>

        <Card>
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            关于雾璃
          </Text>
          <Text className="mt-2 text-xs leading-5 text-muted dark:text-dark-muted">
            雾璃是一名 INFJ 人格的虚拟主播。她温柔、内省，偶尔矛盾。
            她会记得你喂过她什么、多久没陪她，也会在深夜说出一些平时不会说的话。
            {'\n\n'}
            照顾好她的饮食、作息与心情，她会慢慢向你打开心扉。
          </Text>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            更新
          </Text>
          <Text className="mt-2 text-xs text-muted dark:text-dark-muted">
            当前版本：{info?.currentVersion ?? DeviceInfo.getVersion()}
            {info?.latestVersion ? `\n最新版本：${info.latestVersion}` : ''}
            {info?.apkSize ? `\n安装包大小：${formatFileSize(info.apkSize)}` : ''}
          </Text>
          <View className="mt-3">
            <Button
              label={isChecking || checking ? '检查中…' : '检查更新'}
              variant="primary"
              size="sm"
              icon="refresh"
              loading={isChecking || checking}
              onPress={handleCheck}
            />
          </View>
          {info?.hasUpdate && info.apkUrl ? (
            <View className="mt-2">
              <Button
                label={`下载 v${info.latestVersion ?? ''}`}
                variant="success"
                size="sm"
                icon="download"
                onPress={() => void openApk(info.apkUrl ?? '')}
              />
            </View>
          ) : null}
          {info?.hasUpdate && info.releaseTag ? (
            <View className="mt-2">
              <Button
                label="跳过此版本"
                variant="ghost"
                size="sm"
                onPress={() => skipVersion(info.releaseTag ?? '')}
              />
            </View>
          ) : null}
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            回忆仓库
          </Text>
          <Text className="mt-2 text-xs text-muted dark:text-dark-muted">
            {GITHUB_REPO.owner}/{GITHUB_REPO.repo}
          </Text>
          <View className="mt-3">
            <Button
              label="在浏览器打开仓库"
              variant="ghost"
              size="sm"
              icon="open-outline"
              onPress={() => void Linking.openURL(repoUrl)}
            />
          </View>
        </Card>

        <Card className="mt-3">
          <Text className="text-sm font-semibold text-text dark:text-dark-text">
            隐私
          </Text>
          <Text className="mt-2 text-xs leading-5 text-muted dark:text-dark-muted">
            · 所有养成数据只保存在你的手机本地
            {'\n'}· GitHub Token 使用系统密钥链加密存储
            {'\n'}· 回忆内容直接从你的私有仓库实时读取，不经过任何第三方服务器
          </Text>
        </Card>

        <View className="mt-4">
          <Button label="返回" variant="ghost" onPress={() => navigation.goBack()} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

export default AboutScreen;