// src/screens/VideoPlayerScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Video from 'react-native-video';

import ScreenContainer from '@/components/ScreenContainer';
import { bgmManager } from '@/services/bgmManager';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

// 🔥 Cloudflare R2 专属公开域名（避免传入相对路径时无法播放）
const R2_BASE_URL = 'https://pub-daee64ddf4df4b6e8f58100ed89fd6d2.r2.dev';

export function VideoPlayerScreen({ route }: Props): React.JSX.Element {
  const rawUrl = route.params?.url;

  // 🔥 保证 videoUrl 一定是可播放的 R2 绝对路径
  const videoUrl = useMemo(() => {
    if (!rawUrl) return null;
    if (rawUrl.startsWith('http://') || rawUrl.startsWith('https://')) {
      return rawUrl;
    }
    return `${R2_BASE_URL}/${rawUrl.replace(/^\/+/, '')}`;
  }, [rawUrl]);

  // 🔥 进入视频时自动挂起 BGM，避免音频焦点冲突，离开时无缝恢复
  useFocusEffect(
    useCallback(() => {
      bgmManager.suspendForVideo();

      return () => {
        bgmManager.resumeFromVideo();
      };
    }, [])
  );

  return (
    <ScreenContainer padded={false} edges={['bottom', 'top']}>
      <View style={styles.container}>
        {videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            style={styles.video}
            controls={true}
            resizeMode="contain"
            ignoreSilentSwitch="ignore"
          />
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  video: {
    width: '100%',
    height: '100%',
  },
});

export default VideoPlayerScreen;
