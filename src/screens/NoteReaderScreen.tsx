import React from 'react';
import { Pressable, Text, View } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';

import ScreenContainer from '@/components/ScreenContainer';
import NoteRenderer from '@/components/NoteRenderer';
import LoadingView from '@/components/LoadingView';
import ErrorView from '@/components/ErrorView';
import { useGitHubRawFile } from '@/hooks/useGitHubFile';
import { humanizeFileName } from '@/utils/format';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'NoteReader'>;

export function NoteReaderScreen({ route, navigation }: Props): React.JSX.Element {
  const { path, displayName } = route.params;
  const query = useGitHubRawFile(path, true);

  if (query.isLoading) {
    return (
      <ScreenContainer edges={['bottom']}>
        <LoadingView message="正在加载读文…" fullScreen />
      </ScreenContainer>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScreenContainer edges={['bottom']}>
        <ErrorView
          title="加载失败"
          message="无法读取这篇读文，请检查网络或 Token。"
          onRetry={() => query.refetch()}
          fullScreen
        />
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer padded={false} edges={['bottom']}>
      <View className="px-4 pt-3 pb-2 border-b border-border dark:border-dark-border">
        <View className="flex-row items-center">
          <Pressable
            onPress={() => navigation.goBack()}
            className="p-1 rounded-full active:opacity-60"
          >
            <Ionicons name="chevron-back" size={22} color="#2563EB" />
          </Pressable>
          <View className="ml-2 flex-1">
            <Text
              className="text-base font-semibold text-text dark:text-dark-text"
              numberOfLines={1}
            >
              {humanizeFileName(displayName)}
            </Text>
            <Text className="text-[10px] text-muted dark:text-dark-muted mt-0.5">
              {Math.round(query.data.size / 1024)} KB · 来自 GitHub 仓库
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-1 px-4">
        <NoteRenderer content={query.data.raw} />
      </View>
    </ScreenContainer>
  );
}

export default NoteReaderScreen;