import { useCallback } from 'react';
import { Linking, Alert } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import { checkForUpdateFromList } from '@/api/githubUpdate';
import { useUpdateStore } from '@/store/useUpdateStore';
import { useSettingsStore } from '@/store/useSettingsStore';
import type { UpdateInfo } from '@/types/settings';

export interface UseAppUpdateResult {
  info: UpdateInfo | null;
  isChecking: boolean;
  lastError: string | null;
  check: (options?: { silent?: boolean }) => Promise<UpdateInfo | null>;
  promptIfAvailable: () => Promise<boolean>;
  openApk: (url: string) => Promise<void>;
  skipVersion: (version: string) => void;
  clearError: () => void;
}

export function useAppUpdate(): UseAppUpdateResult {
  const info = useUpdateStore((s) => s.info);
  const isChecking = useUpdateStore((s) => s.isChecking);
  const lastError = useUpdateStore((s) => s.lastError);
  const setInfo = useUpdateStore((s) => s.setInfo);
  const setChecking = useUpdateStore((s) => s.setChecking);
  const setError = useUpdateStore((s) => s.setError);
  const clearError = useUpdateStore((s) => s.clearError);

  const autoCheck = useSettingsStore((s) => s.settings.autoCheckUpdate);
  const skippedVersion = useSettingsStore((s) => s.settings.skippedVersion);
  const skipVersionSetting = useSettingsStore((s) => s.skipVersion);
  const setLastUpdateCheckAt = useSettingsStore((s) => s.setLastUpdateCheckAt);

  const check = useCallback(
    async (options?: { silent?: boolean }): Promise<UpdateInfo | null> => {
      const silent = options?.silent === true;
      if (!autoCheck && silent) return null;
      setChecking(true);
      setError(null);
      try {
        const currentVersion = DeviceInfo.getVersion();
        const result = await checkForUpdateFromList(currentVersion);
        setInfo(result);
        setLastUpdateCheckAt(Date.now());
        if (result.error && !silent) {
          setError(result.error);
        }
        return result;
      } catch (error) {
        const message = error instanceof Error ? error.message : '检查更新失败';
        setError(message);
        if (!silent) {
          Alert.alert('检查更新失败', message);
        }
        return null;
      } finally {
        setChecking(false);
      }
    },
    [autoCheck, setChecking, setError, setInfo, setLastUpdateCheckAt],
  );

  const openApk = useCallback(async (url: string): Promise<void> => {
    try {
      const supported = await Linking.canOpenURL(url);
      if (!supported) {
        Alert.alert('无法打开链接', '请手动复制链接到浏览器下载');
        return;
      }
      await Linking.openURL(url);
    } catch {
      Alert.alert('打开失败', '请稍后重试');
    }
  }, []);

  const promptIfAvailable = useCallback(async (): Promise<boolean> => {
    const result = await check({ silent: true });
    if (!result || !result.hasUpdate) return false;
    if (result.releaseTag && result.releaseTag === skippedVersion) return false;
    const version = result.latestVersion ?? '新版本';
    const notes = result.releaseNotes ?? '有新的更新可用';
    return new Promise<boolean>((resolve) => {
      Alert.alert(
        `发现新版本 ${version}`,
        notes.length > 300 ? `${notes.slice(0, 300)}…` : notes,
        [
          {
            text: '稍后',
            style: 'cancel',
            onPress: () => resolve(false),
          },
          {
            text: '跳过此版本',
            style: 'destructive',
            onPress: () => {
              if (result.releaseTag) skipVersionSetting(result.releaseTag);
              resolve(false);
            },
          },
          {
            text: '立即更新',
            onPress: () => {
              if (result.apkUrl) {
                void openApk(result.apkUrl);
              } else {
                Alert.alert('暂无下载链接', '请稍后再试');
              }
              resolve(true);
            },
          },
        ],
        { cancelable: true },
      );
    });
  }, [check, openApk, skipVersionSetting, skippedVersion]);

  const skipVersion = useCallback(
    (version: string) => {
      skipVersionSetting(version);
    },
    [skipVersionSetting],
  );

  return {
    info,
    isChecking,
    lastError,
    check,
    promptIfAvailable,
    openApk,
    skipVersion,
    clearError,
  };
}