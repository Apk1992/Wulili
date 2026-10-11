import React from 'react';
import { Modal, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import Button from './Button';
import { formatFileSize } from '@/utils/format';
import { formatVersion } from '@/utils/version';
import type { UpdateInfo } from '@/types/settings';

export interface UpdatePromptModalProps {
  visible: boolean;
  info: UpdateInfo | null;
  onClose: () => void;
  onUpdate: (url: string) => void;
  onSkip: (version: string) => void;
}

export function UpdatePromptModal({
  visible,
  info,
  onClose,
  onUpdate,
  onSkip,
}: UpdatePromptModalProps): React.JSX.Element {
  if (!info) {
    return <Modal visible={false} transparent animationType="none" />;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/50 items-center justify-center px-6">
        <View className="w-full rounded-3xl p-5 bg-card dark:bg-dark-card border border-border dark:border-dark-border">
          <View className="items-center mb-3">
            <View className="w-14 h-14 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center">
              <Ionicons name="cloud-download" size={28} color="#2563EB" />
            </View>
          </View>

          <Text className="text-lg font-bold text-center text-text dark:text-dark-text">
            发现新版本
          </Text>
          <Text className="text-center text-sm text-muted dark:text-dark-muted mt-1">
            {formatVersion(info.currentVersion)} → {formatVersion(info.latestVersion)}
          </Text>

          {info.releaseName ? (
            <Text className="text-center text-xs text-muted dark:text-dark-muted mt-1">
              {info.releaseName}
            </Text>
          ) : null}

          {info.releaseNotes ? (
            <ScrollView
              className="mt-3 max-h-40"
              showsVerticalScrollIndicator={false}
            >
              <Text className="text-xs text-text dark:text-dark-text leading-5">
                {info.releaseNotes}
              </Text>
            </ScrollView>
          ) : null}

          {info.apkSize ? (
            <Text className="text-center text-[10px] text-muted dark:text-dark-muted mt-2">
              安装包大小：{formatFileSize(info.apkSize)}
            </Text>
          ) : null}

          <View className="mt-4">
            <Button
              label="立即更新"
              variant="primary"
              icon="download"
              onPress={() => {
                if (info.apkUrl) onUpdate(info.apkUrl);
              }}
            />
          </View>

          <View className="mt-2">
            <Button
              label="稍后再说"
              variant="ghost"
              onPress={onClose}
            />
          </View>

          {info.releaseTag ? (
            <Pressable
              onPress={() => onSkip(info.releaseTag ?? '')}
              className="mt-1 py-2 items-center"
            >
              <Text className="text-[10px] text-muted dark:text-dark-muted">
                跳过此版本
              </Text>
            </Pressable>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

export default UpdatePromptModal;