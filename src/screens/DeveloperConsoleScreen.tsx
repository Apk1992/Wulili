// src/screens/DeveloperConsoleScreen.tsx
import React, { useState } from 'react';
import { Alert, ScrollView, Text, View, Modal, Pressable, TextInput, Clipboard } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SettingRow from '@/components/SettingRow';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import { formatRelativeTime } from '@/utils/time';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DeveloperConsole'>;

const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function DeveloperConsoleScreen({ navigation }: Props): React.JSX.Element {
  // 导出弹窗状态
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportTitle, setExportTitle] = useState('');
  const [exportJson, setExportJson] = useState('');

  const config = useAppConfigStore((s) => s.config);
  const syncMeta = useAppConfigStore((s) => s.syncMeta);

  const dialogues = useDialogueStore((s) => s.dialogues);
  const userDialogues = dialogues.filter((d) => d.source === 'user');
  const remoteDialogues = dialogues.filter((d) => d.source === 'remote');
  const defaultCount = dialogues.filter((d) => d.source === 'default').length;

  // ===== 导出逻辑 =====
  const handleExportConfig = () => {
    const json = JSON.stringify(config, null, 2);
    setExportTitle('配置导出 (复制后替换 R2: data/config.json)');
    setExportJson(json);
    setExportModalVisible(true);
  };

  const handleExportDialogues = () => {
    // 把远程和本地自定义的台词合并导出
    const allDialogues = [...remoteDialogues, ...userDialogues];
    const json = JSON.stringify(
      {
        schemaVersion: 1,
        updatedAt: new Date().toISOString(),
        dialogues: allDialogues,
      },
      null,
      2,
    );
    setExportTitle('台词导出 (复制后替换 R2: dialogue/dialogues.json)');
    setExportJson(json);
    setExportModalVisible(true);
  };

  const copyToClipboard = () => {
    Clipboard.setString(exportJson);
    Alert.alert('已复制', '内容已复制到剪贴板，请去 R2 控制台替换对应文件。');
    setExportModalVisible(false);
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

        <View className="px-4 mt-4 mb-2">
          <Text className="text-xs font-bold text-muted dark:text-dark-muted">
            R2 数据同步 (导出后手动上传)
          </Text>
        </View>

        <View className="px-4 mt-2">
          <Button
            label="导出【台词配置】"
            variant="primary"
            icon="download"
            onPress={handleExportDialogues}
          />
        </View>

        <View className="px-4 mt-2">
          <Button
            label="导出【物品/系统配置】"
            variant="primary"
            icon="download"
            onPress={handleExportConfig}
          />
        </View>

        <View className="px-4 mt-3">
          <Text className="text-[10px] text-muted dark:text-dark-muted leading-4">
            提示：点击导出后，复制 JSON 字符串，前往 Cloudflare R2 控制台，覆盖对应的 `dialogues.json` 或 `config.json`。App 重启后会自动读取最新内容。
          </Text>
        </View>

        <Text className="px-4 pt-6 pb-2 text-xs text-muted dark:text-dark-muted">
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

        <View className="px-4 mt-6">
          <Button
            label="返回设置"
            variant="ghost"
            onPress={() => navigation.goBack()}
          />
        </View>
      </ScrollView>

      {/* 导出 JSON 弹窗 */}
      <Modal visible={exportModalVisible} transparent animationType="fade">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ width: '90%', height: '70%', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
            <View className="flex-row justify-between items-center mb-3">
              <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }}>{exportTitle}</Text>
              <Pressable onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </Pressable>
            </View>
            
            <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, marginBottom: 12 }}>
              <TextInput
                multiline
                editable={false}
                value={exportJson}
                style={{ color: '#CBD5E1', fontSize: 12, padding: 10, flex: 1, textAlignVertical: 'top' }}
              />
            </View>

            <Button label="复制到剪贴板" variant="primary" onPress={copyToClipboard} />
          </View>
        </View>
      </Modal>
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

export default DeveloperConsoleScreen;
