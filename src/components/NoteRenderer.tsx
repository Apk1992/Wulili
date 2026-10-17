import React, { useEffect, useState } from 'react';
import { Pressable, Text, View, ActivityIndicator } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import NoteRenderer from '@/components/NoteRenderer';
import { humanizeFileName } from '@/utils/format';
import { getGitHubToken } from '@/api/githubClient';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteReader'>;

const RAW_BASE = 'https://raw.githubusercontent.com/yukee520/Wulili_assets/main';

export function NoteReaderScreen({ route, navigation }: Props): React.JSX.Element {
  const { path, displayName } = route.params;
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchText = async () => {
      try {
        const token = getGitHubToken();
        // 直接通过 fetch 拉取纯文本，绕开所有复杂的 Hook！
        const url = `${RAW_BASE}/${path.replace(/^\/+/, '')}`;
        const res = await fetch(url, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const text = await res.text();
        if (isMounted) setContent(text);
      } catch (err: any) {
        if (isMounted) setError(err.message || '网络错误');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchText();
    return () => { isMounted = false; };
  }, [path]);

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 border-b border-border dark:border-dark-border">
        <View className="flex-row items-center">
          <Pressable onPress={() => navigation.goBack()} className="p-1 rounded-full active:opacity-60">
            <Ionicons name="chevron-back" size={22} color="#2563EB" />
          </Pressable>
          <View className="ml-2 flex-1">
            <Text className="text-base font-semibold text-text dark:text-dark-text" numberOfLines={1}>
              {humanizeFileName(displayName)}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1">
        {loading ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#2563EB" />
            <Text className="mt-4 text-muted">正在下载读文…</Text>
          </View>
        ) : error ? (
          <View className="flex-1 items-center justify-center px-4">
            <Ionicons name="warning" size={40} color="#EF4444" />
            <Text className="mt-4 text-danger font-medium">{error}</Text>
            <Text className="mt-2 text-muted text-xs">请检查网络或 Token 权限</Text>
          </View>
        ) : (
          <NoteRenderer content={content} />
        )}
      </View>
    </ScreenContainer>
  );
}

export default NoteReaderScreen;
