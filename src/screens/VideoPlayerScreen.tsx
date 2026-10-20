import React, { useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import Video from 'react-native-video';

import ScreenContainer from '@/components/ScreenContainer';
import { bgmManager } from '@/services/bgmManager';
import type { RootStackParamList } from '@/types/navigation';

type Props = NativeStackScreenProps<RootStackParamList, 'VideoPlayer'>;

export function VideoPlayerScreen({ route }: Props): React.JSX.Element {
  const videoUrl = route.params?.url;

  // 🔥 进入视频时自动暂停并释放 BGM，离开时无缝恢复
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
