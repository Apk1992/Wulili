// src/screens/R2ConfigScreen.tsx
import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, Text, TextInput, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import { useR2Store } from '@/store/useR2Store';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'R2Config'>;

export function R2ConfigScreen({ navigation }: Props): React.JSX.Element {
  const { config, saveConfig, clearConfig } = useR2Store();
  
  const [accountId, setAccountId] = useState('');
  const [accessKeyId, setAccessKeyId] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [bucketName, setBucketName] = useState('');

  useEffect(() => {
    // 加载已有的配置（脱敏显示）
    setAccountId(config.accountId);
    setAccessKeyId(config.accessKeyId);
    setSecretKey(config.secretAccessKey ? '********' : '');
    setBucketName(config.bucketName);
  }, [config]);

  const handleSave = async () => {
    if (!accountId || !accessKeyId || !secretKey || !bucketName) {
      Alert.alert('提示', '所有字段都必须填写');
      return;
    }
    
    // 如果 Secret 是 ******** 表示没改，用原来的
    const finalSecret = secretKey === '********' ? config.secretAccessKey : secretKey;

    await saveConfig({ accountId, accessKeyId, secretAccessKey: finalSecret, bucketName });
    Alert.alert('保存成功', 'R2 密钥已安全加密存储在本机。', [
      { text: '好', onPress: () => navigation.goBack() }
    ]);
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView className="flex-1 p-4">
        <Card className="mb-4">
          <Text className="text-sm text-muted dark:text-dark-muted leading-5">
            请在此填入 Cloudflare R2 的 S3 API 密钥。配置只会保存在你手机的本地安全区（Keychain），绝不上传网络。
          </Text>
        </Card>

        <View className="space-y-3">
          <View>
            <Text className="text-xs font-bold text-text dark:text-dark-text mb-1">Account ID</Text>
            <TextInput
              value={accountId}
              onChangeText={setAccountId}
              placeholder="例如: a1b2c3d4..."
              className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl px-3 py-3 text-text dark:text-dark-text"
              autoCapitalize="none"
            />
          </View>
          
          <View className="mt-3">
            <Text className="text-xs font-bold text-text dark:text-dark-text mb-1">Access Key ID</Text>
            <TextInput
              value={accessKeyId}
              onChangeText={setAccessKeyId}
              placeholder="输入 Access Key ID"
              className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl px-3 py-3 text-text dark:text-dark-text"
              autoCapitalize="none"
            />
          </View>

          <View className="mt-3">
            <Text className="text-xs font-bold text-text dark:text-dark-text mb-1">Secret Access Key</Text>
            <TextInput
              value={secretKey}
              onChangeText={setSecretKey}
              placeholder="输入 Secret Key"
              secureTextEntry
              className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl px-3 py-3 text-text dark:text-dark-text"
              autoCapitalize="none"
            />
          </View>

          <View className="mt-3">
            <Text className="text-xs font-bold text-text dark:text-dark-text mb-1">存储桶名称 (Bucket)</Text>
            <TextInput
              value={bucketName}
              onChangeText={setBucketName}
              placeholder="例如: wulili-assets"
              className="bg-card dark:bg-dark-card border border-border dark:border-dark-border rounded-xl px-3 py-3 text-text dark:text-dark-text"
              autoCapitalize="none"
            />
          </View>
        </View>

        <View className="mt-6">
          <Button label="保存密钥" icon="save" onPress={() => void handleSave()} />
        </View>

        <View className="mt-2">
          <Button 
            label="清除密钥" 
            variant="danger" 
            icon="trash" 
            onPress={() => {
              Alert.alert('清除密钥', '确定要清除本机的 R2 配置吗？', [
                { text: '取消', style: 'cancel' },
                { text: '清除', style: 'destructive', onPress: () => void clearConfig() }
              ]);
            }} 
          />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}
