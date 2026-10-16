import notifee, {
  AndroidImportance,
  AndroidVisibility,
  AuthorizationStatus,
  EventType,
  type AndroidChannel,
  type Notification,
} from '@notifee/react-native';
import { Platform } from 'react-native';

const ANDROID_CHANNEL_ID = 'anistep-events';
const ANDROID_CHANNEL_NAME = 'AniStep Events';

let channelReady = false;

export const ensureChannel = async (): Promise<string> => {
  if (Platform.OS !== 'android') return '';
  if (channelReady) return ANDROID_CHANNEL_ID;

  const channel: AndroidChannel = {
    id: ANDROID_CHANNEL_ID,
    name: ANDROID_CHANNEL_NAME,
    description: 'Battle alerts, loot drops, and egg hatch notifications',
    importance: AndroidImportance.HIGH,
    visibility: AndroidVisibility.PUBLIC,
    vibration: true,
    badge: true,
    lights: true,
  };

  await notifee.createChannel(channel);
  channelReady = true;
  return ANDROID_CHANNEL_ID;
};

export const requestNotificationPermission = async (): Promise<boolean> => {
  try {
    const settings = await notifee.requestPermission({
      alert: true,
      badge: true,
      sound: true,
      criticalAlert: false,
      provisional: false,
    });

    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
};

export const hasNotificationPermission = async (): Promise<boolean> => {
  try {
    const settings = await notifee.getNotificationSettings();
    return (
      settings.authorizationStatus === AuthorizationStatus.AUTHORIZED ||
      settings.authorizationStatus === AuthorizationStatus.PROVISIONAL
    );
  } catch {
    return false;
  }
};

const display = async (
  notification: Notification,
  channelId: string,
): Promise<void> => {
  try {
    await notifee.displayNotification({
      ...notification,
      android: {
        ...notification.android,
        channelId,
        pressAction: {
          id: 'default',
          launchActivity: 'default',
        },
      },
    });
  } catch {
    // silent — notifications are best-effort
  }
};

export const notifyEncounter = async (
  speciesName: string,
  emoji: string,
  level: number,
): Promise<void> => {
  const channelId = await ensureChannel();
  await display(
    {
      title: '⚔️ A wild creature appeared!',
      body: `${emoji} ${speciesName} (Lv.${level}) is waiting. Steps are paused until you resolve.`,
      data: { type: 'encounter' },
      android: {
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        smallIcon: 'ic_launcher',
        color: '#EF4444',
        autoCancel: true,
        ongoing: false,
      },
    },
    channelId,
  );
};

export const notifyLoot = async (
  items: readonly { name: string; emoji: string; count: number }[],
): Promise<void> => {
  if (items.length === 0) return;
  const channelId = await ensureChannel();
  const summary = items
    .map((i) => `${i.emoji} ${i.name} ×${i.count}`)
    .join('  ·  ');

  await display(
    {
      title: '🎁 Items collected',
      body: summary,
      data: { type: 'loot' },
      android: {
        importance: AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PUBLIC,
        smallIcon: 'ic_launcher',
        color: '#10B981',
        autoCancel: true,
      },
    },
    channelId,
  );
};

export const notifyHatchReady = async (): Promise<void> => {
  const channelId = await ensureChannel();
  await display(
    {
      title: '🥚 Your egg is ready to hatch!',
      body: 'Open AniStep to meet your new companion.',
      data: { type: 'hatch' },
      android: {
        importance: AndroidImportance.HIGH,
        visibility: AndroidVisibility.PUBLIC,
        smallIcon: 'ic_launcher',
        color: '#2563EB',
        autoCancel: true,
      },
    },
    channelId,
  );
};

export const notifyStepGoal = async (goal: number): Promise<void> => {
  const channelId = await ensureChannel();
  await display(
    {
      title: '🏆 Daily goal reached!',
      body: `You walked ${goal.toLocaleString()} steps today. Your buddy is proud.`,
      data: { type: 'goal' },
      android: {
        importance: AndroidImportance.DEFAULT,
        visibility: AndroidVisibility.PUBLIC,
        smallIcon: 'ic_launcher',
        color: '#F59E0B',
        autoCancel: true,
      },
    },
    channelId,
  );
};

export const cancelAllNotifications = async (): Promise<void> => {
  try {
    await notifee.cancelAllNotifications();
  } catch {
    // silent
  }
};

export const setupNotificationListeners = (
  onForegroundEvent?: (type: EventType, data: Record<string, string>) => void,
): (() => void) => {
  return notifee.onForegroundEvent(({ type, detail }) => {
    if (onForegroundEvent) {
      const data = (detail.notification?.data ?? {}) as Record<string, string>;
      onForegroundEvent(type, data);
    }
  });
};