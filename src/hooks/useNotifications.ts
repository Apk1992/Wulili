import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, Platform, type AppStateStatus } from 'react-native';
import {
  hasNotificationPermission,
  requestNotificationPermission,
} from '@/services/notifications';
import { useSettingsStore } from '@/store/useSettingsStore';

export interface UseNotificationsResult {
  permission: 'unknown' | 'granted' | 'denied';
  ready: boolean;
  request: () => Promise<boolean>;
  enabled: boolean;
}

export const useNotifications = (): UseNotificationsResult => {
  const notificationsEnabled = useSettingsStore(
    (s) => s.settings.notificationsEnabled,
  );

  const [permission, setPermission] = useState<'unknown' | 'granted' | 'denied'>(
    'unknown',
  );
  const [ready, setReady] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(true);

  const check = useCallback(async (): Promise<void> => {
    const ok = await hasNotificationPermission();
    if (!mountedRef.current) return;
    setPermission(ok ? 'granted' : 'denied');
    setReady(true);
  }, []);

  const request = useCallback(async (): Promise<boolean> => {
    const ok = await requestNotificationPermission();
    if (!mountedRef.current) return ok;
    setPermission(ok ? 'granted' : 'denied');
    return ok;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    void check();

    const onAppState = (state: AppStateStatus): void => {
      if (state === 'active') void check();
    };

    const sub = AppState.addEventListener('change', onAppState);

    return () => {
      mountedRef.current = false;
      sub.remove();
    };
  }, [check]);

  // Auto-request on first boot if user hasn't decided yet (Android 13+).
  useEffect(() => {
    if (!ready) return;
    if (Platform.OS !== 'android') return;
    if (permission !== 'denied') return;
    if (!notificationsEnabled) return;
    void request();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  return {
    permission,
    ready,
    request,
    enabled: notificationsEnabled && permission === 'granted',
  };
};