import {
  PermissionsAndroid,
  Platform,
  NativeModules,
  Alert,
  Linking,
} from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';

const { BatteryOptimization } = NativeModules as {
  BatteryOptimization?: {
    isIgnoringBatteryOptimizations: () => Promise<boolean>;
    requestIgnoreBatteryOptimizations: () => Promise<boolean>;
  };
};

export interface PermissionStatus {
  notifications: boolean;
  batteryOptimization: boolean;
}

/**
 * 请求通知权限（Android 13+）
 */
export async function requestNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    // Android 13+ 才有 POST_NOTIFICATIONS
    if (Platform.Version < 33) return true;

    const status = await check(
      PERMISSIONS.ANDROID.POST_NOTIFICATIONS as never,
    );

    if (status === RESULTS.GRANTED) return true;

    const result = await request(
      PERMISSIONS.ANDROID.POST_NOTIFICATIONS as never,
    );

    return result === RESULTS.GRANTED;
  } catch (error) {
    console.warn('[Permissions] 请求通知权限失败', error);
    return false;
  }
}

/**
 * 检查是否已在电池优化白名单
 * 需要原生模块支持，如果没注册，返回 true（视为已授权）
 */
export async function isIgnoringBatteryOptimizations(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (!BatteryOptimization) {
    // 原生模块未注册，视为已授权（降级处理）
    return true;
  }

  try {
    return await BatteryOptimization.isIgnoringBatteryOptimizations();
  } catch {
    return true;
  }
}

/**
 * 请求加入电池优化白名单
 * 会打开系统弹窗，用户点"允许"即可
 */
export async function requestIgnoreBatteryOptimizations(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  if (!BatteryOptimization) {
    // 原生模块未注册，只能跳转到设置页面引导用户手动操作
    await openBatterySettings();
    return false;
  }

  try {
    return await BatteryOptimization.requestIgnoreBatteryOptimizations();
  } catch (error) {
    console.warn('[Permissions] 请求电池优化失败', error);
    await openBatterySettings();
    return false;
  }
}

/**
 * 跳转到系统电池优化设置页
 */
export async function openBatterySettings(): Promise<void> {
  if (Platform.OS !== 'android') return;
  try {
    await Linking.openSettings();
  } catch {
    Alert.alert('无法打开设置', '请手动进入设置 → 应用 → 雾璃专属 → 电池 → 无限制');
  }
}

/**
 * 检查当前所有权限状态
 */
export async function checkAllPermissions(): Promise<PermissionStatus> {
  const notifications = await (async () => {
    if (Platform.OS !== 'android') return true;
    if (Platform.Version < 33) return true;
    try {
      const status = await check(
        PERMISSIONS.ANDROID.POST_NOTIFICATIONS as never,
      );
      return status === RESULTS.GRANTED;
    } catch {
      return false;
    }
  })();

  const batteryOptimization = await isIgnoringBatteryOptimizations();

  return { notifications, batteryOptimization };
}

/**
 * 完整权限请求流程
 */
export async function requestAllPermissions(): Promise<PermissionStatus> {
  const notifications = await requestNotificationPermission();
  const batteryOptimization = await requestIgnoreBatteryOptimizations();
  return { notifications, batteryOptimization };
}

void PermissionsAndroid;