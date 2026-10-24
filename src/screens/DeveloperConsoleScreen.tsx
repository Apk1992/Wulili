// src/screens/DeveloperConsoleScreen.tsx
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SettingRow from '@/components/SettingRow';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { uploadToR2 } from '@/api/r2Client';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DeveloperConsole'>;

export function DeveloperConsoleScreen({ navigation }: Props): React.JSX.Element {
  const [uploadingDialogues, setUploadingDialogues] = useState(false);
  const [uploadingConfig, setUploadingConfig] = useState(false);

  const config = useAppConfigStore((s) => s.config);
  const dialogues = useDialogueStore((s) => s.dialogues);
  const userDialogues = dialogues.filter((d) => d.source === 'user');
  const remoteDialogues = dialogues.filter((d) => d.source === 'remote');

  // 🔥 一键发布：台词
  const handleUploadDialogues = async () => {
    try {
      setUploadingDialogues(true);
      const allDialogues = [...remoteDialogues, ...userDialogues];
      const json = JSON.stringify({
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        dialogues: allDialogues,
      }, null, 2);

      await uploadToR2('dialogue/dialogues.json', json, 'application/json');
      Alert.alert('发布成功', '台词已直接同步到 R2 云端，重启 App 即可生效。');
    } catch (e: any) {
      Alert.alert('发布失败', String(e?.message ?? e));
    } finally {
      setUploadingDialogues(false);
    }
  };

  // 🔥 一键发布：物品配置
  const handleUploadConfig = async () => {
    try {
      setUploadingConfig(true);
      const json = JSON.stringify(config, null, 2);
      await uploadToR2('data/config.json', json, 'application/json');
      Alert.alert('发布成功', '物品配置已直接同步到 R2 云端，重启 App 即可生效。');
    } catch (e: any) {
      Alert.alert('发布失败', String(e?.message ?? e));
    } finally {
      setUploadingConfig(false);
    }
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        
        <View className="px-4 pt-4">
          <Card className="bg-primary/10 border-primary/20">
            <View className="flex-row items-center mb-2">
              <Ionicons name="cloud-upload" size={20} color="#2563EB" />
              <Text className="ml-2 text-sm font-bold text-primary">云端一键发布</Text>
            </View>
            <Text className="text-xs text-muted dark:text-dark-muted leading-5">
              你在下方编辑器中做的所有修改，只需点击这里的发布按钮，就会自动覆盖到 Cloudflare R2。发布完毕后重启 App 即可看到最新内容。
            </Text>
          </Card>
        </View>

        <View className="px-4 mt-4">
          <Button 
            label="发布最新【台词数据】" 
            icon="chatbubbles" 
            loading={uploadingDialogues}
            onPress={() => void handleUploadDialogues()} 
          />
        </View>

        <View className="px-4 mt-2">
          <Button 
            label="发布最新【物品配置】" 
            icon="settings" 
            loading={uploadingConfig}
            onPress={() => void handleUploadConfig()} 
          />
        </View>

        <Text className="px-4 pt-6 pb-2 text-xs font-bold text-text dark:text-dark-text">
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

        <Text className="px-4 pt-6 pb-2 text-xs font-bold text-text dark:text-dark-text">
          系统与权限
        </Text>
        <SettingRow
          icon="key"
          label="R2 密钥设置"
          value="配置上传权限"
          onPress={() => navigation.navigate('R2Config')}
        />

        <View className="px-4 mt-6">
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

export default DeveloperConsoleScreen;
