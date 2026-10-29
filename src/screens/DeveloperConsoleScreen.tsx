// src/screens/DeveloperConsoleScreen.tsx
import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  Text,
  View,
  Modal,
  Pressable,
  TextInput,
  Clipboard,
  Linking,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import Card from '@/components/Card';
import Button from '@/components/Button';
import SettingRow from '@/components/SettingRow';
import { useDialogueStore } from '@/store/useDialogueStore';
import { useAppConfigStore } from '@/store/useAppConfigStore';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'DeveloperConsole'>;

// 🔥 你的 R2 控制台直达链接（方便你一键跳转粘贴）
const R2_CONSOLE_URL = 'https://dash.cloudflare.com/';

export function DeveloperConsoleScreen({ navigation }: Props): React.JSX.Element {
  const [exportModalVisible, setExportModalVisible] = useState(false);
  const [exportTitle, setExportTitle] = useState('');
  const [exportJson, setExportJson] = useState('');
  const [r2Path, setR2Path] = useState('');

  const config = useAppConfigStore((s) => s.config);
  const dialogues = useDialogueStore((s) => s.dialogues);
  
  const userDialogues = dialogues.filter((d) => d.source === 'user');
  const remoteDialogues = dialogues.filter((d) => d.source === 'remote');

  // ===== 导出台词 =====
  const handleExportDialogues = () => {
    const allDialogues = [...remoteDialogues, ...userDialogues];
    const json = JSON.stringify({
      schemaVersion: 1,
      updatedAt: new Date().toISOString(),
      dialogues: allDialogues,
    }, null, 2);
    
    setExportTitle('导出：台词配置');
    setR2Path('dialogue/dialogues.json');
    setExportJson(json);
    setExportModalVisible(true);
  };

  // ===== 导出配置 =====
  const handleExportConfig = () => {
    const json = JSON.stringify(config, null, 2);
    setExportTitle('导出：物品与系统配置');
    setR2Path('data/config.json');
    setExportJson(json);
    setExportModalVisible(true);
  };

  // ===== 复制并打开 R2 后台 =====
  const copyToClipboardAndOpenR2 = () => {
    Clipboard.setString(exportJson);
    setExportModalVisible(false);
    
    Alert.alert(
      '内容已复制',
      `请前往 R2 控制台，覆盖文件：\n${r2Path}\n\n（点击“打开 R2”会自动跳转到浏览器）`,
      [
        { text: '留在 App', style: 'cancel' },
        { 
          text: '打开 R2', 
          onPress: () => void Linking.openURL(R2_CONSOLE_URL) 
        },
      ]
    );
  };

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 32 }}>
        
        {/* 顶部提示卡片 */}
        <View className="px-4 pt-4">
          <Card className="bg-primary/10 border-primary/20">
            <View className="flex-row items-center mb-2">
              <Ionicons name="cloud-done" size={20} color="#2563EB" />
              <Text className="ml-2 text-sm font-bold text-primary">内容发布面板</Text>
            </View>
            <Text className="text-xs text-muted dark:text-dark-muted leading-5">
              App 直接读取 R2 上的内容。你在下方修改内容后，点击【导出】复制 JSON，然后去 Cloudflare R2 控制台覆盖对应的文件。重启 App 即可生效。
            </Text>
          </Card>
        </View>

        {/* 发布区 */}
        <Text className="px-4 pt-5 pb-2 text-xs font-bold text-text dark:text-dark-text">
          第一步：导出并复制
        </Text>

        <View className="px-4">
          <Card className="mb-3">
            <View className="flex-row items-center mb-1">
              <Ionicons name="chatbubbles" size={16} color="#8B5CF6" />
              <Text className="ml-2 text-sm font-semibold text-text dark:text-dark-text">台词数据</Text>
            </View>
            <Text className="text-[10px] text-muted dark:text-dark-muted mb-3">
              保存路径: {`dialogue/dialogues.json`}
            </Text>
            <Button 
              label="导出全部台词并复制" 
              icon="download" 
              onPress={handleExportDialogues} 
            />
          </Card>

          <Card className="mb-3">
            <View className="flex-row items-center mb-1">
              <Ionicons name="settings" size={16} color="#10B981" />
              <Text className="ml-2 text-sm font-semibold text-text dark:text-dark-text">物品与系统配置</Text>
            </View>
            <Text className="text-[10px] text-muted dark:text-dark-muted mb-3">
              保存路径: {`data/config.json`}
            </Text>
            <Button 
              label="导出全部配置并复制" 
              icon="download" 
              onPress={handleExportConfig} 
            />
          </Card>
        </View>

        <View className="px-4 mt-2">
          <Text className="text-[10px] text-muted dark:text-dark-muted leading-4">
            提示：素材图片（食物、服饰、人物立绘等）请直接在电脑浏览器上传到 R2 对应的 images 文件夹中，无需通过 App。
          </Text>
        </View>

        {/* 编辑器入口 */}
        <Text className="px-4 pt-6 pb-2 text-xs font-bold text-text dark:text-dark-text">
          第二步：在此处修改内容
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

        <View className="px-4 mt-8">
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
          <View style={{ width: '92%', height: '75%', backgroundColor: '#1E293B', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: '#334155' }}>
            
            <View className="flex-row justify-between items-center mb-2">
              <Text style={{ color: '#F8FAFC', fontSize: 16, fontWeight: 'bold' }}>{exportTitle}</Text>
              <Pressable onPress={() => setExportModalVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94A3B8" />
              </Pressable>
            </View>
            
            <View className="bg-warning/15 px-3 py-2 rounded-lg mb-3">
              <Text style={{ color: '#F59E0B', fontSize: 12 }}>
                请覆盖 R2 上的这个文件：{r2Path}
              </Text>
            </View>

            <View style={{ flex: 1, backgroundColor: '#0F172A', borderRadius: 8, marginBottom: 12 }}>
              <TextInput
                multiline
                editable={false}
                value={exportJson}
                style={{ color: '#CBD5E1', fontSize: 12, padding: 10, flex: 1, textAlignVertical: 'top' }}
              />
            </View>

            <Button 
              label="复制并跳转 R2" 
              icon="copy"
              variant="primary" 
              onPress={copyToClipboardAndOpenR2} 
            />
          </View>
        </View>
      </Modal>
    </ScreenContainer>
  );
}

export default DeveloperConsoleScreen;
