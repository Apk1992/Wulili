import { useColorScheme } from 'react-native';
import { useSettingsStore } from '@/store/useSettingsStore';

export type ResolvedTheme = 'light' | 'dark';

export interface UseThemeResult {
  theme: ResolvedTheme;
  isDark: boolean;
  colorScheme: ReturnType<typeof useColorScheme>;
}

export function useTheme(): UseThemeResult {
  const systemScheme = useColorScheme();
  const preference = useSettingsStore((s) => s.settings.themePreference);

  let resolved: ResolvedTheme = 'light';
  if (preference === 'system') {
    resolved = systemScheme === 'dark' ? 'dark' : 'light';
  } else {
    resolved = preference;
  }

  return {
    theme: resolved,
    isDark: resolved === 'dark',
    colorScheme: systemScheme,
  };
}