import React, { useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  Text,
  View,
  ActivityIndicator,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

import Button from './Button';
import { useTheme } from '@/hooks/useTheme';
import {
  checkAllPermissions,
  requestAllPermissions,
  type PermissionStatus,
} from '@/services/permissions';

export interface PermissionGateModalProps {
  visible: boolean;
  onComplete: () => void;
}

export function PermissionGateModal({
  visible,
  onComplete,
}: PermissionGateModalProps): React.JSX.Element {
  const { isDark } = useTheme();
  const [status, setStatus] = useState<PermissionStatus>({
    notifications: false,
    batteryOptimization: false,
  });
  const [checking, setChecking] = useState<boolean>(false);

  useEffect(() => {
    if (!visible) return;
    void (async () => {
      const result = await checkAllPermissions();
      setStatus(result);
      // 如果都已授权，直接关闭
      if (result.notifications && result.batteryOptimization) {
        onComplete();
      }
    })();
  }, [visible, onComplete]);

  const handleRequest = async () => {
    setChecking(true);
    try {
      const result = await requestAllPermissions();
      setStatus(result);
      if (result.notifications && result.batteryOptimization) {
        onComplete();
      }
    } finally {
      setChecking(false);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onComplete}
      statusBarTranslucent
    >
      <View className="flex-1 bg-black/60 items-center justify-center px-6">
        <View className="w-full rounded-3xl p-5 bg-card dark:bg-dark-card border border-border dark:border-dark-border">
          <View className="items-center mb-3">
            <View className="w-16 h-16 rounded-full bg-primary/10 dark:bg-primary/20 items-center justify-center">
              <Ionicons name="musical-notes" size={32} color="#2563EB" />
            </View>
          </View>

          <Text className="text-lg font-bold text-center text-text dark:text-dark-text">
            让雾璃的音乐持续播放
          </Text>
          <Text className="text-xs text-center text-muted dark:text-dark-muted mt-2 leading-5">
            为了让音乐在后台和锁屏时继续播放，需要你授权两个权限。
          </Text>

          <View className="mt-4">
            <PermissionRow
              icon="notifications"
              title="通知权限"
              description="显示播放控制条（Android 13+ 需要）"
              granted={status.notifications}
            />
            <View className="h-2" />
            <PermissionRow
              icon="battery-charging"
              title="电池优化白名单"
              description="防止系统杀掉后台播放"
              granted={status.batteryOptimization}
            />
          </View>

          <View className="mt-5">
            <Button
              label={checking ? '正在请求…' : '一键授权'}
              icon="shield-checkmark"
              variant="primary"
              size="lg"
              loading={checking}
              onPress={() => void handleRequest()}
            />
          </View>

          <View className="mt-2">
            <Button
              label="稍后再说"
              variant="ghost"
              size="sm"
              onPress={handleSkip}
            />
          </View>

          <Text className="text-[10px] text-center text-muted dark:text-dark-muted mt-2 leading-4">
            不授权的话，切到后台或锁屏后音乐可能会停止。
          </Text>
        </View>
      </View>
    </Modal>
  );
}

interface PermissionRowProps {
  icon: string;
  title: string;
  description: string;
  granted: boolean;
}

function PermissionRow({
  icon,
  title,
  description,
  granted,
}: PermissionRowProps): React.JSX.Element {
  return (
    <View className="flex-row items-center p-3 rounded-2xl bg-background dark:bg-dark-bg border border-border dark:border-dark-border">
      <View
        className={[
          'w-10 h-10 rounded-full items-center justify-center mr-3',
          granted ? 'bg-success/15' : 'bg-warning/15',
        ].join(' ')}
      >
        <Ionicons
          name={granted ? 'checkmark' : icon}
          size={20}
          color={granted ? '#10B981' : '#F59E0B'}
        />
      </View>
      <View className="flex-1">
        <Text className="text-sm font-semibold text-text dark:text-dark-text">
          {title}
        </Text>
        <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
          {description}
        </Text>
      </View>
      <Text
        className={[
          'text-[10px] font-medium',
          granted ? 'text-success' : 'text-warning',
        ].join(' ')}
      >
        {granted ? '已授权' : '待授权'}
      </Text>
    </View>
  );
}

export default PermissionGateModal;